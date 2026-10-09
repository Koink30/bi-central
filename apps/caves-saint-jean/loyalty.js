/* Loyalty rules are stored with the cave; cards are derived from recorded sales. */
(function (root) {
  'use strict';
  const defaults = Object.freeze({ enabled: false, target: 10, rewardPercent: 10,
    minPurchaseCents: 0, includeProfessionals: false, stackDiscounts: false,
    countRewardPurchase: false });
  function number(value, min, max, integer = false) {
    const n = Number(value);
    if (value === '' || value === null || !Number.isFinite(n) || n < min || n > max || (integer && !Number.isSafeInteger(n)))
      throw new Error('Paramètre de fidélité incorrect.');
    return n;
  }
  function normalize(value = {}) {
    const s = { ...defaults, ...value };
    return { enabled: !!s.enabled, target: number(s.target, 1, 50, true),
      rewardPercent: number(s.rewardPercent, 0.01, 100),
      minPurchaseCents: number(s.minPurchaseCents, 0, 100000000, true),
      includeProfessionals: !!s.includeProfessionals, stackDiscounts: !!s.stackDiscounts,
      countRewardPurchase: !!s.countRewardPurchase };
  }
  function total(lines) {
    return lines.reduce((sum, line) => {
      const net = Math.round(line.price * line.qty * (1 - line.discount / 100));
      return sum + (line.basis === 'HT' ? net + Math.round(net * line.vat / 100) : net);
    }, 0);
  }
  function cancelled(state, sale) {
    return state.invoices.some(invoice => invoice.kind === 'invoice' && invoice.sourceId === sale.id &&
      (invoice.creditId || state.invoices.some(credit => credit.kind === 'credit' && credit.sourceId === invoice.id)));
  }
  function earned(state, sale) {
    const card = sale.loyalty;
    if (!card || cancelled(state, sale)) return 0;
    const invoice = state.invoices.find(doc => doc.kind === 'invoice' && doc.sourceId === sale.id);
    const paid = (invoice ? invoice.payments : sale.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const amount = total(sale.lines);
    return card.eligibleStamp && amount > 0 && paid >= amount ? 1 : 0;
  }
  function account(state, clientId) {
    const settings = normalize(state.settings.loyalty);
    let balance = 0, purchases = 0, redeemed = 0;
    for (const sale of state.sales) {
      if (sale.client?.id !== clientId || !sale.loyalty || cancelled(state, sale)) continue;
      const stamp = earned(state, sale);
      balance += stamp - sale.loyalty.spentStamps;
      purchases += stamp;
      if (sale.loyalty.spentStamps) redeemed++;
    }
    const available = Math.max(0, balance);
    return { balance, purchases, redeemed, available, target: settings.target,
      rewards: Math.floor(available / settings.target), progress: available % settings.target };
  }
  function prepare(state, clientId, lines, redeem = false, strict = false) {
    const settings = normalize(state.settings.loyalty);
    const client = state.clients.find(c => c.id === clientId);
    const card = account(state, clientId);
    const eligible = !!client && settings.enabled && (settings.includeProfessionals || client.type !== 'Professionnel');
    let adjusted = lines.map(line => ({ ...line }));
    const canRedeem = eligible && card.rewards > 0;
    let saving = 0, used = false;
    if (redeem && canRedeem) {
      adjusted = lines.map(line => ({ ...line, discount: settings.stackDiscounts
        ? 100 - (100 - line.discount) * (1 - settings.rewardPercent / 100)
        : Math.max(line.discount, settings.rewardPercent) }));
      saving = total(lines) - total(adjusted);
      used = saving > 0;
      if (!used) adjusted = lines.map(line => ({ ...line }));
    }
    if (strict && redeem && !used) throw new Error(canRedeem
      ? 'La réduction de fidélité ne diminue pas ce panier. Vérifiez les remises déjà appliquées.'
      : 'Cette carte ne dispose pas de récompense utilisable. Actualisez la vente.');
    const amount = total(adjusted);
    const eligibleStamp = eligible && amount > 0 && amount >= settings.minPurchaseCents && (!used || settings.countRewardPurchase);
    return { settings, card, eligible, canRedeem, saving, used, lines: adjusted,
      record: eligible ? { version: 1, eligibleStamp, spentStamps: used ? settings.target : 0,
        rewardPercent: used ? settings.rewardPercent : 0, discountAmount: saving,
        target: settings.target, minimum: settings.minPurchaseCents } : null };
  }
  function validate(state) {
    if (state.settings.loyalty) normalize(state.settings.loyalty);
    for (const sale of state.sales) if (sale.loyalty) {
      const v = sale.loyalty;
      if (v.version !== 1 || typeof v.eligibleStamp !== 'boolean') throw new Error('Carte de fidélité incorrecte.');
      number(v.spentStamps, 0, 50, true); number(v.rewardPercent, 0, 100);
      number(v.discountAmount, 0, 1000000000, true); number(v.target, 1, 50, true);
      number(v.minimum, 0, 100000000, true);
    }
    return state;
  }
  const api = { defaults, normalize, total, cancelled, earned, account, prepare, validate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.caveLoyalty = api;
})(typeof window !== 'undefined' ? window : globalThis);
