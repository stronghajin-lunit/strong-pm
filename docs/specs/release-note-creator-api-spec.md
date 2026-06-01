# Release Note Creator — API Specification

## Overview

Release Note Creator 페이지에서 사용하는 API 목록입니다.  
Jira Fix Version을 선택하면 AI가 해당 릴리즈의 티켓들을 바탕으로 사전 정의된 Confluence 템플릿을 채워 publish합니다.

### 생성 플로우

1. 사전 설정된 Jira Space의 Fix Version 목록을 드롭다운으로 조회
2. Confluence Parent Page는 시스템에서 2개 고정 제공 (프론트 정적 관리)
3. 유저가 Version + Page 선택 후 Run → AI가 티켓 내용으로 Confluence 템플릿을 채워 publish
4. 완료된 작업이 리스트에 표시됨 (StrongPM에서 생성한 이력만)

---

## Endpoints

### 1. Jira Fix Version 목록 조회

**사전 설정된 Jira Space에서 Fix Version 목록을 가져옵니다.**  
생성 폼의 "Jira Version" 드롭다운에 사용됩니다.

```
GET /api/v1/jira-versions
```

#### Query Parameters

없음

#### Response `200 OK`

```json
{
  "versions": [
    { "id": "aicp-0401", "label": "AICP Monthly 26-04-01" },
    { "id": "odm-0401",  "label": "ODM Monthly 26-04-01" },
    { "id": "aicp-0301", "label": "AICP Monthly 26-03-01" }
  ]
}
```

| Field               | Type   | Description                        |
|---------------------|--------|------------------------------------|
| `versions`          | array  | Jira Fix Version 목록 (최신순)      |
| `versions[].id`     | string | Fix Version 고유 ID                 |
| `versions[].label`  | string | 화면에 표시되는 Fix Version명        |

#### Error Responses

| Status | Code                  | Description                    |
|--------|-----------------------|--------------------------------|
| `502`  | `JIRA_FETCH_FAIL`     | Jira API 연동 실패              |

---

### 2. 릴리즈 노트 생성 실행

**선택한 Jira Fix Version의 티켓들을 바탕으로 AI가 Confluence 템플릿을 채워 publish합니다.**

```
POST /api/v1/release-notes/run
```

#### Request Body

```json
{
  "jira_version_id": "aicp-0401",
  "confluence_page": "aicp"
}
```

| Field               | Type   | Required | Description                                                          |
|---------------------|--------|----------|----------------------------------------------------------------------|
| `jira_version_id`   | string | ✅        | `GET /api/v1/jira-versions`에서 반환된 Fix Version ID                |
| `confluence_page`   | string | ✅        | 업로드할 Confluence Parent Page. `odm` \| `annotation` (시스템 고정 2종)   |

#### Response `201 Created`

```json
{
  "id": "rn-1745900000000",
  "jira_version": "AICP Monthly 26-04-01",
  "confluence_location": "AIP / AICP Release Notes / 2026",
  "requested_at": "2026-04-29 14:30",
  "completed_at": "2026-04-29 14:33",
  "status": "done",
  "confluence_url": "https://lunit.atlassian.net/wiki/spaces/..."
}
```

| Field                 | Type           | Description                                        |
|-----------------------|----------------|----------------------------------------------------|
| `id`                  | string         | 실행 이력 고유 ID                                   |
| `jira_version`        | string         | Fix Version명 (UI: Jira Version 컬럼)              |
| `confluence_location` | string         | publish된 Confluence 페이지 경로 (UI: Confluence Location 컬럼) |
| `requested_at`        | string         | 요청 시각 `YYYY-MM-DD HH:mm` (UI: Requested 컬럼)  |
| `completed_at`        | string \| null | 완료 시각 `YYYY-MM-DD HH:mm` (UI: Completed 컬럼). 진행 중이면 `null` |
| `status`              | string         | `running` \| `done` \| `error` (UI: Status 컬럼)  |
| `confluence_url`      | string \| null | publish된 Confluence 페이지 URL (UI: Link 컬럼). 실패 시 `null` |

#### Error Responses

