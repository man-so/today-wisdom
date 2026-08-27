if (typeof module === 'object' && module.exports) {
  module.exports = require('./quotes-data');
} else {
  var quotes = window.quotesData || window.quotes || [];
}
