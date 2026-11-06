// Package httpx writes JSON responses, { items, total } lists and ErrorBody failures.
package httpx

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/infra/docstore"
	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// JSON writes v with the given status.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Warn("write response", "error", err)
	}
}

// OK writes a 200 response.
func OK(w http.ResponseWriter, v any) { JSON(w, http.StatusOK, v) }

// Created writes the 201 response every successful POST returns.
func Created(w http.ResponseWriter, v any) { JSON(w, http.StatusCreated, v) }

// ListResponse is the contract's collection envelope.
type ListResponse[T any] struct {
	Items []T `json:"items"`
	Total int `json:"total"`
}

// List writes a collection; a nil slice is written as an empty list.
func List[T any](w http.ResponseWriter, items []T) {
	if items == nil {
		items = []T{}
	}
	OK(w, ListResponse[T]{Items: items, Total: len(items)})
}

// ListFrom loads a collection and writes it, or writes the error.
func ListFrom[T any](w http.ResponseWriter, r *http.Request, load func(context.Context) ([]T, error)) {
	items, err := load(r.Context())
	if err != nil {
		Error(w, r, err)
		return
	}
	List(w, items)
}

type errorBody struct {
	Status  int    `json:"status"`
	Code    string `json:"code"`
	Message string `json:"message"`
	TraceID string `json:"traceId,omitempty"`
}

// Error writes err as an ErrorBody, hiding and logging anything that is not an API error.
func Error(w http.ResponseWriter, r *http.Request, err error) {
	if e, ok := kernel.AsError(err); ok {
		JSON(w, e.Status, errorBody{Status: e.Status, Code: string(e.Code), Message: e.Message, TraceID: e.TraceID})
		return
	}
	if errors.Is(err, docstore.ErrNotFound) {
		JSON(w, http.StatusNotFound, errorBody{Status: http.StatusNotFound, Code: string(kernel.CodeNotFound), Message: "Not found"})
		return
	}
	slog.ErrorContext(r.Context(), "request failed", "method", r.Method, "path", r.URL.Path, "error", err)
	JSON(w, http.StatusInternalServerError, errorBody{
		Status: http.StatusInternalServerError, Code: string(kernel.CodeInvalidState), Message: "Something went wrong. Try again, or check the platform logs.",
	})
}

// Decode reads a JSON request body into v. An empty body leaves v unchanged.
func Decode(r *http.Request, v any) error {
	err := json.NewDecoder(r.Body).Decode(v)
	if err == nil || errors.Is(err, io.EOF) {
		return nil
	}
	return kernel.Invalid("The request body is not valid JSON")
}

// Caller returns the authenticated caller; protected routes always have one.
func Caller(r *http.Request) *kernel.Caller {
	c, ok := kernel.CallerFrom(r.Context())
	if !ok {
		panic("httpx.Caller called on a route without authentication")
	}
	return c
}
