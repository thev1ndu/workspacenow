package flow

import (
	"fmt"
	"math"
	"regexp"
	"slices"
	"strconv"
	"strings"
)

// These helpers mirror the console editor (libs/types/src/workflow.ts) so both judge a flow the same way.

func startStep(steps []Step, start *string) string {
	if start != nil {
		return *start
	}
	if len(steps) > 0 {
		return steps[0].ID
	}
	return ""
}

func stepByID(steps []Step, id string) (Step, bool) {
	i := slices.IndexFunc(steps, func(s Step) bool { return s.ID == id })
	if i < 0 {
		return Step{}, false
	}
	return steps[i], true
}

// nextStep is a step's own next, or the step after it in the list when next is unset; "" ends the run.
func nextStep(steps []Step, s Step) string {
	if s.Next.Set {
		return s.Next.To
	}
	i := slices.IndexFunc(steps, func(x Step) bool { return x.ID == s.ID })
	if i >= 0 && i+1 < len(steps) {
		return steps[i+1].ID
	}
	return ""
}

type link struct{ path, to string }

func stepLinks(steps []Step, s Step) []link {
	if s.Kind == "condition" {
		return []link{{"then", s.Then.To}, {"otherwise", s.Otherwise.To}}
	}
	out := []link{{"next", nextStep(steps, s)}}
	if s.Kind == "approval" && s.OnReject.To != "" {
		out = append(out, link{"onReject", s.OnReject.To})
	}
	return out
}

// readPath reads a dotted path such as "order.total" from a run's context.
func readPath(ctx map[string]any, path string) any {
	var cur any = ctx
	for _, key := range strings.Split(path, ".") {
		m, ok := cur.(map[string]any)
		if !ok {
			return nil
		}
		cur = m[key]
	}
	return cur
}

// conditionHolds compares numbers as numbers and everything else as text.
func conditionHolds(actual any, op, expected string) bool {
	text := ""
	if actual != nil {
		text = fmt.Sprint(actual)
	}
	if op == "exists" {
		return actual != nil && text != ""
	}
	a, errA := strconv.ParseFloat(text, 64)
	b, errB := strconv.ParseFloat(expected, 64)
	numeric := text != "" && expected != "" && errA == nil && errB == nil && !math.IsInf(a, 0) && !math.IsInf(b, 0)
	switch op {
	case "eq":
		return (numeric && a == b) || (!numeric && text == expected)
	case "neq":
		return (numeric && a != b) || (!numeric && text != expected)
	case "gt":
		return numeric && a > b
	case "gte":
		return numeric && a >= b
	case "lt":
		return numeric && a < b
	case "lte":
		return numeric && a <= b
	case "contains":
		return strings.Contains(strings.ToLower(text), strings.ToLower(expected))
	}
	return false
}

var placeholder = regexp.MustCompile(`\{\{\s*([\w.]+)\s*\}\}`)

// render fills {{key}} placeholders from the run's context; a missing key becomes empty.
func render(template string, ctx map[string]any) string {
	return placeholder.ReplaceAllStringFunc(template, func(m string) string {
		v := readPath(ctx, placeholder.FindStringSubmatch(m)[1])
		if v == nil {
			return ""
		}
		return fmt.Sprint(v)
	})
}

// References are what a definition may point at.
type References struct {
	AgentIDs           []string
	BusinessOperations []string
	Permissions        []string
}

// validateWorkflow returns every problem with a definition, in reading order.
func validateWorkflow(d Definition, refs References) []string {
	var p []string
	if strings.TrimSpace(d.Name) == "" {
		p = append(p, "The workflow needs a name")
	}
	if d.Trigger.Kind == "entity-event" && strings.TrimSpace(d.Trigger.Event) == "" {
		p = append(p, "Trigger: choose the event that starts the workflow")
	}
	if d.Trigger.Kind == "schedule" && len(strings.Fields(d.Trigger.Cron)) != 5 {
		p = append(p, "Trigger: a schedule needs a five-field cron expression")
	}
	if len(d.Steps) == 0 {
		p = append(p, "Add at least one step")
	}
	ids := map[string]bool{}
	for _, s := range d.Steps {
		if ids[s.ID] {
			p = append(p, or(s.Name, s.ID)+": duplicate step id")
		}
		ids[s.ID] = true
	}
	target := func(where, to string) {
		if to != "" && !ids[to] {
			p = append(p, where+": connects to a step that no longer exists")
		}
	}
	target("Trigger", startStep(d.Steps, d.Start))
	for _, s := range d.Steps {
		where := or(s.Name, "Unnamed step")
		if strings.TrimSpace(s.Name) == "" {
			p = append(p, fmt.Sprintf("A %s step needs a name", s.Kind))
		}
		for _, l := range stepLinks(d.Steps, s) {
			target(where, l.to)
		}
		switch s.Kind {
		case "agent":
			if !slices.Contains(refs.AgentIDs, s.AgentID) {
				p = append(p, where+": choose an agent")
			}
			if strings.TrimSpace(s.Prompt) == "" {
				p = append(p, where+": tell the agent what to do")
			}
		case "approval":
			if !slices.Contains(refs.Permissions, s.Permission) {
				p = append(p, where+": choose the permission an approver needs")
			}
		case "operation":
			if !slices.Contains(refs.BusinessOperations, s.BusinessOperation) {
				p = append(p, where+": choose a business operation")
			}
		case "notify":
			if strings.TrimSpace(s.Channel) == "" {
				p = append(p, where+": choose where to send the notification")
			}
			if strings.TrimSpace(s.Message) == "" {
				p = append(p, where+": write the message")
			}
		case "condition":
			if strings.TrimSpace(s.Field) == "" {
				p = append(p, where+": choose the value to check")
			}
			if s.Operator != "exists" && strings.TrimSpace(s.Value) == "" {
				p = append(p, where+": enter the value to compare with")
			}
			if s.Then.To == "" && s.Otherwise.To == "" {
				p = append(p, where+": connect at least one branch")
			}
		case "wait":
			if s.Minutes <= 0 {
				p = append(p, where+": wait for at least one minute")
			}
		}
	}
	reached, onPath, looped := map[string]bool{}, map[string]bool{}, false
	var walk func(id string)
	walk = func(id string) {
		s, ok := stepByID(d.Steps, id)
		if id == "" || !ok {
			return
		}
		if onPath[id] {
			looped = true
			return
		}
		if reached[id] {
			return
		}
		reached[id], onPath[id] = true, true
		for _, l := range stepLinks(d.Steps, s) {
			walk(l.to)
		}
		delete(onPath, id)
	}
	walk(startStep(d.Steps, d.Start))
	if looped {
		p = append(p, "The flow loops back on itself; every path must reach an end")
	}
	for _, s := range d.Steps {
		if !reached[s.ID] {
			p = append(p, or(s.Name, "A step")+": not connected to the trigger")
		}
	}
	return p
}

func or(s, fallback string) string {
	if strings.TrimSpace(s) != "" {
		return s
	}
	return fallback
}
