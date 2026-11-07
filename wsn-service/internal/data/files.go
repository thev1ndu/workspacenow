package data

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"path"
	"strings"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// maxFileBytes caps one uploaded file (50 MiB).
const maxFileBytes = 50 << 20

// FileRef is a file field's value: the object-storage reference and its metadata. Never the bytes.
type FileRef struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	SizeBytes   int64  `json:"sizeBytes"`
	ContentType string `json:"contentType"`
}

// UploadFile stores the file in object storage and sets the record's file field to its FileRef.
func (s *service) UploadFile(ctx context.Context, ec kernel.ExecutionContext, entity, recordID, field, name string, r io.Reader) (*Record, error) {
	e, err := s.rt.Entity(ctx, entity)
	if err != nil {
		return nil, err
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, e.WritePermission, entity+".file.upload", "entity/"+entity); err != nil {
		return nil, err
	}
	f := fieldByName(e, field)
	if f == nil || f.Type != FieldFile {
		return nil, kernel.Invalid("%s has no file field %s", entity, field)
	}
	if _, err := s.rt.Record(ctx, entity, recordID); err != nil {
		return nil, err
	}
	name = path.Base(strings.TrimSpace(name))
	if name == "" || name == "." || name == "/" {
		name = "file"
	}
	contentType := ""
	if ct, ok := r.(interface{ ContentType() string }); ok {
		contentType = ct.ContentType()
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	limited := io.LimitReader(r, maxFileBytes+1)
	body, err := io.ReadAll(limited)
	if err != nil {
		return nil, err
	}
	if int64(len(body)) > maxFileBytes {
		return nil, kernel.Invalid("file exceeds the 50 MiB limit")
	}
	key := fmt.Sprintf("uploads/%s/%s/%s/%s-%s", entity, recordID, field, kernel.NewID("file"), name)
	if err := s.artifacts.Put(ctx, key, contentType, body); err != nil {
		return nil, err
	}
	ref, _ := json.Marshal(FileRef{Key: key, Name: name, SizeBytes: int64(len(body)), ContentType: contentType})
	out, err := s.rt.Update(ctx, ec, entity, recordID, map[string]any{field: string(ref)})
	if err != nil {
		return nil, err
	}
	if err := s.auditor.Record(ctx, ec, "record.file.upload", "record/"+entity+"/"+recordID, kernel.OutcomeAllowed, field+" "+name); err != nil {
		return nil, err
	}
	return out, nil
}

// DownloadFile streams the object a record's file field references.
func (s *service) DownloadFile(ctx context.Context, ec kernel.ExecutionContext, entity, recordID, field string) (*FileRef, []byte, error) {
	e, err := s.rt.Entity(ctx, entity)
	if err != nil {
		return nil, nil, err
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, e.ReadPermission, entity+".file.download", "entity/"+entity); err != nil {
		return nil, nil, err
	}
	f := fieldByName(e, field)
	if f == nil || f.Type != FieldFile {
		return nil, nil, kernel.Invalid("%s has no file field %s", entity, field)
	}
	rec, err := s.rt.Record(ctx, entity, recordID)
	if err != nil {
		return nil, nil, err
	}
	raw, _ := rec.Values[field].(string)
	var ref FileRef
	if raw == "" || json.Unmarshal([]byte(raw), &ref) != nil || ref.Key == "" {
		return nil, nil, kernel.NotFound("No file on %s.%s", recordID, field)
	}
	body, err := s.artifacts.Get(ctx, ref.Key)
	if err != nil {
		return nil, nil, err
	}
	return &ref, body, nil
}

func fieldByName(e *Entity, name string) *Field {
	for i := range e.Fields {
		if e.Fields[i].Name == name {
			return &e.Fields[i]
		}
	}
	return nil
}
