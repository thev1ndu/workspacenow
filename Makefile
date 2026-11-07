# WorkspaceNow root Makefile — run the whole local stack from the repo root.
#
#   make setup    create .env from .env.example (first run; edit it to set MISTRAL_API_KEY etc.)
#   make up       start infra + the full app (console :8088, API :8080, Temporal UI :8233, observer :9098)
#   make down     stop everything (named volumes are kept)
#
# Component-level targets (tests, codegen, lint) live in each service's own Makefile.

COMPOSE := docker compose -f deploy/compose/docker-compose.yml --env-file .env

.PHONY: help setup up down deps build ps logs clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-8s %s\n", $$1, $$2}'

setup: ## Create .env from .env.example if missing (edit it afterwards)
	@test -f .env || cp .env.example .env
	@echo ".env ready — set MISTRAL_API_KEY in it for real agent runs"

up: setup ## Start the full local stack (infra + apps) and wait for readiness
	$(COMPOSE) --profile app up -d --wait
	@echo "console http://localhost:8088 | api http://localhost:8080 | temporal UI http://localhost:8233 | observer http://localhost:9098"

deps: setup ## Start only the infrastructure (postgres, valkey, nats, temporal, minio, openbao)
	$(COMPOSE) up -d --wait

build: setup ## Build the four app images locally instead of pulling from GHCR
	$(COMPOSE) --profile app build

down: ## Stop the stack (volumes kept; `make clean` removes them)
	$(COMPOSE) --profile app down

ps: ## Show container status
	$(COMPOSE) --profile app ps

logs: ## Follow all app logs
	$(COMPOSE) --profile app logs -f

clean: ## Stop the stack and delete its volumes (postgres data, minio, nats, temporal, observer)
	$(COMPOSE) --profile app down -v
