# Deployment Tracker — API Specification

## Overview

Deployment Tracker 페이지에서 사용하는 API 목록입니다.  
Jira Fix Version에 포함된 티켓들이 GitHub에서 실제 배포되었는지 교차 검증합니다.

### 분석 플로우

1. Release Note Tracker와 동일한 Jira Space의 Fix Version 목록을 드롭다운으로 조회 (`GET /api/v1/jira-versions` 공유 사용)
2. 유저가 Version 선택 후 Run → AI가 Jira 티켓 ↔ GitHub PR 배포 상태 교차 검증
3. 완료된 분석이 이력 리스트에 추가되고, 행 클릭 시 상세 페이지에서 다시 확인 가능

---

## Endpoints

### 1. Jira Fix Version 목록 조회

Release Note Tracker와 동일한 엔드포인트를 공유합니다.

```
GET /api/v1/jira-versions
```

→ [`release-note-creator-api-spec.md` Endpoint 1 참고](./release-note-creator-api-spec.md)

---

### 2. 배포 분석 실행

**선택한 Jira Fix Version의 티켓들과 GitHub PR 배포 상태를 교차 검증합니다.**

```
POST /api/v1/deployments/run
```

#### Request Body

```json
{
  "jira_version_id": "aicp-0401"
}
```

| Field             | Type   | Required | Description                                    |
|-------------------|--------|----------|------------------------------------------------|
| `jira_version_id` | string | ✅        | `GET /api/v1/jira-versions`에서 반환된 Fix Version ID |

#### Response `201 Created`

```json
{
  "id": "dt-1745900000000",
  "version": "AICP Monthly 26-04-01",
  "run_at": "2026-04-29 14:30",
  "stats": {
    "total": 32,
    "with_pr": 26,
    "no_pr": 6,
    "merged": 26,
    "deployed_this": 24,
    "deployed_prev": 2,
    "unregistered_prs": 5
  },
  "repos": [
    "scope-dp-console (v4.8.0)",
    "scope-annotation-tool-front (v4.7.0)"
  ],
  "no_pr_tickets": ["RAD-9372", "RAD-9362"],
  "unregistered_pr_tickets": ["RAD-9241", "RAD-9242"],
  "unregistered_pr_breakdown": {
    "needed": 4,
    "not_needed": 2,
    "no_ticket": 3
  },
  "ticket_rows": [
    {
      "id": "RAD-9372",
      "title": "Add annotation batch export",
      "pr": null,
      "merged": null,
      "status": "no-pr"
    },
    {
      "id": "RAD-9100",
      "title": "Payment gateway webhook handler",
      "pr": "#1801",
      "merged": true,
      "status": "deployed-this"
    }
  ]
}
```

**상위 필드**

| Field                       | Type           | Description                                              |
|-----------------------------|----------------|----------------------------------------------------------|
| `id`                        | string         | 분석 이력 고유 ID                                         |
| `version`                   | string         | Fix Version명 (UI: Version 컬럼)                         |
| `run_at`                    | string         | 분석 실행 시각 `YYYY-MM-DD HH:mm` (UI: Run At 컬럼)      |
| `repos`                     | string[]       | 이번 릴리즈에 포함된 GitHub 레포 목록                      |
| `no_pr_tickets`             | string[]       | PR이 없는 Jira 티켓 ID 목록                               |
| `unregistered_pr_tickets`   | string[]       | Fix Version에 미등록된 PR과 연관된 Jira 티켓 ID 목록       |
| `unregistered_pr_breakdown` | object \| null | 미등록 PR 상세 분류 `{ needed, not_needed, no_ticket }`. 정보가 없으면 `null` |

**`stats` 객체**

| Field                   | Type | Description                                              |
|-------------------------|------|----------------------------------------------------------|
| `stats.total`           | int  | Fix Version 내 전체 티켓 수 (UI: Total 컬럼)              |
| `stats.with_pr`         | int  | PR이 연결된 티켓 수                                       |
| `stats.no_pr`           | int  | PR이 없는 티켓 수 (UI: No PR 컬럼)                        |
| `stats.merged`          | int  | Merge된 PR 수                                            |
| `stats.deployed_this`   | int  | 이번 릴리즈에서 배포된 티켓 수 (UI: Deployed 컬럼)         |
| `stats.deployed_prev`   | int  | 이전 릴리즈에서 이미 배포된 티켓 수                        |
| `stats.unregistered_prs`| int  | Fix Version에 등록되지 않은 PR 수 (UI: Unregistered 컬럼) |

