const RECENT_LIMIT = 10;
const LANGUAGES = ['ko', 'en', 'ja'];

const state = {
  currentQuote: null,
  selectedMood: localStorage.getItem('lastMood') || null,
  favorites: safeJson('favoriteQuotes', []),
  recentIds: safeJson('recentQuoteIds', []),
  journal: safeJson('quoteJournal', []),
  theme: localStorage.getItem('theme') || 'light',
  language: LANGUAGES.includes(localStorage.getItem('language')) ? localStorage.getItem('language') : 'ko'
};

const $ = (id) => document.getElementById(id);
const quoteCard = $('quoteCard');

const categoryVisuals = {
  hope: 'hope.svg',
  recovery: 'hope.svg',
  courage: 'courage.svg',
  challenge: 'courage.svg',
  love: 'love.svg',
  relationship: 'love.svg',
  growth: 'growth.svg',
  confidence: 'growth.svg',
  anxiety: 'calm.svg',
  comfort: 'calm.svg',
  calm: 'calm.svg',
  life: 'life.svg',
  choice: 'life.svg',
  friendship: 'friendship.svg',
  collaboration: 'friendship.svg',
  teamwork: 'friendship.svg',
  success: 'success.svg',
  goal: 'success.svg',
  wisdom: 'wisdom.svg',
  philosophy: 'wisdom.svg',
  change: 'change.svg',
  second_chance: 'change.svg',
  family: 'family.svg',
  happiness: 'joy.svg',
  motivation: 'joy.svg',
  responsibility: 'wisdom.svg',
  leadership: 'success.svg',
  identity: 'growth.svg',
  balance: 'calm.svg'
};

function safeJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

function t(key) {
  return i18n.ui[state.language]?.[key] || i18n.ui.en[key] || i18n.ui.ko[key] || key;
}

function getLocalizedValue(value, lang = state.language) {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return '';
  return value[lang] || value.en || value.ko || '';
}

function getDisplayName(type, key) {
  const dict = type === 'emotion' ? i18n.emotionNames : i18n.categoryNames;
  return getLocalizedValue(dict[key], state.language) || key;
}

function getQuoteAuthorName(quote, lang = state.language) {
  const author = getLocalizedValue(quote.author, lang);
  return author
    .replace(/^Inspired by\s+/i, '')
    .replace(/\s*에서 영감을 받은 문구$/u, '')
    .replace(/\s*에 착상한 문구$/u, '')
    .replace(/\s*의 이야기$/u, '')
    .replace(/\s*に着想を得た言葉$/u, '')
    .replace(/\s*に着想した言葉$/u, '')
    .trim();
}

