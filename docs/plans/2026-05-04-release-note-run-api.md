# POST /api/v1/release-notes/run — 로직 초안 & 작업 지시서

작성일: 2026-05-04  
대상 브랜치: `feature/ui-prd-jira-writer`  
참고 문서: `/Users/hajinlee/automation/release/release_note_generator.md`

---

## 현재 상태 (as-is)

```
Request → validate → Jira(mock, ticket_id+title만) 
       → AI(mock, 단순 목록) → Confluence(mock, URL 생성만) 
       → DB 저장 → Response
```

**문제점:**
- Jira: ticket_id, title만 수집 (IssueType, Status, Epic, Assignee 없음)
- AI: 실제 AI 호출 없음 — 티켓 목록을 단순 나열만 함
- Confluence: 실제 페이지 생성 없음 — mock URL만 반환

---

## 목표 로직 (to-be)

### 전체 흐름

```
[1] 입력 검증
      ↓
[2] Product 감지 (version name prefix → AICP / ODM)
      ↓
[3] Jira 이슈 조회 (JQL + full field: IssueType, Status, Epic, Assignee)
      ↓
[4] DB upsert (tickets, version)
      ↓
[5] AI 생성 (Epic별 그룹핑 → 카테고리 분류 → Confluence 본문 생성)
      ↓
[6] Confluence 페이지 생성 (실제 API 호출)
      ↓
[7] DB 저장 (release_note 레코드)
      ↓
[8] Response 반환
```

---

### [1] 입력 검증

```python
# Request body
{
  "jira_version_id": "aicp-0401",   # Jira Fix Version ID
  "confluence_page": "annotation"   # "annotation" | "odm"
}
```

- `confluence_page` ∉ `{"annotation", "odm"}` → 400 `INVALID_CONFLUENCE_PAGE`
- Jira version 조회 실패 → 404 `JIRA_VERSION_NOT_FOUND`

---

### [2] Product 감지

version label의 prefix로 product 결정:

| Prefix | Product | Jira Project Key | Confluence 부모 페이지 ID |
|--------|---------|-----------------|--------------------------|
| `AICP` | Annotation Admin | `AICP` | `5118918776` |
| `ODM`  | ODM | `ODM` | `5120884774` |

- prefix 불명확 시 → `confluence_page` 파라미터 기준으로 fallback

---

### [3] Jira 이슈 조회

**JQL:**
```
project = "{PROJECT_KEY}" AND fixVersion = "{VERSION_NAME}" ORDER BY issuetype ASC
```

**수집 필드 (현재 대비 추가 필요):**

| 필드 | 현재 | 추가 필요 |
|------|------|----------|
| Key (ticket_id) | ✅ | - |
| Summary (title) | ✅ | - |
| Issue Type | ❌ | `Story` / `Bug` / `Task` |
| Status | ❌ | `Done` / `In Progress` 등 |
| Epic 이름 | ❌ | Epic Link 또는 Parent Epic |
| Assignee | ❌ | full name |

**기존 `JiraTicketData` 확장:**
```python
@dataclass
class JiraTicketData:
    ticket_id: str
    title: str
    issue_type: str        # "Story" | "Bug" | "Task"
    status: str            # "Done" | "In Progress" ...
    epic_name: str | None  # Epic 이름 (없으면 None)
    assignee: str | None   # full name
```

---

### [4] DB upsert

현재 `jira_tickets` 테이블은 `ticket_id`, `title`만 저장.  
새 필드 저장 방식은 아래 두 가지 중 선택 필요:

**옵션 A** (권장): `jira_tickets` 테이블에 컬럼 추가
```
issue_type: str | None
status: str | None
epic_name: str | None
assignee: str | None
```

**옵션 B**: AI 입력용으로만 메모리에서 처리, DB에는 저장하지 않음

→ 이번 작업은 **옵션 B**로 진행 (DB 스키마 변경 최소화, 추후 필요 시 A로 전환)

---

### [5] AI 생성

**입력:**
```python
{
  "version_label": "AICP Monthly 26-04-01",
  "tickets": [
    {
      "ticket_id": "AICP-123",
      "title": "Add annotation batch export",
      "issue_type": "Story",
      "status": "Done",
      "epic_name": "Batch Processing",
      "assignee": "Jane Doe"
    },
    ...
  ]
}
```

**AI 처리 단계:**

