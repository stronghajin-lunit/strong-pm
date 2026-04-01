백엔드 레이어 분리 리팩토링을 실행합니다: $ARGUMENTS

@skills/refactor/SKILL.md 스킬을 실행하세요.

인자 형식:
- `/project:refactor users`           → users 도메인 전체
- `/project:refactor users get_user`  → users 도메인의 get_user 메서드만
- `/project:refactor status`          → 진행 상황 확인

**실행 순서 (반드시 준수)**:
1. Step 0: 현재 코드 읽기 + 위반 목록 작성 (수정 없음)
2. 위반 사항과 변경 계획을 사용자에게 보고 → 승인 받기
3. Step 1~3: 승인 후 순서대로 구현
4. Step 4: 체크리스트 검증

생성 파일 위치:
- `apps/backend/app/enums/{domain}.py`
- `apps/backend/app/dtos/{domain}.py`
- `apps/backend/app/repositories/{domain}_repo.py`
