package kernel

import (
	"errors"
	"fmt"
	"net/http"
	"strings"
)

// Code is the machine-readable error code of the API contract (ErrorBody.code).
type Code string

const (
	CodeUnauthenticated  Code = "UNAUTHENTICATED"
	CodeForbidden        Code = "FORBIDDEN"
	CodeNotFound         Code = "NOT_FOUND"
	CodeValidationFailed Code = "VALIDATION_FAILED"
	CodeConflict         Code = "CONFLICT"
	CodeInvalidState     Code = "INVALID_STATE"
)

// Error is a failure shown to the caller as written, so Message must be plain language.
type Error struct {
	Status  int
	Code    Code
	Message string
	TraceID string
}

func (e *Error) Error() string { return e.Message }

// WithTrace returns a copy of the error that names the trace it was audited under.
func (e *Error) WithTrace(traceID string) *Error {
	c := *e
	c.TraceID = traceID
	return &c
}

func newError(status int, code Code, format string, args ...any) *Error {
	return &Error{Status: status, Code: code, Message: fmt.Sprintf(format, args...)}
}

func Unauthenticated(format string, args ...any) *Error {
	return newError(http.StatusUnauthorized, CodeUnauthenticated, format, args...)
}

func Forbidden(format string, args ...any) *Error {
	return newError(http.StatusForbidden, CodeForbidden, format, args...)
}

func NotFound(format string, args ...any) *Error {
	return newError(http.StatusNotFound, CodeNotFound, format, args...)
}

func Conflict(format string, args ...any) *Error {
	return newError(http.StatusConflict, CodeConflict, format, args...)
}

func InvalidState(format string, args ...any) *Error {
	return newError(http.StatusConflict, CodeInvalidState, format, args...)
}

func Invalid(format string, args ...any) *Error {
	return newError(http.StatusUnprocessableEntity, CodeValidationFailed, format, args...)
}

// Problems reports the problems a validator found; the message names at most three of them.
func Problems(problems []string) *Error {
	if len(problems) > 3 {
		problems = problems[:3]
	}
	return Invalid("%s", strings.Join(problems, "; "))
}

// AsError returns the API error carried by err, if any.
func AsError(err error) (*Error, bool) {
	var e *Error
	if errors.As(err, &e) {
		return e, true
	}
	return nil, false
}
