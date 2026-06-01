# Sprint Report Creator — API Specification

## Overview

Sprint Report Creator 페이지에서 사용하는 API 목록입니다.  
Jira 스프린트 데이터를 수집하고 AI가 Confluence 스프린트 리포트를 생성 및 발행합니다.

### 생성 플로우

1. Jira Agile API에서 Onco Sprint 목록 조회 (active + recent closed)
2. 유저가 스프린트 선택 후 Run
3. 선택 스프린트의 이슈 전체 수집 (dropped 제외)
4. 각 이슈에서 Initiative 추출 (RAD Epic → PM 티켓 → Parent Epic Summary의 `[]` 제거)
5. Engineer 이름 정규화, Epic 이름 정규화, Story Points 집계
6. AI가 few-shot 예시(기존 Confluence 템플릿 페이지) 참조해 리포트 생성
7. Confluence `AIP` space에 발행 (페이지 제목: `Week{n} Sprint {sprint_no} Report`)
8. 이력 저장 및 반환

### Sprint → Week 번호 계산

```
week = 11 + (sprint_number - 75) * 2
예: Sprint 75 = Week11, Sprint 76 = Week13, Sprint 79 = Week19
```

---

## Endpoints

### 1. 스프린트 목록 조회

**Jira Agile API에서 active 및 최근 closed 스프린트 목록을 반환합니다.**

```
GET /api/v1/sprint-reports/sprints
```

#### Query Parameters

없음

#### Response `200 OK`

```json
{
  "sprints": [
    { "sprint_id": 324, "sprint_number": 80, "label": "Onco Sprint 80", "status": "active" },
    { "sprint_id": 323, "sprint_number": 79, "label": "Onco Sprint 79", "status": "closed" },
    { "sprint_id": 322, "sprint_number": 78, "label": "Onco Sprint 78", "status": "closed" }
  ]
}
```

| Field                   | Type   | Description |
|-------------------------|--------|-------------|
| `sprints[].sprint_id`   | int    | Jira Agile 스프린트 ID |
| `sprints[].sprint_number` | int  | 스프린트 번호 (Confluence Week 계산에 사용) |
| `sprints[].label`       | string | 화면 표시용 이름 (`Onco Sprint {n}`) |
| `sprints[].status`      | string | `active` \| `closed` |

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| `502` | `JIRA_UPSTREAM_ERROR` | Jira Agile API 호출 실패 또는 JIRA_BOARD_IDS 미설정 |

---

### 2. 스프린트 리포트 생성 실행

**선택한 스프린트의 Jira 데이터를 수집하고 AI로 리포트를 생성해 Confluence에 발행합니다.**

```
POST /api/v1/sprint-reports/run
```

#### Request Body

```json
{
  "sprint_id": 324,
  "sprint_number": 80,
  "sprint_label": "Onco Sprint 80"
}
```

| Field           | Type   | Required | Description |
|-----------------|--------|----------|-------------|
| `sprint_id`     | int    | ✅        | Jira 스프린트 ID |
| `sprint_number` | int    | ✅        | 스프린트 번호 (Week 계산용) |
| `sprint_label`  | string | ✅        | 스프린트 레이블 (이력 표시용) |

#### Response `201 Created`

```json
{
  "id": "sr-1",
  "sprint_label": "Onco Sprint 80",
  "requested_at": "2026-06-01 14:30",
  "completed_at": "2026-06-01 14:33",
  "status": "done",
  "confluence_url": "https://lunit.atlassian.net/wiki/spaces/AIP/pages/..."
}
```

| Field             | Type           | Description |
|-------------------|----------------|-------------|
| `id`              | string         | 실행 이력 고유 ID (`sr-{db_id}`) |
| `sprint_label`    | string         | 스프린트 레이블 (UI: Jira Sprint 컬럼) |
| `requested_at`    | string         | 요청 시각 `YYYY-MM-DD HH:mm` KST |
| `completed_at`    | string \| null | 완료 시각. 진행 중이면 `null` |
| `status`          | string         | `running` \| `done` \| `error` |
| `confluence_url`  | string \| null | 발행된 Confluence 페이지 URL. 실패 시 `null` |

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| `422` | — | 필수 필드 누락 |
| `502` | `JIRA_UPSTREAM_ERROR` | Jira 데이터 수집 실패 |
| `502` | `AI_UPSTREAM_ERROR` | AI 리포트 생성 실패 |
| `502` | `CONFLUENCE_UPSTREAM_ERROR` | Confluence 발행 실패 |

