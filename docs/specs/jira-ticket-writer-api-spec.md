# Jira Ticket Writer — API Specification

## Overview

Jira Ticket Writer 페이지에서 사용하는 API 목록입니다.  
AI를 통해 Feature Description과 DoD를 기반으로 Jira 티켓을 자동 생성하고, 선택한 스프린트에 할당합니다.

---

## Endpoints

### 1. 스프린트 목록 조회

**선택한 제품(product)에 해당하는 보드의 active/future 스프린트를 반환합니다.**

```
GET /api/v1/jira-tickets/sprints?product={product}
```

#### Query Parameters

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `product` | string | ✅        | `ODM` \| `Annotation Admin` \| `Annotation Tool` |

#### Response `200 OK`

```json
{
  "sprints": [
    { "sprint_id": 101, "label": "Onco Sprint 79", "state": "active" },
    { "sprint_id": 100, "label": "Onco Sprint 78", "state": "future" }
  ]
}
```

| Field              | Type   | Description |
|--------------------|--------|-------------|
| `sprints[].sprint_id` | int | Jira Agile 스프린트 ID |
| `sprints[].label`  | string | 스프린트 이름 |
| `sprints[].state`  | string | `active` \| `future` |

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| `400` | `INVALID_PRODUCT` | 유효하지 않은 product 값 |
| `502` | `JIRA_UPSTREAM_ERROR` | JIRA_BOARD_IDS 미설정 또는 Agile API 호출 실패 |

---

### 2. Jira 티켓 생성 실행

**입력 정보를 기반으로 AI가 티켓 내용을 생성하고 Jira에 이슈를 생성한 후 지정 스프린트에 할당합니다.**

```
POST /api/v1/jira-tickets/run
```

#### Request Body

```json
{
  "product": "ODM",
  "sprint_id": 101,
  "sprint": "Onco Sprint 79",
  "type": "Task",
  "feature_description": "Add a license field to the block registration form.",
  "definition_of_done": "The license dropdown is displayed on the block registration form."
}
```

| Field                 | Type   | Required | Description |
|-----------------------|--------|----------|-------------|
| `product`             | string | ✅        | `ODM` \| `Annotation Admin` \| `Annotation Tool` |
| `sprint_id`           | int    | ✅        | Jira 스프린트 ID (`GET /jira-tickets/sprints`에서 획득) |
| `sprint`              | string | ✅        | 스프린트 레이블 (이력 표시용) |
| `type`                | string | ✅        | `Task` \| `Bug` |
| `feature_description` | string | ✅        | 기능 설명 (자유 텍스트) |
| `definition_of_done`  | string | ✅        | 완료 조건 (자유 텍스트) |

#### Response `201 Created`

```json
{
  "id": "jt-1",
  "summary": "ODM > Add a license field to the block registration form",
  "product": "ODM",
  "sprint": "Onco Sprint 79",
  "type": "Task",
  "requested_at": "2026-06-01 14:30",
  "status": "done",
  "jira_url": "https://lunit.atlassian.net/browse/RAD-9400"
}
```

| Field          | Type           | Description |
|----------------|----------------|-------------|
| `id`           | string         | 실행 이력 고유 ID (`jt-{db_id}` 형태) |
| `summary`      | string         | AI가 생성한 티켓 제목 |
| `product`      | string         | 제품명 |
| `sprint`       | string         | 스프린트 레이블 |
| `type`         | string         | `Task` \| `Bug` |
| `requested_at` | string         | 요청 시각 (`YYYY-MM-DD HH:mm`, KST) |
| `status`       | string         | `running` \| `done` \| `error` |
| `jira_url`     | string \| null | 생성된 Jira 이슈 URL. 실패 시 `null` |

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| `400` | `INVALID_PRODUCT` | 유효하지 않은 product 값 |
| `400` | `INVALID_ISSUE_TYPE` | `Task`/`Bug` 외의 type |
| `422` | — | 필수 필드 누락 (FastAPI 기본 검증) |
| `502` | `JIRA_UPSTREAM_ERROR` | Jira 이슈 생성/스프린트 할당 실패 또는 JIRA_BOARD_IDS 미설정 |
| `502` | `AI_UPSTREAM_ERROR` | Anthropic 호출 실패 또는 ANTHROPIC_API_KEY 미설정 |

---

### 3. 생성 이력 목록 조회

**Jira 티켓 생성 이력 목록을 최신순으로 반환합니다.**

```
GET /api/v1/jira-tickets
```

#### Response `200 OK`

```json
{
  "tickets": [
    {
      "id": "jt-1",
      "summary": "ODM > Add license field to Block registration",
      "product": "ODM",
      "sprint": "Onco Sprint 79",
      "type": "Task",
      "requested_at": "2026-06-01 10:15",
      "status": "done",
      "jira_url": "https://lunit.atlassian.net/browse/RAD-9400"
    }
  ]
}
```

| Field                    | Type           | Description |
|--------------------------|----------------|-------------|
| `tickets`                | array          | 생성 이력 목록 (최신순) |
| `tickets[].id`           | string         | 이력 고유 ID |
| `tickets[].summary`      | string         | AI 생성 티켓 제목 (UI: Summary 컬럼) |
| `tickets[].product`      | string         | 제품명 |
| `tickets[].sprint`       | string         | 스프린트 레이블 (UI: Sprint 컬럼) |
| `tickets[].type`         | string         | `Task` \| `Bug` (UI: Type 컬럼) |
| `tickets[].requested_at` | string         | 요청 시각 `YYYY-MM-DD HH:mm` KST (UI: Requested 컬럼) |
| `tickets[].status`       | string         | `running` \| `done` \| `error` (UI: Status 컬럼) |
| `tickets[].jira_url`     | string \| null | Jira 이슈 URL (UI: Link 컬럼), 실패 시 `null` |

---

## 환경변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `JIRA_TICKET_PROJECT_KEY` | Jira 이슈 생성 시 사용할 프로젝트 키 | `RAD` |
| `JIRA_BOARD_IDS` | product→boardId 매핑 (`ODM=123,Annotation Admin=456,Annotation Tool=789`) | 없음 (필수) |
| `ANTHROPIC_API_KEY` | AI 티켓 생성에 사용 | 없음 (필수) |
| `AI_MODEL` | 사용할 Claude 모델 | `claude-opus-4-8` |

---

## 공통 타입 정의

| Type                 | Values |
|----------------------|--------|
| `JiraProduct`        | `"ODM"` \| `"Annotation Admin"` \| `"Annotation Tool"` |
| `JiraTicketType`     | `"Task"` \| `"Bug"` |
| `JiraTicketRunStatus`| `"running"` \| `"done"` \| `"error"` |
