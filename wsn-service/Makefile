# WorkspaceNow platform. Run targets from this directory.

VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
COMPOSE := docker compose -f ../deploy/compose/docker-compose.yml
OAPI_CODEGEN := go run github.com/oapi-codegen/oapi-codegen/v2/cmd/oapi-codegen@v2.6.0
GOLANGCI_LINT := go run github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.14.0
MOQ := go run github.com/matryer/moq@latest

.PHONY: help generate build test test-integration lint fmt run migrate deps deps-down seed-export

help: ## List targets
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-18s %s\n", $$1, $$2}'

generate: ## Regenerate API code from ../openapi.yaml, the 501 fallback and mocks
	$(OAPI_CODEGEN) -config api/oapi-codegen.yaml ../openapi.yaml
	sh scripts/gen-unimplemented.sh
	go install github.com/matryer/moq@latest
	PATH="$$PATH:$$(go env GOPATH)/bin" go generate ./internal/...

build: ## Build the platform binary
	go build -ldflags "-X github.com/thev1ndu/workspacenow/wsn-service/config.Version=$(VERSION)" -o bin/wsn-service .

test: ## Unit tests
	go test -race -covermode=atomic ./...

test-integration: ## Integration tests against the compose database (make deps first)
	go test -race -tags=integration ./...

lint: ## golangci-lint
	$(GOLANGCI_LINT) run ./...

fmt: ## Format
	gofmt -w $$(find . -name '*.go' -not -path './internal/oapi/*')

run: ## Run the API server with .env
	set -a; [ -f .env ] && . ./.env; set +a; go run . -migrate

migrate: ## Apply migrations with .env and exit
	set -a; [ -f .env ] && . ./.env; set +a; go run . -migrate -server=false

deps: ## Start local infrastructure (postgres, valkey, nats, temporal, minio, openbao)
	$(COMPOSE) up -d --wait

deps-down: ## Stop local infrastructure
	$(COMPOSE) down

seed-export: ## Re-export the demo seed from the console mock
	node scripts/export-seed.mjs
