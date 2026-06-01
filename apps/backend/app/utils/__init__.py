from datetime import UTC, datetime
from zoneinfo import ZoneInfo

_KST = ZoneInfo("Asia/Seoul")


def fmt_dt(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(_KST).strftime("%Y-%m-%d %H:%M")


def fmt_dt_required(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(_KST).strftime("%Y-%m-%d %H:%M")


def make_rn_id(db_id: int) -> str:
    return f"rn-{db_id}"


def parse_rn_id(id: str) -> int:
    return int(id.removeprefix("rn-"))


def make_dt_id(db_id: int) -> str:
    return f"dt-{db_id}"


def parse_dt_id(id: str) -> int:
    return int(id.removeprefix("dt-"))


def make_jt_id(db_id: int) -> str:
    return f"jt-{db_id}"


def parse_jt_id(id: str) -> int:
    return int(id.removeprefix("jt-"))
