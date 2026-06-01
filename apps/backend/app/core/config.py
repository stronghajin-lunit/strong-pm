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

    # Jira Ticket Writer — project key used when creating issues (default: RAD).
    JIRA_TICKET_PROJECT_KEY: str = "RAD"
    # Version Assignment — JQL project identifier for unversioned ticket search.
    # Can be a project key (e.g. "RAD") or name (e.g. "[AIP] Onco Space").
    JIRA_VERSION_ASSIGN_PROJECT: str = "RAD"
    # Board IDs per product for sprint lookup via Agile API.
    # Format: "ODM=123,Annotation Admin=456,Annotation Tool=789"
    JIRA_BOARD_IDS: str = ""

    # Sprint Report Creator — Onco board ID for sprint list + issue fetch.
    JIRA_SPRINT_BOARD_ID: int = 0
    # Confluence page used as few-shot example for AI generation.
    CONFLUENCE_SPRINT_EXAMPLE_PAGE_ID: str = "5400365750"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def jira_project_keys_list(self) -> list[str]:
        return [k.strip() for k in self.JIRA_PROJECT_KEYS.split(",") if k.strip()]

    @property
    def jira_board_ids_map(self) -> dict[str, int]:
        """Parse 'Product=boardId,...' into {product: boardId}."""
        result: dict[str, int] = {}
        for pair in self.JIRA_BOARD_IDS.split(","):
            pair = pair.strip()
            if "=" not in pair:
                continue
            product, _, board_id_str = pair.partition("=")
            try:
                result[product.strip()] = int(board_id_str.strip())
            except ValueError:
                continue
        return result


settings = Settings()
