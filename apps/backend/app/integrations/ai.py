from dataclasses import dataclass

from app.integrations.jira import JiraTicketData


@dataclass
class ReleaseNoteContent:
    body: str


async def generate_release_note(
    jira_version_label: str,
    tickets: list[JiraTicketData],
) -> ReleaseNoteContent:
    """Mock: generates release note content from Jira tickets using AI."""
    ticket_lines = "\n".join(f"- {t.ticket_id}: {t.title}" for t in tickets)
    body = f"## {jira_version_label}\n\n### Changes\n\n{ticket_lines}\n"
    return ReleaseNoteContent(body=body)
