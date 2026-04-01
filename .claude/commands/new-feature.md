새 기능을 스캐폴딩합니다: $ARGUMENTS

다음 순서로 진행하세요:

1. **계획 수립 및 보고** (파일 생성 전 승인 필수)
   - 기능 이름, 생성할 파일 목록, API 설계를 정리하여 사용자에게 보고
   - 승인 받은 후에만 파일 생성 시작

2. **Backend 생성 순서 (순서 엄수)**
   - Model → Schema → Repository → Service → Router → Migration → Test

3. **Frontend 생성 순서 (순서 엄수)**
   - Types → API Hook → Component → Page → Test

4. **완료 후 업데이트**
   - `docs/api-conventions.md`에 새 엔드포인트 추가
   - `.claude/plan/PLAN.md` 현재 작업 섹션 업데이트

@skills/new-feature/SKILL.md 스킬을 참고하여 각 파일의 패턴을 따르세요.
