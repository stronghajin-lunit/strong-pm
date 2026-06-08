"""Jira ticket generation rules (mirrors jira-ticket-writer-config.yaml)."""

# Area detection keywords — checked in priority order
_AREA_KEYWORDS: list[tuple[str, list[str]]] = [
    ("UI + API Integration", ["connection", "integrate", "hook up", "wire", "link UI"]),
    ("API Integration", ["API integration", "connect API", "call API"]),
    ("API", ["API", "endpoint", "backend", "model", "CRUD", "migration", "script", "CLI"]),
    ("UI", ["page", "UI", "component", "button", "modal", "form", "table", "filter", "design"]),
]

# Product → Area → labels
_LABEL_MAPPING: dict[str, dict[str, list[str]]] = {
    "ODM": {
        "API": ["BE", "oncology-odm", "AIP"],
        "UI": ["FE", "oncology-odm", "AIP"],
        "UI + API Integration": ["FE", "oncology-odm", "AIP"],
        "API Integration": ["FE", "oncology-odm", "AIP"],
    },
    "Annotation Admin": {
        "API": ["BE", "scope-dp-annotation-manager", "AIP"],
        "UI": ["FE", "scope-dp-console", "AIP"],
        "UI + API Integration": ["FE", "scope-dp-console", "AIP"],
        "API Integration": ["FE", "scope-dp-console", "AIP"],
    },
    "Annotation Tool": {
        "API": ["BE", "scope-dp-annotation-manager", "AIP"],
        "UI": ["FE", "scope-annotation-tool-front", "AIP"],
        "UI + API Integration": ["FE", "scope-annotation-tool-front", "AIP"],
        "API Integration": ["FE", "scope-annotation-tool-front", "AIP"],
    },
}

# Special labels appended when feature description contains these keywords
_SPECIAL_LABELS: list[dict[str, object]] = [
    {
        "keywords": ["auth", "login", "JWT", "token", "permission", "role", "RBAC"],
        "label": "scope-dp-auth-manager",
    },
    {
        "keywords": ["image server", "tiling", "tile", "DZI", "OpenSlide", "signed URL", "GCS"],
        "label": "scope-dp-image-server",
    },
]


def detect_area(feature_description: str) -> str:
    """Return area inferred from feature_description keywords. Defaults to 'UI'."""
    text_lower = feature_description.lower()
    for area, keywords in _AREA_KEYWORDS:
        if any(kw.lower() in text_lower for kw in keywords):
            return area
    return "UI"


def get_labels(product: str, area: str, feature_description: str) -> list[str]:
    """Return Jira labels for this ticket."""
    labels: list[str] = list(_LABEL_MAPPING.get(product, {}).get(area, []))
    text_lower = feature_description.lower()
    for special in _SPECIAL_LABELS:
        keywords = special["keywords"]
        label = special["label"]
        assert isinstance(keywords, list)
        assert isinstance(label, str)
        if any(kw.lower() in text_lower for kw in keywords) and label not in labels:
            labels.append(label)
    return labels


def format_description(
    feature_description: str,
    definition_of_done: str,
    issue_type: str,
) -> str:
    """Format Jira description body from template."""
    dod_items = [line.strip() for line in definition_of_done.strip().splitlines() if line.strip()]
    dod_block = "\n".join(
        line if line.startswith("- [") else f"- [ ] {line}" for line in dod_items
    )

    if issue_type.lower() == "bug":
        return (
            f"Current behaviour\n{feature_description.strip()}\n\n"
            f"Expected behaviour\n{dod_block}"
        )
    return f"Context\n{feature_description.strip()}\n\nDoD\n{dod_block}"
