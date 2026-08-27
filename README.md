# Quote for Today V2

카드형 명언 추천 웹앱 MVP. HTML/CSS/Vanilla JS + Node.js/Express + Ollama Gemma로 동작합니다.

## 주요 기능

- 자유문장 입력 -> Gemma 감정/상황/주제 분석
- 분석 결과로 로컬 명언 DB 후보 5개 필터링 -> Gemma 최종 선택
- 한국어 / English / 日本語 언어 선택
- 명언 데이터는 `ko` / `en` / `ja` 사전 번역 데이터 사용
- AI 추천 결과의 `reason`, `action`, `situation`은 현재 선택 언어로 생성
- 최근 본 명언 10개 중복 방지
- 실제 인용 / Movie-Inspired 문구 배지 구분
- Favorite, Saved, Journal, Dark Mode 지원

## 콘텐츠 안내

Marvel 영화 기반 Movie-Inspired 콘텐츠 60개로 구성되어 있습니다.

`MOVIE-INSPIRED` 콘텐츠는 Marvel 영화의 주제와 캐릭터 성장에서 영감을 받아 새롭게 재구성한 문구입니다. 실제 영화 대사를 그대로 대량 수록한 것이 아닙니다.

## 데이터 구조

현재 명언 데이터는 다국어 구조를 사용합니다.

```javascript
{
  quote: {
    ko: "자신이 만든 것 뒤에 숨지 않을 때 더 강해진다.",
    en: "You become stronger when you stop hiding behind what you built.",
    ja: "自分が作ったものの陰に隠れるのをやめたとき、人はもっと強くなれる。"
  }
}
```

앱은 현재 언어 -> English -> Korean 순서로 fallback 합니다. `categories`와 `emotions`는 화면 표시용 문구가 아니라 영어 기반 내부 key로 저장하고, `i18n.js`에서 언어별 표시명을 관리합니다.

## 실행

```powershell
npm install
npm start
```

브라우저: http://localhost:3000

기본 Ollama 모델: `gemma4:e2b`

다른 모델 사용 시 PowerShell 예:

```powershell
$env:OLLAMA_MODEL="gemma4:e4b"; npm start
```

3000 포트가 이미 사용 중이면 기존 서버를 종료하거나 다음처럼 실행하세요.

```powershell
$env:PORT=3001; npm start
```

## 검증

```powershell
node scripts/validate-quotes.js
```

검증 항목:

- ID 중복
- 필수 field 누락
- `quote` / `author` / `meaning` / `action` 다국어 필드
- `categories` / `emotions` 배열 여부 및 영어 key 형식
- `source`, `kind` 존재 여부
