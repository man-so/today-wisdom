const express = require('express');
const path = require('path');
const quotes = require('./quotes.server');

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4:e2b';

app.use(express.json({ limit: '100kb' }));
app.use(express.static(__dirname));

async function callOllama(prompt) {
  const r = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, format: 'json' })
  });
  if (!r.ok) throw new Error(`Ollama ${r.status}`);
  const data = await r.json();
  return JSON.parse(data.response);
}

function normalizeTerms(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value).split(/[\s,\/·]+/).filter(Boolean);
}

function scoreQuote(q, analysis, input) {
  const haystack = [
    ...(q.categories || []),
    ...(q.emotions || []),
    q.meaning || '',
    q.action || '',
    q.translation || ''
  ].join(' ').toLowerCase();

  const terms = [
    ...normalizeTerms(analysis.emotion),
    ...normalizeTerms(analysis.situation),
    ...normalizeTerms(analysis.theme),
    ...normalizeTerms(analysis.keywords),
    ...normalizeTerms(input)
  ].map(x => x.toLowerCase());

  let score = 0;
  for (const term of terms) {
    if (term.length < 2) continue;
    if ((q.emotions || []).some(x => String(x).includes(term) || term.includes(String(x)))) score += 6;
    if ((q.categories || []).some(x => String(x).includes(term) || term.includes(String(x)))) score += 5;
    if (haystack.includes(term)) score += 2;
  }
  return score;
}

app.post('/api/recommend', async (req, res) => {
  const text = String(req.body?.text || '').trim();
  const recentIds = Array.isArray(req.body?.recentIds) ? req.body.recentIds.map(Number) : [];
  if (!text) return res.status(400).json({ error: 'text is required' });

  try {
    // 1) 사용자의 상황을 먼저 구조화한다.
    const analysisPrompt = `당신은 한국어 감정/상황 분석기다. 사용자의 문장을 짧고 실용적으로 분류하라.\n응답은 JSON만 반환한다.\n스키마: {"emotion":"대표 감정 1개","situation":"상황 2~6단어","theme":"필요한 메시지 주제 1~2개","keywords":["검색 키워드 최대 5개"]}\n\n사용자 문장:\n${text}`;
    const analysis = await callOllama(analysisPrompt);

    // 2) 최근 본 명언을 제외한 뒤 로컬 데이터에서 후보를 좁힌다.
    let available = quotes.filter(q => !recentIds.includes(q.id));
    if (available.length < 5) available = quotes;

    const ranked = available
      .map(q => ({ q, score: scoreQuote(q, analysis, text) }))
      .sort((a, b) => b.score - a.score);

    let candidates = ranked.slice(0, 5).map(x => x.q);
    if (!candidates.length || ranked[0]?.score === 0) {
      candidates = available.sort(() => Math.random() - 0.5).slice(0, 5);
    }

    // 3) Gemma는 후보 5개 안에서만 최종 선택한다.
    const compact = candidates.map(q => ({
      id: q.id,
      quote: q.quote,
      translation: q.translation,
      categories: q.categories,
      emotions: q.emotions,
      meaning: q.meaning
    }));

    const choosePrompt = `당신은 명언 추천 어시스턴트다.\n사용자 상황과 분석 결과를 보고 아래 후보 5개 중 가장 적합한 quoteId 하나만 선택하라. 새 명언을 만들지 마라.\nreason은 왜 이 명언이 지금 상황에 맞는지 한국어 1~2문장으로, action은 오늘 바로 할 수 있는 아주 작은 행동 1문장으로 작성하라.\n응답은 JSON만 반환한다.\n스키마: {"quoteId":숫자,"reason":"...","action":"..."}\n\n사용자 상황:\n${text}\n\n분석:\n${JSON.stringify(analysis)}\n\n후보:\n${JSON.stringify(compact)}`;
    const choice = await callOllama(choosePrompt);

    if (!candidates.some(q => q.id === Number(choice.quoteId))) {
      choice.quoteId = candidates[0].id;
    }

    res.json({
      emotion: analysis.emotion || '현재 감정',
      situation: analysis.situation || '',
      theme: analysis.theme || '추천',
      keywords: analysis.keywords || [],
      candidateIds: candidates.map(q => q.id),
      quoteId: Number(choice.quoteId),
      reason: choice.reason || candidates[0].meaning,
      action: choice.action || candidates[0].action
    });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'ollama_unavailable', detail: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Quote app: http://localhost:${PORT}`);
  console.log(`Ollama model: ${OLLAMA_MODEL}`);
});
