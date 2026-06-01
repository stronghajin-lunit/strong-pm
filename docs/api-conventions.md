# API Conventions

## URL 구조

```
/api/v1/{resource}           # 목록 조회 (GET), 생성 (POST)
/api/v1/{resource}/{id}      # 단건 조회 (GET), 수정 (PATCH), 삭제 (DELETE)
```

- 리소스명: `snake_case` 복수형 (`/api/v1/user_profiles`)
- 버전: URL prefix (`/api/v1/`)

---

## 요청

- `GET` 파라미터: query string
- `POST` / `PATCH` 바디: JSON (`Content-Type: application/json`)
- `PATCH`: 부분 업데이트 (변경할 필드만 전송)

---

## 응답

### 성공

```json
// 단건
{
  "id": 1,
  "name": "example",
  "createdAt": "2024-01-01T00:00:00Z"
}

// 목록
{
  "items": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

### 에러

```json
{
  "detail": "에러 메시지",
  "code": "ERROR_CODE"
}
```

### HTTP 상태 코드

| 코드 | 상황 |
|------|------|
| 200 | 조회/수정 성공 |
| 201 | 생성 성공 |
| 204 | 삭제 성공 (바디 없음) |
| 400 | 잘못된 요청 |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 409 | 충돌 (중복 등) |
| 422 | 검증 실패 |
| 500 | 서버 에러 |
| 502 | 외부 서비스(업스트림) 호출 실패 (예: Jira) |

에러 `code` 예시:
- `JIRA_VERSION_NOT_FOUND` (404) — 존재하지 않는 Jira fix version
- `JIRA_UPSTREAM_ERROR` (502) — Jira 인증 실패/네트워크 오류 등 업스트림 장애
- `CONFLUENCE_UPSTREAM_ERROR` (502) — Confluence 발행 실패/설정 누락 등 업스트림 장애
- `AI_UPSTREAM_ERROR` (502) — Anthropic 호출 실패/키 누락 등 업스트림 장애
- `INVALID_CONFLUENCE_PAGE` (400), `NOT_FOUND` (404), `CONFLICT` (409)

---

## 외부 서비스 연동

| 서비스 | 상태 | 필요 환경변수 |
|--------|------|----------------|
| **Jira** (fix version/티켓 조회) | ✅ 실연동 (Atlassian Cloud REST v3) | `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEYS` |
| **Confluence** (릴리즈노트 발행) | ✅ 실연동 (Atlassian Cloud REST v2) | (인증은 Jira와 공유) `CONFLUENCE_SPACE_KEY`, `CONFLUENCE_ODM_PARENT_ID`, `CONFLUENCE_ANNOTATION_PARENT_ID` |
| **AI** (릴리즈노트 생성) | ✅ 실연동 (Anthropic Claude) | `ANTHROPIC_API_KEY`, `AI_MODEL`(기본 `claude-opus-4-8`) |
| GitHub (배포 PR 대조) | 🟡 mock | - |

- `JIRA_PROJECT_KEYS`: 쉼표 구분 (예: `RAD,ODM`)
- **Confluence는 Jira와 같은 Atlassian 자격증명**(`JIRA_BASE_URL`/`EMAIL`/`API_TOKEN`)을 재사용하고, `/wiki` 경로로 호출. 릴리즈노트는 지정 부모 페이지(odm/annotation) 아래 **새 자식 페이지**로 발행.
- 자격증명 미설정 시 호출은 `502 *_UPSTREAM_ERROR`로 실패 (mock 폴백 없음)

---

## 엔드포인트 목록

> 새 API 추가 시 여기에 반드시 추가합니다.

| 메서드 | 경로 | 설명 | 추가일 |
|--------|------|------|--------|
| GET | `/api/v1/health` | 헬스체크 | 2026-04 |
| GET | `/api/v1/jira-versions` | Jira fix version 목록(동기화) | 2026-04 |
| POST | `/api/v1/release-notes/run` | 릴리즈노트 생성+발행 | 2026-05 |
| GET | `/api/v1/release-notes` | 릴리즈노트 목록 | 2026-05 |
| PATCH | `/api/v1/release-notes/{id}/reflection` | 반영(회고) 1회 등록 | 2026-05 |
| POST | `/api/v1/deployments/run` | 티켓↔GitHub PR 배포 대조 | 2026-05 |
| GET | `/api/v1/deployments` | 배포 스냅샷 목록 | 2026-05 |
| GET | `/api/v1/deployments/{id}` | 배포 상세 | 2026-05 |
