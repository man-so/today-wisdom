const quotes = require('../quotes-data');

const LANGUAGES = ['ko', 'en', 'ja'];
const REQUIRED = ['id', 'author', 'source', 'kind', 'quote', 'meaning', 'categories', 'emotions', 'action'];

const errors = [];
const seenIds = new Set();

function label(quote) {
  return `id ${quote?.id ?? '(missing)'}`;
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateLocalizedField(quote, field) {
  const value = quote[field];
  if (typeof value === 'string') {
    if (!hasText(value)) errors.push(`${label(quote)}: ${field} string is empty`);
    return;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${label(quote)}: ${field} must be a string or localized object`);
    return;
  }
  for (const lang of LANGUAGES) {
    if (!hasText(value[lang])) errors.push(`${label(quote)}: ${field}.${lang} is missing`);
  }
}

function validateEnglishKeys(quote, field) {
  if (!Array.isArray(quote[field]) || quote[field].length === 0) {
    errors.push(`${label(quote)}: ${field} must be a non-empty array`);
    return;
  }
  for (const key of quote[field]) {
    if (!/^[a-z][a-z0-9_]*$/.test(String(key))) {
      errors.push(`${label(quote)}: ${field} key "${key}" is not an English internal key`);
    }
  }
}

for (const quote of quotes) {
  for (const field of REQUIRED) {
    if (!(field in quote)) errors.push(`${label(quote)}: missing ${field}`);
  }

  if (!Number.isInteger(quote.id)) errors.push(`${label(quote)}: id must be an integer`);
  if (seenIds.has(quote.id)) errors.push(`${label(quote)}: duplicate id`);
  seenIds.add(quote.id);

  if (!hasText(quote.source)) errors.push(`${label(quote)}: source is missing`);
  if (!hasText(quote.kind)) errors.push(`${label(quote)}: kind is missing`);

  validateLocalizedField(quote, 'quote');
  validateLocalizedField(quote, 'author');
  validateLocalizedField(quote, 'meaning');
  validateLocalizedField(quote, 'action');
  validateEnglishKeys(quote, 'categories');
  validateEnglishKeys(quote, 'emotions');

  for (const field of ['quote', 'author', 'meaning', 'action']) {
    if (typeof quote[field] === 'string') {
      errors.push(`${label(quote)}: ${field} must use ko/en/ja object`);
    }
  }
}

const sortedIds = [...seenIds].sort((a, b) => a - b);
for (let index = 1; index < sortedIds.length; index += 1) {
  if (sortedIds[index] === sortedIds[index - 1]) continue;
}

if (errors.length) {
  console.error(`Quote validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Quote validation passed: ${quotes.length} quotes, ${seenIds.size} unique ids.`);
