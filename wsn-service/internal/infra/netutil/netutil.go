// Package netutil guards user-supplied URLs against SSRF: platform-delivered webhooks,
// integration targets and alert URLs must not reach internal infrastructure.
package netutil

import (
	"errors"
	"fmt"
	"net"
	"net/url"
	"strings"
)

// ErrInternalTarget is returned when a URL points at loopback, private, link-local or otherwise
// non-public infrastructure.
var ErrInternalTarget = errors.New("URL points at internal or non-public infrastructure")

// AssertPublicHTTPURL validates that raw is an absolute http(s) URL whose host is public:
// literal private/loopback/link-local IPs and obvious internal hostnames are rejected, and a
// best-effort DNS lookup rejects hosts that resolve only to internal addresses.
func AssertPublicHTTPURL(raw string) error {
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") {
		return errors.New("must be an absolute http(s) URL")
	}
	host := u.Hostname()
	lower := strings.ToLower(host)
	if lower == "localhost" || strings.HasSuffix(lower, ".localhost") || strings.HasSuffix(lower, ".internal") || strings.HasSuffix(lower, ".local") || lower == "metadata.google.internal" {
		return ErrInternalTarget
	}
	if ip := net.ParseIP(host); ip != nil && isInternalIP(ip) {
		return ErrInternalTarget
	}
	// Best-effort DNS check; an unresolvable host simply fails later at delivery time.
	if ips, err := net.LookupIP(host); err == nil {
		for _, ip := range ips {
			if isInternalIP(ip) {
				return fmt.Errorf("%w: %s resolves to %s", ErrInternalTarget, host, ip)
			}
		}
	}
	return nil
}

func isInternalIP(ip net.IP) bool {
	return ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified()
}