| Status | Code                    | Description                          |
|--------|-------------------------|--------------------------------------|
| `400`  | `MISSING_FIELD`         | 필수 필드 누락                         |
| `400`  | `INVALID_CONFLUENCE_PAGE` | 유효하지 않은 `confluence_page` 값   |
| `404`  | `JIRA_VERSION_NOT_FOUND`| 해당 Fix Version이 Jira에 존재하지 않음 |
| `500`  | `AI_GENERATION_FAIL`    | AI 릴리즈 노트 생성 실패               |
| `502`  | `CONFLUENCE_PUBLISH_FAIL`| Confluence publish 실패              |

---

### 3. 생성 이력 목록 조회

**StrongPM에서 생성한 릴리즈 노트 이력 목록을 최신순으로 반환합니다.**

```
GET /api/v1/release-notes
```

#### Query Parameters

없음

#### Response `200 OK`

```json
{
  "notes": [
    {
      "id": "rn-1",
      "jira_version": "AICP Monthly 26-03-01",
      "confluence_location": "AIP / AICP Release Notes / 2026",
      "requested_at": "2026-03-21 14:02",
      "completed_at": "2026-03-21 14:05",
      "status": "done",
      "confluence_url": "https://lunit.atlassian.net/wiki/spaces/...",
      "reflection": "버그 픽스 항목 서술 방식 변경. 다음 릴리즈부터 PR 링크 포함."
    }
  ]
}
```

| Field                        | Type           | Description                                                         |
|------------------------------|----------------|---------------------------------------------------------------------|
| `notes`                      | array          | StrongPM 생성 이력 목록 (최신순)                                     |
| `notes[].id`                 | string         | 이력 고유 ID                                                         |
| `notes[].jira_version`       | string         | Fix Version명 (UI: Jira Version 컬럼)                               |
| `notes[].confluence_location`| string         | Confluence 페이지 경로 (UI: Confluence Location 컬럼)               |
| `notes[].requested_at`       | string         | 요청 시각 `YYYY-MM-DD HH:mm` (UI: Requested 컬럼)                   |
| `notes[].completed_at`       | string \| null | 완료 시각 `YYYY-MM-DD HH:mm` (UI: Completed 컬럼). 미완료 시 `null`  |
| `notes[].status`             | string         | `running` \| `done` \| `error` (UI: Status 컬럼)                   |
| `notes[].confluence_url`     | string \| null | Confluence 페이지 URL (UI: Link 컬럼). 실패 시 `null`               |
| `notes[].reflection`         | string \| null | 적용된 피드백 메모 (UI: Applied 아코디언). 없으면 `null`              |

---

### 4. 피드백 메모 저장 (Apply)

**생성된 릴리즈 노트에 대한 피드백 메모를 저장합니다.**  
UI의 "Apply" 버튼 → Chat Panel에서 작성 확정 시 호출됩니다. 한 번 저장 후 수정 불가.

```
PATCH /api/v1/release-notes/{id}/reflection
```

#### Path Parameters

| Parameter | Type   | Description         |
|-----------|--------|---------------------|
| `id`      | string | 릴리즈 노트 이력 ID  |

#### Request Body

```json
{
  "reflection": "버그 픽스 항목 서술 방식 변경. 다음 릴리즈부터 PR 링크 포함."
}
```

| Field        | Type   | Required | Description          |
|--------------|--------|----------|----------------------|
| `reflection` | string | ✅        | 저장할 피드백 메모 내용 |

#### Response `200 OK`

```json
{
  "id": "rn-1",
  "reflection": "버그 픽스 항목 서술 방식 변경. 다음 릴리즈부터 PR 링크 포함."
}
```

#### Error Responses

| Status | Code        | Description                              |
|--------|-------------|------------------------------------------|
| `404`  | `NOT_FOUND` | 해당 ID의 이력이 없음                     |
| `409`  | `CONFLICT`  | 이미 피드백이 저장됨 (중복 저장 불가)      |

---

## 공통 타입 정의

| Type                | Values                                |
|---------------------|---------------------------------------|
| `ReleaseRunStatus`  | `"running"` \| `"done"` \| `"error"` |
| `ConfluencePage`    | `"odm"` (Oncology Data Manager Release Notes) \| `"annotation"` (Annotation Admin & Tool Release Notes) |