---

### 3. 생성 이력 목록 조회

**스프린트 리포트 생성 이력을 최신순으로 반환합니다.**

```
GET /api/v1/sprint-reports
```

#### Response `200 OK`

```json
{
  "reports": [
    {
      "id": "sr-1",
      "sprint_label": "Onco Sprint 80",
      "requested_at": "2026-06-01 14:30",
      "completed_at": "2026-06-01 14:33",
      "status": "done",
      "confluence_url": "https://lunit.atlassian.net/wiki/spaces/AIP/pages/..."
    }
  ]
}
```

| Field                       | Type           | Description |
|-----------------------------|----------------|-------------|
| `reports`                   | array          | 이력 목록 (최신순) |
| `reports[].id`              | string         | 이력 ID |
| `reports[].sprint_label`    | string         | 스프린트 레이블 (UI: Jira Sprint 컬럼) |
| `reports[].requested_at`    | string         | 요청 시각 (UI: Requested 컬럼) |
| `reports[].completed_at`    | string \| null | 완료 시각 (UI: Completed 컬럼) |
| `reports[].status`          | string         | `running` \| `done` \| `error` (UI: Status 컬럼) |
| `reports[].confluence_url`  | string \| null | Confluence URL (UI: Link 컬럼) |

---

## 생성 로직 상세

### Initiative 추출

```
RAD 이슈 → Epic Link → RAD Epic
→ "implements" 링크 → PM 티켓
→ PM 티켓의 Parent Epic Summary
→ 정규식 \[.*?\]\s*(.+) 로 [] 제거
예: "[Onco] Regulation & Governance" → "Regulation & Governance"
```

Initiative 없는 경우 키워드 기반 자동 분류:
- "review effort" 포함 → `Review Effort`
- "spike" 포함 → `Spike / Research`
- "release prep" 포함 → `Release Preparation`
- 그 외 → `Bug Fixes & Improvements`

### Epic 정규화

| 원본 | 정규화 |
|------|--------|
| `[ONCO] Improvement Wishlist` | `Bug Fixes & Improvements` |
| `Bugfixes` | `Bug Fixes & Improvements` |
| `[Onco] Customer Request 2026` | `Customer Request` |

### Sprint Summary 테이블 컬럼

| 컬럼 | 설명 |
|------|------|
| Initiative | Epic의 상위 PM Initiative |
| Epic | RAD Epic 이름 (정규화 적용) |
| Summary | 이슈 제목 (terminology 규칙 적용) |
| Story / Task Count | 이슈 수 |
| Story Points | 합계 SP |
| % of Planned Capacity | SP 기준 비율 |
| Main Contributors | 담당 엔지니어 (short name 사용) |

### 엔지니어 이름 매핑

| Full name | Short name |
|-----------|------------|
| Công Cảnh Phan | Canh |
| Priscila Power | Pri |
| Hajin Lee | Hajin |
| Yiseul Kwon | Yiseul |
| Alana Domit Bittar | Alana |
| Wilson Chen | Wilson |
| (위에 없는 경우) | First name 사용 |

---

## 환경변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `JIRA_BOARD_IDS` | 보드 ID 매핑 (Ticket Writer와 공유) | 없음 (필수) |
| `CONFLUENCE_SPRINT_PARENT_ID` | 스프린트 리포트 발행 대상 부모 페이지 ID | 없음 (필수) |
| `CONFLUENCE_SPRINT_EXAMPLE_PAGE_ID` | few-shot 참조용 예시 페이지 ID | `5400365750` |

---

## 공통 타입

| Type | Values |
|------|--------|
| `SprintStatus` | `"active"` \| `"closed"` |
| `SprintReportRunStatus` | `"running"` \| `"done"` \| `"error"` |
