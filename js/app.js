/* Interface : navigation, vues, graphiques, animations. Les données restent dans le navigateur (localStorage)
   et se partagent dans le pôle par export / import d'un fichier JSON. */
(function () {
  const F = window.FACTEURS;
  const KEY = 'bilan-carbone.v1';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clone = o => JSON.parse(JSON.stringify(o));

  // ---------- État ----------
  let st;
  try { st = JSON.parse(localStorage.getItem(KEY)); } catch (e) { st = null; }
  if (!st || !Array.isArray(st.groupes)) st = clone(window.HYPOTHESES);
  st = { ...clone(window.HYPOTHESES), ...st, scenarios: { ...window.HYPOTHESES.scenarios, ...(st.scenarios || {}) } };
  const fixLocations = () => st.groupes.forEach(g => { if (!Array.isArray(g.locations)) g.locations = []; }); // anciennes sauvegardes
  fixLocations();
  // Ancienne sauvegarde avec l'ancien prix par défaut (30 €) : passage au nouveau défaut, une seule fois.
  if (!st.prixMaj) { if (st.prixTonne === 30) st.prixTonne = window.HYPOTHESES.prixTonne; st.prixMaj = 1; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  // ---------- Formats ----------
  const nf = (v, d = 1) => (+v || 0).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const t = (kg, d = 1) => nf(kg / 1000, d);
  const eur = v => (+v || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
  const pct = v => nf(v * 100, 0) + ' %';
  const col = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // Le nombre monte jusqu'à sa valeur (format conservé).
  function countUp(el, dur = 900) {
    // On n'anime que le premier nœud texte : l'unité (<small>) qui suit reste en place.
    const node = el.firstChild && el.firstChild.nodeType === 3 ? el.firstChild : el;
    const tail = node === el ? '' : ' ';
    const text = el.dataset.count ?? el.textContent;
    const set = v => { if (node === el) el.textContent = v; else node.nodeValue = v + tail; };
    const m = text.match(/^([^\d]*?)(\d(?:[\d\s  ]*\d)?(?:,(\d+))?)(.*)$/s);
    if (!m || calm()) return;
    const [, pre, num, dec = '', post] = m;
    const target = Number(num.replace(/[\s  ]/g, '').replace(',', '.'));
    if (!isFinite(target) || !target) return;
    const f = v => v.toLocaleString('fr-FR', { minimumFractionDigits: dec.length, maximumFractionDigits: dec.length });
    const t0 = performance.now();
    const step = now => {
      if (!el.isConnected) return;
      const k = Math.min(1, (now - t0) / dur);
      set(k >= 1 ? text : `${pre}${f(target * (1 - (1 - k) ** 4))}${post}`);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---------- Graphiques ----------
  let charts = [];
  const killCharts = () => { charts.forEach(c => c.destroy()); charts = []; };
  function chart(canvas, cfg) {
    if (!window.Chart || !canvas) return;
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.color = col('--text-2');
    Chart.defaults.borderColor = col('--border');
    cfg.options = Object.assign({
      responsive: true, maintainAspectRatio: false,
      animation: calm() ? false : { duration: 1100, easing: 'easeOutElastic' },
      plugins: { legend: { labels: { usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 10, padding: 14 } },
        tooltip: { backgroundColor: col('--surface-2'), titleColor: col('--text'), bodyColor: col('--text'), padding: 10, cornerRadius: 12, borderColor: col('--border'), borderWidth: 1,
          callbacks: { label: c => ` ${c.dataset.label || c.label} : ${nf(c.raw, 1)} tCO2e` } } }
    }, cfg.options || {});
    charts.push(new Chart(canvas, cfg));
  }
  const barOpts = (stacked = true) => ({
    animation: calm() ? false : { duration: 900, easing: 'easeOutQuart' },
    scales: { x: { stacked, grid: { display: false } }, y: { stacked, beginAtZero: true, grid: { color: col('--border') }, ticks: { callback: v => nf(v, 0) + ' t' } } }
  });

  // ---------- Petits composants ----------
  const seg = () => `<div class="seg-wrap no-print"><div class="seg" role="group" aria-label="Traînées de condensation">
      <button data-rf="1" class="${st.rf ? 'on' : ''}">Avec traînées</button><button data-rf="0" class="${st.rf ? '' : 'on'}">Sans traînées</button></div><span class="info" tabindex="0" data-tip="${esc(Lexique.definition('traînées'))}" aria-label="Qu'est-ce que les traînées ?">i</span></div>`;
  const kpi = (label, kg, sub, color, i) => `<div class="card tilt" style="--i:${i}">
      <div class="kpi-label">${color ? `<span class="dot" style="background:${color}"></span>` : ''}${label}</div>
      <div class="kpi-value num" data-count="${t(kg)}">${t(kg)} <small>tCO2e</small></div>
      <div class="kpi-sub">${sub}</div></div>`;
  const hypoNote = r => r.hypotheses ? `<div class="note warn mt" style="--i:2"><b>${r.hypotheses} ligne${r.hypotheses > 1 ? 's' : ''} encore en hypothèse.</b> Les résultats sont provisoires tant que les données des responsables des Study Tours ne sont pas saisies (onglet <a href="#/saisie">Saisie</a>, colonne « Source »).${Viz.fiabilite(st, r)}</div>` : '';
  // Trajets saisis par les étudiants (js/partage.js) ou base injoignable.
  const partNote = r => !window.Partage ? '' : Partage.etat === 'hors-ligne'
    ? `<div class="note warn mt">Base en ligne injoignable : bilan calculé avec les hypothèses seulement.</div>`
    : Partage.etat === 'ok' ? `<div class="note mt">Trajets saisis par les étudiants : <b class="num">${r.saisis}</b> sur ${r.participants} (${Math.max(0, r.participants - r.saisis)} en hypothèse).</div>` : '';
  const errNote = r => r.erreurs.length ? `<div class="note warn mt">${r.erreurs.map(esc).join('<br>')}</div>` : '';

  // =====================================================================
  // Vue : Synthèse
  // =====================================================================
  function vSynthese() {
    const r = Calc.calculer(st);
    const alt = Calc.calculer(st, { rf: !st.rf });
    const [k, h] = r.groupes;
    const max = Math.max(...r.groupes.map(g => g.total), 1);
    const gc = [col('--c-kelley'), col('--c-hec')];
    const direct = r.air - r.corr;
    const repere = r.parEtudiant / F.reperes.objectifParisKg;
    const eqv = Viz.equivalences(r);
    return `
      <div class="head"><div><div class="page-title">Study Tours 2026-2027 · ${r.participants} étudiants</div><h1 style="font-size:28px">Empreinte carbone des mobilités</h1></div>${seg()}</div>
      <div class="dash-top">
        <div class="dash-left">
        <div class="card glass hero-card tilt" style="--i:0">
          <div class="hero-main">
            <div class="page-title">Bilan global · ${st.rf ? 'avec' : 'sans'} traînées</div>
            <div class="hero-value num" data-count="${t(r.total)}">${t(r.total)} <small>tCO2e</small></div>
            <div class="hero-sub"><span class="pill accent">${t(r.parEtudiant, 2)} t par étudiant</span><span>soit ${nf(repere, 1)} an${repere >= 2 ? 's' : ''} de budget carbone « Accord de Paris » (2 t/an)</span></div>
            <div class="group-bar">
              ${r.groupes.map((g, i) => `<div class="row"><span class="muted">${esc(g.nom.split(' (')[0])}</span><div class="track"><div class="fill" style="width:${g.total / max * 100}%;background:${gc[i]};animation-delay:${200 + i * 120}ms"></div></div><span class="num r" style="text-align:right;font-weight:600">${t(g.total)} t</span></div>`).join('')}
            </div>
            <div class="split">
              <span style="width:${r.total ? direct / r.total * 100 : 0}%;background:var(--c-air)"></span>
              <span style="width:${r.total ? r.corr / r.total * 100 : 0}%;background:var(--c-corr);animation-delay:120ms"></span>
              <span style="width:${r.total ? r.terrestre / r.total * 100 : 0}%;background:var(--c-ground);animation-delay:240ms"></span>
            </div>
            <div class="legend"><span><i class="dot" style="background:var(--c-air)"></i>Vols (équivalent direct) · ${t(direct)} t</span><span><i class="dot" style="background:var(--c-corr)"></i>Correspondances · ${t(r.corr)} t</span><span><i class="dot" style="background:var(--c-ground)"></i>Terrestre · ${t(r.terrestre)} t</span></div>
          </div>
          <div class="ring-wrap"><div class="ring" id="ring"></div><div class="ring-label"><div><span class="num" data-count="${nf(r.partAir * 100, 1)} %">${nf(r.partAir * 100, 1)} %</span><small>aérien</small></div></div></div>
        </div>
        <div class="grid grid-2 kpis">
          ${kpi('Kelley University', k.total, `${t(k.parEtudiant, 2)} t / étudiant · ${k.participants} pers.`, gc[0], 1)}
          ${kpi('HEC Montréal', h.total, `${t(h.parEtudiant, 2)} t / étudiant · ${h.participants} pers.`, gc[1], 2)}
          ${kpi('Poids des correspondances', r.corr, `${pct(r.total ? r.corr / r.total : 0)} du total, par rapport à des vols directs`, col('--c-corr'), 3)}
          ${kpi('Déplacements terrestres', r.terrestre, `${pct(r.total ? r.terrestre / r.total : 0)} du total`, col('--c-ground'), 4)}
        </div>
        </div>
        <div class="card map-card" style="--i:5"><div class="map-head"><h2 class="section">Carte des trajets</h2><span class="muted sub">Plus le trait est épais, plus le segment émet</span></div>${Viz.carte(st, r, { H: 660 })}</div>
      </div>
      ${partNote(r)}${hypoNote(r)}${errNote(r)}
      <div class="grid grid-main mt">
        <div class="card" style="--i:6"><h2 class="section">D'où viennent les tonnes ?</h2><p class="muted sub">Du total vers chaque groupe, puis vers chaque poste. Survoler un flux pour le chiffre.</p>${Viz.flux(r)}</div>
        <div class="card" style="--i:7"><h2 class="section">Répartition par poste et par groupe</h2><div class="chart-box"><canvas id="c-postes"></canvas></div></div>
      </div>
      <div class="grid grid-2 mt charts-row">
        <div class="card" style="--i:8"><h2 class="section">Effet des traînées (hors CO2)</h2>
          <div class="chart-box sm"><canvas id="c-rf"></canvas></div>
          <p class="muted mt" style="font-size:12.5px">Avec traînées : <b>${t(st.rf ? r.total : alt.total)} t</b> · sans : <b>${t(st.rf ? alt.total : r.total)} t</b>. Les deux conventions ne se mélangent jamais.</p></div>
        ${eqv.waffle}
      </div>
      <div class="grid grid-anat mt">
        <div class="card" style="--i:9"><h2 class="section">Anatomie d'un voyage</h2><p class="muted sub">Émissions d'un passager pour un aller, segment par segment, comparées à un vol direct.</p>${Viz.anatomie(st, r)}</div>
        <div class="eq-col"><h2 class="section">Pour se représenter ${t(r.parEtudiant, 2)} t par étudiant</h2><div class="eq-stack">${eqv.tiles}</div></div>
      </div>`;
  }
  function aSynthese() {
    const r = Calc.calculer(st), alt = Calc.calculer(st, { rf: !st.rf });
    requestAnimationFrame(() => { const ring = $('#ring'); if (ring) ring.style.setProperty('--p', (r.partAir * 100).toFixed(1)); });
    chart($('#c-postes'), {
      type: 'bar',
      data: { labels: r.groupes.map(g => g.nom.split(' (')[0]), datasets: [
        { label: 'Vols (équivalent direct)', data: r.groupes.map(g => (g.air - g.corr) / 1000), backgroundColor: col('--c-air'), borderRadius: 8, borderSkipped: false },
        { label: 'Correspondances', data: r.groupes.map(g => g.corr / 1000), backgroundColor: col('--c-corr'), borderRadius: 8, borderSkipped: false },
        { label: 'Terrestre', data: r.groupes.map(g => g.terrestre / 1000), backgroundColor: col('--c-ground'), borderRadius: 8, borderSkipped: false }
      ] }, options: barOpts(true)
    });
    const withRf = st.rf ? r : alt, noRf = st.rf ? alt : r;
    chart($('#c-rf'), {
      type: 'bar',
      data: { labels: ['Sans traînées', 'Avec traînées'], datasets: [{ label: 'Bilan', data: [noRf.total / 1000, withRf.total / 1000], backgroundColor: [col('--surface-2'), col('--accent')], borderRadius: 12, borderSkipped: false }] },
      options: { ...barOpts(false), plugins: { legend: { display: false } } }
    });
  }

  // =====================================================================
  // Vue : Saisie
  // =====================================================================
  const modeOptions = sel => Object.entries(F.terrestre).map(([k, m]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(m.label)}</option>`).join('');
  const classeOptions = sel => Object.entries(F.classes).map(([k, c]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(c.label)}</option>`).join('');
  const sourceInput = (g, kind, i, v) => `<input data-g="${g}" data-k="${kind}" data-i="${i}" data-f="source" value="${esc(v)}" list="sources" class="w-sm" aria-label="Source">`;
  const X = `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`;

  function legsInfo(v) {
    const it = Calc.itineraire(v.route, st);
    if (it.err) return `<div class="legs err">${esc(it.err)}</div>`;
    return `<div class="legs">${it.legs.map(l => `${l.from.code}→${l.to.code} ${nf(l.d, 0)} km`).join(' · ')}${it.legs.length > 1 ? ` · ${it.legs.length - 1} corresp.` : ''}</div>`;
  }

  function vSaisie() {
    const r = Calc.calculer(st, { saisies: [] });
    const perso = Object.entries(st.aeroportsPerso || {});
    return `
      <div class="head"><div><div class="page-title">Collecte des données</div><h1 style="font-size:28px">Tableau des déplacements</h1></div>
        <div class="actions no-print">
          <button class="btn sm" data-act="export-json">Exporter (.json)</button>
          <label class="btn sm" style="cursor:pointer">Importer et remplacer (.json)<input type="file" accept=".json,application/json" id="import" hidden></label>
          <label class="btn sm" style="cursor:pointer">Importer et ajouter (.json)<input type="file" accept=".json,application/json" id="import-ajout" hidden></label>
          <button class="btn sm" data-act="export-csv">Tableau Excel (.csv)</button>
          <button class="btn sm ghost" data-act="reset">Revenir aux hypothèses</button>
        </div></div>
      <div class="note" style="--i:0">Saisir un vol par itinéraire, avec les codes IATA séparés par des tirets : <code>MRS-CDG-ATL-IND</code>. Chaque segment compte comme un vol (distance orthodromique + ${F.correctionKm} km). Cocher <b>A/R</b> pour compter l'aller et le retour. Les données sont enregistrées dans ce navigateur : pour les partager dans le pôle, exporter le fichier .json et l'envoyer.</div>
      <datalist id="sources"><option value="Hypothèse"><option value="Responsable Study Tour"><option value="Billet / réservation"><option value="Questionnaire étudiant"></datalist>
      ${st.groupes.map((g, gi) => `
      <div class="card mt2" style="--i:${gi + 1}">
        <div class="group-head">
          <span class="dot" style="width:12px;height:12px;background:var(${gi ? '--c-hec' : '--c-kelley'})"></span>
          <input class="field" style="font-weight:600;font-size:15px;min-width:240px" data-g="${gi}" data-f="nom" value="${esc(g.nom)}" aria-label="Nom du groupe">
          <label class="inline muted">Participants <input class="field w-num num" type="number" min="0" data-g="${gi}" data-f="participants" value="${g.participants}"></label>
          <span class="pill accent" style="margin-left:auto" id="tot-${gi}">${t(r.groupes[gi].total)} tCO2e</span>
        </div>
        <div class="saisie-viz">
          <div class="mini-map" id="mini-${gi}">${Viz.carte(st, r, { groupe: gi, H: 430, noLegend: true })}</div>
          <div><h3>Parcours d'un étudiant</h3><p class="muted sub" style="margin:2px 0 10px">Chaque étape, cercle proportionnel aux émissions. Se met à jour pendant la saisie.</p><div id="trip-${gi}">${Viz.parcours(st, r, gi)}</div></div>
        </div>
        <h3>Vols</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>Libellé</th><th>Itinéraire (codes IATA)</th><th class="r">Passagers</th><th>Classe</th><th>A/R</th><th>Source</th><th class="r">tCO2e</th><th></th></tr></thead>
          <tbody>${g.vols.map((v, i) => `<tr>
            <td><input data-g="${gi}" data-k="vols" data-i="${i}" data-f="label" value="${esc(v.label)}"></td>
            <td><input class="route" data-g="${gi}" data-k="vols" data-i="${i}" data-f="route" value="${esc(v.route)}"><span id="legs-${gi}-${i}">${legsInfo(v)}</span></td>
            <td><input type="number" min="0" class="w-num" data-g="${gi}" data-k="vols" data-i="${i}" data-f="pax" value="${v.pax}"></td>
            <td><select data-g="${gi}" data-k="vols" data-i="${i}" data-f="classe">${classeOptions(v.classe)}</select></td>
            <td><input type="checkbox" class="check" data-g="${gi}" data-k="vols" data-i="${i}" data-f="ar" ${v.ar ? 'checked' : ''}></td>
            <td>${sourceInput(gi, 'vols', i, v.source)}</td>
            <td class="r num" id="out-${gi}-vols-${i}">${t(r.groupes[gi].vols[i].air + (r.groupes[gi].vols[i].sol || 0))}</td>
            <td><button class="icon-x" data-del="${gi}-vols-${i}" aria-label="Supprimer">${X}</button></td></tr>`).join('')}</tbody>
        </table></div>
        <button class="btn sm mt no-print" data-add="${gi}-vols">+ Ajouter un vol</button>
        <h3 class="mt2">Déplacements terrestres</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>Trajet</th><th>Mode</th><th class="r">km (aller)</th><th class="r">Passagers</th><th class="r" title="Voitures et taxis seulement">Occupants / véh.</th><th>A/R</th><th>Source</th><th class="r">tCO2e</th><th></th></tr></thead>
          <tbody>${g.terrestres.map((x, i) => `<tr>
            <td><input data-g="${gi}" data-k="terrestres" data-i="${i}" data-f="label" value="${esc(x.label)}" style="min-width:200px"></td>
            <td><select data-g="${gi}" data-k="terrestres" data-i="${i}" data-f="mode">${modeOptions(x.mode)}</select></td>
            <td><input type="number" min="0" class="w-num" data-g="${gi}" data-k="terrestres" data-i="${i}" data-f="km" value="${x.km}"></td>
            <td><input type="number" min="0" class="w-num" data-g="${gi}" data-k="terrestres" data-i="${i}" data-f="pax" value="${x.pax}"></td>
            <td><input type="number" min="1" class="w-num" data-g="${gi}" data-k="terrestres" data-i="${i}" data-f="occ" value="${x.occ}" ${F.terrestre[x.mode]?.parVehicule ? '' : 'disabled'}></td>
            <td><input type="checkbox" class="check" data-g="${gi}" data-k="terrestres" data-i="${i}" data-f="ar" ${x.ar ? 'checked' : ''}></td>
            <td>${sourceInput(gi, 'terrestres', i, x.source)}</td>
            <td class="r num" id="out-${gi}-terrestres-${i}">${t(r.groupes[gi].terr[i], 2)}</td>
            <td><button class="icon-x" data-del="${gi}-terrestres-${i}" aria-label="Supprimer">${X}</button></td></tr>`).join('')}</tbody>
        </table></div>
        <button class="btn sm mt no-print" data-add="${gi}-terrestres">+ Ajouter un trajet</button>
      </div>`).join('')}
      ${window.Partage ? `<div class="card mt2" style="--i:3" id="pole">${vPole()}</div>` : ''}
      <div class="card mt2" style="--i:4">
        <h3>Ajouter un aéroport manquant</h3>
        <p class="muted" style="font-size:12.5px;margin:4px 0 10px">${Object.keys(window.AEROPORTS).length} aéroports sont déjà connus (${Object.keys(window.AEROPORTS).join(', ')}). Coordonnées en degrés décimaux, à copier depuis Wikipédia.</p>
        <div class="actions"><input class="field w-num" id="ap-code" placeholder="Code" maxlength="3" style="text-transform:uppercase"><input class="field" id="ap-nom" placeholder="Nom" style="width:180px"><input class="field w-sm" id="ap-lat" placeholder="Latitude"><input class="field w-sm" id="ap-lon" placeholder="Longitude"><input class="field w-num" id="ap-pays" placeholder="Pays" maxlength="2" style="text-transform:uppercase"><button class="btn sm primary" data-act="add-ap">Ajouter</button></div>
        ${perso.length ? `<p class="muted mt" style="font-size:12.5px">Ajoutés : ${perso.map(([c, p]) => `${esc(c)} (${esc(p[0])}) <a href="#" data-delap="${esc(c)}">retirer</a>`).join(' · ')}</p>` : ''}
      </div>`;
  }

  // Bloc « Saisies des étudiants » : réservé au pôle (compte créé dans Supabase).
  function vPole() {
    if (!Partage.connecte()) return `
      <h3>Saisies des étudiants (pôle)</h3>
      <p class="muted sub" style="margin:2px 0 10px">Réservé au pôle : voir qui a saisi son trajet et masquer une fausse saisie.</p>
      <form class="actions" id="pole-form"><input class="field" type="email" id="pole-email" placeholder="Email" autocomplete="username" required style="width:220px">
        <input class="field" type="password" id="pole-mdp" placeholder="Mot de passe" autocomplete="current-password" required style="width:180px">
        <button class="btn sm primary" type="submit">Se connecter</button></form>`;
    return `
      <div class="group-head"><h3 style="margin:0">Saisies des étudiants (pôle)</h3><span class="muted" style="margin-left:auto">${esc(Partage.session.email)}</span><button class="btn sm ghost" data-act="pole-sortir">Se déconnecter</button></div>
      <div id="pole-liste" class="mt"><p class="muted">Chargement…</p></div>`;
  }
  function listePole() {
    const box = $('#pole-liste'); if (!box) return;
    const nomGroupe = id => (st.groupes.find(g => g.id === id) || { nom: id }).nom.split(' (')[0];
    Partage.toutes().then(rows => {
      if (!rows.length) { box.innerHTML = '<p class="muted">Aucune saisie pour l’instant.</p>'; return; }
      box.innerHTML = `<div class="table-wrap"><table>
        <thead><tr><th>Étudiant</th><th>Groupe</th><th>Itinéraire</th><th>Classe</th><th>A/R</th><th>Date</th><th></th></tr></thead>
        <tbody>${rows.map(x => `<tr${x.masquee ? ' class="faint"' : ''}>
          <td>${esc(x.prenom)} ${esc(x.initiale)}.</td><td>${esc(nomGroupe(x.groupe))}</td><td><code>${esc(x.trajet?.route || '')}</code></td>
          <td>${esc(F.classes[x.trajet?.classe]?.label || 'Économique')}</td><td>${x.trajet?.ar === false ? 'non' : 'oui'}</td>
          <td class="num">${new Date(x.cree).toLocaleDateString('fr-FR')}</td>
          <td><button class="btn sm${x.masquee ? '' : ' ghost'}" data-masquer="${esc(x.id)}" data-oui="${x.masquee ? '' : '1'}">${x.masquee ? 'Réafficher' : 'Masquer'}</button></td></tr>`).join('')}</tbody>
      </table></div>`;
    }).catch(e => {
      if (!Partage.connecte()) { const p = $('#pole'); if (p) p.innerHTML = vPole(); toast('Session expirée : se reconnecter'); return; }
      box.innerHTML = `<p class="down">Lecture impossible : ${esc(e.message)}. Ce compte est-il dans la liste du pôle ?</p>`;
    });
  }

  function refreshSaisie() {
    const r = Calc.calculer(st, { saisies: [] });
    r.groupes.forEach((g, gi) => {
      const tot = $(`#tot-${gi}`); if (tot) tot.textContent = `${t(g.total)} tCO2e`;
      g.vols.forEach((v, i) => { const o = $(`#out-${gi}-vols-${i}`); if (o) o.textContent = t(v.air + (v.sol || 0)); const l = $(`#legs-${gi}-${i}`); if (l) l.innerHTML = legsInfo(st.groupes[gi].vols[i]); });
      g.terr.forEach((kg, i) => { const o = $(`#out-${gi}-terrestres-${i}`); if (o) o.textContent = t(kg, 2); });
      const trip = $(`#trip-${gi}`); if (trip) trip.innerHTML = Viz.parcours(st, r, gi);
    });
    // La mini-carte se redessine un instant après la frappe (pas à chaque lettre).
    clearTimeout(refreshSaisie._m);
    refreshSaisie._m = setTimeout(() => {
      const r2 = Calc.calculer(st, { saisies: [] });
      st.groupes.forEach((g, gi) => {
        const box = $(`#mini-${gi}`); if (!box) return;
        box.innerHTML = Viz.carte(st, r2, { groupe: gi, H: 430, noLegend: true });
        Viz.hydrateMaps(box);
      });
    }, 500);
  }

  function aSaisie(view) {
    view.addEventListener('input', e => {
      const el = e.target; if (!el.dataset.f || el.dataset.g == null) return;
      const g = st.groupes[+el.dataset.g];
      const val = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? 0 : +el.value) : el.value;
      if (el.dataset.k) {
        const row = g[el.dataset.k][+el.dataset.i];
        row[el.dataset.f] = val;
        if (el.dataset.f === 'mode') { const occ = el.closest('tr').querySelector('[data-f="occ"]'); occ.disabled = !F.terrestre[val]?.parVehicule; }
        if (el.dataset.f === 'route') el.classList.toggle('err', !!Calc.itineraire(val, st).err);
      } else g[el.dataset.f] = val;
      save(); refreshSaisie();
    });
    view.addEventListener('click', e => {
      const b = e.target.closest('button, a[data-delap]'); if (!b) return;
      if (b.dataset.add) {
        const [gi, k] = b.dataset.add.split('-'); const g = st.groupes[+gi];
        // Nouveau vol : les participants qui n'ont pas encore d'itinéraire.
        const reste = Math.max(0, (+g.participants || 0) - g.vols.reduce((s, v) => s + (+v.pax || 0), 0));
        g[k].push(k === 'vols'
          ? { label: 'Nouveau vol', route: '', pax: reste, classe: 'eco', ar: true, source: 'Hypothèse' }
          : { label: 'Nouveau trajet', mode: 'autocar', km: 0, pax: g.participants, ar: true, occ: 4, source: 'Hypothèse' });
        save(); render();
      } else if (b.dataset.del) {
        const [gi, k, i] = b.dataset.del.split('-');
        if (!confirm(k === 'vols' ? 'Supprimer ce vol ?' : 'Supprimer ce trajet ?')) return;
        st.groupes[+gi][k].splice(+i, 1); save(); render();
      } else if (b.dataset.delap) {
        e.preventDefault(); delete st.aeroportsPerso[b.dataset.delap]; save(); render();
      } else if (b.dataset.act === 'add-ap') {
        const code = $('#ap-code').value.trim().toUpperCase(), lat = parseFloat($('#ap-lat').value.replace(',', '.')), lon = parseFloat($('#ap-lon').value.replace(',', '.'));
        if (!/^[A-Z]{3}$/.test(code) || !isFinite(lat) || !isFinite(lon)) return toast('Code à 3 lettres et coordonnées valides requis');
        st.aeroportsPerso[code] = [$('#ap-nom').value.trim() || code, lat, lon, $('#ap-pays').value.trim().toUpperCase()];
        save(); render(); toast(`${code} ajouté`);
      } else if (b.dataset.act === 'reset') {
        if (confirm('Remplacer toutes les données saisies par les hypothèses de départ ?')) { st = { ...clone(window.HYPOTHESES), prixMaj: 1 }; save(); render(); toast('Hypothèses restaurées'); }
      } else if (b.dataset.act === 'export-json') exportJson();
      else if (b.dataset.act === 'export-csv') exportCsv();
      else if (b.dataset.act === 'pole-sortir') { Partage.deconnecter(); $('#pole').innerHTML = vPole(); }
      else if (b.dataset.masquer) {
        b.disabled = true;
        Partage.masquer(b.dataset.masquer, !!b.dataset.oui)
          .then(() => Partage.charger()).then(() => { listePole(); toast(b.dataset.oui ? 'Saisie masquée' : 'Saisie réaffichée'); })
          .catch(err => { b.disabled = false; toast(err.message); });
      }
    });
    view.addEventListener('submit', e => {
      if (e.target.id !== 'pole-form') return;
      e.preventDefault();
      const btn = $('button[type="submit"]', e.target); btn.disabled = true;
      Partage.connecter($('#pole-email').value.trim(), $('#pole-mdp').value)
        .then(() => { $('#pole').innerHTML = vPole(); listePole(); })
        .catch(() => { btn.disabled = false; toast('Connexion refusée : email ou mot de passe incorrect'); });
    });
    if (window.Partage && Partage.connecte()) listePole();
    $('#import', view)?.addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then(txt => {
        const d = JSON.parse(txt);
        if (!Array.isArray(d.groupes)) throw new Error();
        st = { ...clone(window.HYPOTHESES), ...d }; fixLocations(); save(); render(); toast('Données importées');
      }).catch(() => toast('Fichier non reconnu'));
    });
    // Import qui ajoute : les vols, trajets et locations du fichier s'ajoutent au groupe de même identifiant.
    $('#import-ajout', view)?.addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then(txt => {
        const d = JSON.parse(txt);
        if (!Array.isArray(d.groupes)) throw new Error();
        let n = 0;
        d.groupes.forEach(gf => {
          const g = st.groupes.find(x => x.id === gf.id);
          if (!g) { st.groupes.push({ locations: [], ...clone(gf) }); n++; return; }
          for (const k of ['vols', 'terrestres', 'locations']) if (Array.isArray(gf[k])) { g[k] = (g[k] || []).concat(clone(gf[k])); n += gf[k].length; }
        });
        st.aeroportsPerso = { ...(d.aeroportsPerso || {}), ...(st.aeroportsPerso || {}) };
        fixLocations(); save(); render(); toast(`${n} ligne${n > 1 ? 's' : ''} ajoutée${n > 1 ? 's' : ''}`);
      }).catch(() => toast('Fichier non reconnu'));
    });
  }

  function download(name, content, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const stamp = () => new Date().toISOString().slice(0, 10);
  function exportJson() { download(`bilan-carbone_${stamp()}.json`, JSON.stringify(st, null, 2), 'application/json'); toast('Fichier exporté'); }
  function exportCsv() {
    const r = Calc.calculer(st);
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Groupe', 'Type', 'Libellé', 'Itinéraire / mode', 'Segments', 'Distance par trajet (km)', 'Passagers', 'Classe', 'Aller-retour', 'Source', `kgCO2e (${st.rf ? 'avec' : 'sans'} traînées)`]];
    st.groupes.forEach((g, gi) => {
      r.groupes[gi].vols.forEach(x => { const v = x.vol; rows.push([g.nom, 'Vol', v.label, v.route, x.legs.length, nf(x.legs.reduce((s, l) => s + l.d, 0), 0), v.pax, F.classes[v.classe]?.label, v.ar ? 'oui' : 'non', v.source, nf(x.air, 1)]); });
      g.terrestres.forEach((x, i) => rows.push([g.nom, 'Terrestre', x.label, F.terrestre[x.mode]?.label, '', x.km, x.pax, '', x.ar ? 'oui' : 'non', x.source, nf(r.groupes[gi].terr[i], 1)]));
      (g.locations || []).forEach((l, i) => { const x = r.groupes[gi].loc[i]; rows.push([g.nom, 'Location voiture', [l.label, l.de && l.a ? `${l.de} → ${l.a}` : ''].filter(Boolean).join(' : '), `${x.modele?.label || ''} × ${l.nv}`, '', l.km, x.personnes, '', l.ar ? 'oui' : 'non', l.source, nf(x.kg, 1)]); });
    });
    rows.push([], ['Total', '', '', '', '', '', r.participants, '', '', '', nf(r.total, 1)]);
    download(`tableau-deplacements_${stamp()}.csv`, '﻿' + rows.map(l => l.map(q).join(';')).join('\n'), 'text/csv;charset=utf-8');
    toast('Tableau exporté (s’ouvre dans Excel)');
  }

  // =====================================================================
  // Vue : Scénarios. Responsable : Quentin.
  // Lignes aériennes, TGV et repères de prix : js/leviers.js ; vérifications et sources : docs/leviers-reduction.md.
  // Mise en page : css/scenarios.css. La page suit trois étapes : 1. choisir les leviers,
  // 2. voir le trajet changer, 3. financer ce qui reste.
  // =====================================================================
  const LV = window.LEVIERS || { liaisons: [], tgv: {}, prix: { max: 300, reperes: [] } };
  // Icônes (couleur = currentColor).
  const ICO = {
    train: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2.23l2-2H14l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-7H6V6h5v4zm2 0V6h5v4h-5zm3.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
    avion: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>',
    route: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18.5C6 12 18 12.5 18 5.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-dasharray=".1 4.4"/><circle cx="6" cy="18.5" r="3"/><circle cx="18" cy="5.5" r="3"/></svg>',
    bus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/></svg>',
    voiture: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>',
    siege: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18v3h3v-3h10v3h3v-6H4zm15-8h3v3h-3zM2 10h3v3H2zm15 3H7V5c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v8z"/></svg>'
  };
  // Ordre = ordre d'application (cascade) : d'abord le TGV, puis l'itinéraire est optimisé à partir de Paris.
  const SCEN = [
    { id: 'trainFr', titre: 'TGV au lieu des vols en France', court: 'TGV', icone: 'train', couleur: 'var(--c-ground)',
      qui: 'les responsables des Study Tours, à la réservation (billet unique « Train + Air » avec Air France)' },
    { id: 'itineraire', titre: 'Meilleur itinéraire existant', court: 'Itinéraire', icone: 'route', couleur: 'var(--c-corr)',
      qui: 'les responsables des Study Tours, au choix de la compagnie et de l’escale' },
    { id: 'carToBus', titre: 'Navette au lieu des voitures', court: 'Navettes', icone: 'bus', couleur: 'var(--c-kelley)',
      qui: 'les responsables des Study Tours, pour les transferts sur place' },
    { id: 'eco', titre: 'Tous en classe économique', court: 'Classe éco', icone: 'siege', couleur: 'var(--c-hec)',
      qui: 'les responsables des Study Tours, à la réservation' }
  ];
  const PILL = {
    verifie: '<span class="pill accent">Vérifié</span>',
    a_verifier: '<span class="pill warn">À vérifier</span>',
    a_decider: '<span class="pill warn">À décider</span>',
    deja: '<span class="pill">Déjà dans le bilan</span>',
    sans_objet: '<span class="pill">Pas concerné aujourd’hui</span>'
  };
  const nomCourt = g => esc(String(g.nom || '').split(' (')[0]);
  const ville = p => String(p.nom || p.code).split(/[-–]/)[0].trim();
  const codesVols = legs => legs.length ? [legs[0].from.code, ...legs.map(l => l.to.code)] : [];
  const descLigne = (a, b) => {
    const l = Calc.liaison(a, b);
    return `${a} → ${b}${l && l.cie ? ` (${esc(l.cie)})` : ''}${l && l.note ? ` : ${esc(l.note)}` : ''}`;
  };
  const couleurGroupe = g => g.id === 'hec' ? 'var(--c-hec)' : 'var(--c-kelley)';

  // Effet d'un levier seul : gain avec et sans traînées, statut, phrase simple, itinéraires modifiés, pistes et sources.
  function levierInfo(s) {
    const gain = rf => Calc.calculer(st, { rf }).total - Calc.calculer(st, { rf, [s.id]: true }).total;
    const g = { avec: gain(true), sans: gain(false) };
    const actif = Math.max(g.avec, g.sans) > 0.5;
    const lignes = [], sources = new Set(), pistes = [], phrases = [];
    let statut = actif ? 'verifie' : 'sans_objet';
    if (s.id === 'trainFr' || s.id === 'itineraire') {
      st.groupes.forEach(gr => gr.vols.forEach(v => {
        const a = Calc.calcVol(v, st, { rf: st.rf }), b = Calc.calcVol(v, st, { rf: st.rf, [s.id]: true });
        if (a.err || !a.legs.length) return;
        const avant = codesVols(a.legs), apres = codesVols(b.apres);
        const train = b.trainLegs.map(l => `${l.from.code} → ${l.to.code} en TGV`);
        if (train.length || avant.join() !== apres.join()) {
          lignes.push(`<b>${nomCourt(gr)}</b> : ${avant.join(' → ')} devient ${[...train, apres.join(' → ')].filter(Boolean).join(', puis ')}`);
          if (train.length) {
            // Durée connue seulement pour la ligne documentée dans js/leviers.js (Marseille → Paris-CDG).
            b.trainLegs.forEach(l => phrases.push(`${esc(ville(l.from))} → ${esc(ville(l.to))} en TGV ${[l.from.code, l.to.code].sort().join() === 'CDG,MRS' ? 'direct (≈ 4 h)' : '(durée à vérifier)'} au lieu de l’avion`));
            if (LV.tgv.source) sources.add(`TGV : ${esc(LV.tgv.texte || '')} Source : ${esc(LV.tgv.source)}`);
          }
          if (s.id === 'itineraire') {
            if (b.apres.length === 1) phrases.push(`${nomCourt(gr)} : vol sans escale ${esc(ville(b.apres[0].from))} → ${esc(ville(b.apres[0].to))}`);
            else {
              // Ne citer que les escales qui changent : « escale à Detroit au lieu d’Atlanta ».
              const hubs = l => l.slice(0, -1).map(x => x.to);
              const ha = hubs(a.legs), hb = hubs(b.apres);
              const nv = hb.filter(h => !ha.some(x => x.code === h.code)), anc = ha.filter(h => !hb.some(x => x.code === h.code));
              const noms = l => l.map(x => esc(ville(x))).join(' et ');
              const de = l => (/^[aeiouyéèêh]/i.test(ville(l[0])) ? 'd’' : 'de ') + noms(l);
              phrases.push(`${nomCourt(gr)} : escale à ${noms(nv.length ? nv : hb)}${anc.length ? ` au lieu ${de(anc)}` : ''}`);
            }
            b.apres.forEach(l => { const x = Calc.liaison(l.from.code, l.to.code); if (x) sources.add(`${descLigne(l.from.code, l.to.code)}. Source : ${esc(x.source)}`); });
          }
        }
        // Pistes : meilleur itinéraire si l'on accepte aussi les lignes saisonnières ou à vérifier (non compté).
        if (s.id === 'itineraire' && a.legs.length > 1) {
          const from = a.legs[0].from, to = a.legs[a.legs.length - 1].to;
          const sur = Calc.meilleurItineraire(from, to, a.legs.length, st, st.rf, false);
          const tout = Calc.meilleurItineraire(from, to, a.legs.length, st, st.rf, true);
          if (tout && (!sur || tout.kg < sur.kg - 1)) {
            const kgAvant = a.legs.reduce((x, l) => x + l.d * (st.rf ? l.tranche.avec : l.tranche.sans), 0);
            const n = (+v.pax || 0) * (v.ar ? 2 : 1);
            const pourquoi = tout.legs.map(l => Calc.liaison(l.from.code, l.to.code)).filter(x => x && !(x.statut === 'verifie' && x.toutLAnnee))
              .map(x => `${x.route.replace('-', ' → ')} : ${[x.statut === 'verifie' ? '' : 'à vérifier', esc(x.note || '')].filter(Boolean).join(', ')}`);
            pistes.push(`<b>${nomCourt(gr)}</b> : ${codesVols(tout.legs).join(' → ')}, environ − ${t((kgAvant - tout.kg) * n)} t (${pourquoi.join(' ; ')})`);
          }
        }
      }));
      if (s.id === 'trainFr' && !actif) {
        const deja = st.groupes.some(gr => gr.vols.some(v => (Calc.calcVol(v, st, { rf: st.rf }).solLegs || []).some(l => l.mode === 'train' && l.from.pays === 'FR' && l.to.pays === 'FR')));
        if (deja) statut = 'deja';
      }
    } else if (actif) statut = s.id === 'eco' ? 'a_decider' : 'a_verifier';
    const vide = {
      trainFr: statut === 'deja' ? 'Déjà fait : ce trajet est saisi en train.' : 'Aucun vol à l’intérieur de la France dans les données.',
      itineraire: 'Les itinéraires saisis sont déjà les moins émetteurs parmi les lignes connues.',
      carToBus: 'Personne n’est en voiture ou en taxi dans les données.',
      eco: 'Tout le monde voyage déjà en classe économique.'
    };
    const plein = { carToBus: 'Autocar ou navette collective au lieu des voitures, taxis et locations.', eco: 'Tout le monde en classe économique.' };
    const phrase = actif ? ([...new Set(phrases)].join(' · ') || plein[s.id] || '') : vide[s.id];
    return { g, actif, statut, phrase, lignes, sources: [...sources], pistes };
  }

  // ---------- Étape 1 : une carte par levier (toute la carte est un interrupteur) ----------
  function levierCarte(s, x) {
    const on = !!st.scenarios[s.id];
    const [g1, g2] = st.rf ? [x.g.avec, x.g.sans] : [x.g.sans, x.g.avec];
    const autre = st.rf ? 'sans' : 'avec';
    const detail = [
      `Qui décide : ${s.qui}.`,
      x.lignes.length ? x.lignes.join('<br>') : '',
      x.pistes.length ? `<span class="faint">Piste selon les dates, non comptée :</span><br>${x.pistes.join('<br>')}` : '',
      x.sources.length ? `<span class="faint">Lignes utilisées et sources :</span><br>${x.sources.join('<br>')}` : ''
    ].filter(Boolean).map(h => `<p>${h}</p>`).join('');
    return `<div class="sc-lever${on ? ' on' : ''}${x.actif ? '' : ' na'}" style="--c:${s.couleur}">
        <button type="button" class="sc-lever-hit" data-scen="${s.id}" aria-pressed="${on}"${!x.actif && !on ? ' disabled' : ''}>
          <span class="sc-ico">${ICO[s.icone]}</span>
          <span class="sc-lever-body">
            <span class="sc-lever-title">${s.titre}</span>
            <span class="sc-lever-txt">${x.phrase}</span>
            <span class="sc-lever-foot">${x.actif ? `<span class="sc-gain num">− ${t(g1)} t</span><span class="sc-gain-2 faint num">${autre} traînées : − ${t(g2)} t</span>` : ''}${PILL[x.statut]}${x.pistes.length ? '<span class="pill">+ 1 piste selon les dates</span>' : ''}</span>
          </span>
          <span class="sc-switch" aria-hidden="true"></span>
        </button>
        <details class="sc-more"><summary>Détail et sources</summary>${detail}</details>
      </div>`;
  }

  // ---------- Étape 2 : le trajet de chaque groupe, avant et après ----------
  // Étapes d'un vol saisi (avec les segments au sol de l'onglet Trajets), puis avec les leviers cochés.
  function etapesVol(v) {
    const it = Calc.itineraire(v.route, st); if (it.err) return null;
    const modes = Array.isArray(v.legModes) ? v.legModes : [];
    const avant = it.legs.map((l, i) => ({ a: l.from, b: l.to, mode: Calc.MODES_SOL[modes[i]] && !Calc.transat(l.from, l.to) ? modes[i] : 'avion' }));
    const iAir = avant.map((s, i) => s.mode === 'avion' ? i : -1).filter(i => i >= 0);
    if (!iAir.length) return { avant, apres: avant };
    const y = Calc.calcVol(v, st, { ...st.scenarios, rf: st.rf });
    const lead = avant.slice(0, iAir[0]), trail = avant.slice(iAir[iAir.length - 1] + 1);
    const reste = (y.trainLegs || []).map(l => ({ a: l.from, b: l.to, mode: 'tgv' }));
    const seq = [...lead]; let cur = avant[iAir[0]].a.code;
    const train = () => { let k; while ((k = reste.findIndex(s => s.a.code === cur)) >= 0) { const s = reste.splice(k, 1)[0]; seq.push(s); cur = s.b.code; } };
    train();
    (y.apres || []).forEach(l => { seq.push({ a: l.from, b: l.to, mode: 'avion' }); cur = l.to.code; });
    train();
    return { avant, apres: [...seq, ...reste, ...trail] };
  }
  const MODE = { avion: ['avion', 'en avion'], tgv: ['train', 'en TGV'], train: ['train', 'en train'], autocar: ['bus', 'en autocar'], voiture: ['voiture', 'en voiture'] };
  function chemin(segs, ref) {
    if (!segs.length) return '';
    const stops = [segs[0].a, ...segs.map(s => s.b)];
    return `<ol class="sc-path">${stops.map((p, i) => {
      const s = segs[i], m = s && (MODE[s.mode] || MODE.avion);
      return `<li class="sc-stop${ref && !ref.has(p.code) ? ' new' : ''}"><b>${p.code}</b><small>${esc(ville(p))}</small></li>`
        + (s ? `<li class="sc-leg ${s.mode === 'avion' ? 'air' : 'ground'}" title="${s.a.code} → ${s.b.code} ${m[1]}"><span>${ICO[m[0]]}</span><i class="sr">${m[1]}</i></li>` : '');
    }).join('')}</ol>`;
  }
  function trajetCarte(g, gi, r0, r1) {
    const vols = g.vols.map(v => ({ v, e: etapesVol(v) })).filter(x => x.e);
    const a = r0.groupes[gi].total, b = r1.groupes[gi].total, d = a - b;
    const cle = e => e.map(s => s.a.code + s.b.code + s.mode).join();
    return `<div class="sc-trip">
        <div class="sc-trip-head"><span class="dot" style="background:${couleurGroupe(g)}"></span><b>${esc(g.nom)}</b>
          <span class="sc-trip-t num">${d > 0.05 ? `${t(a)} t → <b>${t(b)} t</b> <span class="sc-down">− ${t(d)} t</span>` : `${t(a)} t`}</span></div>
        ${vols.map(({ v, e }) => {
          const change = cle(e.avant) !== cle(e.apres);
          const ref = new Set(e.avant.flatMap(s => [s.a.code, s.b.code]));
          return `${vols.length > 1 ? `<div class="sc-vol faint">${esc(v.label || 'Vol')} · ${+v.pax || 0} pers.</div>` : ''}
          <div class="sc-row${change ? ' old' : ''}"><span class="sc-tag">Aujourd’hui</span>${chemin(e.avant)}</div>
          ${change ? `<div class="sc-row"><span class="sc-tag accent">Avec les leviers</span>${chemin(e.apres, ref)}</div>` : ''}`;
        }).join('')}
      </div>`;
  }

  // ---------- Étape 3 : prix de la tonne et budget ----------
  const prixSource = p => {
    const r = (LV.prix.reperes || []).find(x => x.prix === p);
    if (r) return `<b>${esc(r.label)}</b> : ${esc(r.desc)} Source : ${esc(r.source)}.`;
    const b = LV.prix.plancher;
    return `Prix libre, à justifier avec le pôle compensation.${b ? ` Pour comparer : crédits volontaires tous standards ≈ ${b.prix} €/t (${esc(b.source)}).` : ''}`;
  };
  const budgets = () => {
    const res = rf => Calc.calculer(st, { ...st.scenarios, rf }).total;
    return { res: res(st.rf), autre: res(!st.rf) };
  };

  // Largeur précédente de la barre « après », pour l'animer d'un état à l'autre.
  let scAvant = null, scDoux = false;

  function vScenarios() {
    const base = Calc.calculer(st);
    const sc = Calc.calculer(st, st.scenarios);
    const infos = Object.fromEntries(SCEN.map(s => [s.id, levierInfo(s)]));
    const red = base.total - sc.total;
    const residuel = sc.total;
    const budget = residuel / 1000 * st.prixTonne;
    const budgetAutre = budgets().autre / 1000 * st.prixTonne;
    const plants = st.coutPlant > 0 ? Math.floor(budget / st.coutPlant) : 0;
    const conv = st.rf ? 'avec' : 'sans', autre = st.rf ? 'sans' : 'avec';
    // Contribution de chaque levier coché, dans l'ordre d'application.
    const pas = []; let opts = {}, prev = base.total;
    SCEN.filter(s => st.scenarios[s.id]).forEach(s => { opts = { ...opts, [s.id]: true }; const v = Calc.calculer(st, opts).total; if (prev - v > 0.5) pas.push({ s, kg: prev - v }); prev = v; });
    // Potentiel des leviers vérifiés (tous cochés).
    const verifs = SCEN.filter(s => infos[s.id].statut === 'verifie');
    const pot = base.total - Calc.calculer(st, Object.fromEntries(verifs.map(s => [s.id, true]))).total;
    const montre = red > 0.5 ? red : pot, choisi = red > 0.5;
    const n = base.participants || 1;
    const w = kg => (base.total ? kg / base.total * 100 : 0).toFixed(2);
    const wRes = w(choisi ? residuel : base.total - pot);
    const w0 = scDoux && scAvant != null ? scAvant : 100;
    scAvant = +wRes; const doux = scDoux; scDoux = false;
    const reps = LV.prix.reperes || [];
    const libre = !reps.some(r => r.prix === st.prixTonne);

    return `<div class="sc-page${doux ? ' sc-calm' : ''}">
      <div class="head"><div><div class="page-title">Scénarios · réduire, puis contribuer</div><h1 style="font-size:28px">Et si on voyageait autrement ?</h1></div>${seg()}</div>

      <section class="card sc-hero">
        <div>
          <div class="kpi-label">${choisi ? 'Avec les leviers choisis, le voyage éviterait' : 'Ce que les leviers vérifiés permettraient d’éviter'}</div>
          <div class="sc-big num"${doux ? '' : ` data-count="− ${t(montre)}"`}>− ${t(montre)} <small>tCO2e</small></div>
          <p class="sc-hero-sub">soit <b>${pct(base.total ? montre / base.total : 0)}</b> du bilan, ${nf(montre / 1000 / n, 2)} t de moins par étudiant${F.reperes && F.reperes.objectifParisKg ? `, ou ${nf(montre / F.reperes.objectifParisKg, 0)} ans du budget carbone annuel compatible avec l’Accord de Paris (2 t par personne)` : ''}.</p>
          ${choisi ? (pot > red + 0.5 ? `<button type="button" class="sc-cta" data-all>Ajouter les autres leviers vérifiés : jusqu’à − ${t(pot)} t</button>` : '')
            : (pot > 0.5 ? `<button type="button" class="sc-cta" data-all>Appliquer ces leviers</button>` : '')}
          <p class="faint sc-hero-note">Ce sont des recommandations : le pôle ne réserve pas les voyages, les responsables des Study Tours décident. Chiffres ${conv} traînées.</p>
        </div>
        <div class="sc-bars" role="img" aria-label="Bilan aujourd’hui ${t(base.total)} tonnes, avec les leviers ${t(choisi ? residuel : base.total - pot)} tonnes">
          <div class="sc-bar-l"><span>Aujourd’hui</span><b class="num">${t(base.total)} t</b></div>
          <div class="sc-bar"><i class="sc-seg base" style="width:100%"></i></div>
          <div class="sc-bar-l"><span>${choisi ? 'Avec les leviers choisis' : 'Avec les leviers vérifiés'}</span><b class="num${choisi ? ' sc-acc' : ''}">${t(choisi ? residuel : base.total - pot)} t</b></div>
          <div class="sc-bar"><i class="sc-seg res" style="width:${wRes}%;--w0:${w0}%"></i>${choisi
            ? pas.map(p => `<i class="sc-seg cut" style="width:${w(p.kg)}%;--c:${p.s.couleur}" title="${p.s.court} : − ${t(p.kg)} t"></i>`).join('')
            : `<i class="sc-seg cut ghost" style="width:${w(pot)}%"></i>`}</div>
          <div class="sc-legend">${choisi
            ? pas.map(p => `<span><i class="sc-sw" style="--c:${p.s.couleur}"></i>${p.s.court} <b class="num">− ${t(p.kg)} t</b></span>`).join('')
            : '<span class="faint">Coche un levier ci-dessous pour voir sa part.</span>'}</div>
        </div>
      </section>

      <div class="sc-step"><i>1</i><div><h2>Réduire : choisir les leviers</h2><p>Chaque carte est un interrupteur. Seules des lignes qui existent sont utilisées (vérifiées le ${esc(LV.maj || '')}, horaires à confirmer aux dates du voyage).</p></div></div>
      <div class="sc-levers">${SCEN.map(s => levierCarte(s, infos[s.id])).join('')}</div>
      <p class="faint sc-foot">Le gain de chaque carte est calculé seul. Ensemble, les leviers ne s’additionnent pas : le TGV s’applique d’abord, puis l’itinéraire est optimisé à partir de Paris. La barre du haut montre l’effet combiné.</p>

      <div class="sc-step"><i>2</i><div><h2>Ce qui change dans le voyage</h2><p>Le trajet de chaque groupe, aujourd’hui et avec les leviers cochés. En vert : les nouvelles escales.</p></div></div>
      <div class="sc-change">
        <div>${st.groupes.map((g, gi) => trajetCarte(g, gi, base, sc)).join('')}</div>
        <div class="card sc-map"><h3>Sur la carte</h3>${Viz.carte(st, base, { scen: st.scenarios, H: 360 })}</div>
      </div>

      <div class="sc-step"><i>3</i><div><h2>Contribuer : financer ce qui reste</h2><p>Les ${t(residuel)} t restantes (${conv} traînées) × un prix par tonne. Choisis un repère : le prix définitif se fixe avec le pôle compensation.</p></div></div>
      <div class="sc-pay">
        <div class="card">
          <div class="sc-prices">${reps.map(r => `<button type="button" class="sc-price${st.prixTonne === r.prix ? ' on' : ''}" data-prix="${r.prix}" aria-pressed="${st.prixTonne === r.prix}">
              <span class="sc-price-name">${esc(r.label)}</span>
              <span class="sc-price-val num">${r.prix} € <small>/ t</small></span>
              <span class="sc-price-budget num">${eur(residuel / 1000 * r.prix)}</span>
              <span class="sc-price-court">${esc(r.court || '')}</span>
            </button>`).join('')}</div>
          <p class="faint sc-src" id="prix-src">${prixSource(st.prixTonne)}</p>
          <details class="sc-more sc-free"${libre ? ' open' : ''}><summary>Autre prix, coût d’un plant</summary>
            <div class="range-row"><span class="muted">Prix par tonne</span><b class="num" id="prix-out">${st.prixTonne} € / tCO2e</b></div>
            <input type="range" min="1" max="${LV.prix.max || 300}" step="1" value="${st.prixTonne}" data-range="prixTonne" aria-label="Prix par tonne">
            <div class="range-row mt"><span class="muted">Coût d'un plant (devis oct. 2025 : ${nf(F.coutPlantHistorique, 2)} €)</span><b class="num" id="plant-out">${nf(st.coutPlant, 2)} €</b></div>
            <input type="range" min="1" max="30" step="0.25" value="${st.coutPlant}" data-range="coutPlant" aria-label="Coût d'un plant">
          </details>
        </div>
        <div class="card sc-budget">
          <div class="kpi-label">Budget de contribution</div>
          <div class="sc-budget-val num" id="budget-out">${eur(budget)}</div>
          <p class="muted">${t(residuel)} t (${conv} traînées) × <span id="prix-sub">${st.prixTonne}</span> €<br>${autre[0].toUpperCase() + autre.slice(1)} traînées : <span id="budget-autre">${eur(budgetAutre)}</span></p>
          <div class="sc-plants"><b class="num" id="plants-out">${plants.toLocaleString('fr-FR')}</b> plants finançables<br><span class="faint">Fournitures seules (plants, protections, tuteurs), sans entretien ni suivi. Ce n’est <b>pas</b> un nombre de tonnes compensées.</span></div>
        </div>
      </div>
      <div class="mt2">${Viz.troisResultats(red, residuel, eur(budget))}</div>
      <div class="note warn mt"><b>Trois résultats à ne jamais additionner :</b> la réduction potentielle (tCO2e évitées si on change le voyage), les émissions résiduelles, et le montant de contribution (en €). Un arbre séquestre du carbone lentement, sur des décennies, et seulement s'il survit.</div>
    </div>`;
  }
  function aScenarios(view) {
    // Met à jour le bloc « Contribuer » sans tout redessiner.
    const majPrix = () => {
      const b = budgets();
      const budget = b.res / 1000 * st.prixTonne;
      $('#prix-out').textContent = `${st.prixTonne} € / tCO2e`;
      $('#prix-sub').textContent = st.prixTonne;
      $('#prix-src').innerHTML = prixSource(st.prixTonne);
      $('#plant-out').textContent = `${nf(st.coutPlant, 2)} €`;
      $('#budget-out').textContent = eur(budget);
      $('#budget-autre').textContent = eur(b.autre / 1000 * st.prixTonne);
      const tb = $$('.three-box b'); if (tb[2]) tb[2].textContent = eur(budget);
      $('#plants-out').textContent = Math.floor(budget / st.coutPlant).toLocaleString('fr-FR');
      $$('[data-prix]', view).forEach(el => { const on = +el.dataset.prix === st.prixTonne; el.classList.toggle('on', on); el.setAttribute('aria-pressed', on); });
    };
    const redessiner = () => { scDoux = true; render(true); };
    view.addEventListener('click', e => {
      const lv = e.target.closest('[data-scen]');
      if (lv && !lv.disabled) {
        st.scenarios[lv.dataset.scen] = !st.scenarios[lv.dataset.scen]; save();
        lv.closest('.sc-lever').classList.toggle('on', st.scenarios[lv.dataset.scen]);
        setTimeout(redessiner, 220);
        return;
      }
      if (e.target.closest('[data-all]')) {
        SCEN.forEach(s => { if (levierInfo(s).statut === 'verifie') st.scenarios[s.id] = true; });
        save(); redessiner(); return;
      }
      const p = e.target.closest('[data-prix]');
      if (p) {
        st.prixTonne = +p.dataset.prix; save();
        const r = $('[data-range="prixTonne"]', view); if (r) r.value = st.prixTonne;
        majPrix();
      }
    });
    view.addEventListener('input', e => {
      const k = e.target.dataset.range; if (!k) return;
      st[k] = +e.target.value; save();
      majPrix();
    });
  }

  // =====================================================================
  // Vue : Rapport (Carbon Footprint Report)
  // =====================================================================
  function vRapport() {
    const r = Calc.calculer(st), alt = Calc.calculer(st, { rf: !st.rf });
    const [k, h] = r.groupes;
    const top = k.total >= h.total ? k : h, other = top === k ? h : k;
    const leviers = SCEN.map(s => ({ s, g: r.total - Calc.calculer(st, { [s.id]: true }).total })).filter(x => x.g > 0.5).sort((a, b) => b.g - a.g);
    // Repères de prix sourcés (js/leviers.js) ; le pôle compensation fixe le prix définitif.
    const reperes = (window.LEVIERS && LEVIERS.prix.reperes) || [];
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const table = g => `<table><thead><tr><th>Poste</th><th class="r">tCO2e</th><th class="r">Part</th></tr></thead><tbody>
      <tr><td>Vols (équivalent direct)</td><td class="r num">${t(g.air - g.corr, 2)}</td><td class="r num">${pct(g.total ? (g.air - g.corr) / g.total : 0)}</td></tr>
      <tr><td>Surplus des correspondances</td><td class="r num">${t(g.corr, 2)}</td><td class="r num">${pct(g.total ? g.corr / g.total : 0)}</td></tr>
      <tr><td>Déplacements terrestres</td><td class="r num">${t(g.terrestre, 2)}</td><td class="r num">${pct(g.total ? g.terrestre / g.total : 0)}</td></tr></tbody>
      <tfoot><tr><td>Total · ${g.participants} participants</td><td class="r num">${t(g.total, 2)}</td><td class="r num">${t(g.parEtudiant, 2)} t / pers.</td></tr></tfoot></table>`;
    return `
      <div class="head no-print"><div><div class="page-title">Livrable stratégique</div><h1 style="font-size:28px">Carbon Footprint Report</h1></div>
        <div class="actions">${seg()}<button class="btn primary" data-act="print">Imprimer / PDF</button></div></div>
      <div class="report">
        <div class="card" style="--i:0">
          <div class="page-title">Rapport ${r.hypotheses ? 'provisoire' : ''} · ${date} · ${st.rf ? 'avec' : 'sans'} traînées</div>
          <div class="hero-value num" style="margin-top:6px">${t(r.total)} <small>tCO2e</small></div>
          <p class="muted" style="margin-top:6px">Empreinte des mobilités internationales des Masters MG FF et ISDBC (${r.participants} participants). ${st.rf ? `Sans les traînées : ${t(alt.total)} tCO2e.` : `Avec les traînées : ${t(alt.total)} tCO2e.`}</p>
          ${r.hypotheses ? `<div class="note warn mt">Ce rapport repose encore sur ${r.hypotheses} hypothèse${r.hypotheses > 1 ? 's' : ''}. Il devient définitif quand les données des responsables des Study Tours sont saisies.</div>` : ''}
        </div>

        <h2>1. Bilans par groupe</h2>
        <div class="grid grid-2">
          <div class="card" style="--i:1"><h3 style="margin-bottom:8px"><span class="dot" style="background:var(--c-kelley)"></span> ${esc(k.nom)}</h3>${table(k)}</div>
          <div class="card" style="--i:2"><h3 style="margin-bottom:8px"><span class="dot" style="background:var(--c-hec)"></span> ${esc(h.nom)}</h3>${table(h)}</div>
        </div>

        <div class="grid grid-2 mt">
          <div class="card" style="--i:3"><h3 style="margin-bottom:10px">Flux des émissions</h3>${Viz.flux(r)}</div>
          <div class="card" style="--i:4"><h3 style="margin-bottom:10px">Carte des trajets</h3>${Viz.carte(st, r)}</div>
        </div>

        <h2>2. Réponses aux questions du cahier des charges</h2>
        <p class="q">Quel groupe génère le plus d'émissions ?</p>
        <p>${esc(top.nom)}, avec ${t(top.total)} tCO2e (${pct(r.total ? top.total / r.total : 0)} du total), contre ${t(other.total)} t pour ${esc(other.nom)}. Par étudiant : ${t(top.parEtudiant, 2)} t contre ${t(other.parEtudiant, 2)} t.</p>
        <p class="q">Quelle est la part du transport aérien ?</p>
        <p>${nf(r.partAir * 100, 1)} % des émissions (${t(r.air)} t). C'est de loin le premier poste : c'est là que se jouent les décisions.</p>
        <p class="q">Quel est le poids des correspondances ?</p>
        <p>${r.corr > 0.5 ? `${t(r.corr)} tCO2e, soit ${pct(r.corr / r.total)} du bilan. C'est le surplus par rapport à des vols directs sur les mêmes origines et destinations : un détour, plus un décollage supplémentaire compté au facteur court-courrier, plus élevé.` : 'Aucun itinéraire saisi ne comporte de correspondance.'}</p>
        <div class="card mt">${Viz.anatomie(st, r)}</div>
        <p class="q">Quel est le poids des déplacements terrestres ?</p>
        <p>${t(r.terrestre, 2)} tCO2e, soit ${pct(r.total ? r.terrestre / r.total : 0)} du bilan. C'est faible, mais facile à réduire et visible pour les participants.</p>
        <p class="q">Quelles sont les possibilités de réduction ?</p>
        ${leviers.length ? `<ul>${leviers.map(x => `<li><b>${x.s.titre}</b> : − ${t(x.g)} tCO2e (${pct(x.g / r.total)}).</li>`).join('')}</ul>` : '<p>Aucun levier simulé n’a d’effet sur les données actuelles.</p>'}
        <p class="q">Quel budget serait nécessaire pour financer une contribution correspondant aux émissions calculées ?</p>
        <p>Selon le prix retenu par tonne (le pôle compensation doit fixer et justifier ce prix) :</p>
        <table style="max-width:560px"><thead><tr><th>Repère de prix par tonne</th><th class="r">Budget pour ${t(r.total)} t (${st.rf ? 'avec' : 'sans'} traînées)</th></tr></thead><tbody>${reperes.map(x => `<tr><td>${x.prix} € / tCO2e · ${esc(x.label)}</td><td class="r num">${eur(r.total / 1000 * x.prix)}</td></tr>`).join('')}</tbody></table>
        <p style="font-size:13px">Ce budget porte sur le bilan entier, sans levier de réduction. L'onglet Scénarios le calcule sur ce qui reste après les leviers cochés.</p>
        <p class="faint" style="font-size:12px">Sources : ${reperes.map(x => `${esc(x.label)} : ${esc(x.source)}`).join(' ; ')}.</p>

        <h2>3. Méthode de calcul</h2>
        ${Viz.chaine()}

        <h2>4. Limites du calcul</h2>
        <div class="card" style="margin-bottom:12px"><h3 style="margin-bottom:10px">Sensibilité du résultat aux hypothèses</h3>${Viz.sensibilite(st)}</div>
        <ul>
          <li>Les facteurs sont ceux de la Base Empreinte de l'ADEME (${st.rf ? 'avec' : 'sans'} traînées), appliqués par segment de vol selon la distance. La taille d'avion est choisie selon la distance, pas selon l'avion réellement utilisé, et les facteurs ne tiennent compte ni du taux de remplissage réel, ni de la compagnie.</li>
          <li>Les distances sont orthodromiques + ${F.correctionKm} km : elles approchent la trajectoire réelle sans la reproduire.</li>
          <li>Périmètre principal : vols et déplacements terrestres. Hébergement, restauration et achats sur place sont exclus de ce bilan (analyse complémentaire possible).</li>
          <li>Les coefficients par classe viennent du DEFRA, une autre source que l'ADEME. Ils s'appliquent au bilan principal, mais seulement aux passagers hors classe économique.</li>
        </ul>
        <h2>Annexe · Détail des calculs</h2>
        <p>Chaque ligne se recalcule à la main : distance × facteur × classe × passagers × trajets.</p>
        ${Viz.detail(st, r)}
        <p class="faint" style="margin-top:24px;font-size:12px">Document produit par le pôle bilan carbone (Project 2). Méthode détaillée : onglet Méthode.</p>
      </div>`;
  }
  function aRapport(view) { view.addEventListener('click', e => { if (e.target.closest('[data-act="print"]')) window.print(); }); }

  // =====================================================================
  // Vue : Méthode
  // =====================================================================
  function vMethode() {
    return `
      <div class="head"><div><div class="page-title">Note méthodologique</div><h1 style="font-size:28px">Comment le bilan est calculé</h1></div></div>
      <div class="method stack">
        <div class="card" style="--i:0"><h2 class="section">La chaîne de calcul</h2>${Viz.chaine()}</div>
        <div class="grid grid-2">
        <div class="card" style="--i:0"><h2 class="section">Pourquoi + ${F.correctionKm} km ?</h2>${Viz.schemaDistance()}</div>
        <div class="card" style="--i:0"><h2 class="section">Formule</h2>
          <p>Pour chaque segment de vol : <code>émissions = (distance orthodromique + ${F.correctionKm} km) × facteur ADEME de la tranche × coefficient de classe × passagers × trajets</code>.</p>
          <p class="mt">Pour chaque trajet terrestre : <code>km × trajets × passagers × facteur</code>, ou, pour une voiture, <code>km × trajets × nombre de véhicules × facteur par véhicule</code>.</p>
          <p class="mt">Le poids d'une correspondance est l'écart entre l'itinéraire réel et un vol direct théorique entre le premier et le dernier aéroport.</p>
          <p class="mt">Les + ${F.correctionKm} km viennent de la réglementation sur l'information CO2 des prestations de transport (article L. 1431-3 du code des transports et guide méthodologique du ministère de l'Écologie) : la distance entre deux aéroports est la distance orthodromique augmentée de 95 km.</p></div>
        </div>
        <div class="grid grid-2">
        <div class="card" style="--i:1"><h2 class="section">Facteurs aériens (kgCO2e par passager.km)</h2>
          <div class="table-wrap"><table><thead><tr><th>Tranche de distance</th><th class="r">Avec traînées</th><th class="r">Sans traînées</th><th>Identifiants ADEME</th></tr></thead>
          <tbody>${F.avion.map(a => `<tr><td>${a.label}</td><td class="r num">${nf(a.avec, 4)}</td><td class="r num">${nf(a.sans, 4)}</td><td class="muted">${a.ademe.join(' / ')}</td></tr>`).join('')}</tbody></table></div>
          <p class="mt" style="font-size:13px">Facteurs « Avion passagers » 2023 de la Base Empreinte. L'ADEME donne un facteur par taille d'avion. Nous avons retenu un avion de 101 à 220 sièges (type A320) jusqu'à 5 000 km, et un gros-porteur de plus de 220 sièges au-delà, car ce sont les avions qui volent en général sur ces distances.</p>
          <div class="mt2">${Viz.escalier(st, Calc.calculer(st))}</div>
          <div class="note mt"><b>Traînées et effets hors CO2.</b> En altitude, les avions forment des traînées de condensation et émettent des oxydes d'azote, qui réchauffent le climat en plus du CO2. L'ADEME publie deux jeux de facteurs : avec ces effets et sans. Dans le détail de ses facteurs, le poste « traînées » est égal au poste « combustion » : la combustion est comptée deux fois, mais pas la production du kérosène ni la fabrication de l'avion. Au total, le facteur avec traînées vaut donc environ 1,8 fois le facteur sans traînées. Le bilan principal utilise <b>${st.rf ? 'la version avec traînées' : 'la version sans traînées'}</b>. La bascule recalcule tout avec l'autre jeu, sans jamais mélanger les deux.</div></div>
        <div class="stack">
        <div class="card" style="--i:2"><h2 class="section">Facteurs terrestres</h2>
          <div class="table-wrap"><table><thead><tr><th>Mode</th><th class="r">kgCO2e / km</th><th>Unité</th><th>Source</th></tr></thead>
          <tbody>${Object.values(F.terrestre).map(m => `<tr><td>${m.label}</td><td class="r num">${nf(m.f, 4)}</td><td class="muted">${m.parVehicule ? 'par véhicule' : 'par passager'}</td><td class="muted">${esc(m.source || '')}</td></tr>`).join('')}</tbody></table></div></div>
        <div class="card" style="--i:3"><h2 class="section">Classes de voyage</h2>
          <p>L'ADEME ne distingue pas les classes : son facteur vaut pour un siège moyen. Les coefficients suivants viennent du DEFRA (gouvernement britannique, facteurs de conversion 2025, vols long-courriers) : ils reflètent la place occupée dans l'avion. Chaque coefficient est le rapport entre le facteur DEFRA de la classe et celui du siège moyen. La classe économique reste à 1, c'est-à-dire au facteur ADEME. Le coefficient s'applique au bilan principal : tant que tout le monde voyage en classe économique, il ne change rien.</p>
          <ul>${Object.values(F.classes).map(c => `<li>${c.label} : × ${nf(c.coef, 2)}</li>`).join('')}</ul></div></div></div>
        <div class="card" style="--i:3"><h2 class="section">Trajets au sol et voitures de location</h2>
          <p><b>Une étape d'itinéraire faite au sol</b> (onglet Trajets : bus, train ou voiture au lieu de l'avion). La distance est le vol d'oiseau multiplié par un détour : × ${nf(Calc.MODES_SOL.train, 1)} en train, × ${nf(Calc.MODES_SOL.autocar, 1)} sur la route <span class="muted">(hypothèses du pôle, sans source officielle)</span>. Ensuite : <code>km × trajets × passagers × facteur</code>, ou pour une voiture <code>km × trajets × nombre de voitures × facteur</code>, avec 4 personnes par voiture <span class="muted">(hypothèse)</span>.</p>
          <p class="mt">Le facteur du train dépend du pays : TGV entre deux villes françaises (ADEME 43256), Amtrak en Amérique du Nord (EPA), Intercités ailleurs en Europe (ADEME 43272). La traversée de l'Atlantique et le trajet vers l'Islande se font toujours en avion.</p>
          <p class="mt"><b>Une voiture de location</b> : <code>carburant = km × trajets × voitures × consommation / 100</code>, puis <code>kgCO2e = carburant × facteur du carburant + km parcourus × ${nf(VEHICULES.fabricationKm, 3)}</code> pour la fabrication du véhicule (ADEME 43791). La consommation est celle annoncée par l'EPA pour chaque modèle (fueleconomy.gov). Quand on choisit deux villes, la distance est le vol d'oiseau × ${nf(VEHICULES.detourRoute, 1)} <span class="muted">(hypothèse)</span>.</p>
          <ul class="mt">${Object.values(VEHICULES.energies).map(e => `<li>${esc(e.label)} : ${nf(e.f, 4)} kgCO2e/${e.unite} · <span class="muted">${esc(e.source)}</span></li>`).join('')}</ul>
          <p class="mt">Les polluants affichés pour les locations (NOx, particules, CO) sont les limites de la norme du véhicule. Ce sont des polluants locaux : ils ne s'ajoutent jamais aux tCO2e.</p></div>
        <div class="card" style="--i:3"><h2 class="section">Quelles hypothèses pèsent le plus ?</h2>
          <p class="muted sub" style="margin:0 0 12px">Écart du bilan quand on change une seule hypothèse à la fois. Les plus grosses barres sont celles à justifier en priorité.</p>
          ${Viz.sensibilite(st)}</div>
        <div><h2 class="section mt2" id="calculs">Calculs détaillés, segment par segment</h2>
          <p class="muted" style="font-size:13px">Toutes les étapes avec les données saisies (${st.rf ? 'avec' : 'sans'} traînées). Chaque résultat peut être vérifié à la calculatrice.</p>
          ${Viz.detail(st, Calc.calculer(st))}</div>
        <div class="card" style="--i:4" id="lexique"><h2 class="section">Lexique</h2><p class="muted" style="font-size:13px;margin-bottom:12px">Les mots soulignés en pointillés dans tout le site affichent ces définitions au survol (ou au toucher sur téléphone).</p>${Lexique.lexiqueHTML()}</div>
        <div class="card" style="--i:4"><h2 class="section">Communication responsable</h2>
          <ul><li>Ne pas annoncer de neutralité carbone non démontrée.</li><li>Ne pas présenter des arbres plantés comme des tonnes de CO2 compensées immédiatement.</li><li>Ne jamais additionner émissions évitées, émissions réduites et contributions financées.</li><li>Ne pas confondre un financement environnemental avec un crédit carbone.</li><li>Toujours indiquer la convention retenue (avec ou sans traînées) et les limites.</li></ul></div>
        <div class="card" style="--i:5"><h2 class="section">Limites</h2>
          <ul><li>Un facteur ADEME est une moyenne : il ne tient compte ni de la compagnie, ni du taux de remplissage réel du vol.</li>
          <li>La taille d'avion est choisie selon la distance, pas selon l'avion réellement utilisé. Un petit avion régional émet plus par passager.km.</li>
          <li>Les + ${F.correctionKm} km sont un forfait : la trajectoire réelle peut être plus longue ou plus courte.</li>
          <li>L'effet des traînées est incertain : il dépend de l'altitude, de l'humidité et de l'heure du vol. Le coefficient de l'ADEME est une moyenne, d'où l'affichage des deux résultats.</li>
          <li>Les coefficients de classe viennent d'une autre source que l'ADEME (DEFRA) : ils ne comptent que pour les passagers hors classe économique.</li>
          <li>Le train en Amérique du Nord vient de l'EPA (agence américaine de l'environnement), car l'ADEME n'a pas de facteur pour ce pays. L'EPA ne compte que les émissions du train, pas la production du carburant : ce facteur est un peu sous-estimé par rapport à ceux de l'ADEME.</li>
          <li>La voiture et le taxi utilisent le facteur d'une voiture moyenne française. Une voiture américaine consomme en général plus, et un taxi roule aussi à vide entre deux clients : ces trajets sont un peu sous-estimés.</li>
          <li>Le périmètre se limite aux déplacements : hébergement, repas et achats sur place sont exclus.</li></ul></div>
        <div class="note" style="--i:5"><b>Sources :</b> ${esc(F.version)}, <a href="https://base-empreinte.ademe.fr" target="_blank" rel="noopener">Base Empreinte de l'ADEME</a>. Train en Amérique du Nord : <a href="https://www.epa.gov/climateleadership/ghg-emission-factors-hub" target="_blank" rel="noopener">EPA, GHG Emission Factors Hub 2025</a>. Consommation des voitures de location : <a href="https://www.fueleconomy.gov" target="_blank" rel="noopener">EPA, fueleconomy.gov</a>. Électricité aux États-Unis : <a href="https://www.epa.gov/egrid" target="_blank" rel="noopener">EPA, eGRID</a>.</div>
      </div>`;
  }

  // ---------- Routeur ----------
  // Onglet Trajets (js/trajets.js) : page d'accueil. Il lit et modifie le même état que l'onglet Saisie.
  const ctx = { st: () => st, save, render: soft => render(soft), toast };
  const ROUTES = {
    trajets: [() => Trajets.view(ctx), v => Trajets.bind(v, ctx)],
    synthese: [vSynthese, aSynthese], saisie: [vSaisie, aSaisie], scenarios: [vScenarios, aScenarios],
    rapport: [vRapport, aRapport], methode: [vMethode, () => {}]
  };
  const route = () => { const h = location.hash.replace(/^#\/?/, ''); return ROUTES[h] ? h : 'trajets'; };

  function render(soft) {
    const name = route();
    const y = soft ? scrollY : 0;
    killCharts();
    const old = $('#view');
    const view = old.cloneNode(false); // nouveau nœud = écouteurs propres
    view.innerHTML = `<div class="view">${ROUTES[name][0]()}</div>`;
    old.replaceWith(view);
    ROUTES[name][1](view);
    Lexique.annoter(view);
    Viz.hydrateMaps(view);
    view.addEventListener('click', e => {
      const b = e.target.closest('[data-rf]'); if (!b) return;
      st.rf = b.dataset.rf === '1'; save(); render(true);
    });
    $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.route === name));
    moveBubble();
    if (!soft) $$('[data-count]', view).forEach(el => countUp(el));
    tilt(view);
    window.scrollTo(0, y);
  }

  // ---------- Pastille de navigation ----------
  function moveBubble() {
    const nav = $('#nav'); let b = $('.bubble', nav);
    if (!b) { b = document.createElement('span'); b.className = 'bubble'; nav.prepend(b); nav.classList.add('has-bubble'); b.style.transition = 'none'; requestAnimationFrame(() => (b.style.transition = '')); }
    const a = $('a.active', nav); if (!a) return;
    const pos = `translate(${a.offsetLeft}px, ${a.offsetTop}px)`;
    if (b.style.transform && b.style.transform !== pos && !calm()) {
      b.classList.remove('moving'); void b.offsetWidth; b.classList.add('moving');
    }
    b.style.width = a.offsetWidth + 'px'; b.style.height = a.offsetHeight + 'px';
    b.style.transform = pos;
  }
  addEventListener('resize', () => { const b = $('#nav .bubble'); if (b) b.style.transform = ''; moveBubble(); });

  // ---------- Glisser à gauche / à droite pour changer d'onglet (téléphone) ----------
  (() => {
    const order = ['trajets', 'synthese', 'saisie', 'scenarios', 'rapport', 'methode'];
    let x0 = null, y0 = 0;
    document.addEventListener('touchstart', e => {
      if (e.target.closest('input, select, textarea, .table-wrap, canvas, .viz-scroll')) { x0 = null; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener('touchend', e => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * .6) return;
      const i = order.indexOf(route()) + (dx < 0 ? 1 : -1);
      if (order[i]) location.hash = order[i] === 'trajets' ? '#/' : '#/' + order[i];
    }, { passive: true });
  })();

  // ---------- Cartes qui s'inclinent (souris) ----------
  function tilt(root) {
    if (calm() || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    $$('.card.tilt', root).forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        c.style.transform = `perspective(900px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg) translateY(-2px)`;
      });
      c.addEventListener('pointerleave', () => { c.style.transform = ''; });
    });
  }

  // ---------- Rebond au toucher ----------
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest('.btn, .seg button, .theme-btn'); if (!b || calm()) return;
    b.classList.remove('press-bounce'); void b.offsetWidth; b.classList.add('press-bounce');
  });

  // ---------- Thème (ouverture en cercle) ----------
  $('#theme').addEventListener('click', e => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    const apply = () => { document.documentElement.dataset.theme = next; try { localStorage.setItem('bilan-carbone.theme', next); } catch (_) {} render(true); };
    if (!document.startViewTransition || calm()) return apply();
    const s = document.documentElement.style;
    s.setProperty('--vx', e.clientX + 'px'); s.setProperty('--vy', e.clientY + 'px');
    s.setProperty('--vr', Math.hypot(Math.max(e.clientX, innerWidth - e.clientX), Math.max(e.clientY, innerHeight - e.clientY)) + 'px');
    document.documentElement.classList.add('vt-theme');
    const vt = document.startViewTransition(apply); vt.ready.catch(() => {}); vt.finished.catch(() => {}).finally(() => document.documentElement.classList.remove('vt-theme'));
  });

  // ---------- Écran de démarrage ----------
  function splash() {
    const sp = $('#splash'); if (!sp) return;
    try { sessionStorage.setItem('bilan-carbone.splash', '1'); } catch (e) {}
    const num = $('.splash-num', sp);
    const total = t(Calc.calculer(st).total);
    setTimeout(() => {
      sp.classList.add('show-num');
      num.innerHTML = `<span data-count="${total}">${total}</span> <small>tCO2e</small>`;
      countUp($('span', num), 1000);
    }, 380);
    setTimeout(() => { sp.classList.add('out'); setTimeout(() => sp.remove(), 460); }, 1700);
  }

  addEventListener('hashchange', () => {
    // Transition animée si possible ; sinon (onglet en arrière-plan, navigateur ancien) rendu direct.
    if (!document.startViewTransition || calm() || document.hidden) return render();
    let done = false;
    const vt = document.startViewTransition(() => { done = true; render(); });
    vt.updateCallbackDone.catch(() => { if (!done) render(); });
    vt.ready.catch(() => {}); vt.finished.catch(() => {});
  });
  render();
  splash();
  if (window.Partage) Partage.charger().then(() => { if (!['saisie', 'trajets'].includes(route())) render(true); });
})();
