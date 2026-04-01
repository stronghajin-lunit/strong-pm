현재 브랜치의 변경 사항을 코드 리뷰합니다.

다음 절차로 진행하세요:

1. **변경 범위 파악**
   ```bash
   git diff main...HEAD --stat
   git diff main...HEAD
   ```
   - 변경된 파일 목록과 줄 수 확인
   - 400줄 초과 시 분할 권장 메시지 표시

2. **아키텍처 & 설계 검토**
   - 계층 분리 원칙 준수 여부 (Router → Service → Repository)
   - 의존성 방향 확인 (역방향/순환 의존 없음)

3. **Convention 검토** (`@rules/code-style.md` 기준)
   - TypeScript: `any` 사용, `strict` 위반, 네이밍 컨벤션
   - Python: 타입 힌트 누락, `datetime.utcnow()` 사용, 매직 스트링
   - FastAPI: `response_model` 누락, `commit()` in Repository

4. **테스트 검토** (`@rules/testing.md` 기준)
   - 새 기능에 테스트 파일 동반 여부
   - 커버리지 목표 달성 여부

5. **보안 검토**
   - SQL 인젝션, XSS, 민감 데이터 노출 여부
   - `.env` 하드코딩 여부

6. **결과 리포트** 출력
   - Blocking / Important / Nit / Praise 항목으로 분류
   - 수정이 필요한 항목은 Before/After 코드 예시 포함

@rules/code-style.md
@rules/testing.md
@rules/git-workflow.md
