LOCAL_DB_URL = postgresql+asyncpg://dev:devpass@localhost:5432/strongpm

.PHONY: migrate migrate-down backend frontend logs

# Run Alembic migrations (works whether or not the backend Docker container is running)
migrate:
	@if docker ps --format '{{.Names}}' | grep -q '^strongpm-backend$$'; then \
		echo "→ Running migration inside strongpm-backend container"; \
		docker exec strongpm-backend uv run alembic upgrade head; \
	else \
		echo "→ Backend container not running — using localhost DB"; \
		cd apps/backend && DATABASE_URL=$(LOCAL_DB_URL) uv run alembic upgrade head; \
	fi

migrate-down:
	@if docker ps --format '{{.Names}}' | grep -q '^strongpm-backend$$'; then \
		docker exec strongpm-backend uv run alembic downgrade -1; \
	else \
		cd apps/backend && DATABASE_URL=$(LOCAL_DB_URL) uv run alembic downgrade -1; \
	fi

# Start everything via Docker (postgres + backend:8000 + frontend:3000)
dev:
	docker compose -f docker/docker-compose.dev.yml up -d
	@echo "→ frontend: http://localhost:3000"
	@echo "→ backend:  http://localhost:8000"

# Stop all containers
down:
	docker compose -f docker/docker-compose.dev.yml down

# Restart backend container only (picks up code changes)
restart-backend:
	docker compose -f docker/docker-compose.dev.yml restart backend

# Run backend/frontend locally (outside Docker) — for debugging
backend:
	cd apps/backend && uv run uvicorn app.main:app --reload --port 8000

frontend:
	cd apps/frontend && npm run dev

# Tail backend logs (Docker)
logs:
	docker logs strongpm-backend -f --tail 100
