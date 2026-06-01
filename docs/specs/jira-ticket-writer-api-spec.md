# Jira Ticket Writer — API Specification

## Overview

Jira Ticket Writer 페이지에서 사용하는 API 목록입니다.  
AI를 통해 Feature Description과 DoD를 기반으로 Jira 티켓을 자동 생성합니다.

---

## Endpoints

### 1. Jira 티켓 생성 실행

**입력 정보를 기반으로 AI가 Jira 티켓을 생성하고, 생성 이력 레코드를 반환합니다.**

```
POST /api/v1/jira-tickets/run
```

#### Request Body

```json
{
  "product": "ODM",
  "sprint": "Onco Sprint 77",
  "type": "Task",
  "feature_description": "Add a license field to the block registration form. License options are selectable via dropdown, and the selected value is sent to POST /api/v1/blocks as license_id.",
  "definition_of_done": "The license dropdown is displayed on the block registration form. The selected license_id is sent to POST /api/v1/blocks."
}
```

| Field                 | Type   | Required | Description                                          |
|-----------------------|--------|----------|------------------------------------------------------|
| `product`             | string | ✅        | 제품명. `ODM` \| `Annotation Admin` \| `Annotation Tool` |
| `sprint`              | string | ✅        | 스프린트명 (프론트에서 정적 목록으로 관리)               |
| `type`                | string | ✅        | 티켓 유형. `Task` \| `Bug`                            |
| `feature_description` | string | ✅        | 기능 설명 (자유 텍스트)                                 |
| `definition_of_done`  | string | ✅        | 완료 조건 (자유 텍스트)                                 |

#### Response `201 Created`

```json
{
  "id": "jt-1745900000000",
  "summary": "ODM > ... > Add a license field to the block registration form.",
  "product": "ODM",
  "sprint": "Onco Sprint 77",
  "type": "Task",
  "requested_at": "2026-04-29 14:30",
  "status": "done",
  "jira_url": "https://lunit.atlassian.net/browse/RAD-9400"
}
```

| Field          | Type           | Description                              |
|----------------|----------------|------------------------------------------|
| `id`           | string         | 실행 이력 고유 ID                          |
| `summary`      | string         | 티켓 제목 요약 (`{product} > ... > {첫줄}`) |
| `product`      | string         | 제품명                                    |
| `sprint`       | string         | 스프린트명                                 |
| `type`         | string         | `Task` \| `Bug`                          |
| `requested_at` | string         | 실행 요청 시각 (`YYYY-MM-DD HH:mm`)       |
| `status`       | string         | `running` \| `done` \| `error`           |
| `jira_url`     | string \| null | 생성된 Jira 티켓 URL. 실패 시 `null`      |

#### Error Responses

| Status | Code                 | Description              |
|--------|----------------------|--------------------------|
| `400`  | `MISSING_FIELD`      | 필수 필드 누락             |
| `400`  | `INVALID_PRODUCT`    | 유효하지 않은 product 값   |
| `500`  | `AI_GENERATION_FAIL` | AI 티켓 생성 실패          |

---

### 2. 생성 이력 목록 조회

**Jira 티켓 생성 이력 목록을 최신순으로 반환합니다.**

```
GET /api/v1/jira-tickets/tickets
```

#### Query Parameters

없음

#### Response `200 OK`

```json
{
  "tickets": [
    {
      "id": "jt-1",
      "summary": "ODM > UI + API Integration > Add license field to Block registration",
      "product": "ODM",
      "sprint": "Onco Sprint 77",
      "type": "Task",
      "requested_at": "2026-04-11 10:15",
      "status": "done",
      "jira_url": "https://lunit.atlassian.net/browse/RAD-9400"
    }
  ]
}
```

| Field                    | Type           | Description                                       |
|--------------------------|----------------|---------------------------------------------------|
| `tickets`                | array          | 생성 이력 목록 (최신순)                              |
| `tickets[].id`           | string         | 이력 고유 ID                                       |
| `tickets[].summary`      | string         | 티켓 제목 요약 (UI: Summary 컬럼)                   |
| `tickets[].product`      | string         | 제품명 (UI에 미표시, 상세/필터 용도)                  |
| `tickets[].sprint`       | string         | 스프린트명 (UI: Sprint 컬럼)                        |
| `tickets[].type`         | string         | `Task` \| `Bug` (UI: Type 컬럼)                   |
| `tickets[].requested_at` | string         | 요청 시각 `YYYY-MM-DD HH:mm` (UI: Requested 컬럼)  |
| `tickets[].status`       | string         | `running` \| `done` \| `error` (UI: Status 컬럼)  |
| `tickets[].jira_url`     | string \| null | Jira 티켓 URL (UI: Link 컬럼), 실패 시 `null`      |

---

## 공통 타입 정의

| Type                 | Values                                                  |
|----------------------|---------------------------------------------------------|
| `JiraProduct`        | `"ODM"` \| `"Annotation Admin"` \| `"Annotation Tool"` |
| `JiraTicketType`     | `"Task"` \| `"Bug"`                                    |
| `JiraTicketRunStatus`| `"running"` \| `"done"` \| `"error"`                   |
