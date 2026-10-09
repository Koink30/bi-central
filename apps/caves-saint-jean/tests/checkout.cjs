/* Local-only integration checks: no network and no production writes. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const storage = new Map();
const context = {
  console, structuredClone, Intl, Date, Math, JSON, Map, Set, Number, String, Array,
  setTimeout, clearTimeout, setInterval, clearInterval, URL, Blob, TextEncoder,
  navigator: { userAgent: 'checkout-tests' },
  location: { protocol: 'https:', href: 'https://example.invalid/' },
  document: { createTextNode: text => ({textContent:text}), createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
    getElementById: () => null, getElementsByTagName: () => [{appendChild() {}}], querySelector: () => null, addEventListener() {}, removeEventListener() {} },
  localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
};
context.window = context; context.self = context; context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'loyalty.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'checkout-ui.js'), 'utf8'), context);
let bundle = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const render = '(0,gR.createRoot)(document.getElementById("root")).render((0,hR.jsx)(Dg,{}));';
assert.ok(bundle.includes(render), 'App bootstrap anchor');
bundle = bundle.replace(render, 'window.testEngine={wb,Bb,di,Ve,Sp,fi};');
try { vm.runInContext(bundle, context); } catch (error) { throw new Error('Engine test harness: ' + error.message); }
const { wb, Bb, di, Ve } = context.testEngine, loyalty = context.caveLoyalty;
let sequence = 0;
const act = (state, action, id = 'test-' + (++sequence)) => wb(state, action, id);
function fixture() {
  let s = Bb([{ id: 'wine', name: 'Vin test', domain: 'Domaine test', volume: '75 cl', family: 'Vin',
    vintage: '', active: true, confirmed: true, price: 1000, proPrice: null, cost: null, vat: 20,
    stock: null, threshold: 6, pack: 6 }]);
  s = act(s, { type: 'client', client: { name: 'Client test', type: 'Particulier', discount: 0 } }, 'new-client');
  s = act(s, { type: 'loyaltySettings', loyalty: { ...loyalty.defaults, enabled: true, target: 2 } });
  return s;
}
function sale(state, extra = {}, id) {
  return act(state, { type: 'sale', clientId: 'new-client', method: 'Carte bancaire',
    lines: [{ productId: 'wine', qty: 1, price: 1000, basis: 'TTC', discount: 0 }], ...extra }, id);
}
let state = fixture();
assert.equal(state.clients.find(c => c.id === 'new-client').name, 'Client test');
state = sale(state, {}, 'first');
assert.equal(loyalty.account(state, 'new-client').available, 1);
assert.equal(state.products[0].stock, -1);
assert.doesNotThrow(() => di(structuredClone(state)), 'Negative stock remains restorable');
state = sale(state, {}, 'second');
assert.equal(loyalty.account(state, 'new-client').rewards, 1);
const ready = structuredClone(state);
state = sale(state, { redeemLoyalty: true }, 'reward');
const discounted = state.sales[0];
assert.equal(Ve(discounted.lines).ttc, 900);
assert.equal(discounted.payments[0].amount, 900);
assert.equal(discounted.loyalty.discountAmount, 100);
assert.equal(discounted.loyalty.spentStamps, 2);
assert.equal(loyalty.account(state, 'new-client').available, 0);
assert.equal(sale(state, { redeemLoyalty: true }, 'reward').sales.length, state.sales.length, 'Idempotent retry');
assert.throws(() => sale(state, { redeemLoyalty: true }), /récompense utilisable/);
state = act(state, { type: 'invoice', id: 'reward' });
assert.equal(loyalty.account(state, 'new-client').available, 0, 'Creating invoice does not add a second stamp');
assert.equal(state.invoices[0].loyalty.discountAmount, 100);
state = act(state, { type: 'credit', id: state.invoices[0].id, note: 'Annulation test' });
assert.equal(loyalty.account(state, 'new-client').available, 2, 'Credit restores the redeemed reward');
state = act(state, { type: 'invoice', id: 'second' });
state = act(state, { type: 'credit', id: state.invoices[0].id, note: 'Annulation test' });
assert.equal(loyalty.account(state, 'new-client').available, 1, 'Credit removes the earned stamp');
let deferred = sale(fixture(), { invoiceNow: true, method: 'À régler' });
assert.equal(loyalty.account(deferred, 'new-client').available, 0);
deferred = act(deferred, { type: 'payment', id: deferred.invoices[0].id, amount: 400, method: 'Carte bancaire' });
assert.equal(loyalty.account(deferred, 'new-client').available, 0, 'Partial payment does not stamp');
deferred = act(deferred, { type: 'payment', id: deferred.invoices[0].id, amount: 600, method: 'Carte bancaire' });
assert.equal(loyalty.account(deferred, 'new-client').available, 1, 'Full payment stamps once');
let noGain = loyalty.prepare(ready, 'new-client', [{ price: 1000, qty: 1, basis: 'TTC', vat: 20, discount: 20 }], true);
assert.equal(noGain.used, false);
assert.equal(noGain.saving, 0);
assert.throws(() => loyalty.prepare(ready, 'new-client', noGain.lines, true, true), /ne diminue pas/);
const stacked = act(ready, { type: 'loyaltySettings', loyalty: { ...ready.settings.loyalty, stackDiscounts: true } });
const stackSale = sale(stacked, { redeemLoyalty: true,
  lines: [{ productId: 'wine', qty: 1, price: 1000, basis: 'TTC', discount: 20 }] });
assert.equal(Ve(stackSale.sales[0].lines).ttc, 720, '20% then 10% gives 28%');
let excluded = sale(fixture(), { clientId: 'C001' });
assert.equal(excluded.sales[0].loyalty, null, 'Professionals excluded by default');
let anonymous = sale(fixture(), { clientId: '' });
assert.equal(anonymous.sales[0].loyalty, null);
let disabled = act(fixture(), { type: 'loyaltySettings', loyalty: loyalty.defaults });
disabled = sale(disabled);
assert.equal(disabled.sales[0].loyalty, null);
const minimum = act(fixture(), { type: 'loyaltySettings', loyalty: { ...loyalty.defaults, enabled: true, minPurchaseCents: 1500 } });
assert.equal(loyalty.account(sale(minimum), 'new-client').available, 0);
let preserved = act(ready, { type: 'settings', settings: ready.settings });
assert.equal(preserved.settings.loyalty.enabled, true, 'Standard settings edit preserves loyalty');
context.caveAccount = { role: 'user' };
assert.throws(() => act(ready, { type: 'loyaltySettings', loyalty: loyalty.defaults }), /administrateur/);
context.caveAccount = { role: 'admin' };
assert.doesNotThrow(() => di(structuredClone(stackSale)), 'Discounted backup validation');
console.log('Passed: quick client id, paid stamps, delayed payment, reward totals, retries, stale reward, invoices, credits, discount rules, minimum, roles and restore.');

if (process.argv.includes("--demo-fixture")) {
  const demo = structuredClone(ready);
  demo.products[0].stock = 12;
  demo.clients = demo.clients.filter(c => c.id === "new-client");
  demo.clients[0].name = "Camille — démonstration";
  demo.settings.confirmed = true;
  fs.writeFileSync("/tmp/cave-v24-demo.json", JSON.stringify({revision:1000,state:demo}));
}
