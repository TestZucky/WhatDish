# WhatDish — dev tasks. Run `make` (or `make help`) to see everything.
SHELL := /bin/bash

BACKEND_DIR  := backend
FRONTEND_DIR := frontend
VENV         := $(BACKEND_DIR)/.venv
PY           := $(VENV)/bin/python
PIP          := $(VENV)/bin/pip
UVICORN      := $(VENV)/bin/uvicorn
PORT         := 8000

# Free the API port if a stale process is holding it (avoids "Address already in use").
FREE_PORT = lsof -tiTCP:$(PORT) -sTCP:LISTEN 2>/dev/null | xargs kill -9 2>/dev/null || true

.DEFAULT_GOAL := help
.PHONY: help install install-backend install-frontend hooks backend frontend dev build start test clean

help: ## Show this help
	@echo "WhatDish — available commands:"
	@echo
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "First time?  Run 'make install', add your OpenAI key to backend/.env.local, then 'make dev'."

install: install-backend install-frontend hooks ## First-time setup: install backend + frontend + git hooks
	@echo
	@echo "✅ Setup complete."
	@echo "   1. Add your OpenAI key to  $(BACKEND_DIR)/.env.local   (OPENAI_API_KEY=sk-...)"
	@echo "      (optional — it runs in demo mode without one)"
	@echo "   2. Start everything with   make dev"

install-backend: $(VENV) ## Create the Python venv, install deps, and seed backend/.env.local
	$(PIP) install --upgrade pip -q
	$(PIP) install -q -r $(BACKEND_DIR)/requirements.txt
	@test -f $(BACKEND_DIR)/.env.local \
		|| { cp $(BACKEND_DIR)/.env.example $(BACKEND_DIR)/.env.local; echo "→ created $(BACKEND_DIR)/.env.local (add your OPENAI_API_KEY)"; }

$(VENV):
	python3 -m venv $(VENV)

install-frontend: ## Install frontend deps (per-env config lives in .env.development / .env.production)
	cd $(FRONTEND_DIR) && npm install

hooks: ## Enable git pre-commit hooks (scoped pytest + typecheck on staged changes)
	git config core.hooksPath .githooks
	@chmod +x .githooks/pre-commit
	@echo "→ git hooks enabled (core.hooksPath=.githooks). Bypass a run with 'git commit --no-verify'."

backend: ## Run the API in DEV on http://localhost:8000 (reload, cheap models)
	@$(FREE_PORT)
	APP_ENV=development $(UVICORN) app.main:app --reload --port $(PORT) --app-dir $(BACKEND_DIR)

frontend: ## Run the web app in DEV on http://localhost:5173
	cd $(FRONTEND_DIR) && npm run dev

dev: ## Run backend + frontend together in DEV (Ctrl-C stops both)
	@$(FREE_PORT)
	@trap 'kill 0' INT TERM EXIT; \
	APP_ENV=development $(UVICORN) app.main:app --reload --port $(PORT) --app-dir $(BACKEND_DIR) & \
	( cd $(FRONTEND_DIR) && npm run dev ) & \
	wait

build: ## Build the frontend for PRODUCTION (uses .env.production)
	cd $(FRONTEND_DIR) && npm run build

start: ## Run the API in PRODUCTION (no reload, real model, docs off)
	@$(FREE_PORT)
	APP_ENV=production $(UVICORN) app.main:app --host 0.0.0.0 --port $(PORT) --app-dir $(BACKEND_DIR)

test: ## Run backend unit tests
	$(PIP) install -q -r $(BACKEND_DIR)/requirements-dev.txt
	$(VENV)/bin/pytest $(BACKEND_DIR)/tests -q

clean: ## Remove the venv, node_modules, and build output
	rm -rf $(VENV) $(FRONTEND_DIR)/node_modules $(FRONTEND_DIR)/dist
	@echo "→ cleaned. Run 'make install' to set up again."
