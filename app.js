const RECENT_LIMIT = 10;

const state = {
  currentQuote: null,
  selectedMood: localStorage.getItem('lastMood') || null,
  favorites: safeJson('favoriteQuotes', []),
  recentIds: safeJson('recentQuoteIds', []),
  journal: safeJson('quoteJournal', []),
  theme: localStorage.getItem('theme') || 'light'
};

const $ = (id) => document.getElementById(id);
const quoteCard = $('quoteCard');

const categoryVisuals = {
  '희망': 'hope.svg', '회복': 'hope.svg', '용기': 'courage.svg', '도전': 'courage.svg',
  '사랑': 'love.svg', '관계': 'love.svg', '성장': 'growth.svg', '자신감': 'growth.svg',
  '불안': 'calm.svg', '위로': 'calm.svg', '평온': 'calm.svg', '삶': 'life.svg',
  '선택': 'life.svg', '우정': 'friendship.svg', '협력': 'friendship.svg', '성공': 'success.svg',
  '목표': 'success.svg', '지혜': 'wisdom.svg', '철학': 'wisdom.svg', '변화': 'change.svg',
  '재도전': 'change.svg', '가족': 'family.svg', '행복': 'joy.svg', '동기': 'joy.svg'
};

function safeJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

function getVisualForQuote(quote) {
  const keys = [...(quote.categories || []), ...(quote.emotions || [])];
  const file = keys.map(key => categoryVisuals[key]).find(Boolean) || 'life.svg';
  return `assets/images/${file}`;
}

function initApp() {
  applyTheme();
  setGreeting();
  renderCategories();
  renderFavorites();
  renderJournal();
  const start = getRandomQuote();
  renderQuote(start, '오늘의 추천', start.meaning, start.action);
  bindEvents();
}

function setGreeting() {
  const hour = new Date().getHours();
  $('greeting').textContent = hour < 12 ? 'good morning.' : hour < 18 ? 'good afternoon.' : 'good evening.';
}

function addRecent(id) {
  state.recentIds = [id, ...state.recentIds.filter(x => x !== id)].slice(0, RECENT_LIMIT);
  localStorage.setItem('recentQuoteIds', JSON.stringify(state.recentIds));
}

function renderQuote(quote, badge = '추천 이유', reason = quote.meaning, action = quote.action) {
  state.currentQuote = quote;
  addRecent(quote.id);
  quoteCard.classList.add('swap');
  setTimeout(() => {
    $('quoteText').textContent = `“${quote.quote}”`;
    $('quoteTranslation').textContent = quote.translation;
    $('quoteAuthor').textContent = quote.author;
    $('quoteSource').textContent = quote.kind === 'paraphrase' ? `Inspired by · ${quote.source}` : (quote.source || 'Quote');
    $('contentType').textContent = quote.kind === 'paraphrase' ? 'MOVIE-INSPIRED' : 'QUOTE';
    $('contentType').classList.toggle('inspired', quote.kind === 'paraphrase');
    $('quoteImage').src = getVisualForQuote(quote);
    $('reasonText').textContent = reason || quote.meaning;
    $('actionText').textContent = action || quote.action;
    $('emotionBadge').textContent = badge;
    updateFavoriteButton();
    quoteCard.classList.remove('swap');
  }, 150);
}

function getRandomQuote(pool = quotes) {
  let available = pool.filter(q => !state.recentIds.includes(q.id));
  if (!available.length) available = pool;
  if (!available.length) return quotes[0];
  return available[Math.floor(Math.random() * available.length)];
}

function recommendByMood(mood) {
  state.selectedMood = mood;
  localStorage.setItem('lastMood', mood);
  document.querySelectorAll('.mood').forEach(btn => btn.classList.toggle('active', btn.dataset.mood === mood));
  $('moodHint').textContent = `${mood}에 맞는 명언`;
  const pool = quotes.filter(q => q.emotions.includes(mood));
  const quote = getRandomQuote(pool.length ? pool : quotes);
  renderQuote(quote, mood, quote.meaning, quote.action);
}

function renderCategories() {
  const categories = [...new Set(quotes.flatMap(q => q.categories))].slice(0, 8);
  $('categoryGrid').innerHTML = categories.map(cat => {
    const icon = categoryVisuals[cat] || 'life.svg';
    return `<button class="category-btn" data-category="${cat}">
      <img src="assets/images/${icon}" alt="" aria-hidden="true" />
      <strong>${cat}</strong>
      <span>${quotes.filter(q => q.categories.includes(cat)).length} quotes</span>
    </button>`;
  }).join('');
}

function toggleFavorite() {
  if (!state.currentQuote) return;
  const id = state.currentQuote.id;
  state.favorites = state.favorites.includes(id) ? state.favorites.filter(x => x !== id) : [...state.favorites, id];
  localStorage.setItem('favoriteQuotes', JSON.stringify(state.favorites));
  updateFavoriteButton();
  renderFavorites();
}

function updateFavoriteButton() {
  $('favoriteBtn').textContent = state.currentQuote && state.favorites.includes(state.currentQuote.id) ? '♥' : '♡';
}

