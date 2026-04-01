Alembic 마이그레이션을 생성하고 적용합니다: $ARGUMENTS

다음 순서로 진행하세요:

1. **현재 마이그레이션 상태 확인**
   ```bash
   cd apps/backend && alembic current
   alembic history --verbose | head -20
   ```

2. **마이그레이션 생성**
   ```bash
   cd apps/backend && alembic revision --autogenerate -m "$ARGUMENTS"
   ```

3. **생성된 파일 검토** (자동 실행 전 반드시 확인)
   - `upgrade()` 내용이 의도한 변경과 일치하는지 확인
   - `downgrade()` 가 올바르게 역순으로 구현되었는지 확인
   - 불필요한 변경 감지 여부 확인
   
   > **주의**: 생성된 마이그레이션 파일을 사용자에게 보여주고 승인받은 후 적용합니다.

4. **마이그레이션 적용**
   ```bash
   cd apps/backend && alembic upgrade head
   ```

5. **검증**
   ```bash
   alembic current  # 최신 버전으로 이동했는지 확인
   ```

6. **규칙 준수 체크** (`@rules/docker-db.md` 기준)
   - [ ] `upgrade()` 구현 완료
   - [ ] `downgrade()` 구현 완료
   - [ ] 새 테이블에 `id`, `created_at`, `updated_at` 포함
   - [ ] 테이블명 `snake_case` 복수형
   - [ ] `.env.example` 업데이트 필요 여부 확인

@rules/docker-db.md
