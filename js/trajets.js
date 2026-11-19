/* Onglet Trajets (page d'accueil du site). Responsable : Adrien (données de vol).
   1. Aéroports de chaque itinéraire, étape par étape, avec recherche par nom de ville.
   2. Voitures de location : modèle, nombre de personnes, trajet ou distance, avec consommation et polluants.
   Les données sont celles de l'onglet Saisie (mêmes vols, même enregistrement) : modifier ici modifie là-bas. */
(function () {
  const F = window.FACTEURS, V = window.VEHICULES;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = (v, d = 1) => (+v || 0).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const t = (kg, d = 1) => nf(kg / 1000, d);
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const X = `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`;
  const PAYS = { FR: 'France', US: 'États-Unis', CA: 'Canada', GB: 'Royaume-Uni', DE: 'Allemagne', NL: 'Pays-Bas', BE: 'Belgique', CH: 'Suisse', ES: 'Espagne', PT: 'Portugal', IT: 'Italie', IE: 'Irlande', IS: 'Islande', TR: 'Turquie', AT: 'Autriche', DK: 'Danemark', SE: 'Suède', NO: 'Norvège', FI: 'Finlande', PL: 'Pologne', CZ: 'Tchéquie', GR: 'Grèce', AE: 'Émirats', QA: 'Qatar', MA: 'Maroc', DZ: 'Algérie', TN: 'Tunisie' };

  // ---------- Bases de recherche ----------
  const villeDe = {};
  (window.AEROPORTS_DB || []).forEach(a => { villeDe[a[0]] = a[1]; });

  function aeroports(st) {
    const all = { ...window.AEROPORTS, ...(st.aeroportsPerso || {}) };
    return Object.entries(all).map(([code, p]) => ({ code, nom: p[0], ville: villeDe[code] || p[0], pays: p[3] || '', lat: +p[1], lon: +p[2] }));
  }
  function lieux(st) {
    const v = (window.VILLES || []).map(([ville, precision, pays, lat, lon]) => ({ label: `${ville}, ${precision}`, ville, detail: precision, pays, lat, lon }));
    const a = aeroports(st).map(x => ({ label: `Aéroport ${x.nom} (${x.code})`, ville: x.ville, detail: `aéroport ${x.code}`, code: x.code, pays: x.pays, lat: x.lat, lon: x.lon }));
    return v.concat(a);
  }

  // Classement : code exact, puis ville qui commence par la saisie, puis nom, puis contient.
  function chercher(list, q, champs) {
    const n = norm(q).trim(); if (!n) return [];
    const out = [];
    for (const it of list) {
      let s = 99;
      if (it.code && norm(it.code) === n) s = 0;
      for (const [k, w] of champs) {
        const v = norm(it[k]);
        if (v.startsWith(n)) s = Math.min(s, w);
        else if (v.split(/[\s\-'’()]+/).some(m => m.startsWith(n))) s = Math.min(s, w + 2);
        else if (n.length > 2 && v.includes(n)) s = Math.min(s, w + 4);
      }
      if (s < 99) out.push([s, it]);
    }
    return out.sort((a, b) => a[0] - b[0] || String(a[1].ville).localeCompare(b[1].ville)).slice(0, 8).map(x => x[1]);
  }

  // ---------- Menu de suggestions (commun aux deux tableaux) ----------
  let menu = null, items = [], idx = -1, onPick = null, owner = null;
  function closeMenu() { if (menu) menu.remove(); menu = null; items = []; idx = -1; owner = null; }
  function openMenu(input, list, render, pick) {
    closeMenu();
    if (!list.length) return;
    owner = input; items = list; onPick = pick; idx = 0;
    menu = document.createElement('div');
    menu.className = 'ac-menu';
    menu.setAttribute('role', 'listbox');
    menu.innerHTML = list.map((it, i) => `<div class="ac-item${i === 0 ? ' on' : ''}" role="option" data-i="${i}">${render(it)}</div>`).join('');
    const r = input.getBoundingClientRect();
    menu.style.left = r.left + 'px';
    menu.style.top = (r.bottom + 4) + 'px';
    menu.style.minWidth = Math.max(r.width, 280) + 'px';
    menu.addEventListener('mousedown', e => {
      const el = e.target.closest('.ac-item'); if (!el) return;
      e.preventDefault(); const it = items[+el.dataset.i]; const f = onPick; closeMenu(); f(it);
    });
    document.body.appendChild(menu);
  }
  function moveMenu(d) {
    if (!menu) return;
    idx = (idx + d + items.length) % items.length;
    [...menu.children].forEach((c, i) => c.classList.toggle('on', i === idx));
    menu.children[idx].scrollIntoView({ block: 'nearest' });
  }
  addEventListener('scroll', closeMenu, true);
  addEventListener('resize', closeMenu);

  const surligne = (txt, q) => {
    const n = norm(q).trim(), s = String(txt), i = norm(s).indexOf(n);
    return n && i >= 0 ? `${esc(s.slice(0, i))}<b>${esc(s.slice(i, i + n.length))}</b>${esc(s.slice(i + n.length))}` : esc(s);
  };

  // ---------- Étapes d'un vol ----------
  // v.etapes garde les cases vides (escale pas encore choisie) ; v.route reste la référence pour le calcul.
  function etapes(v) {
    const codes = String(v.route || '').toUpperCase().split(/[^A-Z]+/).filter(Boolean);
    if (Array.isArray(v.etapes) && v.etapes.filter(Boolean).join('-') === codes.join('-') && v.etapes.length >= 2) return v.etapes.slice();
    while (codes.length < 2) codes.push('');
    return codes;
  }
  function setEtapes(v, arr) { v.etapes = arr; v.route = arr.filter(Boolean).join('-'); }
  const affAeroport = (code, st) => {
    if (!code) return '';
    const a = Calc.aeroport(code, st);
    return a ? `${villeDe[code] || a.nom} · ${a.nom}` : code;
  };

  // =====================================================================
  // Vue
  // =====================================================================
  function view(ctx) {
    const st = ctx.st();
    const r = Calc.calculer(st);
    return `
      <div class="head"><div><div class="page-title">Collecte des données · Adrien</div><h1 style="font-size:28px">Itinéraires et voitures de location</h1></div></div>
      <div class="note" style="--i:0">Tapez le <b>nom d'une ville</b> (ex. « Atlanta », « Paris », « Montréal ») : le site propose ses aéroports. Ajoutez une ligne par escale. Les distances et les émissions se recalculent tout de suite, et tout est repris dans les onglets Saisie, Synthèse et Rapport.</div>

      <h2 class="section mt2">1. Aéroports de l'itinéraire</h2>
      <div class="grid grid-2 tj-grid">
      ${st.groupes.map((g, gi) => `
        <div class="card" style="--i:${gi + 1}">
          <div class="group-head"><span class="dot" style="width:12px;height:12px;background:var(${gi ? '--c-hec' : '--c-kelley'})"></span><b>${esc(g.nom)}</b>
            <span class="pill accent" style="margin-left:auto">${t(r.groupes[gi].air)} tCO2e en vol</span></div>
          ${g.vols.map((v, vi) => volTable(st, r, g, gi, v, vi)).join('')}
          <button class="btn sm mt no-print" data-tj="add-vol" data-g="${gi}">+ Ajouter un itinéraire</button>
        </div>`).join('')}
      </div>

      <h2 class="section mt2">2. Voitures de location</h2>
      <p class="muted sub">Une ligne par trajet. Indiquez le trajet (ville de départ et d'arrivée) <b>ou</b> directement la distance. Le modèle donne la consommation moyenne, les émissions et les polluants.</p>
      <datalist id="sources-tj"><option value="Hypothèse"><option value="Responsable Study Tour"><option value="Questionnaire étudiant"><option value="Devis du loueur"></datalist>
      ${st.groupes.map((g, gi) => locTable(st, r, g, gi)).join('')}

      <details class="card mt2 more tj-db" style="--i:5"><summary>Base de véhicules : consommation, émissions et normes</summary>
        <div class="table-wrap mt"><table>
          <thead><tr><th>Catégorie</th><th>Modèle (ou similaire)</th><th class="r">Places</th><th>Énergie</th><th class="r">Conso. /100 km</th><th class="r">kgCO2e / km véhicule</th><th>Norme</th><th class="r">NOx mg/km</th><th class="r">PM mg/km</th><th>Source</th></tr></thead>
          <tbody>${V.modeles.map(m => {
            const e = V.energies[m.energie === 'elec' ? 'elec_us' : m.energie], n = V.normes[m.norme];
            return `<tr><td>${esc(m.cat)}</td><td>${esc(m.label)}</td><td class="r num">${m.places}</td><td>${m.energie === 'elec' ? 'Électrique' : esc(e.label)}</td>
              <td class="r num">${nf(m.conso, 1)} ${e.unite}</td><td class="r num">${m.energie === 'elec' ? `${nf(m.conso / 100 * V.energies.elec_us.f + V.fabricationKm, 3)} (US) · ${nf(m.conso / 100 * V.energies.elec_qc.f + V.fabricationKm, 3)} (QC)` : nf(m.conso / 100 * e.f + V.fabricationKm, 3)}</td>
              <td class="muted">${esc(n.label)}</td><td class="r num">${nf(n.nox, 1)}</td><td class="r num">${nf(n.pm, 1)}</td><td class="muted">${esc(m.source)}</td></tr>`; }).join('')}</tbody>
        </table></div>
        <ul class="muted mt" style="font-size:12.5px">
          ${Object.values(V.energies).map(e => `<li>${esc(e.label)} : ${nf(e.f, 4)} kgCO2e/${e.unite}. ${esc(e.source)}</li>`).join('')}
          <li>Fabrication du véhicule : ${nf(V.fabricationKm, 3)} kgCO2e par km (ADEME 43791).</li>
          <li>Distance calculée depuis deux villes : vol d'oiseau × ${nf(V.detourRoute, 1)} (hypothèse). Remplacer par la vraie distance routière quand elle est connue.</li>
          <li><b>Polluants :</b> valeurs limites de la norme d'homologation, pas des mesures réelles (souvent plus élevées sur la route). Ce sont des polluants locaux : ils ne s'ajoutent jamais aux tCO2e.</li>
        </ul>
      </details>`;
  }

  function volTable(st, r, g, gi, v, vi) {
    const et = etapes(v);
    const res = r.groupes[gi].vols[vi];
    const pts = et.map(c => c ? Calc.aeroport(c, st) : null);
    return `
      <div class="tj-vol">
        <div class="tj-vol-head"><input class="field tj-label" data-tjv="label" data-g="${gi}" data-v="${vi}" value="${esc(v.label)}" aria-label="Nom de l'itinéraire">
          <span class="muted tj-meta">${v.pax} pass. · ${esc(F.classes[v.classe]?.label || '')} · ${v.ar ? 'aller-retour' : 'aller simple'} · <a href="#/saisie">modifier</a></span>
          <button class="icon-x" data-tj="del-vol" data-g="${gi}" data-v="${vi}" aria-label="Supprimer l'itinéraire" title="Supprimer l'itinéraire">${X}</button></div>
        <div class="table-wrap"><table class="tj-air">
          <thead><tr><th>Étape</th><th>Ville ou aéroport</th><th>Code</th><th>Pays</th><th class="r">Segment</th><th></th></tr></thead>
          <tbody>${et.map((c, i) => {
            const a = pts[i], prev = pts[i - 1];
            const nom = i === 0 ? 'Départ' : i === et.length - 1 ? 'Arrivée' : `Escale ${i}`;
            const d = a && prev ? Calc.orthodromie(prev, a) + F.correctionKm : null;
            return `<tr>
              <td class="tj-step"><span class="tj-dot ${i === 0 || i === et.length - 1 ? 'end' : ''}"></span>${nom}</td>
              <td><input class="field ac ${c && !a ? 'err' : ''}" data-ac="aeroport" data-g="${gi}" data-v="${vi}" data-e="${i}" value="${esc(affAeroport(c, st))}" placeholder="Tapez une ville…" autocomplete="off" aria-label="${nom}"></td>
              <td class="num"><b>${esc(c)}</b></td>
              <td class="muted">${a ? esc(PAYS[a.pays] || a.pays) : ''}</td>
              <td class="r num muted">${d ? nf(d, 0) + ' km' : ''}</td>
              <td>${i > 0 && i < et.length - 1 ? `<button class="icon-x" data-tj="del-stop" data-g="${gi}" data-v="${vi}" data-e="${i}" aria-label="Retirer l'escale">${X}</button>` : ''}</td></tr>`; }).join('')}</tbody>
        </table></div>
        <div class="tj-vol-foot"><button class="btn sm ghost no-print" data-tj="add-stop" data-g="${gi}" data-v="${vi}">+ Ajouter une escale</button>
          <span class="muted">${res && !res.err ? `${res.legs.length} segment${res.legs.length > 1 ? 's' : ''} · <b class="num">${t(res.air)} tCO2e</b>` : '<span class="tj-warn">Itinéraire incomplet</span>'}</span></div>
      </div>`;
  }

  const modeleOptions = sel => {
    const cats = [...new Set(V.modeles.map(m => m.cat))];
    return `<option value="" ${sel ? '' : 'selected'}>Choisir…</option>` + cats.map(c => `<optgroup label="${esc(c)}">${V.modeles.filter(m => m.cat === c).map(m => `<option value="${m.id}" ${m.id === sel ? 'selected' : ''}>${esc(m.label)} (${m.places} pl.)</option>`).join('')}</optgroup>`).join('');
  };

  function locTable(st, r, g, gi) {
    const L = g.locations || [];
    const rg = r.groupes[gi];
    const tot = (rg.loc || []).reduce((s, x) => ({ kg: s.kg + x.kg, nox: s.nox + x.nox, pm: s.pm + x.pm, co: s.co + x.co }), { kg: 0, nox: 0, pm: 0, co: 0 });
    return `
      <div class="card mt" style="--i:${gi + 3}">
        <div class="group-head"><span class="dot" style="width:12px;height:12px;background:var(${gi ? '--c-hec' : '--c-kelley'})"></span><b>${esc(g.nom)}</b>
          <span class="pill accent" style="margin-left:auto" id="tj-tot-${gi}">${t(tot.kg, 2)} tCO2e</span></div>
        ${L.length ? `<div class="table-wrap"><table class="tj-loc">
          <thead><tr><th>Trajet</th><th>De</th><th>À</th><th class="r">km (aller)</th><th>Véhicule</th><th class="r">Voitures</th><th class="r">Pers. / voiture</th><th>A/R</th><th>Source</th>
            <th class="r">Carburant</th><th class="r">kgCO2e</th><th class="r">kg / pers.</th><th class="r" title="Valeur limite de la norme (NMOG + NOx aux US et au Canada)">NOx (g)</th><th class="r" title="Particules fines, valeur limite de la norme">PM (g)</th><th class="r" title="Monoxyde de carbone, valeur limite de la norme">CO (g)</th><th></th></tr></thead>
          <tbody>${L.map((l, i) => {
            const x = rg.loc[i] || {}, m = V.modeles.find(mm => mm.id === l.modele);
            const trop = m && +l.pers > m.places;
            return `<tr>
              <td><input data-lf="label" data-g="${gi}" data-i="${i}" value="${esc(l.label)}" style="min-width:160px" placeholder="ex. Visite Chicago"></td>
              <td><input class="ac" data-ac="lieu" data-lf="de" data-g="${gi}" data-i="${i}" value="${esc(l.de)}" placeholder="Ville…" autocomplete="off" style="min-width:150px"></td>
              <td><input class="ac" data-ac="lieu" data-lf="a" data-g="${gi}" data-i="${i}" value="${esc(l.a)}" placeholder="Ville…" autocomplete="off" style="min-width:150px"></td>
              <td><input type="number" min="0" class="w-num" data-lf="km" data-g="${gi}" data-i="${i}" value="${l.km || ''}" placeholder="km" title="${l.kmAuto ? `Calculé : vol d'oiseau × ${nf(V.detourRoute, 1)}. Modifiable.` : 'Distance saisie'}">${l.kmAuto ? '<div class="legs">≈ estimé</div>' : ''}</td>
              <td><select data-lf="modele" data-g="${gi}" data-i="${i}">${modeleOptions(l.modele)}</select>${m ? `<div class="legs">${esc(m.cat)} · ${nf(m.conso, 1)} ${m.energie === 'elec' ? 'kWh' : 'L'}/100 km</div>` : ''}</td>
              <td><input type="number" min="0" class="w-num" data-lf="nv" data-g="${gi}" data-i="${i}" value="${l.nv}"></td>
              <td><input type="number" min="0" class="w-num ${trop ? 'err' : ''}" data-lf="pers" data-g="${gi}" data-i="${i}" value="${l.pers}" title="${trop ? `Plus que les ${m.places} places du véhicule` : ''}"></td>
              <td><input type="checkbox" class="check" data-lf="ar" data-g="${gi}" data-i="${i}" ${l.ar ? 'checked' : ''}></td>
              <td><input data-lf="source" data-g="${gi}" data-i="${i}" value="${esc(l.source)}" list="sources-tj" class="w-sm"></td>
              <td class="r num" data-out="qty">${x.bus ? '<span class="faint">navette</span>' : x.qty ? `${nf(x.qty, 0)} ${x.unite}` : '–'}</td>
              <td class="r num" data-out="kg"><b>${nf(x.kg || 0, 1)}</b></td>
              <td class="r num" data-out="pp">${nf(x.parPers || 0, 1)}</td>
              <td class="r num" data-out="nox">${nf(x.nox || 0, 1)}</td>
              <td class="r num" data-out="pm">${nf(x.pm || 0, 2)}</td>
              <td class="r num" data-out="co">${nf(x.co || 0, 0)}</td>
              <td><button class="icon-x" data-tj="del-loc" data-g="${gi}" data-i="${i}" aria-label="Supprimer">${X}</button></td></tr>`; }).join('')}</tbody>
          <tfoot><tr><td colspan="10">Total ${esc(g.nom.split(' (')[0])}</td><td class="r num" data-tot="kg">${nf(tot.kg, 1)}</td><td></td><td class="r num" data-tot="nox">${nf(tot.nox, 1)}</td><td class="r num" data-tot="pm">${nf(tot.pm, 2)}</td><td class="r num" data-tot="co">${nf(tot.co, 0)}</td><td></td></tr></tfoot>
        </table></div>` : '<p class="muted" style="font-size:13px">Aucune voiture de location pour ce groupe.</p>'}
        <button class="btn sm mt no-print" data-tj="add-loc" data-g="${gi}">+ Ajouter une location</button>
      </div>`;
  }

  // Mise à jour des chiffres d'une ligne sans tout redessiner (le curseur reste dans la case).
  function refreshLoc(view, ctx) {
    const st = ctx.st(), r = Calc.calculer(st);
    st.groupes.forEach((g, gi) => {
      const rg = r.groupes[gi];
      const rows = view.querySelectorAll(`.tj-loc [data-lf="label"][data-g="${gi}"]`);
      rows.forEach(inp => {
        const i = +inp.dataset.i, x = rg.loc[i] || {}, tr = inp.closest('tr');
        const set = (k, v) => { const c = tr.querySelector(`[data-out="${k}"]`); if (c) c.innerHTML = v; };
        set('qty', x.bus ? '<span class="faint">navette</span>' : x.qty ? `${nf(x.qty, 0)} ${x.unite}` : '–');
        set('kg', `<b>${nf(x.kg || 0, 1)}</b>`); set('pp', nf(x.parPers || 0, 1));
        set('nox', nf(x.nox || 0, 1)); set('pm', nf(x.pm || 0, 2)); set('co', nf(x.co || 0, 0));
        const l = g.locations[i], m = V.modeles.find(mm => mm.id === l.modele), p = tr.querySelector('[data-lf="pers"]');
        if (p) p.classList.toggle('err', !!(m && +l.pers > m.places));
      });
      const tot = (rg.loc || []).reduce((s, x) => ({ kg: s.kg + x.kg, nox: s.nox + x.nox, pm: s.pm + x.pm, co: s.co + x.co }), { kg: 0, nox: 0, pm: 0, co: 0 });
      const pill = view.querySelector(`#tj-tot-${gi}`); if (pill) pill.textContent = `${t(tot.kg, 2)} tCO2e`;
      const card = pill && pill.closest('.card');
      if (card) [['kg', 1], ['nox', 1], ['pm', 2], ['co', 0]].forEach(([k, d]) => { const c = card.querySelector(`[data-tot="${k}"]`); if (c) c.textContent = nf(tot[k], d); });
    });
  }

  function kmAuto(l) {
    if (l.deC && l.aC) {
      const d = Calc.orthodromie({ lat: l.deC[0], lon: l.deC[1] }, { lat: l.aC[0], lon: l.aC[1] });
      l.km = Math.round(d * V.detourRoute); l.kmAuto = true;
    }
  }

  // =====================================================================
  // Interactions
  // =====================================================================
  function bind(view, ctx) {
    const st = () => ctx.st();
    const done = soft => { ctx.save(); ctx.render(soft !== false); };

    view.addEventListener('input', e => {
      const el = e.target, s = st();
      if (el.dataset.ac === 'aeroport') {
        const q = el.value;
        openMenu(el, chercher(aeroports(s), q, [['ville', 1], ['nom', 2], ['code', 1]]),
          a => `<span class="ac-code">${esc(a.code)}</span><span><b>${surligne(a.ville, q)}</b> · ${surligne(a.nom, q)}<small>${esc(PAYS[a.pays] || a.pays)}</small></span>`,
          a => { const v = s.groupes[+el.dataset.g].vols[+el.dataset.v], arr = etapes(v); arr[+el.dataset.e] = a.code; setEtapes(v, arr); done(); });
        return;
      }
      if (el.dataset.tjv === 'label') { s.groupes[+el.dataset.g].vols[+el.dataset.v].label = el.value; ctx.save(); return; }
      const f = el.dataset.lf; if (!f) return;
      const l = s.groupes[+el.dataset.g].locations[+el.dataset.i];
      if (f === 'de' || f === 'a') {
        l[f] = el.value; l[f + 'C'] = null; ctx.save();
        const q = el.value;
        openMenu(el, chercher(lieux(s), q, [['ville', 1], ['label', 3], ['code', 1]]),
          p => `<span class="ac-code">${p.code ? '✈' : '●'}</span><span><b>${surligne(p.ville, q)}</b> · ${esc(p.detail)}<small>${esc(PAYS[p.pays] || p.pays)}</small></span>`,
          p => { l[f] = p.label; l[f + 'C'] = [p.lat, p.lon]; kmAuto(l); done(); });
        return;
      }
      const val = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? 0 : +el.value) : el.value;
      l[f] = val;
      if (f === 'km') l.kmAuto = false;
      ctx.save();
      if (f === 'modele') return ctx.render(true); // la ligne d'info du modèle change
      refreshLoc(view, ctx);
    });

    view.addEventListener('keydown', e => {
      if (!menu || e.target !== owner) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); moveMenu(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); moveMenu(-1); }
      else if (e.key === 'Enter' || e.key === 'Tab') { if (items[idx]) { e.preventDefault(); const it = items[idx], f = onPick; closeMenu(); f(it); } }
      else if (e.key === 'Escape') closeMenu();
    });

    // En quittant une case aéroport : accepter un code IATA tapé directement, ou vider l'étape.
    view.addEventListener('focusout', e => {
      const el = e.target; if (el.dataset.ac !== 'aeroport') return;
      setTimeout(() => {
        if (menu && owner === el) closeMenu();
        if (!el.isConnected) return;
        const s = st(), v = s.groupes[+el.dataset.g].vols[+el.dataset.v], arr = etapes(v), i = +el.dataset.e;
        const txt = el.value.trim().toUpperCase();
        if (!txt) { if (arr[i]) { arr[i] = ''; setEtapes(v, arr); done(); } return; }
        if (/^[A-Z]{3}$/.test(txt) && Calc.aeroport(txt, s) && txt !== arr[i]) { arr[i] = txt; setEtapes(v, arr); done(); return; }
        if (txt !== affAeroport(arr[i], s).toUpperCase()) el.value = affAeroport(arr[i], s); // saisie abandonnée
      }, 120);
    });
    view.addEventListener('focusout', e => { if (e.target.dataset.ac === 'lieu') setTimeout(() => { if (owner === e.target) closeMenu(); }, 120); });

    view.addEventListener('click', e => {
      const b = e.target.closest('[data-tj]'); if (!b) return;
      const s = st(), g = s.groupes[+b.dataset.g];
      switch (b.dataset.tj) {
        case 'add-stop': { const v = g.vols[+b.dataset.v], arr = etapes(v); arr.splice(arr.length - 1, 0, ''); setEtapes(v, arr); done(); break; }
        case 'del-stop': { const v = g.vols[+b.dataset.v], arr = etapes(v); arr.splice(+b.dataset.e, 1); setEtapes(v, arr); done(); break; }
        case 'add-vol': g.vols.push({ label: 'Nouvel itinéraire', route: '', etapes: ['', ''], pax: g.participants, classe: 'eco', ar: true, source: 'Hypothèse' }); done(); break;
        case 'del-vol': if (confirm('Supprimer cet itinéraire ?')) { g.vols.splice(+b.dataset.v, 1); done(); } break;
        case 'add-loc': (g.locations ||= []).push({ label: '', de: '', a: '', km: 0, modele: '', nv: 1, pers: 4, ar: true, source: 'Hypothèse' }); done(); break;
        case 'del-loc': g.locations.splice(+b.dataset.i, 1); done(); break;
      }
    });
  }

  window.Trajets = { view, bind };
})();
