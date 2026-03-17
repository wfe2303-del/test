# 강사별 DB보고서 · 분할 버전

이 버전은 단일 HTML 구조를 정적 호스팅용으로 다시 쪼갠 버전이다.

## 구조

- `index.html` : 최소 엔트리 파일
- `views/app-shell.html` : 실제 화면 마크업 전체
- `styles/main.css` : 스타일
- `js/00-bootstrap.js` : 화면 HTML 로드 후 스크립트를 순차 로드
- `js/01-core-utils-state-auth.js` : 공통 유틸, 로컬 상태, 인증
- `js/02-core-db-mapping.js` : Supabase 데이터 로드/매핑/CRUD
- `js/03-core-dom-ui.js` : DOM 참조, 로딩/토스트/ZIP 미리보기, 현재 프로젝트 전환
- `js/04-data.js` : CSV/XLSX 파싱, 집계 계산
- `js/05-render-shell.js` : 헤더/메뉴/온드DB/광고DB/메인/설정 렌더
- `js/06-project-import-management.js` : 프로젝트 업로드/생성/복제/삭제
- `js/07-charts-compare.js` : 차트 + 강사/기수 비교
- `js/08-events-init.js` : 이벤트 바인딩 및 초기화

## 배포

### GitHub
1. 이 폴더 전체를 새 저장소 루트에 업로드
2. `index.html`, `js`, `styles`, `views`, `vercel.json`이 모두 루트 기준으로 올라가야 함

### Vercel
1. GitHub 저장소 Import
2. Framework Preset: `Other`
3. Build Command: 비워둠
4. Output Directory: 비워둠
5. Deploy

## 주의

- `views/app-shell.html`을 `fetch()`로 읽기 때문에, 로컬에서 그냥 HTML 파일 더블클릭으로 열면 브라우저 보안 정책 때문에 동작이 제한될 수 있다.
- 확인은 Vercel, GitHub Pages, 혹은 간단한 로컬 서버(`python -m http.server`)로 하는 게 좋다.


## 추가된 테스트 계정 동작

- 로그인 아이디 `test` 는 `test@gmail.com` 으로 매핑됩니다.
- 비밀번호 `1234` 로 로그인하도록 사용할 수 있습니다.
- 첫 로그인 시 Supabase Auth에 해당 계정이 아직 없으면 앱이 자동으로 계정 생성을 시도합니다.
- 데이터 조회/수정/삭제 쿼리에 `owner_id = 현재 로그인 사용자` 조건을 추가해, 테스트 계정 데이터가 기존 계정 데이터에 섞이지 않도록 보강했습니다.
- 단, Supabase 프로젝트에서 Email Confirm이 켜져 있으면 자동 생성 후 이메일 인증이 필요할 수 있습니다.
