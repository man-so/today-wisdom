const express = require('express');
const quotes = require('./quotes.server');

const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4:e2b';
const LANGUAGES = ['ko', 'en', 'ja'];

const languageNames = {
  ko: 'Korean',
  en: 'English',
  ja: 'Japanese'
};

const emotionLabels = {
  frustration: { ko: '좌절', en: 'Frustration', ja: '挫折' },
  anxiety: { ko: '불안', en: 'Anxiety', ja: '不安' },
  fatigue: { ko: '피로', en: 'Fatigue', ja: '疲労' },
  happiness: { ko: '행복', en: 'Happiness', ja: '幸福' },
  motivation: { ko: '동기', en: 'Motivation', ja: 'やる気' },
  loneliness: { ko: '외로움', en: 'Loneliness', ja: '孤独' },
  anger: { ko: '분노', en: 'Anger', ja: '怒り' },
  helplessness: { ko: '무기력', en: 'Helplessness', ja: '無力感' },
  low_confidence: { ko: '낮은 자신감', en: 'Low confidence', ja: '自信の低下' }
};

app.use(express.json({ limit: '100kb' }));
app.use(express.static(__dirname));

async function callOllama(prompt) {
  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, format: 'json' })
  });
  if (!response.ok) throw new Error(`Ollama ${response.status}`);
  const data = await response.json();
  return JSON.parse(data.response);
}

function getLocalizedValue(value, lang = 'ko') {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return value[lang] || value.en || value.ko || '';
}

function getSearchText(value) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return [value.ko, value.en, value.ja].filter(Boolean).join(' ');
}

function normalizeTerms(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value).split(/[\s,\/·,]+/).filter(Boolean);
}

function responseText(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (value == null) return '';
  return String(value);
}

function scoreQuote(quote, analysis, input) {
  const haystack = [
    ...(quote.categories || []),
    ...(quote.emotions || []),
    getSearchText(quote.quote),
    getSearchText(quote.author),
    getSearchText(quote.meaning),
    getSearchText(quote.action),
    quote.translation || '',
    quote.source || ''
  ].join(' ').toLowerCase();

  const terms = [
    ...normalizeTerms(analysis.emotion),
    ...normalizeTerms(analysis.situation),
    ...normalizeTerms(analysis.theme),
    ...normalizeTerms(analysis.keywords),
    ...normalizeTerms(input)
  ].map(term => term.toLowerCase());

  let score = 0;
  for (const term of terms) {
    if (term.length < 2) continue;
    if ((quote.emotions || []).some(key => key.includes(term) || term.includes(key))) score += 8;
    if ((quote.categories || []).some(key => key.includes(term) || term.includes(key))) score += 6;
    if (haystack.includes(term)) score += 2;
  }
  return score;
}

app.post('/api/recommend', async (req, res) => {
  const text = String(req.body?.text || '').trim();
  const recentIds = Array.isArray(req.body?.recentIds) ? req.body.recentIds.map(Number) : [];
  const language = LANGUAGES.includes(req.body?.language) ? req.body.language : 'ko';
  if (!text) return res.status(400).json({ error: 'text is required' });

  try {
    const analysisPrompt = `You are a practical emotion and situation classifier.
Return JSON only.
The user may write in Korean, English, or Japanese.
Use these emotion keys only when possible: frustration, anxiety, fatigue, happiness, motivation, loneliness, anger, helplessness, low_confidence.
Return situation and theme only in ${languageNames[language]}.
If the target language is Japanese, situation and theme must be Japanese text.
If the target language is Korean, situation and theme must be Korean text.
Only emotion and keywords may use English internal keys.
Schema: {"emotion":"one emotion key","situation":"2-6 words in target language","theme":"1-2 message themes in target language","keywords":["up to 5 search keywords, can include internal English keys"]}

User text:
${text}`;
    const analysis = await callOllama(analysisPrompt);

    let available = quotes.filter(quote => !recentIds.includes(quote.id));
    if (available.length < 5) available = quotes;

    const ranked = available
      .map(quote => ({ quote, score: scoreQuote(quote, analysis, text) }))
      .sort((a, b) => b.score - a.score);

    let candidates = ranked.slice(0, 5).map(item => item.quote);
    if (!candidates.length || ranked[0]?.score === 0) {
      candidates = available.sort(() => Math.random() - 0.5).slice(0, 5);
    }

    const compact = candidates.map(quote => ({
      id: quote.id,
      quote: getLocalizedValue(quote.quote, language),
      author: getLocalizedValue(quote.author, language),
      source: quote.source,
      categories: quote.categories,
      emotions: quote.emotions,
      meaning: getLocalizedValue(quote.meaning, language)
    }));

    const choosePrompt = `You are a quote recommendation assistant.
Choose the single best quoteId from the five candidates. Do not create a new quote.
Write reason and action in ${languageNames[language]}.
reason: 1-2 practical sentences explaining why the quote fits now.
action: one very small action the user can do today.
Return JSON only.
Schema: {"quoteId":number,"reason":"...","action":"..."}

User situation:
${text}

Analysis:
${JSON.stringify(analysis)}

Candidates:
${JSON.stringify(compact)}`;
    const choice = await callOllama(choosePrompt);

    if (!candidates.some(quote => quote.id === Number(choice.quoteId))) {
      choice.quoteId = candidates[0].id;
    }

    const selected = candidates.find(quote => quote.id === Number(choice.quoteId)) || candidates[0];
    const emotionKey = String(analysis.emotion || '').trim();

    res.json({
      emotion: emotionKey || 'motivation',
      emotionLabel: getLocalizedValue(emotionLabels[emotionKey], language) || emotionKey,
      situation: responseText(analysis.situation),
      theme: responseText(analysis.theme),
      keywords: analysis.keywords || [],
      candidateIds: candidates.map(quote => quote.id),
      quoteId: Number(choice.quoteId),
      reason: choice.reason || getLocalizedValue(selected.meaning, language),
      action: choice.action || getLocalizedValue(selected.action, language)
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