function renderFavorites() {
  const items = quotes.filter(q => state.favorites.includes(q.id));
  $('savedCount').textContent = `${items.length} Quotes`;
  $('savedList').innerHTML = items.length ? items.map(q => `
    <article class="saved-item" data-id="${q.id}">
      <strong>“${q.quote}”</strong>
      <small>${q.author}${q.source ? ` · ${q.source}` : ''}</small>
    </article>`).join('') : '<p class="body-text">아직 저장한 명언이 없어요.</p>';
}

async function shareCurrentQuote() {
  if (!state.currentQuote) return;
  const text = `“${state.currentQuote.quote}” — ${state.currentQuote.author}`;
  try {
    if (navigator.share) await navigator.share({ title: '오늘의 명언', text });
    else {
      await navigator.clipboard.writeText(text);
      $('aiStatus').textContent = '명언을 클립보드에 복사했어요.';
    }
  } catch (_) {}
}

function applyTheme() { document.body.classList.toggle('dark', state.theme === 'dark'); }
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', state.theme);
  applyTheme();
}

async function aiRecommend() {
  const input = $('aiInput').value.trim();
  if (!input) { $('aiStatus').textContent = '상황을 한 줄이라도 입력해주세요.'; return; }
  $('aiRecommendBtn').disabled = true;
  $('aiStatus').textContent = 'Gemma가 감정과 상황을 분석하고 있어요...';
  try {
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input, recentIds: state.recentIds })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const quote = quotes.find(q => q.id === data.quoteId) || getRandomQuote();
    renderQuote(quote, data.emotion || data.theme || 'AI 추천', data.reason || quote.meaning, data.action || quote.action);
    $('aiStatus').textContent = `AI 분석 · ${data.emotion || '감정'} · ${data.situation || '상황'} · ${data.theme || '추천'}`;
    $('analysisChips').innerHTML = [data.emotion, data.situation, data.theme].filter(Boolean).map(x => `<span>${x}</span>`).join('');
  } catch (err) {
    console.error(err);
    $('aiStatus').textContent = 'AI 연결 실패. Ollama와 서버 실행 상태를 확인해주세요.';
  } finally {
    $('aiRecommendBtn').disabled = false;
  }
}

function saveJournal() {
  if (!state.currentQuote) return;
  const note = $('journalNote').value.trim();
  const mood = state.selectedMood || '기록';
  const entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    mood,
    quoteId: state.currentQuote.id,
    note
  };
  state.journal = [entry, ...state.journal].slice(0, 30);
  localStorage.setItem('quoteJournal', JSON.stringify(state.journal));
  $('journalNote').value = '';
  $('journalStatus').textContent = '오늘의 기록을 저장했어요.';
  renderJournal();
}

function renderJournal() {
  const recent = state.journal.slice(0, 7);
  $('journalCount').textContent = `${state.journal.length} records`;
  $('journalList').innerHTML = recent.length ? recent.map(entry => {
    const q = quotes.find(x => x.id === entry.quoteId);
    const d = new Date(entry.date);
    return `<article class="journal-item">
      <div><strong>${entry.mood}</strong><span>${d.toLocaleDateString('ko-KR')}</span></div>
      <p>${q ? `“${q.translation || q.quote}”` : '저장된 명언'}</p>
      ${entry.note ? `<small>${entry.note}</small>` : ''}
    </article>`;
  }).join('') : '<p class="body-text">오늘의 기분과 한 줄 메모를 남겨보세요.</p>';
}

function bindEvents() {
  $('nextBtn').addEventListener('click', () => renderQuote(getRandomQuote()));
  $('favoriteBtn').addEventListener('click', toggleFavorite);
  $('shareBtn').addEventListener('click', shareCurrentQuote);
  $('themeToggle').addEventListener('click', toggleTheme);
  $('aiRecommendBtn').addEventListener('click', aiRecommend);
  $('saveJournalBtn').addEventListener('click', saveJournal);
  $('detailToggle').addEventListener('click', () => {
    const expanded = $('detailToggle').getAttribute('aria-expanded') === 'true';
    $('detailToggle').setAttribute('aria-expanded', String(!expanded));
    $('detailBody').hidden = expanded;
    $('detailToggle').textContent = expanded ? '펼치기 +' : '접기 −';
  });

  document.querySelectorAll('.mood').forEach(btn => btn.addEventListener('click', () => recommendByMood(btn.dataset.mood)));
  $('categoryGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-category]');
    if (!btn) return;
    const pool = quotes.filter(q => q.categories.includes(btn.dataset.category));
    renderQuote(getRandomQuote(pool), btn.dataset.category);
  });
  $('savedList').addEventListener('click', (e) => {
    const item = e.target.closest('[data-id]');
    if (!item) return;
    const q = quotes.find(q => q.id === Number(item.dataset.id));
    if (q) renderQuote(q, 'Saved');
  });
  document.querySelector('.bottom-nav').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-target]');
    if (!btn) return;
    if (btn.dataset.target === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
    else document.getElementById(btn.dataset.target)?.scrollIntoView({ behavior: 'smooth' });
  });
}

initApp();
