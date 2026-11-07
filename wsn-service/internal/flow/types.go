// Package flow runs workflows as durable Temporal executions that can wait on people.
package flow

import (
	"encoding/json"
	"time"
)

type Trigger struct {
	Kind  string `json:"kind"`
	Event string `json:"event,omitempty"`
	Cron  string `json:"cron,omitempty"`
}

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// Link is a step reference that tells "not set" apart from "set to null" (the workflow ends).
type Link struct {
	Set bool
	To  string
}

func to(id string) Link { return Link{Set: true, To: id} }

// Step is one workflow step; only the fields of its kind are meaningful.
type Step struct {
	ID       string
	Name     string
	Kind     string
	Next     Link
	Position *Position

	AgentID           string // agent
	Prompt            string
	Permission        string // approval
	Description       string
	OnReject          Link
	BusinessOperation string // operation
	Channel           string // notify
	Message           string
	Field             string // condition
	Operator          string
	Value             string
	Then              Link
	Otherwise         Link
	Minutes           float64 // wait
}

func (s Step) MarshalJSON() ([]byte, error) {
	m := map[string]any{"id": s.ID, "name": s.Name, "kind": s.Kind}
	link := func(key string, l Link) {
		if !l.Set {
			return
		}
		if l.To == "" {
			m[key] = nil
		} else {
			m[key] = l.To
		}
	}
	link("next", s.Next)
	if s.Position != nil {
		m["position"] = s.Position
	}
	switch s.Kind {
	case "agent":
		m["agentId"], m["prompt"] = s.AgentID, s.Prompt
	case "approval":
		m["permission"], m["description"] = s.Permission, s.Description
		link("onReject", s.OnReject)
	case "operation":
		m["businessOperation"] = s.BusinessOperation
	case "notify":
		m["channel"], m["message"] = s.Channel, s.Message
	case "condition":
		m["field"], m["operator"], m["value"] = s.Field, s.Operator, s.Value
		m["then"], m["otherwise"] = nullable(s.Then), nullable(s.Otherwise)
	case "wait":
		m["minutes"] = s.Minutes
	}
	return json.Marshal(m)
}

func nullable(l Link) any {
	if l.To == "" {
		return nil
	}
	return l.To
}

func (s *Step) UnmarshalJSON(b []byte) error {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(b, &raw); err != nil {
		return err
	}
	str := func(key string) string {
		var v string
		_ = json.Unmarshal(raw[key], &v)
		return v
	}
	link := func(key string) Link {
		v, ok := raw[key]
		if !ok {
			return Link{}
		}
		var id *string
		_ = json.Unmarshal(v, &id)
		if id == nil {
			return Link{Set: true}
		}
		return to(*id)
	}
	*s = Step{
		ID: str("id"), Name: str("name"), Kind: str("kind"), Next: link("next"),
		AgentID: str("agentId"), Prompt: str("prompt"), Permission: str("permission"), Description: str("description"), OnReject: link("onReject"),
		BusinessOperation: str("businessOperation"), Channel: str("channel"), Message: str("message"),
		Field: str("field"), Operator: str("operator"), Value: str("value"), Then: link("then"), Otherwise: link("otherwise"),
	}
	if p, ok := raw["position"]; ok {
		_ = json.Unmarshal(p, &s.Position)
	}
	_ = json.Unmarshal(raw["minutes"], &s.Minutes)
	return nil
}

// Definition is what the editor saves: everything about a workflow except what the platform owns.
type Definition struct {
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	ApplicationID   string    `json:"applicationId,omitempty"`
	Trigger         Trigger   `json:"trigger"`
	Steps           []Step    `json:"steps"`
	Start           *string   `json:"start,omitempty"`
	TriggerPosition *Position `json:"triggerPosition,omitempty"`
}

type Workflow struct {
	ID string `json:"id"`
	Definition
	Permissions []string `json:"permissions"`
	Version     int      `json:"version"`
	Status      string   `json:"status"`
}

type ExecutionStep struct {
	StepID    string     `json:"stepId"`
	Status    string     `json:"status"`
	StartedAt *time.Time `json:"startedAt,omitempty"`
	EndedAt   *time.Time `json:"endedAt,omitempty"`
	Detail    string     `json:"detail,omitempty"`
}

type Execution struct {
	ID         string          `json:"id"`
	WorkflowID string          `json:"workflowId"`
	TraceID    string          `json:"traceId"`
	Status     string          `json:"status"`
	Context    map[string]any  `json:"context"`
	Steps      []ExecutionStep `json:"steps"`
	StartedAt  time.Time       `json:"startedAt"`
	EndedAt    *time.Time      `json:"endedAt,omitempty"`
}

type Subject struct {
	Entity        string `json:"entity"`
	RecordID      string `json:"recordId"`
	ApplicationID string `json:"applicationId,omitempty"`
}

type Approval struct {
	ID          string     `json:"id"`
	ExecutionID string     `json:"executionId"`
	WorkflowID  string     `json:"workflowId"`
	StepID      string     `json:"stepId"`
	TraceID     string     `json:"traceId"`
	Title       string     `json:"title"`
	Summary     string     `json:"summary"`
	Permission  string     `json:"permission"`
	Subject     *Subject   `json:"subject,omitempty"`
	Status      string     `json:"status"`
	RequestedAt time.Time  `json:"requestedAt"`
	DecidedAt   *time.Time `json:"decidedAt,omitempty"`
	DecidedBy   string     `json:"decidedBy,omitempty"`
	Comment     string     `json:"comment,omitempty"`
}
