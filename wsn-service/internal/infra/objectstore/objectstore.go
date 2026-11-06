// Package objectstore keeps documents and release artifacts in S3-compatible storage (MinIO or AWS S3).
package objectstore

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/thev1ndu/workspacenow/wsn-service/config"
)

// Store writes and reads immutable objects by key.
type Store interface {
	Put(ctx context.Context, key, contentType string, body []byte) error
	Get(ctx context.Context, key string) ([]byte, error)
}

// s3Store speaks the S3 REST API with path-style addressing and Signature Version 4.
type s3Store struct {
	cfg    config.S3Config
	base   string
	client *http.Client
}

// Open checks the bucket and creates it when missing.
func Open(ctx context.Context, cfg config.S3Config) (Store, error) {
	scheme := "http"
	if cfg.UseSSL {
		scheme = "https"
	}
	s := &s3Store{cfg: cfg, base: scheme + "://" + cfg.Endpoint, client: &http.Client{Timeout: 60 * time.Second}}
	resp, err := s.do(ctx, http.MethodHead, "/"+cfg.Bucket, "", nil)
	if err != nil {
		return nil, fmt.Errorf("check bucket %s: %w", cfg.Bucket, err)
	}
	resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		resp, err = s.do(ctx, http.MethodPut, "/"+cfg.Bucket, "", nil)
		if err != nil {
			return nil, fmt.Errorf("create bucket %s: %w", cfg.Bucket, err)
		}
		defer resp.Body.Close()
		if resp.StatusCode >= 300 {
			return nil, fmt.Errorf("create bucket %s: %s", cfg.Bucket, status(resp))
		}
	} else if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("check bucket %s: %s", cfg.Bucket, resp.Status)
	}
	return s, nil
}

func (s *s3Store) Put(ctx context.Context, key, contentType string, body []byte) error {
	resp, err := s.do(ctx, http.MethodPut, s.path(key), contentType, body)
	if err != nil {
		return fmt.Errorf("put %s: %w", key, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("put %s: %s", key, status(resp))
	}
	return nil
}

func (s *s3Store) Get(ctx context.Context, key string) ([]byte, error) {
	resp, err := s.do(ctx, http.MethodGet, s.path(key), "", nil)
	if err != nil {
		return nil, fmt.Errorf("get %s: %w", key, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return nil, fmt.Errorf("get %s: %s", key, status(resp))
	}
	return io.ReadAll(resp.Body)
}

func (s *s3Store) path(key string) string {
	segments := strings.Split(strings.TrimPrefix(key, "/"), "/")
	for i, seg := range segments {
		segments[i] = url.PathEscape(seg)
	}
	return "/" + s.cfg.Bucket + "/" + strings.Join(segments, "/")
}

func (s *s3Store) do(ctx context.Context, method, path, contentType string, body []byte) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, s.base+path, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	s.sign(req, body, time.Now().UTC())
	return s.client.Do(req)
}

// sign adds an AWS Signature Version 4 Authorization header.
func (s *s3Store) sign(req *http.Request, body []byte, now time.Time) {
	payloadHash := sha256Hex(body)
	amzDate := now.Format("20060102T150405Z")
	day := now.Format("20060102")
	req.Header.Set("Host", req.URL.Host)
	req.Header.Set("X-Amz-Date", amzDate)
	req.Header.Set("X-Amz-Content-Sha256", payloadHash)

	signed := []string{"host", "x-amz-content-sha256", "x-amz-date"}
	canonicalHeaders := "host:" + req.URL.Host + "\n" + "x-amz-content-sha256:" + payloadHash + "\n" + "x-amz-date:" + amzDate + "\n"
	canonical := strings.Join([]string{req.Method, req.URL.EscapedPath(), req.URL.RawQuery, canonicalHeaders, strings.Join(signed, ";"), payloadHash}, "\n")
	scope := day + "/" + s.cfg.Region + "/s3/aws4_request"
	toSign := "AWS4-HMAC-SHA256\n" + amzDate + "\n" + scope + "\n" + sha256Hex([]byte(canonical))

	key := hmacSHA256([]byte("AWS4"+s.cfg.SecretKey), day)
	key = hmacSHA256(key, s.cfg.Region)
	key = hmacSHA256(key, "s3")
	key = hmacSHA256(key, "aws4_request")
	signature := hex.EncodeToString(hmacSHA256(key, toSign))
	req.Header.Set("Authorization", fmt.Sprintf("AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		s.cfg.AccessKey, scope, strings.Join(signed, ";"), signature))
}

func sha256Hex(b []byte) string {
	h := sha256.Sum256(b)
	return hex.EncodeToString(h[:])
}

func hmacSHA256(key []byte, data string) []byte {
	m := hmac.New(sha256.New, key)
	m.Write([]byte(data))
	return m.Sum(nil)
}

func status(resp *http.Response) string {
	b, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
	return strings.TrimSpace(resp.Status + " " + string(b))
}
