(function (root) {
  'use strict';
  root.caveCheckoutUI = function (React, money) {
    const h = React.createElement, rules = root.caveLoyalty;
    function Picker({ items, value, onChange, label }) {
      const id = React.useId(), wrapper = React.useRef(null), input = React.useRef(null);
      const selected = items.find(item => item.id === value);
      const [text, setText] = React.useState(selected?.label || selected?.name || '');
      const [open, setOpen] = React.useState(false), [searching, setSearching] = React.useState(false);
      const [active, setActive] = React.useState(0);
      const normalize = text => String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const options = items.filter(item => !searching || normalize(item.label || item.name).includes(normalize(text))).slice(0, 80);
      React.useEffect(() => { setText(selected?.label || selected?.name || ''); setSearching(false); }, [value, selected?.label, selected?.name]);
      React.useEffect(() => { const outside = event => { if (!wrapper.current?.contains(event.target)) setOpen(false); };
        document.addEventListener('pointerdown', outside); return () => document.removeEventListener('pointerdown', outside); }, []);
      function choose(item) { if (!item) return; onChange(item.id); setText(value === '' ? '' : item.label || item.name);
        setOpen(false); setSearching(false); setActive(0); }
      function keys(event) {
        if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault();
          if (!open) { setOpen(true); setSearching(false); setActive(0); }
          else setActive(Math.max(0, Math.min(options.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1)))); }
        if (event.key === 'Enter') { event.preventDefault(); if (open) choose(options[active]); else { setOpen(true); setSearching(false); } }
        if (event.key === 'Tab') setOpen(false);
      }
      return h('div', { className: 'mouse-picker', ref: wrapper },
        h('div', { className: 'mouse-picker-input' }, h('input', { ref: input, role: 'combobox', 'aria-label': label,
          placeholder: label, value: text, autoComplete: 'off', 'aria-expanded': open, 'aria-controls': id,
          'aria-autocomplete': 'list', 'aria-activedescendant': open && options[active] ? id + '-' + active : undefined,
          onFocus: () => { setOpen(true); setSearching(false); setActive(0); },
          onClick: () => { if (!open) { setSearching(false); setActive(0); } setOpen(true); },
          onChange: event => { setText(event.target.value); setSearching(true); setOpen(true); setActive(0); }, onKeyDown: keys }),
          h('button', { type: 'button', 'aria-label': 'Afficher la liste', 'aria-expanded': open,
            onClick: () => { setOpen(!open); setSearching(false); setActive(0); } }, '⌄'),
          value && h('button', { type: 'button', 'aria-label': 'Effacer', onClick: () => { onChange(''); setText(''); setOpen(false); } }, '×')),
        open && h('div', { className: 'mouse-picker-menu', id, role: 'listbox', 'aria-label': label }, options.length
          ? options.map((item, index) => h('button', { type: 'button', role: 'option', id: id + '-' + index, key: item.id,
            'aria-selected': active === index, tabIndex: -1, onPointerDown: event => event.preventDefault(),
            onClick: () => choose(item), className: active === index ? 'cave-option-active' : '' }, item.label || item.name))
          : h('span', { role: 'status' }, 'Aucun résultat')));
    }
    function QuickClient({ act, busy, onCreated }) {
      const [open, setOpen] = React.useState(false);
      const [data, setData] = React.useState({ name: '', email: '', phone: '', type: 'Particulier' });
      const [error, setError] = React.useState('');
      const nameRef = React.useRef(null);
      React.useEffect(() => { if (open) nameRef.current?.focus(); }, [open]);
      function field(key, label, type = 'text') {
        return h('label', { className: 'field', key }, label, h('input', { ref: key === 'name' ? nameRef : null,
          type, value: data[key], onChange: event => { setData({ ...data, [key]: event.target.value }); setError(''); } }));
      }
      async function save() {
        if (!data.name.trim()) { setError('Indiquez le nom du client.'); nameRef.current?.focus(); return; }
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { setError('Vérifiez l’adresse e-mail.'); return; }
        const success = await act({ type: 'client', client: { ...data, discount: 0, discountConfirmed: false } }, false,
          (_state, requestId) => onCreated(requestId));
        if (success) { setOpen(false); setData({ name: '', email: '', phone: '', type: 'Particulier' }); setError(''); }
      }
      return h('div', { className: 'cave-quick-client' },
        h('button', { type: 'button', className: 'secondary cave-add-client', 'aria-expanded': open,
          'aria-label': 'Créer un client rapidement', disabled: busy, onClick: () => setOpen(!open) }, '+', h('span', null, 'Nouveau client')),
        open && h('fieldset', { className: 'cave-client-fields', disabled: busy },
          h('legend', null, 'Créer et sélectionner ce client'),
          h('p', { className: 'cave-muted' }, 'Le nom suffit. Vous pourrez compléter sa fiche plus tard ; le panier est conservé.'),
          h('div', { className: 'form-grid' }, field('name', 'Nom du nouveau client'), field('phone', 'Téléphone du nouveau client', 'tel'),
            field('email', 'E-mail du nouveau client', 'email'),
            h('label', { className: 'field' }, 'Type du nouveau client', h('select', { className: 'native-select', value: data.type,
              onChange: e => setData({ ...data, type: e.target.value }) }, h('option', null, 'Particulier'), h('option', null, 'Professionnel')))),
          error && h('p', { role: 'alert', className: 'notice error' }, error),
          h('div', { className: 'row' }, h('button', { type: 'button', className: 'primary', onClick: save }, 'Créer et sélectionner'),
            h('button', { type: 'button', className: 'secondary', onClick: () => { setOpen(false); setError(''); } }, 'Annuler'))));
    }
    function Card({ state, clientId, preview, redeem, onRedeem, method }) {
      const config = rules.normalize(state.settings.loyalty);
      const client = state.clients.find(c => c.id === clientId);
      const card = rules.account(state, clientId);
      if (!config.enabled) return h('section', { className: 'cave-loyalty compact' }, h('strong', null, 'Carte de fidélité'),
        h('p', null, 'Programme à configurer et activer dans Réglages → Fidélité.'));
      if (!client) return h('section', { className: 'cave-loyalty compact' }, h('strong', null, 'Carte de fidélité'),
        h('p', null, 'Sélectionnez ou créez un client pour retrouver sa carte.'));
      if (client.type === 'Professionnel' && !config.includeProfessionals) return h('section', { className: 'cave-loyalty compact' },
        h('strong', null, 'Fidélité'), h('p', null, 'Ce programme est réservé aux particuliers.'));
      const filled = card.rewards ? config.target : card.progress;
      const count = preview && method !== 'À régler' && preview.record?.eligibleStamp;
      return h('section', { className: 'cave-loyalty', 'aria-label': 'Carte de fidélité de ' + client.name },
        h('div', { className: 'cave-loyalty-head' }, h('div', null, h('small', null, 'LES CAVES DE SAINT JEAN'),
          h('h3', null, 'La carte de ' + client.name)), h('span', { className: 'badge' }, config.rewardPercent + ' % de récompense')),
        h('div', { className: 'cave-stamps', role: 'img', 'aria-label': card.available + ' tampons, seuil de ' + config.target },
          Array.from({ length: config.target }, (_, i) => h('span', { key: i, className: 'cave-stamp' + (i < filled ? ' filled' : ''), 'aria-hidden': 'true' },
            i < filled ? '✓' : i + 1))),
        h('p', { className: 'cave-card-status', 'aria-live': 'polite' }, card.rewards
          ? card.rewards + ' récompense' + (card.rewards > 1 ? 's' : '') + ' disponible' + (card.rewards > 1 ? 's' : '')
          : card.progress + ' / ' + config.target + ' tampons — encore ' + (config.target - card.progress) + ' achat(s)'),
        card.balance < 0 && h('p', null, 'Une vente a été annulée : les prochains tampons rééquilibreront la carte.'),
        preview && card.rewards > 0 && h('label', { className: 'tick cave-reward-choice' }, h('input', { type: 'checkbox', checked: !!redeem,
          onChange: event => onRedeem(event.target.checked), disabled: !preview.canRedeem }), 'Utiliser une récompense sur cette vente'),
        preview?.used && h('p', { className: 'cave-reward-saving' }, 'Réduction fidélité : −' + money(preview.saving) + ' · ' + config.target + ' tampons utilisés'),
        redeem && preview && !preview.used && h('p', { className: 'notice' }, 'Aucune réduction supplémentaire sur ce panier : la récompense sera conservée.'),
        preview && h('p', { className: 'cave-muted' }, method === 'À régler' ? 'Le tampon sera ajouté au règlement complet de la facture.'
          : count ? '+1 tampon à la validation de cet achat.' : 'Cet achat ne rapporte pas de tampon selon les règles du programme.'),
        h('small', { className: 'cave-muted' }, '1 tampon par achat réglé' + (config.minPurchaseCents ? ' à partir de ' + money(config.minPurchaseCents) : '') +
          '. Réduction utilisable à partir de l’achat suivant.'));
    }
    function Settings({ state, act, busy }) {
      const [draft, setDraft] = React.useState(() => rules.normalize(state.settings.loyalty));
      const [error, setError] = React.useState(''), [message, setMessage] = React.useState('');
      React.useEffect(() => setDraft(rules.normalize(state.settings.loyalty)), [state.settings.loyalty]);
      const role = root.caveAccount?.role;
      if (role && role !== 'admin' && role !== 'local') return null;
      function update(key, value) { setDraft({ ...draft, [key]: value }); setError(''); setMessage(''); }
      function check(key, label) { return h('label', { className: 'tick', key }, h('input', { type: 'checkbox', checked: draft[key],
        onChange: e => update(key, e.target.checked), disabled: busy }), label); }
      function numeric(key, label, min, max, step, cents = false) {
        return h('label', { className: 'field', key }, label, h('input', { type: 'number', min, max, step, required: true,
          value: cents ? (draft[key] === '' ? '' : draft[key] / 100) : draft[key], disabled: busy,
          onChange: e => update(key, e.target.value === '' ? '' : cents ? Math.round(Number(e.target.value) * 100) : Number(e.target.value)) }));
      }
      async function save(e) {
        e.preventDefault();
        try { const value = rules.normalize(draft); const ok = await act({ type: 'loyaltySettings', loyalty: value }, false);
          if (ok) setMessage('Règles de fidélité enregistrées.');
        } catch (err) { setError(err.message); }
      }
      return h('section', { className: 'panel cave-loyalty-settings' }, h('div', { className: 'panel-head' }, h('h2', null, 'Fidélité — cartes à tampons')),
        h('form', { onSubmit: save, className: 'padded' }, h('p', null, 'Validez les règles réelles du magasin avant d’activer le programme. Les anciens achats ne sont pas tamponnés rétroactivement.'),
          check('enabled', 'Activer le programme de fidélité'), h('div', { className: 'form-grid' },
            numeric('target', 'Tampons nécessaires pour une récompense', 1, 50, 1),
            numeric('rewardPercent', 'Réduction de la récompense (%)', 0.01, 100, 0.01),
            numeric('minPurchaseCents', 'Montant minimal TTC par achat (€)', 0, 1000000, 0.01, true)),
          check('includeProfessionals', 'Inclure les clients professionnels'),
          check('stackDiscounts', 'Cumuler la récompense avec les remises des lignes'),
          check('countRewardPurchase', 'Ajouter un tampon sur un achat utilisant une récompense'),
          h('p', { className: 'cave-muted' }, 'Sans cumul, la remise la plus avantageuse est retenue sur chaque ligne. Une récompense sans gain est conservée. Une vente annulée par avoir retire ses tampons et restitue la récompense utilisée.'),
          error && h('p', { role: 'alert', className: 'notice error' }, error), message && h('p', { role: 'status' }, message),
          h('button', { type: 'submit', className: 'primary', disabled: busy }, 'Enregistrer les règles de fidélité')));
    }
    return { Picker, QuickClient, Card, Settings };
  };
})(window);
