# GREENLIGHT

신호등이 초록색으로 바뀌는 순간 클릭하는 반응속도 게임입니다.
5회 평균(ms)이 최종 스코어이며 낮을수록 우수합니다.

## 포함 기능
- 무작위 빨간불 대기, 조기 클릭 재도전
- 클릭·터치·스페이스바·Enter 지원
- 5회 완료 후 종료와 새 게임 시작
- Cloudflare D1에 결과 자동 저장
- 참가자별 최고 기록, 공동 순위, 상위 비율, TOP 10
- 브라우저 쿠키 기반 익명 참가자 구분

## 로컬 화면 미리보기
Node.js가 설치된 환경에서 `node preview.mjs`를 실행하고
http://127.0.0.1:4173 에 접속합니다.
이 단순 미리보기 서버에는 데이터베이스 API가 없어 자동 저장은 동작하지 않습니다.

## 서버 빌드
`node build-server.mjs`로 dist/server/index.js를 생성합니다.
서버는 Cloudflare Workers의 fetch API와 D1 바인딩 DB를 사용합니다.
배포 전 drizzle/0000_results.sql을 데이터베이스에 적용해야 합니다.
Sites에서는 .openai/hosting.json의 d1 선언에 따라 연결됩니다.
이 내보내기에는 기존 Sites 프로젝트 ID와 인증 정보가 포함되지 않습니다.

## 파일
- dist/index.html, styles.css, driver.css: 화면
- dist/app.js: 게임 로직
- dist/dashboard.js: 자동 저장과 순위 표시
- worker/api.mjs: 결과 검증·저장·조회
- drizzle/: 데이터베이스 구조
- build-server.mjs: 화면 파일을 포함한 Worker 생성

## 배포 참고
GitHub는 소스를 보관하는 저장소입니다.
GitHub Pages만으로는 Worker API와 D1 데이터베이스를 실행할 수 없습니다.
자동 저장을 유지하려면 현재 Sites 배포나 별도의 Workers/D1 배포가 필요합니다.
서버 순위는 비공식 게임 기록이며 입력 조작을 완전히 방지하는 시스템은 아닙니다.
