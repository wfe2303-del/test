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

## 새 기능: 프로젝트 파일 일괄반영

강사/기수 메뉴 안의 `프로젝트 파일 일괄반영` 버튼으로 여러 파일을 한 번에 올릴 수 있다.

### 파일명 규칙

아래처럼 파일명 안에 `강사명_아이템명_기수`가 들어 있으면 해당 프로젝트를 자동으로 찾는다.
없으면 자동으로 새 프로젝트를 만든 뒤 반영한다.

예시:
- `숙사장_호스텔부업_1기_프로젝트.xlsx`
- `디노_쇼핑쇼츠_2기_매출.csv`
- `영끌남_부동산경매_3기_설정.xlsx`

### 인식하는 1행 헤더 예시

아래 헤더를 1행에 두고 2행부터 값을 넣으면 자동 반영된다.

- 공통 설정: `실매출`, `일예산`, `이전DB`, `이전매출`, `이전광고비`, `강사정산비율`, `광고분담비율`
- 광고DB(일반형): `날짜`, `플랫폼`, `광고비`, `클릭`, `실DB`
- 광고DB(플랫폼 분리형): `날짜`, `메타광고비`, `메타클릭`, `메타실DB`, `구글광고비`, `구글클릭`, `구글실DB`
- 온드DB: `날짜`, `온드매체`, `추가DB`

### 반영 규칙

- 같은 날짜·플랫폼 광고DB는 합산 후 업서트
- 같은 날짜·온드매체 온드DB는 합산 후 업서트
- `실매출`은 파일 내 해당 컬럼 합계로 반영
- `일예산`, `이전DB`, `이전매출`, `이전광고비`, 정산 비율은 마지막 값 기준 반영