function formatMoodHint(moodName) {
  return state.language === 'en' ? `${moodName} ${t('currentMood')}` : `${moodName}${t('currentMood')}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function getVisualForQuote(quote) {
  const keys = [...(quote.categories || []), ...(quote.emotions || [])];
  const file = keys.map(key => categoryVisuals[key]).find(Boolean) || 'life.svg';
  return `assets/images/${file}`;
}

function initApp() {
  applyTheme();
  applyLanguage();
  renderCategories();
  renderFavorites();
  renderJournal();
  const start = getRandomQuote();
  renderQuote(start, t('defaultBadge'), getLocalizedValue(start.meaning), getLocalizedValue(start.action));
  bindEvents();
}

function setGreeting() {
  const hour = new Date().getHours();
  const greetings = {
    ko: hour < 12 ? '좋은 아침이에요.' : hour < 18 ? '좋은 오후예요.' : '좋은 저녁이에요.',
    en: hour < 12 ? 'good morning.' : hour < 18 ? 'good afternoon.' : 'good evening.',
    ja: hour < 12 ? 'おはようございます。' : hour < 18 ? 'こんにちは。' : 'こんばんは。'
  };
  $('greeting').textContent = greetings[state.language] || greetings.en;
}

function applyLanguage() {
  document.documentElement.lang = state.language;
  document.title = t('title');
  $('languageSelect').value = state.language;
  document.querySelector('.brand small').textContent = t('brandSub');
  document.querySelectorAll('.topnav button').forEach((button, index) => {
    button.textContent = [t('recommend'), t('journal'), t('saved')][index];
  });
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  $('aiInput').placeholder = t('aiPlaceholder');
  $('journalNote').placeholder = t('journalPlaceholder');
  $('moodHint').textContent = state.selectedMood ? formatMoodHint(getDisplayName('emotion', state.selectedMood)) : t('moodHint');
  $('detailToggle').textContent = $('detailToggle').getAttribute('aria-expanded') === 'true' ? t('collapse') : t('expand');
  setGreeting();
}

function addRecent(id) {
  state.recentIds = [id, ...state.recentIds.filter(x => x !== id)].slice(0, RECENT_LIMIT);
  localStorage.setItem('recentQuoteIds', JSON.stringify(state.recentIds));
}

function renderQuote(quote, badge = t('defaultBadge'), reason = getLocalizedValue(quote.meaning), action = getLocalizedValue(quote.action)) {
  state.currentQuote = quote;
  addRecent(quote.id);
  quoteCard.classList.add('swap');
  setTimeout(() => {
    const quoteText = getLocalizedValue(quote.quote);
    const author = getQuoteAuthorName(quote);
    $('quoteText').textContent = `“${quoteText}”`;
    $('quoteAuthor').textContent = `-${author}-`;
    $('reasonText').textContent = reason || getLocalizedValue(quote.meaning) || t('defaultReason');
    $('actionText').textContent = action || getLocalizedValue(quote.action) || t('defaultAction');
    $('emotionBadge').textContent = badge;
    document.querySelector('.action-box strong').textContent = t('actionTitle');
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
  const moodName = getDisplayName('emotion', mood);
  $('moodHint').textContent = formatMoodHint(moodName);
  const pool = quotes.filter(q => (q.emotions || []).includes(mood));
  const quote = getRandomQuote(pool.length ? pool : quotes);
  renderQuote(quote, moodName, getLocalizedValue(quote.meaning), getLocalizedValue(quote.action));
}

function renderCategories() {
  const categories = [...new Set(quotes.flatMap(q => q.categories || []))].slice(0, 8);
  $('categoryGrid').innerHTML = categories.map(cat => {
    const icon = categoryVisuals[cat] || 'life.svg';
    const name = getDisplayName('category', cat);
    return `<button class="category-btn" data-category="${escapeHtml(cat)}">
      <img src="assets/images/${icon}" alt="" aria-hidden="true" />
      <strong>${escapeHtml(name)}</strong>
      <span>${quotes.filter(q => (q.categories || []).includes(cat)).length} ${escapeHtml(t('quotes'))}</span>
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
  $('savedCount').textContent = `${items.length} ${t('quotes')}`;
  $('savedList').innerHTML = items.length ? items.map(q => `
    <article class="saved-item" data-id="${q.id}">
      <strong>“${escapeHtml(getLocalizedValue(q.quote))}”</strong>
      <small>-${escapeHtml(getQuoteAuthorName(q))}-</small>
    </article>`).join('') : `<p class="body-text">${escapeHtml(t('noSaved'))}</p>`;
}

async function shareCurrentQuote() {
  if (!state.currentQuote) return;
  const text = `“${getLocalizedValue(state.currentQuote.quote)}” -${getQuoteAuthorName(state.currentQuote)}-`;
  try {
    if (navigator.share) await navigator.share({ title: t('title'), text });
    else {
      await navigator.clipboard.writeText(text);
      $('aiStatus').textContent = t('quoteCopied');
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
  if (!input) { $('aiStatus').textContent = t('inputRequired'); return; }
  $('aiRecommendBtn').disabled = true;
  $('aiStatus').textContent = t('analyzing');
  try {
    const res = await fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input, recentIds: state.recentIds, language: state.language })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const quote = quotes.find(q => q.id === data.quoteId) || getRandomQuote();
    const badge = data.emotionLabel || getDisplayName('emotion', data.emotion) || data.theme || t('defaultBadge');
    renderQuote(quote, badge, data.reason || getLocalizedValue(quote.meaning), data.action || getLocalizedValue(quote.action));
    $('aiStatus').textContent = `${t('aiAnalysis')} · ${[data.emotionLabel || data.emotion, data.situation, data.theme].filter(Boolean).join(' · ')}`;
    $('analysisChips').innerHTML = [data.emotionLabel || data.emotion, data.situation, data.theme].filter(Boolean).map(x => `<span>${escapeHtml(x)}</span>`).join('');
  } catch (err) {
    console.error(err);
    $('aiStatus').textContent = t('aiFailed');
  } finally {
    $('aiRecommendBtn').disabled = false;
  }
}

