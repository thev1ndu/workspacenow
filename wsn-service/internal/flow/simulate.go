package flow

import (
	"context"
	"fmt"
	"strconv"
	"strings"

	"github.com/thev1ndu/workspacenow/wsn-service/internal/kernel"
)

// SimulateInput is the body of POST /workflows/{id}/simulate.
type SimulateInput struct {
	Event map[string]any `json:"event,omitempty"`
}

// SimStep is one would-be step of a simulated run.
type SimStep struct {
	Name    string `json:"name"`
	Kind    string `json:"kind"`
	Outcome string `json:"outcome"` // would-run, would-wait-approval, would-skip, condition-true, condition-false
	Detail  string `json:"detail"`
}

// Simulation is the result of a dry run: a minted trace id plus the would-be steps.
type Simulation struct {
	TraceID string    `json:"traceId"`
	Summary string    `json:"summary"`
	Steps   []SimStep `json:"steps"`
}

// Simulate walks the workflow's step graph without side effects, evaluating conditions against
// the sample event payload. Requires flow.read.
func (s *service) Simulate(ctx context.Context, ec kernel.ExecutionContext, workflowID string, event map[string]any) (*Simulation, error) {
	w, err := s.Workflow(ctx, workflowID)
	if err != nil {
		return nil, err
	}
	if err := kernel.RequirePermission(ctx, s.auditor, ec, "flow.read", "workflow.simulate", "workflow/"+workflowID); err != nil {
		return nil, err
	}
	if event == nil {
		event = map[string]any{}
	}
	return walkDefinition(w.Name, w.Steps, w.Start, event), nil
}

// walkDefinition walks the step graph without side effects (pure; the service wrapper adds the trace id).
func walkDefinition(name string, steps []Step, start *string, event map[string]any) *Simulation {
	sim := &Simulation{TraceID: kernel.NewID("sim")}
	if event == nil {
		event = map[string]any{}
	}
	byID := map[string]Step{}
	for _, st := range steps {
		byID[st.ID] = st
	}
	startID := ""
	if start != nil {
		startID = *start
	} else if len(steps) > 0 {
		startID = steps[0].ID
	}
	visited := map[string]bool{}
	cur := startID
	for cur != "" && !visited[cur] {
		visited[cur] = true
		st, ok := byID[cur]
		if !ok {
			sim.Steps = append(sim.Steps, SimStep{Name: cur, Kind: "unknown", Outcome: "would-skip", Detail: "step referenced but not defined"})
			break
		}
		next := st.Next
		switch st.Kind {
		case "operation":
			sim.Steps = append(sim.Steps, SimStep{Name: st.Name, Kind: st.Kind, Outcome: "would-run", Detail: "would invoke business operation " + st.BusinessOperation})
		case "agent":
			sim.Steps = append(sim.Steps, SimStep{Name: st.Name, Kind: st.Kind, Outcome: "would-run", Detail: "would run agent " + st.AgentID + " (governed by a signed grant)"})
		case "notify":
			sim.Steps = append(sim.Steps, SimStep{Name: st.Name, Kind: st.Kind, Outcome: "would-run", Detail: "would notify " + st.Channel})
		case "wait":
			sim.Steps = append(sim.Steps, SimStep{Name: st.Name, Kind: st.Kind, Outcome: "would-run", Detail: fmt.Sprintf("would wait %.0f minutes", st.Minutes)})
		case "approval":
			sim.Steps = append(sim.Steps, SimStep{Name: st.Name, Kind: st.Kind, Outcome: "would-wait-approval", Detail: "would wait for approval by a holder of " + st.Permission})
		case "condition":
			cond := evalCondition(st, event)
			outcome := "condition-false"
			if cond {
				outcome = "condition-true"
				next = st.Then
			} else {
				next = st.Otherwise
			}
			sim.Steps = append(sim.Steps, SimStep{Name: st.Name, Kind: st.Kind, Outcome: outcome,
				Detail: fmt.Sprintf("%s %s %s evaluated against the sample event", st.Field, st.Operator, st.Value)})
		default:
			sim.Steps = append(sim.Steps, SimStep{Name: st.Name, Kind: st.Kind, Outcome: "would-skip", Detail: "unknown step kind"})
		}
		if !next.Set {
			break
		}
		cur = next.To
	}
	sim.Summary = fmt.Sprintf("Dry run of %q: %d steps, no side effects", name, len(sim.Steps))
	return sim
}

// evalCondition evaluates a condition step against the sample event payload (dotted field paths).
func evalCondition(st Step, event map[string]any) bool {
	got := lookupPath(event, st.Field)
	switch st.Operator {
	case "eq", "=", "":
		return fmt.Sprintf("%v", got) == st.Value
	case "neq", "!=":
		return fmt.Sprintf("%v", got) != st.Value
	case "gt", ">":
		return toFloat(got) > toFloat(st.Value)
	case "lt", "<":
		return toFloat(got) < toFloat(st.Value)
	case "gte", ">=":
		return toFloat(got) >= toFloat(st.Value)
	case "lte", "<=":
		return toFloat(got) <= toFloat(st.Value)
	case "contains":
		return strings.Contains(fmt.Sprintf("%v", got), st.Value)
	default:
		return false
	}
}

func lookupPath(m map[string]any, path string) any {
	cur := any(m)
	for _, part := range strings.Split(path, ".") {
		mm, ok := cur.(map[string]any)
		if !ok {
			return nil
		}
		cur = mm[part]
	}
	return cur
}

func toFloat(v any) float64 {
	switch t := v.(type) {
	case float64:
		return t
	case float32:
		return float64(t)
	case int:
		return float64(t)
	case int64:
		return float64(t)
	case string:
		f, _ := strconv.ParseFloat(t, 64)
		return f
	default:
		return 0
	}
}
