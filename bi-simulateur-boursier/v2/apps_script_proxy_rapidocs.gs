/**
 * BI Simulateur Boursier V2 Rapidocs - Proxy Google Apps Script
 * Rôle : cacher les clés API et normaliser les réponses vers le BI HTML.
 * Script Properties : PROVIDER = alphavantage | fmp | twelvedata, API_KEY = votre clé, CACHE_SECONDS = 2/5/10
 */
function doGet(e) {
  var symbol = String((e.parameter.symbol || 'AAPL')).toUpperCase();
  var provider = String(e.parameter.provider || PropertiesService.getScriptProperties().getProperty('PROVIDER') || 'fmp').toLowerCase();
  var apiKey = PropertiesService.getScriptProperties().getProperty('API_KEY');
  var cacheSeconds = Number(PropertiesService.getScriptProperties().getProperty('CACHE_SECONDS') || '2');
  if (!apiKey) return out_({ error: 'API_KEY manquante dans Script Properties' });
  var cache = CacheService.getScriptCache();
  var key = provider + ':' + symbol;
  var hit = cache.get(key);
  if (hit) return out_(JSON.parse(hit));
  try {
    var data;
    if (provider === 'fmp') data = fmp_(symbol, apiKey);
    else if (provider === 'alphavantage') data = alpha_(symbol, apiKey);
    else if (provider === 'twelvedata') data = twelve_(symbol, apiKey);
    else return out_({ error: 'Provider non supporté: ' + provider });
    data.provider = provider;
    data.serverTime = new Date().toISOString();
    cache.put(key, JSON.stringify(data), Math.max(1, cacheSeconds));
    return out_(data);
  } catch (err) { return out_({ error: String(err), symbol: symbol, provider: provider }); }
}
function fmp_(symbol, apiKey) {
  var url = 'https://financialmodelingprep.com/stable/quote?symbol=' + encodeURIComponent(symbol) + '&apikey=' + encodeURIComponent(apiKey);
  var json = JSON.parse(UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText());
  var r = Array.isArray(json) ? json[0] : json;
  if (!r || !r.price) throw new Error('FMP quote vide');
  return { symbol: symbol, price: Number(r.price), changePct: Number(r.changesPercentage || 0), volume: Number(r.volume || 0), currency: symbol.indexOf('.PA') > -1 ? 'EUR' : 'USD' };
}
function alpha_(symbol, apiKey) {
  var url = 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=' + encodeURIComponent(symbol) + '&apikey=' + encodeURIComponent(apiKey);
  var json = JSON.parse(UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText());
  var g = json['Global Quote'];
  if (!g || !g['05. price']) throw new Error(json.Note || json.Information || 'Alpha Vantage quote vide');
  return { symbol: symbol, price: Number(g['05. price']), changePct: Number(String(g['10. change percent'] || '0').replace('%','')), volume: Number(g['06. volume'] || 0), currency: symbol.indexOf('.PA') > -1 ? 'EUR' : 'USD' };
}
function twelve_(symbol, apiKey) {
  var url = 'https://api.twelvedata.com/quote?symbol=' + encodeURIComponent(symbol) + '&apikey=' + encodeURIComponent(apiKey);
  var json = JSON.parse(UrlFetchApp.fetch(url, { muteHttpExceptions: true }).getContentText());
  if (json.status === 'error' || json.code) throw new Error(json.message || 'Twelve Data erreur');
  return { symbol: symbol, price: Number(json.close), changePct: Number(json.percent_change || 0), volume: Number(json.volume || 0), currency: json.currency || (symbol.indexOf('.PA') > -1 ? 'EUR' : 'USD') };
}
function out_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }