/**
 * Proxy Google Apps Script pour BI Simulateur Boursier.
 * But : éviter d'exposer une clé API dans GitHub Pages.
 * Déploiement : Apps Script > Deploy > New deployment > Web app.
 * Propriétés script recommandées : API_KEY et PROVIDER.
 */
function doGet(e) {
  const symbol = (e.parameter.symbol || 'AAPL').toUpperCase();
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('API_KEY');
  const provider = props.getProperty('PROVIDER') || 'alphavantage';
  if (!apiKey) return json_({ error: 'API_KEY manquante dans Script Properties' });
  try {
    if (provider === 'alphavantage') return json_(alphaVantage_(symbol, apiKey));
    if (provider === 'fmp') return json_(fmp_(symbol, apiKey));
    return json_({ error: 'Provider non supporté par ce proxy: ' + provider });
  } catch (err) {
    return json_({ error: String(err) });
  }
}
function alphaVantage_(symbol, apiKey) {
  const quoteUrl = 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=' + encodeURIComponent(symbol) + '&apikey=' + encodeURIComponent(apiKey);
  const histUrl = 'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=' + encodeURIComponent(symbol) + '&outputsize=compact&apikey=' + encodeURIComponent(apiKey);
  const q = JSON.parse(UrlFetchApp.fetch(quoteUrl).getContentText());
  const h = JSON.parse(UrlFetchApp.fetch(histUrl).getContentText());
  const g = q['Global Quote'];
  if (!g || !g['05. price']) throw new Error(q.Note || q.Information || 'Quote vide');
  const series = h['Time Series (Daily)'] || {};
  const prices = Object.keys(series).slice(0,80).reverse().map(function(date){ return { date: date, close: Number(series[date]['4. close']) }; });
  return { symbol: symbol, price: Number(g['05. price']), changePct: Number(String(g['10. change percent']).replace('%','')), prices: prices, currency: symbol.indexOf('.PA')>-1 ? 'EUR' : 'USD' };
}
function fmp_(symbol, apiKey) {
  const quoteUrl = 'https://financialmodelingprep.com/stable/quote?symbol=' + encodeURIComponent(symbol) + '&apikey=' + encodeURIComponent(apiKey);
  const histUrl = 'https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=' + encodeURIComponent(symbol) + '&apikey=' + encodeURIComponent(apiKey);
  const q = JSON.parse(UrlFetchApp.fetch(quoteUrl).getContentText());
  const h = JSON.parse(UrlFetchApp.fetch(histUrl).getContentText());
  const row = Array.isArray(q) ? q[0] : q;
  if (!row || !row.price) throw new Error('Quote vide');
  const historical = h.historical || h || [];
  const prices = historical.slice(0,80).reverse().map(function(v){ return { date: v.date, close: Number(v.close) }; });
  return { symbol: symbol, price: Number(row.price), changePct: Number(row.changesPercentage), prices: prices, currency: symbol.indexOf('.PA')>-1 ? 'EUR' : 'USD' };
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}