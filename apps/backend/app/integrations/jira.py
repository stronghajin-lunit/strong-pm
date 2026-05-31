from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class JiraVersionData:
    jira_id: str
    label: str
    synced_at: datetime


@dataclass
class JiraTicketData:
    ticket_id: str
    title: str


async def fetch_fix_versions() -> list[JiraVersionData]:
    """Mock: returns Jira Fix Version list."""
    now = datetime.now(timezone.utc)
    return [
        JiraVersionData("aicp-0401", "AICP Monthly 26-04-01", now),
        JiraVersionData("odm-0401", "ODM Monthly 26-04-01", now),
        JiraVersionData("aicp-0301", "AICP Monthly 26-03-01", now),
    ]


async def fetch_tickets_by_version(jira_version_id: str) -> list[JiraTicketData] | None:
    """Mock: returns ticket list for a Fix Version. None if version not found."""
    _tickets: dict[str, list[JiraTicketData]] = {
        "aicp-0401": [
            JiraTicketData("RAD-9372", "Add annotation batch export"),
            JiraTicketData("RAD-9362", "Fix label rendering on retina display"),
            JiraTicketData("RAD-9100", "Payment gateway webhook handler"),
            JiraTicketData("RAD-9241", "Refactor dataset pipeline"),
            JiraTicketData("RAD-9242", "Improve model inference latency"),
            JiraTicketData("RAD-9300", "Add multi-language support"),
        ],
        "odm-0401": [
            JiraTicketData("ODM-1001", "Export DICOM metadata to CSV"),
            JiraTicketData("ODM-1002", "Fix pagination bug in study list"),
            JiraTicketData("ODM-1003", "Update study sharing permissions"),
        ],
        "aicp-0301": [
            JiraTicketData("RAD-8900", "Integrate new AI model v3"),
            JiraTicketData("RAD-8901", "Fix timeout on large image load"),
            JiraTicketData("RAD-8902", "Add audit log for admin actions"),
        ],
    }
    return _tickets.get(jira_version_id)
