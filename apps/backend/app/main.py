from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.integrations import ai, confluence, jira
from app.integrations.ai import AIIntegrationError
from app.integrations.confluence import ConfluenceIntegrationError
from app.integrations.jira import JiraIntegrationError


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    yield
    await jira.aclose()
    await confluence.aclose()
    await ai.aclose()


app = FastAPI(
    title="StrongPM API",
    version="0.1.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(JiraIntegrationError)
async def jira_integration_error_handler(
    request: Request, exc: JiraIntegrationError
) -> JSONResponse:
    return JSONResponse(status_code=502, content={"detail": {"code": "JIRA_UPSTREAM_ERROR"}})


@app.exception_handler(ConfluenceIntegrationError)
async def confluence_integration_error_handler(
    request: Request, exc: ConfluenceIntegrationError
) -> JSONResponse:
    return JSONResponse(status_code=502, content={"detail": {"code": "CONFLUENCE_UPSTREAM_ERROR"}})


@app.exception_handler(AIIntegrationError)
async def ai_integration_error_handler(request: Request, exc: AIIntegrationError) -> JSONResponse:
    return JSONResponse(status_code=502, content={"detail": {"code": "AI_UPSTREAM_ERROR"}})


app.include_router(api_router, prefix="/api/v1")
