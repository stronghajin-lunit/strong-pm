"""Sprint report generation rules (mirrors sprint-report-config.yaml)."""

import re

# Engineer full name (lower) → short name
_ENGINEER_NAMES: dict[str, str] = {
    "công cảnh phan": "Canh",
    "priscila power": "Pri",
    "hajin lee": "Hajin",
    "yiseul kwon": "Yiseul",
    "alana domit bittar": "Alana",
    "wilson chen": "Wilson",
}

# Epic names to merge into Bug Fixes & Improvements
_MERGE_TO_BUGFIXES: set[str] = {
    "[ONCO] Improvement Wishlist",
    "Bugfixes",
}

# Epic name renames
_EPIC_RENAMES: dict[str, str] = {
    "[Onco] Customer Request 2026": "Customer Request",
}

# Initiative fallback patterns (keyword → initiative)
_INITIATIVE_PATTERNS: list[tuple[str, str]] = [
    ("review effort", "Review Effort"),
    ("spike", "Spike / Research"),
    ("release prep", "Release Preparation"),
]

# Dropped statuses (excluded from summary)
_DROPPED_STATUSES: set[str] = {"dropped"}

# Initiative regex: strip leading [...]
_INITIATIVE_RE = re.compile(r"\[.*?\]\s*(.+)")

# Summary prefix patterns to strip before display
_SUMMARY_PREFIX_PATTERNS = [
    # "ODM > API > ", "Annotation Admin > UI > " etc.
    re.compile(r"^[^>]+>\s*[^>]+>\s*"),
    # "[Customer Request] - ", "[ONCO] - ", "[Tag]: "
    re.compile(r"^\[.*?\]\s*[-:]\s*"),
    # "[Tag] " standalone bracket prefix
    re.compile(r"^\[.*?\]\s+"),
]

# Sprint number → Week number
_SPRINT_BASE = 75
_WEEK_BASE = 11


def sprint_to_week(sprint_number: int) -> int:
    return _WEEK_BASE + (sprint_number - _SPRINT_BASE) * 2


def extract_sprint_number(sprint_label: str) -> int | None:
    """Extract number from 'Onco Sprint 80' → 80."""
    m = re.search(r"\d+", sprint_label)
    return int(m.group()) if m else None


def normalize_engineer(full_name: str) -> str:
    """Map full name to short name. Falls back to first name."""
    key = full_name.lower().strip()
    if key in _ENGINEER_NAMES:
        return _ENGINEER_NAMES[key]
    return full_name.split()[0].capitalize() if full_name else full_name


def normalize_epic(epic_summary: str) -> str:
    """Apply epic merge/rename rules."""
    if epic_summary in _MERGE_TO_BUGFIXES:
        return "Bug Fixes & Improvements"
    return _EPIC_RENAMES.get(epic_summary, epic_summary)


def clean_summary(summary: str) -> str:
    """Strip common Jira ticket prefixes (product/area path, bracket tags)."""
    for pattern in _SUMMARY_PREFIX_PATTERNS:
        cleaned = pattern.sub("", summary).strip()
        if cleaned and cleaned != summary:
            return cleaned
    return summary


def extract_initiative(pm_parent_summary: str) -> str:
    """Strip [] prefix from PM parent epic summary."""
    m = _INITIATIVE_RE.match(pm_parent_summary.strip())
    return m.group(1).strip() if m else pm_parent_summary.strip()


def classify_initiative_from_summary(summary: str) -> str:
    """Infer initiative from ticket summary when PM chain unavailable."""
    lower = summary.lower()
    for keyword, initiative in _INITIATIVE_PATTERNS:
        if keyword in lower:
            return initiative
    # PM ticket chain not resolved — leave blank rather than guessing
    return ""


def is_dropped(status: str) -> bool:
    return status.lower() in _DROPPED_STATUSES
