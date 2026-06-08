"""Feature List Writer config rules (mirrors feature-list-writer-config.yaml)."""

# ─── Feature table columns ─────────────────────────────────────────────────────

FEATURE_COLUMNS = ["id", "feature_category", "feature_name", "description",
                   "priority", "complexity", "dependencies", "note"]

# ─── Priority → Confluence Status macro colour ────────────────────────────────

PRIORITY_COLOURS = {
    "Must Have": "Red",
    "Should Have": "Yellow",
    "Nice to Have": "Green",
}

COMPLEXITY_VALUES = ["S", "M", "L"]
PRIORITY_VALUES = list(PRIORITY_COLOURS.keys())

# ─── Overview fields (order matches template) ──────────────────────────────────

OVERVIEW_FIELDS = [
    "project_name",
    "system_function",
    "related_prd",
    "background",
    "goal",
    # "status" is intentionally excluded — never overwrite the checkbox task-list
]

OVERVIEW_LABEL_MAP = {
    "project name": "project_name",
    "system / function": "system_function",
    "system/function": "system_function",
    "related prd": "related_prd",
    "background": "background",
    "goal": "goal",
}

# ─── Source collection ─────────────────────────────────────────────────────────

EXCLUDE_PAGE_KEYWORDS = ["Feature List"]


def should_exclude_page(title: str) -> bool:
    """Return True if a page should be excluded from source collection."""
    lower = title.lower()
    return any(kw.lower() in lower for kw in EXCLUDE_PAGE_KEYWORDS)


# ─── Priority Status macro builder ────────────────────────────────────────────

def build_priority_macro(priority: str) -> str:
    colour = PRIORITY_COLOURS.get(priority, "Grey")
    return (
        f'<ac:structured-macro ac:name="status" ac:schema-version="1">'
        f'<ac:parameter ac:name="colour">{colour}</ac:parameter>'
        f'<ac:parameter ac:name="title">{priority}</ac:parameter>'
        f"</ac:structured-macro>"
    )
