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

  // ---------- Étapes d'un itinéraire ----------
  // v.etapes garde les cases vides (escale pas encore choisie) ; v.route reste la référence pour le calcul.
  // v.modes[i] = moyen de transport pour ARRIVER à l'étape i (avion, autocar, train, voiture) ;
  // v.legModes = la même chose par segment de v.route, lu par le calcul (js/calc.js).
  const MODES = [['avion', '✈', 'Avion'], ['autocar', '🚌', 'Bus / autocar'], ['train', '🚆', 'Train'], ['voiture', '🚗', 'Voiture']];
  const modeDe = k => MODES.find(m => m[0] === k) || MODES[0];
  function etat(v) {
    const codes = String(v.route || '').toUpperCase().split(/[^A-Z]+/).filter(Boolean);
    if (Array.isArray(v.etapes) && v.etapes.filter(Boolean).join('-') === codes.join('-') && v.etapes.length >= 2) {
      const et = v.etapes.slice();
      const mo = Array.isArray(v.modes) && v.modes.length === et.length ? v.modes.slice() : et.map((_, i) => i ? 'avion' : '');
      return { et, mo };
    }
    while (codes.length < 2) codes.push('');
    const lm = Array.isArray(v.legModes) ? v.legModes : [];
    return { et: codes, mo: codes.map((_, i) => i ? (lm[i - 1] || 'avion') : '') };
  }
  function setEtat(v, et, mo) {
    v.etapes = et; v.modes = mo; v.route = et.filter(Boolean).join('-');
    let premier = true; v.legModes = [];
    et.forEach((c, i) => { if (!c) return; if (premier) { premier = false; return; } v.legModes.push(mo[i] || 'avion'); });
  }
  const affAeroport = (code, st) => {
    if (!code) return '';
    const a = Calc.aeroport(code, st);
    if (!a) return code;
    const ville = villeDe[code] || a.nom;
    return norm(a.nom).startsWith(norm(ville)) ? a.nom : `${ville} · ${a.nom}`; // évite « Atlanta · Atlanta »
  };

  // =====================================================================
  // Vue
  // =====================================================================
  function view(ctx) {
    const st = ctx.st();
    const r = Calc.calculer(st, { saisies: [] });
    return `
      <div class="head"><div><div class="page-title">Collecte des données · Adrien</div><h1 style="font-size:28px">Itinéraires et voitures de location</h1></div></div>
      <div class="note" style="--i:0">Tapez le <b>nom d'une ville</b> (ex. « Atlanta », « Paris », « Montréal ») : le site propose ses aéroports. Ajoutez une ligne par escale. Pour chaque segment, choisissez le <b>moyen de transport</b> : par exemple Atlanta → Indianapolis en <b>🚌 bus</b> plutôt qu'en avion. Les distances et les émissions se recalculent tout de suite, et tout est repris dans les onglets Saisie, Synthèse et Rapport.</div>

      <h2 class="section mt2">1. Itinéraires : vols, bus et trains</h2>
      <div class="grid grid-2 tj-grid">
      ${st.groupes.map((g, gi) => {
        const sol = r.groupes[gi].vols.reduce((s, x) => s + (x.sol || 0), 0);
        return `
        <div class="card" style="--i:${gi + 1}">
          <div class="group-head"><span class="dot" style="width:12px;height:12px;background:var(${gi ? '--c-hec' : '--c-kelley'})"></span><b>${esc(g.nom)}</b>
            <span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap"><span class="pill accent">✈ ${t(r.groupes[gi].air)} tCO2e</span>${sol ? `<span class="pill tj-pill-sol">🚌 ${t(sol, 2)} tCO2e</span>` : ''}</span></div>
          ${repartition(g)}
          ${g.vols.map((v, vi) => volTable(st, r, g, gi, v, vi)).join('')}
          <button class="btn sm mt no-print" data-tj="add-vol" data-g="${gi}">+ Ajouter un itinéraire</button>
        </div>`; }).join('')}
      </div>

      <h2 class="section mt2">2. Voitures de location sur place</h2>
      <p class="muted sub">Une fiche par trajet en voiture de location. Indiquez la ville de départ et d'arrivée (la distance se calcule seule) <b>ou</b> tapez directement la distance. Le véhicule donne la consommation, les émissions et les polluants. Pas d'idée ? Partez d'un <b>exemple</b> et adaptez-le.</p>
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

  // Répartition des participants entre les itinéraires (sous-groupes) : la somme doit retomber sur l'effectif.
  let divise = null; // « groupe-itinéraire » dont le formulaire « Diviser » est ouvert
  function repartition(g) {
    if (g.vols.length < 2) return '';
    const parts = g.vols.map(v => +v.pax || 0), somme = parts.reduce((a, b) => a + b, 0), P = +g.participants || 0;
    const ok = somme === P;
    return `<div class="tj-rep ${ok ? '' : 'warn'}">${ok ? '✓' : '⚠'} Passagers : ${parts.join(' + ')} = <b>${somme}</b> sur ${P} participants${ok ? '' : ` · ${somme > P ? `${somme - P} en trop` : `${P - somme} sans itinéraire`}`}</div>`;
  }
  function diviser(g, vi, n) {
    const v = g.vols[vi], pax = +v.pax || 0;
    n = Math.round(n);
    if (!(n >= 1 && n < pax)) return false;
    const lettre = String.fromCharCode(65 + g.vols.length); // 2e itinéraire = B, 3e = C…
    const copie = JSON.parse(JSON.stringify(v));
    copie.label = `${String(v.label || 'Itinéraire').replace(/ · groupe [A-Z]$/, '')} · groupe ${lettre}`;
    copie.pax = n; v.pax = pax - n;
    g.vols.splice(vi + 1, 0, copie);
    return true;
  }

  function volTable(st, r, g, gi, v, vi) {
    const { et, mo } = etat(v);
    const res = r.groupes[gi].vols[vi];
    const pts = et.map(c => c ? Calc.aeroport(c, st) : null);
    const nAir = res && !res.err ? res.legs.length : 0, nSol = res && !res.err ? (res.solLegs || []).length : 0;
    const resume = [nAir ? `${nAir} vol${nAir > 1 ? 's' : ''}` : '', ...MODES.slice(1).map(([k, ic, lab]) => {
      const n = (res && res.solLegs || []).filter(l => l.mode === k).length;
      return n ? `${n} ${ic} ${lab.toLowerCase()}` : '';
    })].filter(Boolean).join(' + ');
    return `
      <div class="tj-vol">
        <div class="tj-vol-head"><input class="field tj-label" data-tjv="label" data-g="${gi}" data-v="${vi}" value="${esc(v.label)}" aria-label="Nom de l'itinéraire">
          <label class="tj-pax" title="Nombre de personnes qui font cet itinéraire"><input type="number" min="0" class="field" data-tjv="pax" data-g="${gi}" data-v="${vi}" value="${v.pax}" aria-label="Passagers"> pers.</label>
          ${+v.pax >= 2 ? `<button class="btn sm ghost no-print" data-tj="split-open" data-g="${gi}" data-v="${vi}" title="Une partie du groupe fait un autre trajet">⑂ Diviser</button>` : ''}
          <button class="icon-x" data-tj="del-vol" data-g="${gi}" data-v="${vi}" aria-label="Supprimer l'itinéraire" title="Supprimer l'itinéraire">${X}</button></div>
        <div class="tj-meta tj-reglages">
          <label class="tj-classe"><span>Classe</span><select class="field" data-tjv="classe" data-g="${gi}" data-v="${vi}" aria-label="Classe de voyage">${Object.entries(F.classes).map(([k, c]) => `<option value="${k}"${(v.classe || 'eco') === k ? ' selected' : ''}>${esc(c.label)}</option>`).join('')}</select></label>
          <label class="tj-ar"><input type="checkbox" class="check" data-tjv="ar" data-g="${gi}" data-v="${vi}" ${v.ar ? 'checked' : ''}><span>Aller-retour</span></label></div>
        ${divise === `${gi}-${vi}` ? `<div class="tj-split no-print">
          <span>Combien de personnes font un <b>autre trajet</b> ?</span>
          <input type="number" min="1" max="${v.pax - 1}" class="field" data-split="${gi}-${vi}" value="${Math.max(1, Math.round(v.pax / 6))}" aria-label="Personnes du nouveau sous-groupe">
          <span class="muted">sur ${v.pax}</span>
          <button class="btn sm primary" data-tj="split-ok" data-g="${gi}" data-v="${vi}">Créer le sous-groupe</button>
          <button class="btn sm ghost" data-tj="split-cancel" data-g="${gi}">Annuler</button>
          <p class="faint">L'itinéraire est copié pour ces personnes et retiré du groupe actuel. Modifiez ensuite les segments du sous-groupe (ex. Atlanta → Indianapolis en avion au lieu du bus).</p>
        </div>` : ''}
        <div class="table-wrap"><table class="tj-air">
          <thead><tr><th>Étape</th><th>Ville ou aéroport</th><th>Code</th><th>Pour y aller</th><th></th></tr></thead>
          <tbody>${et.map((c, i) => {
            const a = pts[i], prev = pts[i - 1];
            const nom = i === 0 ? 'Départ' : i === et.length - 1 ? 'Arrivée' : `Étape ${i}`;
            const oblig = i > 0 && Calc.transat(prev, a); // traversée de l'Atlantique : avion obligatoire
            const mode = i ? (oblig ? 'avion' : mo[i] || 'avion') : '', sol = !!Calc.MODES_SOL[mode];
            const gc = a && prev ? Calc.orthodromie(prev, a) : null;
            const d = gc == null ? null : sol ? gc * Calc.MODES_SOL[mode] : gc + F.correctionKm;
            return `<tr class="${sol ? 'tj-sol' : ''}">
              <td class="tj-step"><span class="tj-dot ${i === 0 || i === et.length - 1 ? 'end' : ''}"></span>${nom}</td>
              <td><input class="field ac ${c && !a ? 'err' : ''}" data-ac="aeroport" data-g="${gi}" data-v="${vi}" data-e="${i}" value="${esc(affAeroport(c, st))}" placeholder="Tapez une ville…" autocomplete="off" aria-label="${nom}"></td>
              <td class="num" title="${a ? esc(PAYS[a.pays] || a.pays) : ''}"><b>${esc(c)}</b>${a ? `<div class="legs">${esc(PAYS[a.pays] || a.pays)}</div>` : ''}</td>
              <td class="tj-modecell">${oblig ? `<span class="tj-mode-lock" title="Traversée de l'Atlantique : seul l'avion est possible">✈ Avion</span>
                  <span class="num muted tj-km">${d ? nf(d, 0) + ' km' : ''}</span>` : i ? `<select class="tj-mode m-${mode}" data-tjm="1" data-g="${gi}" data-v="${vi}" data-e="${i}" aria-label="Moyen de transport vers ${nom}" title="${sol ? `Trajet au sol : vol d'oiseau × ${nf(Calc.MODES_SOL[mode], 1)}` : `Vol : vol d'oiseau + ${F.correctionKm} km`}">
                  ${MODES.map(([k, ic, lab]) => `<option value="${k}" ${k === mode ? 'selected' : ''}>${ic} ${lab}</option>`).join('')}</select>
                  <span class="num muted tj-km">${d ? nf(d, 0) + ' km' : ''}</span>` : '<span class="faint">point de départ</span>'}</td>
              <td>${i > 0 && et.length > 2 ? `<button class="icon-x" data-tj="del-stop" data-g="${gi}" data-v="${vi}" data-e="${i}" aria-label="Retirer cette étape" title="Retirer cette étape">${X}</button>` : ''}</td></tr>`; }).join('')}</tbody>
        </table></div>
        <div class="tj-vol-foot"><span class="tj-btns no-print"><button class="btn sm ghost" data-tj="add-stop" data-g="${gi}" data-v="${vi}">+ Escale en avion</button>
            <button class="btn sm ghost" data-tj="add-bus" data-g="${gi}" data-v="${vi}" title="Ajoute une étape finale rejointe en bus (ex. Atlanta → Indianapolis)">+ Finir en 🚌 bus</button></span>
          <span class="muted">${res && !res.err ? `${resume} · <b class="num">${t(res.air + (res.sol || 0), 2)} tCO2e</b>${nSol ? ` <span class="faint">(dont ${nf(res.sol, 0)} kg au sol)</span>` : ''}` : '<span class="tj-warn">Itinéraire incomplet : choisissez chaque ville</span>'}</span></div>
      </div>`;
  }

  const modeleOptions = sel => {
    const cats = [...new Set(V.modeles.map(m => m.cat))];
    return `<option value="" ${sel ? '' : 'selected'}>Choisir…</option>` + cats.map(c => `<optgroup label="${esc(c)}">${V.modeles.filter(m => m.cat === c).map(m => `<option value="${m.id}" ${m.id === sel ? 'selected' : ''}>${esc(m.label)} (${m.places} pl.)</option>`).join('')}</optgroup>`).join('');
  };

  // ---------- Exemples de location, ajoutables en un clic ----------
  // Lieux désignés par code d'aéroport ou par « Ville, précision » (js/aeroports.js → VILLES).
  const EXEMPLES = {
    kelley: [
      ['Aéroport → campus Kelley', 'IND', 'Bloomington, Indiana (Kelley School of Business)', 'van15'],
      ['Visite d\'entreprise à Chicago', 'Bloomington, Indiana (Kelley School of Business)', 'Chicago, Illinois', 'minivan'],
      ['Sortie à Louisville', 'Bloomington, Indiana (Kelley School of Business)', 'Louisville, Kentucky', 'minivan_hyb']
    ],
    hec: [
      ['Aéroport → HEC Montréal', 'YUL', 'Montréal, Québec (HEC Montréal)', 'van15'],
      ['Week-end à Québec', 'Montréal, Québec (HEC Montréal)', 'Québec, Québec', 'minivan_hyb'],
      ['Sortie à Mont-Tremblant', 'Montréal, Québec (HEC Montréal)', 'Mont-Tremblant, Québec', 'suv_inter']
    ]
  };
  function trouverLieu(st, cle) {
    const L = lieux(st);
    return /^[A-Z]{3}$/.test(cle) ? L.find(p => p.code === cle) : L.find(p => p.label === cle);
  }
  function exemples(st, g) {
    const P = Math.max(1, +g.participants || 30);
    return (EXEMPLES[g.id] || []).map(([label, d, a, modele]) => {
      const pd = trouverLieu(st, d), pa = trouverLieu(st, a), m = V.modeles.find(x => x.id === modele);
      if (!pd || !pa || !m) return null;
      const nv = Math.ceil(P / m.places);
      const l = { label, de: pd.label, a: pa.label, deC: [pd.lat, pd.lon], aC: [pa.lat, pa.lon], km: 0, modele, nv, pers: Math.ceil(P / nv), ar: true, source: 'Hypothèse (exemple)' };
      kmAuto(l);
      return { l, court: `${pd.code || pd.ville} → ${pa.ville}`, m, kg: Calc.calcLocation(l, g).kg };
    }).filter(Boolean);
  }

  // Double comptage : une ligne terrestre du même groupe qui cite les mêmes villes de départ et d'arrivée.
  const GENERIQUES = new Set(['aeroport', 'gare', 'centre', 'ville', 'international', 'school', 'business']);
  const mots = s => norm(s).split(/[^a-z]+/).filter(m => m.length >= 4 && !GENERIQUES.has(m));
  function doublon(g, l) {
    const d = mots(l.de), a = mots(l.a);
    if (!d.length || !a.length) return null;
    return (g.terrestres || []).find(x => { const m = new Set(mots(x.label)); return d.some(w => m.has(w)) && a.some(w => m.has(w)); }) || null;
  }

  const resumeLoc = (l, x, m) => {
    if (!m) return '<span class="tj-warn">Choisissez un véhicule pour lancer le calcul.</span>';
    if (!(+l.km > 0)) return '<span class="tj-warn">Indiquez le trajet (De / À) ou la distance.</span>';
    const tr = l.ar ? 2 : 1;
    return `${l.nv} × ${esc(m.label)} · ${l.pers} pers. par voiture (${x.personnes || 0} au total) · ${nf(l.km, 0)} km × ${tr} trajet${tr > 1 ? 's' : ''} × ${l.nv} voiture${l.nv > 1 ? 's' : ''} = <b>${nf(x.km || 0, 0)} km parcourus</b>`;
  };
  const sortiesLoc = x => `
    <span class="tj-out" title="Carburant consommé"><small>Carburant</small>${x.bus ? 'navette' : x.qty ? `${nf(x.qty, 0)} ${x.unite}` : '–'}</span>
    <span class="tj-out" title="Émissions par personne transportée"><small>Par personne</small>${nf(x.parPers || 0, 1)} kg</span>
    <span class="tj-out pol" title="NOx : valeur limite de la norme (NMOG + NOx aux US et au Canada). Polluant local, hors tCO2e"><small>NOx</small>${nf(x.nox || 0, 1)} g</span>
    <span class="tj-out pol" title="Particules fines : valeur limite de la norme. Polluant local, hors tCO2e"><small>Particules</small>${nf(x.pm || 0, 2)} g</span>
    <span class="tj-out pol" title="Monoxyde de carbone : valeur limite de la norme. Polluant local, hors tCO2e"><small>CO</small>${nf(x.co || 0, 0)} g</span>`;

  function locTable(st, r, g, gi) {
    const L = g.locations || [];
    const rg = r.groupes[gi];
    const tot = (rg.loc || []).reduce((s, x) => ({ kg: s.kg + x.kg, nox: s.nox + x.nox, pm: s.pm + x.pm, co: s.co + x.co }), { kg: 0, nox: 0, pm: 0, co: 0 });
    const deja = new Set(L.map(l => l.label));
    const ex = exemples(st, g).filter(e => !deja.has(e.l.label));
    return `
      <div class="card mt" style="--i:${gi + 3}">
        <div class="group-head"><span class="dot" style="width:12px;height:12px;background:var(${gi ? '--c-hec' : '--c-kelley'})"></span><b>${esc(g.nom)}</b>
          <span class="muted" style="font-size:12.5px">${L.length} trajet${L.length > 1 ? 's' : ''} en location</span>
          <span class="pill accent" style="margin-left:auto" id="tj-tot-${gi}">${t(tot.kg, 2)} tCO2e</span></div>
        ${L.length ? `<div class="tj-locs">${L.map((l, i) => {
          const x = rg.loc[i] || {}, m = V.modeles.find(mm => mm.id === l.modele);
          const trop = m && +l.pers > m.places;
          return `<div class="tj-lc" data-i="${i}">
            <div class="tj-lc-top">
              <span class="tj-lc-n">${i + 1}</span>
              <input class="field tj-lc-label" data-lf="label" data-g="${gi}" data-i="${i}" value="${esc(l.label)}" placeholder="Nom du trajet (ex. Aéroport → campus)" aria-label="Nom du trajet">
              <span class="tj-lc-kg num" data-out="kg"><b>${nf(x.kg || 0, 1)}</b> kgCO2e</span>
              <button class="icon-x" data-tj="del-loc" data-g="${gi}" data-i="${i}" aria-label="Supprimer ce trajet" title="Supprimer ce trajet">${X}</button>
            </div>
            <div class="tj-lc-grid">
              <label class="tj-f w2"><span>Départ</span><input class="field ac" data-ac="lieu" data-lf="de" data-g="${gi}" data-i="${i}" value="${esc(l.de)}" placeholder="Ville ou aéroport…" autocomplete="off"></label>
              <label class="tj-f w2"><span>Arrivée</span><input class="field ac" data-ac="lieu" data-lf="a" data-g="${gi}" data-i="${i}" value="${esc(l.a)}" placeholder="Ville ou aéroport…" autocomplete="off"></label>
              <label class="tj-f"><span>Distance aller ${l.kmAuto ? '<em>≈ estimée</em>' : ''}</span><span class="tj-unit"><input type="number" min="0" class="field" data-lf="km" data-g="${gi}" data-i="${i}" value="${l.km || ''}" placeholder="0" title="${l.kmAuto ? `Calculée : vol d'oiseau × ${nf(V.detourRoute, 1)}. Modifiable.` : 'Distance saisie'}"><i>km</i></span></label>
              <label class="tj-f w2"><span>Véhicule${m ? ` <em>${esc(m.cat)} · ${nf(m.conso, 1)} ${m.energie === 'elec' ? 'kWh' : 'L'}/100 km</em>` : ''}</span><select class="field" data-lf="modele" data-g="${gi}" data-i="${i}">${modeleOptions(l.modele)}</select></label>
              <label class="tj-f"><span>Voitures</span><input type="number" min="0" class="field" data-lf="nv" data-g="${gi}" data-i="${i}" value="${l.nv}"></label>
              <label class="tj-f"><span>Pers. / voiture${m ? ` <em>max ${m.places}</em>` : ''}</span><input type="number" min="0" class="field ${trop ? 'err' : ''}" data-lf="pers" data-g="${gi}" data-i="${i}" value="${l.pers}" title="${trop ? `Plus que les ${m.places} places du véhicule` : ''}"></label>
              <label class="tj-f tj-chk"><input type="checkbox" class="check" data-lf="ar" data-g="${gi}" data-i="${i}" ${l.ar ? 'checked' : ''}><span>Aller-retour</span></label>
              <label class="tj-f w2"><span>Source</span><input class="field" data-lf="source" data-g="${gi}" data-i="${i}" value="${esc(l.source)}" list="sources-tj"></label>
            </div>
            <div class="tj-lc-res muted" data-out="resume">${resumeLoc(l, x, m)}</div>
            ${(dbl => dbl ? `<div class="tj-lc-res tj-warn">⚠ Ce trajet semble déjà compté dans la ligne « ${esc(dbl.label)} » (${esc(F.terrestre[dbl.mode]?.label || dbl.mode)}, onglet Saisie). Retirez l'une des deux pour ne pas le compter deux fois.</div>` : '')(doublon(g, l))}
            <div class="tj-lc-out" data-out="outs">${sortiesLoc(x)}</div>
          </div>`; }).join('')}</div>
          <div class="tj-loc-tot num"><span>Total ${esc(g.nom.split(' (')[0])}</span><span data-tot="kg"><b>${nf(tot.kg, 1)}</b> kgCO2e</span><span class="faint" data-tot="pol">NOx ${nf(tot.nox, 1)} g · particules ${nf(tot.pm, 2)} g · CO ${nf(tot.co, 0)} g</span></div>`
        : `<p class="muted tj-empty">Aucune voiture de location pour l'instant. Ajoutez un des exemples ci-dessous pour voir le calcul, puis adaptez-le (véhicule, nombre de voitures, distance), ou partez d'une fiche vide.</p>`}
        ${ex.length ? `<div class="tj-ex no-print"><span class="tj-ex-t">Exemples à ajouter en un clic</span>
          ${ex.map(e => `<button class="tj-ex-b" data-tj="add-ex" data-g="${gi}" data-label="${esc(e.l.label)}"><b>${esc(e.l.label)}</b><small>${esc(e.court)} · ${e.l.nv} × ${esc(e.m.label)} · ${nf(e.l.km, 0)} km · ≈ ${nf(e.kg, 0)} kgCO2e</small></button>`).join('')}</div>` : ''}
        <button class="btn sm mt no-print" data-tj="add-loc" data-g="${gi}">+ Fiche vide</button>
      </div>`;
  }

  // Mise à jour des chiffres d'une fiche sans tout redessiner (le curseur reste dans la case).
  function refreshLoc(view, ctx) {
    const st = ctx.st(), r = Calc.calculer(st, { saisies: [] });
    st.groupes.forEach((g, gi) => {
      const rg = r.groupes[gi];
      view.querySelectorAll(`.tj-lc [data-lf="label"][data-g="${gi}"]`).forEach(inp => {
        const i = +inp.dataset.i, x = rg.loc[i] || {}, box = inp.closest('.tj-lc');
        const l = g.locations[i], m = V.modeles.find(mm => mm.id === l.modele);
        const set = (k, v) => { const c = box.querySelector(`[data-out="${k}"]`); if (c) c.innerHTML = v; };
        set('kg', `<b>${nf(x.kg || 0, 1)}</b> kgCO2e`); set('resume', resumeLoc(l, x, m)); set('outs', sortiesLoc(x));
        const p = box.querySelector('[data-lf="pers"]');
        if (p) p.classList.toggle('err', !!(m && +l.pers > m.places));
      });
      const tot = (rg.loc || []).reduce((s, x) => ({ kg: s.kg + x.kg, nox: s.nox + x.nox, pm: s.pm + x.pm, co: s.co + x.co }), { kg: 0, nox: 0, pm: 0, co: 0 });
      const pill = view.querySelector(`#tj-tot-${gi}`); if (pill) pill.textContent = `${t(tot.kg, 2)} tCO2e`;
      const card = pill && pill.closest('.card'); if (!card) return;
      const k = card.querySelector('[data-tot="kg"]'); if (k) k.innerHTML = `<b>${nf(tot.kg, 1)}</b> kgCO2e`;
      const p = card.querySelector('[data-tot="pol"]'); if (p) p.textContent = `NOx ${nf(tot.nox, 1)} g · particules ${nf(tot.pm, 2)} g · CO ${nf(tot.co, 0)} g`;
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
          a => { const v = s.groupes[+el.dataset.g].vols[+el.dataset.v], { et, mo } = etat(v); et[+el.dataset.e] = a.code; setEtat(v, et, mo); done(); });
        return;
      }
      if (el.dataset.tjm) {
        const v = s.groupes[+el.dataset.g].vols[+el.dataset.v], { et, mo } = etat(v);
        mo[+el.dataset.e] = el.value; setEtat(v, et, mo); done(); return;
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

    function splitOk(gi, vi) {
      const s = st(), g = s.groupes[+gi], f = document.querySelector(`#view [data-split="${gi}-${vi}"]`);
      if (!f) return;
      if (!diviser(g, +vi, +f.value)) { ctx.toast(`Indiquez un nombre entre 1 et ${(+g.vols[+vi].pax || 0) - 1}`); f.focus(); return; }
      divise = null; done(); ctx.toast(`Sous-groupe créé : ${Math.round(+f.value)} personne${+f.value > 1 ? 's' : ''}`);
    }

    // Passagers d'un itinéraire : recalcul quand on quitte la case (le curseur ne saute pas pendant la saisie).
    view.addEventListener('change', e => {
      const el = e.target, v = el.dataset.tjv && st().groupes[+el.dataset.g].vols[+el.dataset.v];
      if (el.dataset.tjv === 'pax') { v.pax = Math.max(0, Math.round(+el.value || 0)); done(); }
      else if (el.dataset.tjv === 'classe') { v.classe = el.value; done(); }
      else if (el.dataset.tjv === 'ar') { v.ar = el.checked; done(); }
    });

    view.addEventListener('keydown', e => {
      const sp = e.target.dataset && e.target.dataset.split;
      if (sp && e.key === 'Enter') { e.preventDefault(); const [gi, vi] = sp.split('-'); splitOk(gi, vi); return; }
      if (sp && e.key === 'Escape') { divise = null; done(); return; }
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
        const s = st(), v = s.groupes[+el.dataset.g].vols[+el.dataset.v], { et: arr, mo } = etat(v), i = +el.dataset.e;
        const txt = el.value.trim().toUpperCase();
        if (!txt) { if (arr[i]) { arr[i] = ''; setEtat(v, arr, mo); done(); } return; }
        if (/^[A-Z]{3}$/.test(txt) && Calc.aeroport(txt, s) && txt !== arr[i]) { arr[i] = txt; setEtat(v, arr, mo); done(); return; }
        if (txt !== affAeroport(arr[i], s).toUpperCase()) el.value = affAeroport(arr[i], s); // saisie abandonnée
      }, 120);
    });
    view.addEventListener('focusout', e => { if (e.target.dataset.ac === 'lieu') setTimeout(() => { if (owner === e.target) closeMenu(); }, 120); });

    view.addEventListener('click', e => {
      const b = e.target.closest('[data-tj]'); if (!b) return;
      const s = st(), g = s.groupes[+b.dataset.g];
      switch (b.dataset.tj) {
        case 'add-stop': { const v = g.vols[+b.dataset.v], { et, mo } = etat(v); et.splice(et.length - 1, 0, ''); mo.splice(mo.length - 1, 0, 'avion'); setEtat(v, et, mo); done(); focusVide(view, b.dataset.g, b.dataset.v); break; }
        case 'add-bus': { const v = g.vols[+b.dataset.v], { et, mo } = etat(v); et.push(''); mo.push('autocar'); setEtat(v, et, mo); done(); focusVide(view, b.dataset.g, b.dataset.v); break; }
        case 'del-stop': { const v = g.vols[+b.dataset.v], { et, mo } = etat(v), i = +b.dataset.e; et.splice(i, 1); mo.splice(i, 1); mo[0] = ''; setEtat(v, et, mo); done(); break; }
        case 'add-vol': {
          // Nouvel itinéraire : les participants qui n'en ont pas encore.
          const reste = Math.max(0, (+g.participants || 0) - g.vols.reduce((s, v) => s + (+v.pax || 0), 0));
          g.vols.push({ label: 'Nouvel itinéraire', route: '', etapes: ['', ''], modes: ['', 'avion'], pax: reste, classe: 'eco', ar: true, source: 'Hypothèse' }); done(); break;
        }
        case 'del-vol': if (confirm('Supprimer cet itinéraire ?')) { g.vols.splice(+b.dataset.v, 1); divise = null; done(); } break;
        case 'split-open': {
          divise = `${b.dataset.g}-${b.dataset.v}`; done();
          setTimeout(() => { const f = document.querySelector(`#view [data-split="${divise}"]`); if (f) { f.focus(); f.select(); } }, 0);
          break;
        }
        case 'split-cancel': divise = null; done(); break;
        case 'split-ok': splitOk(b.dataset.g, b.dataset.v); break;
        case 'add-loc': {
          const P = Math.max(1, +g.participants || 4), m = V.modeles.find(x => x.id === 'minivan'), nv = Math.ceil(P / m.places);
          (g.locations ||= []).push({ label: '', de: '', a: '', km: 0, modele: m.id, nv, pers: Math.ceil(P / nv), ar: true, source: 'Hypothèse' }); done();
          setTimeout(() => { const f = document.querySelector(`#view [data-lf="de"][data-g="${b.dataset.g}"][data-i="${g.locations.length - 1}"]`); if (f) f.focus(); }, 0);
          break;
        }
        case 'add-ex': { const e = exemples(s, g).find(x => x.l.label === b.dataset.label); if (e) { (g.locations ||= []).push(e.l); done(); } break; }
        case 'del-loc': g.locations.splice(+b.dataset.i, 1); done(); break;
      }
    });
  }

  // Après l'ajout d'une étape : curseur dans la première case vide de l'itinéraire.
  function focusVide(view, gi, vi) {
    setTimeout(() => {
      // render() remplace le nœud #view : on cherche dans le nouveau.
      const f = [...document.querySelectorAll(`#view [data-ac="aeroport"][data-g="${gi}"][data-v="${vi}"]`)].find(x => !x.value);
      if (f) f.focus();
    }, 0);
  }

  // Recherche d'aéroports réutilisée par le formulaire « Saisir mon trajet » (js/accueil.js), même comportement qu'ici.
  function suggerer(input, st, pick) {
    const q = input.value;
    openMenu(input, chercher(aeroports(st), q, [['ville', 1], ['nom', 2], ['code', 1]]),
      a => `<span class="ac-code">${esc(a.code)}</span><span><b>${surligne(a.ville, q)}</b> · ${surligne(a.nom, q)}<small>${esc(PAYS[a.pays] || a.pays)}</small></span>`, pick);
  }
  function clavierMenu(e) {
    if (!menu || e.target !== owner) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); moveMenu(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveMenu(-1); }
    else if (e.key === 'Enter' || e.key === 'Tab') { if (items[idx]) { e.preventDefault(); const it = items[idx], f = onPick; closeMenu(); f(it); } }
    else if (e.key === 'Escape') closeMenu();
  }
  const villeAeroport = code => villeDe[code] || (window.AEROPORTS[code] || [code])[0];

  window.Trajets = { view, bind, suggerer, clavierMenu, fermerMenu: closeMenu, villeAeroport };
})();
