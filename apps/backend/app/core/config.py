from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    APP_ENV: str = "development"
    DEBUG: bool = True

    DATABASE_URL: str = "postgresql+asyncpg://dev:devpass@localhost:5432/strongpm"

    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # Jira (Atlassian Cloud). Empty by default so the app/tests import without
    # secrets; presence is enforced at first real use in app.integrations.jira.
    JIRA_BASE_URL: str = ""
    JIRA_EMAIL: str = ""
    JIRA_API_TOKEN: str = ""
    # Comma-separated project keys (kept as str to avoid pydantic-settings
    # JSON-decoding a list-typed env var). Parsed via jira_project_keys_list.
    JIRA_PROJECT_KEYS: str = ""

    # Confluence (Atlassian Cloud). Reuses JIRA_BASE_URL/EMAIL/API_TOKEN for the
    # site host and auth; only the publish target differs (one space, a parent
    # page per release-note type).
    CONFLUENCE_SPACE_KEY: str = ""
    CONFLUENCE_ODM_PARENT_ID: str = ""
    CONFLUENCE_ANNOTATION_PARENT_ID: str = ""

    # AI (Anthropic Claude) — release-note generation.
    ANTHROPIC_API_KEY: str = ""
    AI_MODEL: str = "claude-opus-4-8"
    # Optional Anthropic-compatible gateway base URL; empty = public Anthropic API.
    ANTHROPIC_BASE_URL: str = ""

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def jira_project_keys_list(self) -> list[str]:
        return [k.strip() for k in self.JIRA_PROJECT_KEYS.split(",") if k.strip()]


settings = Settings()
