# wsn-observer: telemetry ingest and query API. Run targets from this directory.

VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)

.PHONY: help build test vet fmt check run

help: ## List targets
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-18s %s\n", $$1, $$2}'

build: ## Build the observer binary
	go build -ldflags "-X github.com/thev1ndu/workspacenow/wsn-observer/config.Version=$(VERSION)" -o bin/wsn-observer .

test: ## Run the unit tests with the race detector
	go test -race ./...

vet: ## Run go vet
	go vet ./...

fmt: ## Format the code
	gofmt -w .

check: ## Fail if anything is unformatted
	test -z "$$(gofmt -l .)"

run: ## Run the observer (reads .env via the environment)
	go run .
