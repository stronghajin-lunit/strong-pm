from collections import defaultdict
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.crud import sprint_report as sprint_report_crud
from app.integrations import ai, confluence, jira
from app.models.sprint_report import SprintReport
from app.schemas.sprint_report import (
    SprintOptionListResponse,
    SprintOptionResponse,
    SprintReportListResponse,
    SprintReportResponse,
    SprintReportRunRequest,
)
from app.utils import fmt_dt, fmt_dt_required
from app.utils.sprint_config import (
    classify_initiative_from_summary,
    clean_summary,
    extract_initiative,
    extract_sprint_number,
    is_dropped,
    normalize_engineer,
    normalize_epic,
    sprint_to_week,
)


def _parse_sprint_report_sections(raw: str) -> tuple[str, str]:
    """Split AI output into (sprint_summary_storage, key_deliverables_storage)."""
    summary_marker = "=== SPRINT_SUMMARY ==="
    deliverables_marker = "=== KEY_DELIVERABLES ==="

    s_start = raw.find(summary_marker)
    d_start = raw.find(deliverables_marker)

    if s_start == -1 or d_start == -1:
        # Fallback: treat entire output as sprint summary
        return raw.strip(), ""

    summary_content = raw[s_start + len(summary_marker):d_start].strip()
    deliverables_content = raw[d_start + len(deliverables_marker):].strip()
    return summary_content, deliverables_content


def _make_sr_id(db_id: int) -> str:
    return f"sr-{db_id}"


def _to_response(report: SprintReport) -> SprintReportResponse:
    return SprintReportResponse(
        id=_make_sr_id(report.id),
        sprint_label=report.sprint_label,
        requested_at=fmt_dt_required(report.requested_at),
        completed_at=fmt_dt(report.completed_at),
        status=report.status,
        confluence_url=report.confluence_url,
    )


def _require_sprint_board() -> int:
    board_id = settings.JIRA_SPRINT_BOARD_ID
    if not board_id:
        raise HTTPException(status_code=502, detail={"code": "JIRA_UPSTREAM_ERROR"})
    return board_id


async def list_sprints() -> SprintOptionListResponse:
    board_id = _require_sprint_board()
    sprints = await jira.fetch_sprints_for_report(board_id=board_id)

    options: list[SprintOptionResponse] = []
    for s in sprints:
        sprint_number = extract_sprint_number(s.label) or 0
        options.append(
            SprintOptionResponse(
                sprint_id=s.sprint_id,
                sprint_number=sprint_number,
                label=s.label,
                status=s.state,
            )
        )
    return SprintOptionListResponse(sprints=options)


async def run(db: AsyncSession, body: SprintReportRunRequest) -> SprintReportResponse:
    try:
        page_id = confluence.extract_page_id_from_url(body.confluence_page_url)
    except Exception:
        raise HTTPException(status_code=400, detail={"code": "INVALID_CONFLUENCE_URL"})

    week_number = sprint_to_week(body.sprint_number)

    # ── 1. Fetch sprint issues ──────────────────────────────────────────────
    issues = await jira.fetch_sprint_issues(body.sprint_id)
    active_issues = [i for i in issues if not is_dropped(i.status)]

    # ── 2. Resolve initiatives (cache per epic key) ─────────────────────────
    epic_initiative_cache: dict[str, str] = {}

    async def get_initiative(epic_key: str | None, summary: str) -> str:
        if not epic_key:
            return classify_initiative_from_summary(summary)
        if epic_key not in epic_initiative_cache:
            raw = await jira.resolve_initiative_from_epic(epic_key)
            if raw:
                epic_initiative_cache[epic_key] = extract_initiative(raw)
            else:
                epic_initiative_cache[epic_key] = classify_initiative_from_summary(summary)
        return epic_initiative_cache[epic_key]

    # ── 3. Normalize and group ──────────────────────────────────────────────
    # group key: (initiative, normalized_epic)
    groups: dict[tuple[str, str], dict] = defaultdict(lambda: {
        "summaries": [],
        "story_count": 0,
        "task_count": 0,
        "story_points": 0.0,
        "contributor_sp": defaultdict(float),
    })

    for issue in active_issues:
        initiative = await get_initiative(issue.epic_key, issue.summary)
        epic_name = normalize_epic(issue.epic_summary or issue.epic_key or "—")
        key = (initiative, epic_name)

        g = groups[key]
        g["summaries"].append(clean_summary(issue.summary))

        if issue.issue_type == "Story":
            g["story_count"] += 1
        else:
            g["task_count"] += 1

        sp = issue.story_points or 0.0
        g["story_points"] += sp

        if issue.assignee_name:
            short = normalize_engineer(issue.assignee_name)
            g["contributor_sp"][short] += sp

    total_sp = sum(g["story_points"] for g in groups.values())

    grouped_data: list[dict] = []
    for (initiative, epic), g in groups.items():
        contributors_sorted = sorted(
            g["contributor_sp"].items(), key=lambda x: x[1], reverse=True
        )
        grouped_data.append({
            "initiative": initiative,
            "epic": epic,
            "summaries": g["summaries"],
            "story_count": g["story_count"],
            "task_count": g["task_count"],
            "story_points": g["story_points"],
            "contributors": [name for name, _ in contributors_sorted],
        })

    # ── 4. Fetch few-shot example ───────────────────────────────────────────
    example_storage = ""
    if settings.CONFLUENCE_SPRINT_EXAMPLE_PAGE_ID.strip():
        try:
            example_storage = await confluence.fetch_page_storage(
                settings.CONFLUENCE_SPRINT_EXAMPLE_PAGE_ID
            )
        except Exception:
            pass  # non-fatal: proceed without example

    # ── 5. Generate two sections via AI ────────────────────────────────────
    raw_output = await ai.generate_sprint_report(
        sprint_label=body.sprint_label,
        week_number=week_number,
        grouped_data=grouped_data,
        total_sp=total_sp,
        example_page_storage=example_storage,
    )

    # Parse the two delimited sections from AI output
    sprint_summary_storage, key_deliverables_storage = _parse_sprint_report_sections(raw_output)

    # ── 6. Prepend Sprint Completion Rate (if sp_goal provided) ────────────────
    if body.sp_goal:
        rate = round(total_sp / body.sp_goal * 100, 1)
        completion_prefix = (
            '<p><ac:structured-macro ac:name="status" ac:schema-version="1">'
            '<ac:parameter ac:name="colour">Green</ac:parameter>'
            '<ac:parameter ac:name="title">Sprint Completion Rate</ac:parameter>'
            f"</ac:structured-macro> {rate}%</p>"
        )
        sprint_summary_storage = completion_prefix + sprint_summary_storage

    # ── 7. Update only Sprint Summary + Key Deliverables on the Confluence page
    result = await confluence.update_sprint_report(
        page_id=page_id,
        sprint_summary_storage=sprint_summary_storage,
        key_deliverables_storage=key_deliverables_storage,
    )

    # ── 7. Save run record ──────────────────────────────────────────────────
    now = datetime.now(UTC)
    report = await sprint_report_crud.create(
        db,
        sprint_label=body.sprint_label,
        sprint_number=body.sprint_number,
        status="done",
        confluence_url=result.confluence_url,
        requested_at=now,
        completed_at=now,
    )
    await db.commit()
    return _to_response(report)


async def list_reports(db: AsyncSession) -> SprintReportListResponse:
    reports = await sprint_report_crud.list_all(db)
    return SprintReportListResponse(reports=[_to_response(r) for r in reports])
