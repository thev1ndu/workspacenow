// Package connect owns APIs, API operations, MCP exposure and servers, and outbound integrations.
package connect

import "time"

// ManagedServerID is the MCP server WorkspaceNow itself serves its exposed operations from.
const ManagedServerID = "mcp-workspacenow"

type API struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	BasePath       string `json:"basePath"`
	ApplicationID  string `json:"applicationId"`
	Version        string `json:"version"`
	DefaultVersion string `json:"defaultVersion,omitempty"` // served when the caller asks for no version
	Lifecycle      string `json:"lifecycle"`
	Description    string `json:"description"`
}

type MCPExposure struct {
	ToolName    string `json:"toolName"`
	Description string `json:"description"`
	Enabled     bool   `json:"enabled"`
}

type Operation struct {
	ID                 string       `json:"id"`
	APIID              string       `json:"apiId"`
	Method             string       `json:"method"`
	Path               string       `json:"path"`
	Summary            string       `json:"summary"`
	BusinessOperation  string       `json:"businessOperation"`
	Permission         string       `json:"permission"`
	RateLimitPerMinute int          `json:"rateLimitPerMinute"`
	Version            string       `json:"version,omitempty"` // API version this operation belongs to
	Transform          *Transform   `json:"transform,omitempty"`
	MCP                *MCPExposure `json:"mcp,omitempty"`
}

type ServerTool struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type MCPServer struct {
	ID           string       `json:"id"`
	Name         string       `json:"name"`
	URL          string       `json:"url"`
	Kind         string       `json:"kind"`
	Auth         string       `json:"auth"`
	Status       string       `json:"status"`
	Tools        []ServerTool `json:"tools"`
	RegisteredAt time.Time    `json:"registeredAt"`
}

// Schema is a JSON Schema document.
type Schema = map[string]any

type Tool struct {
	Name              string `json:"name"`
	Description       string `json:"description"`
	Source            string `json:"source"`
	ServerID          string `json:"serverId"`
	OperationID       string `json:"operationId,omitempty"`
	BusinessOperation string `json:"businessOperation,omitempty"`
	Permission        string `json:"permission,omitempty"`
	InputSchema       Schema `json:"inputSchema"`
	OutputSchema      Schema `json:"outputSchema"`
	Version           string `json:"version"`
}

type Integration struct {
	ID           string      `json:"id"`
	Name         string      `json:"name"`
	Kind         string      `json:"kind"`
	Target       string      `json:"target"`
	Status       string      `json:"status"`
	RetryPolicy  string      `json:"retryPolicy"`
	TimeoutMs    int         `json:"timeoutMs"`
	SecretRef    string      `json:"secretRef"`
	Auth         *AuthConfig `json:"auth,omitempty"` // oauth2 client flow; secret resolved via SecretRef
	LastTestedAt *time.Time  `json:"lastTestedAt,omitempty"`
}
