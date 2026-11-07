package ai

import (
	"encoding/base64"
	"strings"
	"testing"
	"time"
)

func testGrant(now time.Time) Grant {
	return Grant{
		RunID:       "run-test0001",
		TraceID:     "trace-test0001",
		AgentID:     "agent-sidekick",
		AgentName:   "Sidekick",
		OnBehalfOf:  "Amaya Perera",
		Permissions: []string{"inventory.read", "procurement.read"},
		Tools:       []string{"get_low_stock_items", "list_suppliers"},
		Budget:      12,
		ExpiresAt:   now.Add(5 * time.Minute),
	}
}

func TestGrantRoundTrip(t *testing.T) {
	signer := GenerateSigner()
	verifier := signer.Verifier()
	token, err := signer.Sign(testGrant(time.Now().UTC()))
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	g, err := verifier.Verify(token)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if g.RunID != "run-test0001" || g.AgentID != "agent-sidekick" || g.Budget != 12 {
		t.Fatalf("claims did not survive the round trip: %+v", g)
	}
	if !g.Permits("get_low_stock_items") {
		t.Errorf("granted tool reported as not permitted")
	}
	if g.Permits("approve_purchase_request") {
		t.Errorf("ungranted tool reported as permitted")
	}
}

func TestGrantExpired(t *testing.T) {
	signer := GenerateSigner()
	// testGrant adds 5 minutes to the time it is given, so go back 10 to land in the past.
	token, err := signer.Sign(testGrant(time.Now().UTC().Add(-10 * time.Minute)))
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	if _, err := signer.Verifier().Verify(token); err != ErrGrantExpired {
		t.Fatalf("expired grant verified with %v", err)
	}
}

func TestGrantWrongKey(t *testing.T) {
	first, second := GenerateSigner(), GenerateSigner()
	token, err := first.Sign(testGrant(time.Now().UTC()))
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	if _, err := second.Verifier().Verify(token); err != ErrGrantMalformed {
		t.Fatalf("foreign grant verified with %v", err)
	}
}

func TestGrantTampered(t *testing.T) {
	signer := GenerateSigner()
	narrow := testGrant(time.Now().UTC())
	narrow.Tools = []string{"get_low_stock_items"}
	narrowToken, err := signer.Sign(narrow)
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	// Re-sign a wider grant, then splice its payload into the narrow token's.
	wide := testGrant(time.Now().UTC())
	wide.Tools = []string{"approve_purchase_request"}
	wideToken, err := signer.Sign(wide)
	if err != nil {
		t.Fatalf("sign wide: %v", err)
	}
	widePayload, _, _ := strings.Cut(wideToken, ".")
	_, narrowSig, _ := strings.Cut(narrowToken, ".")
	g, err := signer.Verifier().Verify(widePayload + "." + narrowSig)
	if err == nil {
		t.Fatalf("tampered grant verified: tools=%v", g.Tools)
	}
}

func TestLoadSignerSeed(t *testing.T) {
	seed := make([]byte, 32)
	for i := range seed {
		seed[i] = byte(i)
	}
	s, err := LoadSigner(base64.StdEncoding.EncodeToString(seed))
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	token, err := s.Sign(testGrant(time.Now().UTC()))
	if err != nil {
		t.Fatalf("sign: %v", err)
	}
	if _, err := s.Verifier().Verify(token); err != nil {
		t.Fatalf("verify: %v", err)
	}
	if _, err := LoadSigner("aGk="); err == nil {
		t.Errorf("short seed accepted")
	}
	if _, err := LoadSigner(""); err == nil {
		t.Errorf("empty seed accepted")
	}
	if _, err := LoadSigner("!!!not base64"); err == nil {
		t.Errorf("invalid base64 accepted")
	}
}