**`ticket_rows[]` 항목**

API는 전체 티켓을 반환하며, 필터링은 클라이언트에서 처리합니다. UI 기본값은 모든 상태의 합집합(전체)입니다.

| Field              | Type           | Description                                                              |
|--------------------|----------------|--------------------------------------------------------------------------|
| `id`               | string         | Jira 티켓 ID (UI: Ticket 컬럼)                                            |
| `title`            | string         | 티켓 제목 (UI: Title 컬럼)                                                |
| `pr`               | string \| null | 연결된 GitHub PR 번호 (UI: PR 컬럼). 없으면 `null`                         |
| `merged`           | bool \| null   | PR merge 여부 (UI: Merged 컬럼). PR 없으면 `null`                         |
| `status`           | string         | `deployed_this` \| `deployed_prev` \| `no_pr` \| `unregistered` (UI: Deploy Status 컬럼) |

#### Error Responses

| Status | Code                    | Description                          |
|--------|-------------------------|--------------------------------------|
| `400`  | `MISSING_FIELD`         | 필수 필드 누락                         |
| `404`  | `JIRA_VERSION_NOT_FOUND`| 해당 Fix Version이 Jira에 존재하지 않음 |
| `502`  | `GITHUB_FETCH_FAIL`     | GitHub API 연동 실패                  |

---

### 3. 분석 이력 목록 조회

**StrongPM에서 실행한 배포 분석 이력을 최신순으로 반환합니다.**

```
GET /api/v1/deployments
```

#### Query Parameters

없음

#### Response `200 OK`

```json
{
  "deployments": [
    {
      "id": "dt-1745900000000",
      "version": "AICP Monthly 26-04-01",
      "run_at": "2026-04-29 14:30",
      "total": 32,
      "deployed_this": 24,
      "no_pr": 6,
      "unregistered_prs": 5
    }
  ]
}
```

| Field                           | Type   | Description                                        |
|---------------------------------|--------|----------------------------------------------------|
| `deployments`                   | array  | 분석 이력 목록 (최신순)                              |
| `deployments[].id`              | string | 분석 이력 고유 ID                                   |
| `deployments[].version`         | string | Fix Version명 (UI: Version 컬럼)                   |
| `deployments[].run_at`          | string | 실행 시각 `YYYY-MM-DD HH:mm` (UI: Run At 컬럼)     |
| `deployments[].total`           | int    | 전체 티켓 수 (UI: Total 컬럼)                       |
| `deployments[].deployed_this`   | int    | 이번 릴리즈 배포 티켓 수 (UI: Deployed 컬럼)         |
| `deployments[].no_pr`           | int    | PR 없는 티켓 수 (UI: No PR 컬럼)                   |
| `deployments[].unregistered_prs`| int    | 미등록 PR 수 (UI: Unregistered 컬럼)               |

---

### 4. 분석 상세 조회

**특정 분석 이력의 전체 결과를 반환합니다.**  
목록에서 행 클릭 시 상세 페이지 진입에 사용됩니다.

```
GET /api/v1/deployments/{id}
```

#### Path Parameters

| Parameter | Type   | Description      |
|-----------|--------|------------------|
| `id`      | string | 분석 이력 고유 ID |

#### Response `200 OK`

`POST /api/v1/deployments/run` 의 response와 동일한 구조를 반환합니다.

#### Error Responses

| Status | Code        | Description             |
|--------|-------------|-------------------------|
| `404`  | `NOT_FOUND` | 해당 ID의 이력이 없음    |

---

## 공통 타입 정의

| Type           | Values                                                            |
|----------------|-------------------------------------------------------------------|
| `DeployStatus` | `"deployed_this"` \| `"deployed_prev"` \| `"no_pr"` \| `"unregistered"` |
