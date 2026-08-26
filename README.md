# Quote for Today V2

카드형 명언 추천 웹앱 MVP. HTML/CSS/Vanilla JS + Node.js/Express + Ollama Gemma로 동작합니다.

## V2 주요 개선
- 자유문장 입력 → Gemma 감정/상황/주제 분석
- 분석 결과로 로컬 명언 DB 후보 5개 필터링 → Gemma 최종 선택
- 최근 본 명언 10개 중복 방지
- 실제 인용/영화 영감 문구 배지 구분
- 추천 이유/오늘의 행동 접이식 영역
- 오늘의 기분·명언·한 줄 메모 LocalStorage 기록
- 카드 높이/이미지/액션 영역 안정화

## 실행
```powershell
npm install
npm start
```
브라우저: http://localhost:3000

기본 Ollama 모델: `gemma4:e2b`
다른 모델 사용 시 PowerShell에서 예: `$env:OLLAMA_MODEL="gemma4:e4b"; npm start`

> 3000 포트가 이미 사용 중이면 기존 서버를 종료하거나 `$env:PORT=3001; npm start`로 실행하세요.