1. **Epic별 그룹핑**: `epic_name` 기준으로 티켓 묶기 (None이면 "Uncategorized")
2. **카테고리 분류**:
   - `New Features`: 신규 Epic 또는 Story/Task 위주
     - Bug 타입이 포함된 경우: 티켓 내용 확인 후 deprecated/제거면 Bug Fix로 이동
   - `Improvements`: 기존 기능 개선 (UX, 성능)
   - `Bug Fix`: Bug 타입 이슈
   - `Removed`: 필드/기능 제거 (별도 감지 필요)
3. **민감 항목 감지** (아래 항목 있으면 별도 섹션 추가):
   - API endpoint / URL 변경 → `⚠️ API Endpoint Changed` 블록 (Old → New)
   - 권한(RBAC/Permission) 변경 → 본문 최상단 `⚠️ Important: RBAC` 섹션
   - 기능 제거/필드 삭제 → `Removed` 카테고리 추가
   - 기능 이동(앱 간 이전) → "previously in X, now only in Y"
   - 신규 attribute → bullet 끝 `(New)` 표기
   - Known Issues → `Known Issues` 섹션
   - 로그아웃/브라우저 초기화 필요 → `Action Required` 섹션
   - 데이터 유실 위험 → 최상단 굵은 글씨 경고

**작성 스타일:**
- 동사로 시작: `Added`, `Updated`, `Fixed`, `Improved`, `Removed`, `Introduced`, `Enabled`, `Restricted`
- 관련 티켓은 1 bullet로 통합 (API + UI 세트 → 한 문장)
- 내부/인프라성 변경 제외 (패키지 업데이트, dependency 변경 등)
- Jira Key는 노출하지 않음
- bullet은 간결하게 (핵심 기능명 위주)

**출력 (Confluence 본문):**
```
## Overview Table
  - Release: Jira 버전 URL (inline smart link)
  - Date: <time datetime="YYYY-MM-DD"> 매크로
  - Version: {VERSION_NAME}

## Highlights
  {전체 요약 2-3문장}

  ### New Features
  **[Epic/Feature Name]**
  - Background: ... (신규 Epic이면 why 설명)
  - Added ...

  ### Improvements
  **[Feature Name]**
  - Improved ...

  ### Bug Fix
  **[Bug Name]**
  - Fixed ...

## Impact & Considerations
  ### Affected Modules
  | App | Changes |
  ...

  ### Compatibility / Migration
  - Breaking Changes: None / ...
  - Database Migration: Required / Not required
  - API Changes: ...
  - Action Required: None / ...

## Issues in this release (expand 매크로로 감쌈, 기본 접힘)
  [note 경고박스] Before sharing, review and remove sensitive data.
  | Issue | Summary | Issue Type |
  | AICP-123 (Jira macro) | ... | Story |
```

---

### [6] Confluence 페이지 생성

**실제 API 호출로 교체 필요:**

```python
# 현재 (mock)
async def publish_release_note(...) -> ConfluencePublishResult:
    # URL만 생성
    return ConfluencePublishResult(...)

# 목표
async def publish_release_note(...) -> ConfluencePublishResult:
    # 1. 이전 릴리즈 페이지에서 버전 번호 확인 (+1)
    # 2. Confluence REST API로 페이지 생성
    #    - 부모 페이지: product별 ID (Step 2에서 결정)
    #    - 너비: Narrow (Fixed width)
    #    - 본문: AI가 생성한 Confluence Storage Format HTML
    # 3. 생성된 page ID, URL 반환
```

**페이지 제목 규칙:**
- `{YY-MM-DD} Annotation Tool {X.X.X} /Annotation Admin {X.X.X}`
- minor 버전만 +1 (이전 페이지에서 확인)
- Annotation Admin 버전 = Annotation Tool 버전 + 1.0

---

### [7] DB 저장

현재와 동일 — `release_notes` 테이블에 레코드 저장.

---

### [8] Response

```json
{
  "id": "rn-001",
  "jira_version": "AICP Monthly 26-04-01",
  "confluence_location": "AIP / Annotation Tool Release Notes / 2026",
  "requested_at": "2026-05-04T10:00:00Z",
  "completed_at": "2026-05-04T10:00:05Z",
  "status": "done",
  "confluence_url": "https://lunit.atlassian.net/wiki/spaces/AIP/pages/123456",
  "reflection": null
}
```

---

## 작업 지시서

### Task 1 — Jira 데이터 확장

**목적:** IssueType, Status, Epic, Assignee 필드 수집

**파일:**
- `apps/backend/app/integrations/jira.py`

