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

---

## 엔드포인트 목록

> 새 API 추가 시 여기에 반드시 추가합니다.

| 메서드 | 경로 | 설명 | 추가일 |
|--------|------|------|--------|
| - | - | (구현 시 추가) | - |