function saveJournal() {
  if (!state.currentQuote) return;
  const note = $('journalNote').value.trim();
  const mood = state.selectedMood || 'journal';
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
  $('journalStatus').textContent = t('savedJournal');
  renderJournal();
}

function renderJournal() {
  const recent = state.journal.slice(0, 7);
  $('journalCount').textContent = `${state.journal.length} ${t('records')}`;
  $('journalList').innerHTML = recent.length ? recent.map(entry => {
    const q = quotes.find(x => x.id === entry.quoteId);
    const d = new Date(entry.date);
    const mood = i18n.emotionNames[entry.mood] ? getDisplayName('emotion', entry.mood) : t('journal');
    return `<article class="journal-item">
      <div><strong>${escapeHtml(mood)}</strong><span>${d.toLocaleDateString(state.language === 'ja' ? 'ja-JP' : state.language === 'en' ? 'en-US' : 'ko-KR')}</span></div>
      <p>${q ? `“${escapeHtml(getLocalizedValue(q.quote))}”` : escapeHtml(t('savedTitle'))}</p>
      ${entry.note ? `<small>${escapeHtml(entry.note)}</small>` : ''}
    </article>`;
  }).join('') : `<p class="body-text">${escapeHtml(t('noJournal'))}</p>`;
}

function changeLanguage(language) {
  if (!LANGUAGES.includes(language)) return;
  state.language = language;
  localStorage.setItem('language', language);
  applyLanguage();
  renderCategories();
  renderFavorites();
  renderJournal();
  if (state.currentQuote) renderQuote(state.currentQuote, t('defaultBadge'), getLocalizedValue(state.currentQuote.meaning), getLocalizedValue(state.currentQuote.action));
}

function bindEvents() {
  $('nextBtn').addEventListener('click', () => renderQuote(getRandomQuote()));
  $('favoriteBtn').addEventListener('click', toggleFavorite);
  $('shareBtn').addEventListener('click', shareCurrentQuote);
  $('themeToggle').addEventListener('click', toggleTheme);
  $('languageSelect').addEventListener('change', (event) => changeLanguage(event.target.value));
  $('aiRecommendBtn').addEventListener('click', aiRecommend);
  $('saveJournalBtn').addEventListener('click', saveJournal);
  $('detailToggle').addEventListener('click', () => {
    const expanded = $('detailToggle').getAttribute('aria-expanded') === 'true';
    $('detailToggle').setAttribute('aria-expanded', String(!expanded));
    $('detailBody').hidden = expanded;
    $('detailToggle').textContent = expanded ? t('expand') : t('collapse');
  });

  document.querySelectorAll('.mood').forEach(btn => btn.addEventListener('click', () => recommendByMood(btn.dataset.mood)));
  $('categoryGrid').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-category]');
    if (!btn) return;
    const pool = quotes.filter(q => (q.categories || []).includes(btn.dataset.category));
    renderQuote(getRandomQuote(pool), getDisplayName('category', btn.dataset.category));
  });
  $('savedList').addEventListener('click', (e) => {
    const item = e.target.closest('[data-id]');
    if (!item) return;
    const q = quotes.find(q => q.id === Number(item.dataset.id));
    if (q) renderQuote(q, t('savedTitle'));
  });
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-target]');
    if (!btn) return;
    if (btn.dataset.target === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
    else document.getElementById(btn.dataset.target)?.scrollIntoView({ behavior: 'smooth' });
  });
}

initApp();