**변경 내용:**
1. `JiraTicketData` dataclass에 `issue_type`, `status`, `epic_name`, `assignee` 추가
2. `fetch_tickets_by_version()` mock 데이터에 해당 필드 포함
3. (실제 Jira API 연동 시) JQL 응답 파싱 로직에 새 필드 매핑

**Mock 데이터 예시:**
```python
JiraTicketData(
    ticket_id="AICP-123",
    title="Add annotation batch export",
    issue_type="Story",
    status="Done",
    epic_name="Batch Processing",
    assignee="Jane Doe"
)
```

---

### Task 2 — AI 생성 로직 구현

**목적:** 실제 Claude API 호출 + 카테고리 분류 + 민감 항목 처리

**파일:**
- `apps/backend/app/integrations/ai.py`

**변경 내용:**
1. `generate_release_note()` 내부에 Claude API 호출 구현
2. System prompt에 `release_note_generator.md` 스타일 가이드 반영:
   - 카테고리 분류 기준 (New Features / Improvements / Bug Fix / Removed)
   - 민감 항목 8가지 패턴 감지 및 별도 섹션 처리
   - 작성 스타일 (동사 시작, bullet 통합, 내부 변경 제외)
3. 출력 형식: Confluence Storage Format (HTML)

**System prompt 핵심 지침:**
```
- Epic별 그룹핑 후 3개 카테고리로 분류
- Bug 타입이 New Features 그룹에 있으면 내용 확인 후 재분류
- Jira Key 노출 금지
- 내부/인프라 변경 제외
- API/권한/제거/이동/Known Issues 등 민감 항목은 별도 섹션
- Confluence Storage Format으로 출력
```

---

### Task 3 — Confluence 페이지 생성 구현

**목적:** 실제 Confluence REST API 호출로 페이지 생성

**파일:**
- `apps/backend/app/integrations/confluence.py`

**변경 내용:**
1. Confluence REST API 클라이언트 구현 (`httpx` 사용)
2. 부모 페이지 ID를 product별로 분기 (AICP: `5118918776`, ODM: `5120884774`)
3. 이전 릴리즈 페이지 조회 → 버전 번호 +1 계산
4. 페이지 생성 API 호출:
   - 제목: `{YY-MM-DD} Annotation Tool {X.X.X} /Annotation Admin {X.X.X}`
   - 너비: Fixed width (`page_width: "fixed-width"`)
   - 본문: AI 생성 Confluence Storage Format
5. 생성된 page ID, URL 반환

**환경변수 추가 필요:**
```
CONFLUENCE_BASE_URL=https://lunit.atlassian.net
CONFLUENCE_TOKEN=...
CONFLUENCE_USER=...
```

---

### Task 4 — Service 레이어 연결

**목적:** product 감지 로직 추가 + 새 필드 전달 경로 정리

**파일:**
- `apps/backend/app/services/release_note_service.py`

**변경 내용:**
1. version label에서 product prefix 감지 (`AICP` / `ODM`) → Confluence 부모 페이지 ID 결정
2. `generate_release_note()` 호출 시 확장된 `JiraTicketData` 전달
3. `publish_release_note()` 호출 시 product 정보 전달

---

### Task 5 — 환경변수 및 문서 업데이트

**파일:**
- `apps/backend/.env.example`
- `docs/api-conventions.md`

**변경 내용:**
1. `.env.example`에 Confluence 관련 환경변수 추가
2. `api-conventions.md`에 `POST /api/v1/release-notes/run` 요청/응답 스펙 업데이트

---

## 작업 우선순위

| 순서 | Task | 비고 |
|------|------|------|
| 1 | Task 1 — Jira 데이터 확장 | AI 입력 데이터 준비 |
| 2 | Task 2 — AI 생성 로직 | 핵심 가치 |
| 3 | Task 4 — Service 연결 | Task 1, 2 선행 필요 |
| 4 | Task 3 — Confluence 생성 | 외부 API 연동, 별도 스프린트 가능 |
| 5 | Task 5 — 문서 업데이트 | Task 3, 4 완료 후 |

---

## 미결정 사항 (사용자 확인 필요)

1. **Jira API 연동 방식**: 실제 Jira REST API 직접 호출 vs MCP 도구 사용?
2. **DB 스키마 변경**: `jira_tickets`에 `issue_type`, `epic_name` 등 컬럼 추가 여부 (옵션 A/B)
3. **Confluence 버전 번호**: 버전 번호 자동 계산 vs 사용자 입력?
4. **AI 모델**: Claude API 직접 호출? 어떤 모델 (Sonnet 4.6)?
5. **에러 처리**: AI 생성 실패 / Confluence 생성 실패 시 partial save 허용?
