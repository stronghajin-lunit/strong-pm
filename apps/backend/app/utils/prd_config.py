"""PRD Writer config rules (mirrors prd-writer-config.yaml)."""

# ─── Team SOP ─────────────────────────────────────────────────────────────────

TEAMS: list[dict[str, str]] = [
    {
        "key": "MS_Team",
        "label": "MS Team (Medical Science)",
        "description": "Defines annotation scope and label criteria; performs slide/grid selection and verification.",
    },
    {
        "key": "MDM_Team",
        "label": "MDM Team (Master Data Management)",
        "description": "Responsible for data acquisition, ODM registration (slide/block/TMA), usage assignment, annotation job creation, and dataset export.",
    },
    {
        "key": "BMRS_Team",
        "label": "BMRS Team (Biomedical Research Support)",
        "description": "Performs artifact analysis and IHC masking using the Annotation Tool.",
    },
    {
        "key": "CR_Team",
        "label": "CR Team (Clinical Research)",
        "description": "Coordinates hospital data transfer to the platform.",
    },
    {
        "key": "OCELOT_Team",
        "label": "OCELOT Team (Computational Pathology)",
        "description": "Defines slide/grid selection criteria, develops models, and generates computational grids.",
    },
    {
        "key": "AIP_PM_Team",
        "label": "AIP PM Team (AI Platform Product Management)",
        "description": "Plans features and requirements for Annotation Admin, Annotation Tool, and ODM.",
    },
    {
        "key": "SysEng",
        "label": "SysEng (Systems Engineering)",
        "description": "Manages cloud/IDC infrastructure and backup operations.",
    },
    {
        "key": "External_Annotator",
        "label": "External Annotator Group",
        "description": (
            "External annotators accessing the Annotation Tool for assigned jobs; "
            "includes pre-registered users from partner institutions."
        ),
    },
]

TEAM_LABELS = [t["label"] for t in TEAMS]


def get_team_description(label: str) -> str | None:
    for t in TEAMS:
        if t["label"] == label or t["key"] == label:
            return t["description"]
    return None


def get_teams_description(labels: list[str]) -> str:
    """Return combined description for multiple teams."""
    parts = []
    for label in labels:
        desc = get_team_description(label)
        if desc:
            parts.append(f"{label}: {desc}")
    return "; ".join(parts)


# ─── Product → Repo mapping ────────────────────────────────────────────────────

PRODUCT_REPOS: dict[str, list[str]] = {
    "ODM": ["aip-oncology", "oncology-data-management"],
    "Annotation Admin": ["scope-dp-annotation-manager", "scope-dp-console"],
    "Annotation Tool": ["scope-dp-annotation-manager", "scope-annotation-tool-front"],
}

SHARED_REPOS = ["scope-dp-auth-manager", "scope-dp-image-server"]


def get_repos_for_products(product_names: list[str]) -> list[str]:
    repos: list[str] = []
    for product in product_names:
        for repo in PRODUCT_REPOS.get(product, []):
            if repo not in repos:
                repos.append(repo)
    return repos


# ─── Repo index (condensed) ────────────────────────────────────────────────────

REPO_INDEX: dict[str, dict[str, str]] = {
    "aip-oncology": {
        "focus": "Slide/Block/TMA management, AI inference pipeline, license management REST API (ODM Backend)",
        "tech": "Python 3.11, FastAPI, PostgreSQL, SQLAlchemy 2.x async",
        "key_terms": "WSI, TMA, tissue block, physical slide, inference package, inference request, license, staining method, antibody",
    },
    "oncology-data-management": {
        "focus": "WSI registration, management, review, and tagging web SPA (ODM Frontend)",
        "tech": "TypeScript 5, React 18, TanStack Router/Query",
        "key_terms": "block registration, TMA core, slide review, OpenSeadragon",
    },
    "scope-dp-annotation-manager": {
        "focus": "Annotation workflow lifecycle management API (Annotation Backend)",
        "tech": "Python 3.11, Django 5, DRF, Celery+Redis",
        "key_terms": "annotation job, QC record, auto-QC, inference correction, grid overlay, job queue, corroboration",
    },
    "scope-dp-console": {
        "focus": "Annotation job management/QC/inference review admin console (Annotation Admin)",
        "tech": "TypeScript 5, Next.js 14, React 18, MUI 5",
        "key_terms": "annotation job, QC job, inference check, bulk slide tag, job queue",
    },
    "scope-annotation-tool-front": {
        "focus": "Pathology image annotation tool for annotators (Annotation Tool)",
        "tech": "TypeScript 5, React 18, Redux+Saga, OpenSeadragon",
        "key_terms": "brush/paint, polygon, autosave, idle detection, inference check, time tracker",
    },
    "scope-dp-auth-manager": {
        "focus": "JWT authentication, user/group CRUD, RBAC management (Auth API)",
        "tech": "Python 3.11, FastAPI, PostgreSQL",
        "key_terms": "JWK, RBAC, UserQualification, soft-delete",
    },
    "scope-dp-image-server": {
        "focus": "WSI image reading, processing, serving microservice (Image API)",
        "tech": "Python 3.11, FastAPI, OpenSlide, GCS",
        "key_terms": "DZI, MPP, tiling, signed URL, OpenSlide",
    },
}


def build_repo_context(repos: list[str]) -> str:
    """Return a condensed repo context string for AI prompt injection."""
    lines: list[str] = []
    for repo in repos:
        info = REPO_INDEX.get(repo)
        if info:
            lines.append(
                f"[{repo}]\n"
                f"  Focus: {info['focus']}\n"
                f"  Tech: {info['tech']}\n"
                f"  Key terms: {info['key_terms']}"
            )
    return "\n\n".join(lines)


# ─── PRD generation rules ──────────────────────────────────────────────────────

PRD_TEMPLATE_PAGE_ID = "3945599175"
KICKOFF_TEMPLATE_PAGE_ID = "5398726280"

# Confluence sections the AI must fill (headings to find and replace)
PRD_SECTIONS_TO_FILL = [
    "Background",
    "Goal",
    "In Scope",
    "Out of Scope",
    "Target User",
    "User Story",
    "Requirements",
    "Appendix. Terminology",
]

# PRD generation terminology rules
AVOID_TERMS = {
    "page": "UI",
    "Develop": "Build or Implement",
    "Create page": "Build UI",
    "Make": "(use specific verb)",
    "AICP": "Annotation Admin",
}
