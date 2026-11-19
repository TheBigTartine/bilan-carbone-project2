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
  const hypoNote = r => r.hypotheses ? `<div class="note warn mt" style="--i:2"><b>${r.hypotheses} ligne${r.hypotheses > 1 ? 's' : ''} encore en hypothèse.</b> Les résultats sont provisoires tant que les données des responsables des Study Tours ne sont pas saisies (onglet <a href="#/saisie">Saisie</a>, colonne « Source »).</div>` : '';
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
      ${hypoNote(r)}${errNote(r)}
      <div class="grid grid-2 mt">
        <div class="card" style="--i:5"><h2 class="section">Carte des trajets</h2><p class="muted sub">Chaque trait est un segment de vol ; plus il est épais, plus il émet.</p>${Viz.carte(st, r)}</div>
        <div class="card" style="--i:6"><h2 class="section">D'où viennent les tonnes ?</h2><p class="muted sub">Du total vers chaque groupe, puis vers chaque poste. Survoler un flux pour le chiffre.</p>${Viz.flux(r)}</div>
      </div>
      <div class="grid grid-3 mt charts-row">
        <div class="card" style="--i:7"><h2 class="section">Répartition par poste et par groupe</h2><div class="chart-box"><canvas id="c-postes"></canvas></div></div>
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
    const r = Calc.calculer(st);
    const perso = Object.entries(st.aeroportsPerso || {});
    return `
      <div class="head"><div><div class="page-title">Collecte des données</div><h1 style="font-size:28px">Tableau des déplacements</h1></div>
        <div class="actions no-print">
          <button class="btn sm" data-act="export-json">Exporter (.json)</button>
          <label class="btn sm" style="cursor:pointer">Importer (.json)<input type="file" accept=".json,application/json" id="import" hidden></label>
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
            <td class="r num" id="out-${gi}-vols-${i}">${t(r.groupes[gi].vols[i].air)}</td>
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
      <div class="card mt2" style="--i:4">
        <h3>Ajouter un aéroport manquant</h3>
        <p class="muted" style="font-size:12.5px;margin:4px 0 10px">${Object.keys(window.AEROPORTS).length} aéroports sont déjà connus (${Object.keys(window.AEROPORTS).join(', ')}). Coordonnées en degrés décimaux, à copier depuis Wikipédia.</p>
        <div class="actions"><input class="field w-num" id="ap-code" placeholder="Code" maxlength="3" style="text-transform:uppercase"><input class="field" id="ap-nom" placeholder="Nom" style="width:180px"><input class="field w-sm" id="ap-lat" placeholder="Latitude"><input class="field w-sm" id="ap-lon" placeholder="Longitude"><input class="field w-num" id="ap-pays" placeholder="Pays" maxlength="2" style="text-transform:uppercase"><button class="btn sm primary" data-act="add-ap">Ajouter</button></div>
        ${perso.length ? `<p class="muted mt" style="font-size:12.5px">Ajoutés : ${perso.map(([c, p]) => `${esc(c)} (${esc(p[0])}) <a href="#" data-delap="${esc(c)}">retirer</a>`).join(' · ')}</p>` : ''}
      </div>`;
  }

  function refreshSaisie() {
    const r = Calc.calculer(st);
    r.groupes.forEach((g, gi) => {
      const tot = $(`#tot-${gi}`); if (tot) tot.textContent = `${t(g.total)} tCO2e`;
      g.vols.forEach((v, i) => { const o = $(`#out-${gi}-vols-${i}`); if (o) o.textContent = t(v.air); const l = $(`#legs-${gi}-${i}`); if (l) l.innerHTML = legsInfo(st.groupes[gi].vols[i]); });
      g.terr.forEach((kg, i) => { const o = $(`#out-${gi}-terrestres-${i}`); if (o) o.textContent = t(kg, 2); });
    });
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
        g[k].push(k === 'vols'
          ? { label: 'Nouveau vol', route: '', pax: g.participants, classe: 'eco', ar: true, source: 'Hypothèse' }
          : { label: 'Nouveau trajet', mode: 'autocar', km: 0, pax: g.participants, ar: true, occ: 4, source: 'Hypothèse' });
        save(); render();
      } else if (b.dataset.del) {
        const [gi, k, i] = b.dataset.del.split('-'); st.groupes[+gi][k].splice(+i, 1); save(); render();
      } else if (b.dataset.delap) {
        e.preventDefault(); delete st.aeroportsPerso[b.dataset.delap]; save(); render();
      } else if (b.dataset.act === 'add-ap') {
        const code = $('#ap-code').value.trim().toUpperCase(), lat = parseFloat($('#ap-lat').value.replace(',', '.')), lon = parseFloat($('#ap-lon').value.replace(',', '.'));
        if (!/^[A-Z]{3}$/.test(code) || !isFinite(lat) || !isFinite(lon)) return toast('Code à 3 lettres et coordonnées valides requis');
        st.aeroportsPerso[code] = [$('#ap-nom').value.trim() || code, lat, lon, $('#ap-pays').value.trim().toUpperCase()];
        save(); render(); toast(`${code} ajouté`);
      } else if (b.dataset.act === 'reset') {
        if (confirm('Remplacer toutes les données saisies par les hypothèses de départ ?')) { st = clone(window.HYPOTHESES); save(); render(); toast('Hypothèses restaurées'); }
      } else if (b.dataset.act === 'export-json') exportJson();
      else if (b.dataset.act === 'export-csv') exportCsv();
    });
    $('#import', view)?.addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      f.text().then(txt => {
        const d = JSON.parse(txt);
        if (!Array.isArray(d.groupes)) throw new Error();
        st = { ...clone(window.HYPOTHESES), ...d }; save(); render(); toast('Données importées');
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
      g.vols.forEach((v, i) => { const x = r.groupes[gi].vols[i]; rows.push([g.nom, 'Vol', v.label, v.route, x.legs.length, nf(x.legs.reduce((s, l) => s + l.d, 0), 0), v.pax, F.classes[v.classe]?.label, v.ar ? 'oui' : 'non', v.source, nf(x.air, 1)]); });
      g.terrestres.forEach((x, i) => rows.push([g.nom, 'Terrestre', x.label, F.terrestre[x.mode]?.label, '', x.km, x.pax, '', x.ar ? 'oui' : 'non', x.source, nf(r.groupes[gi].terr[i], 1)]));
    });
    rows.push([], ['Total', '', '', '', '', '', r.participants, '', '', '', nf(r.total, 1)]);
    download(`tableau-deplacements_${stamp()}.csv`, '﻿' + rows.map(l => l.map(q).join(';')).join('\n'), 'text/csv;charset=utf-8');
    toast('Tableau exporté (s’ouvre dans Excel)');
  }

  // =====================================================================
  // Vue : Scénarios
  // =====================================================================
  const SCEN = [
    { id: 'direct', titre: 'Vols directs plutôt qu’avec escale', court: 'Vols directs', desc: 'Remplace chaque itinéraire par un vol direct entre le premier et le dernier aéroport. À vérifier : la ligne directe doit exister aux dates du voyage.' },
    { id: 'trainFr', titre: 'Pré-acheminement en TGV', court: 'TGV', desc: 'Les segments en avion à l’intérieur de la France (ex. MRS → CDG) sont faits en TGV (distance rail ≈ orthodromie × 1,2).' },
    { id: 'carToBus', titre: 'Voitures et taxis remplacés par une navette', court: 'Navettes', desc: 'Les trajets en voiture thermique ou en taxi passent en autocar ou navette collective.' },
    { id: 'eco', titre: 'Tous en classe économique', court: 'Classe éco', desc: 'N’a d’effet que si des passagers sont saisis dans une autre classe (coefficients DEFRA).' }
  ];
  function vScenarios() {
    const base = Calc.calculer(st);
    const sc = Calc.calculer(st, st.scenarios);
    const red = base.total - sc.total;
    const residuel = sc.total;
    const budget = residuel / 1000 * st.prixTonne;
    const plants = st.coutPlant > 0 ? Math.floor(budget / st.coutPlant) : 0;
    return `
      <div class="head"><div><div class="page-title">Mesurer, éviter, réduire, puis contribuer</div><h1 style="font-size:28px">Simulateur de scénarios</h1></div>${seg()}</div>
      <div class="card" style="--i:0;margin-bottom:12px;padding:12px 14px">${Viz.demarche(red > 0.5 ? [0, 2, 3] : [0, 3])}</div>
      <div class="grid grid-3">
        <div class="card tilt" style="--i:0"><div class="kpi-label">Bilan mesuré</div><div class="kpi-value num" data-count="${t(base.total)}">${t(base.total)} <small>tCO2e</small></div><div class="kpi-sub">Situation saisie, sans aucune mesure</div></div>
        <div class="card tilt" style="--i:1"><div class="kpi-label"><span class="dot" style="background:var(--accent)"></span>Réduction potentielle</div><div class="kpi-value num" style="color:var(--accent)" data-count="${t(red)}">${t(red)} <small>tCO2e</small></div><div class="kpi-sub">${pct(base.total ? red / base.total : 0)} du bilan, si les mesures cochées sont appliquées</div></div>
        <div class="card tilt" style="--i:2"><div class="kpi-label">Émissions résiduelles</div><div class="kpi-value num" data-count="${t(residuel)}">${t(residuel)} <small>tCO2e</small></div><div class="kpi-sub">Ce qui reste à couvrir par une contribution</div></div>
      </div>
      <div class="grid grid-main mt">
        <div class="card" style="--i:3"><h2 class="section">Leviers de réduction</h2>
          ${SCEN.map(s => { const alone = base.total - Calc.calculer(st, { [s.id]: true }).total; return `
          <div class="scenario"><div><label class="switch"><input type="checkbox" data-scen="${s.id}" ${st.scenarios[s.id] ? 'checked' : ''}><span class="track"></span><span>${s.titre}</span></label><div class="desc" style="margin-left:56px">${s.desc}</div></div>
            <div class="gain num">${alone > 0.5 ? '− ' + t(alone) + ' t' : '<span class="faint">aucun effet</span>'}</div></div>`; }).join('')}
          <p class="faint" style="font-size:12px;margin-top:10px">Le gain affiché pour chaque levier est calculé seul. Les leviers combinés ne s'additionnent pas toujours (ex. vol direct et TGV portent sur le même segment).</p>
        </div>
        <div class="card" style="--i:4"><h2 class="section">Cascade : du bilan mesuré au résiduel</h2>${Viz.cascade(st, SCEN)}</div>
      </div>
      <div class="card mt" style="--i:5"><h2 class="section">Contribution à financer</h2>
        <div class="grid grid-2">
          <div>
            <div class="range-row"><span class="muted">Prix retenu par tonne</span><b class="num" id="prix-out">${st.prixTonne} € / tCO2e</b></div>
            <input type="range" min="5" max="200" step="5" value="${st.prixTonne}" data-range="prixTonne" aria-label="Prix par tonne">
            <div class="range-row mt"><span class="muted">Coût d'un plant (devis oct. 2025 : ${nf(F.coutPlantHistorique, 2)} €)</span><b class="num" id="plant-out">${nf(st.coutPlant, 2)} €</b></div>
            <input type="range" min="1" max="30" step="0.25" value="${st.coutPlant}" data-range="coutPlant" aria-label="Coût d'un plant">
          </div>
          <div class="stack">
            <div><div class="kpi-label">Budget de contribution</div><div class="kpi-value num" id="budget-out">${eur(budget)}</div><div class="kpi-sub">${t(residuel)} t résiduelles × ${st.prixTonne} €</div></div>
            <div><div class="kpi-label">Plants finançables avec ce budget</div><div class="kpi-value num" id="plants-out">${plants.toLocaleString('fr-FR')}</div><div class="kpi-sub">Fournitures seulement (plants, protections, tuteurs), sans entretien ni suivi</div></div>
          </div>
        </div>
        <div class="mt2">${Viz.troisResultats(red, residuel, eur(budget))}</div>
        <div class="note warn mt"><b>Trois résultats à ne jamais additionner :</b> la réduction potentielle (tCO2e évitées si on change le voyage), les émissions résiduelles, et le montant de contribution (en €). Le nombre de plants mesure un budget, <b>pas</b> des tonnes compensées : un arbre séquestre du carbone lentement, sur des décennies, et seulement s'il survit.</div>
      </div>`;
  }
  function aScenarios(view) {
    view.addEventListener('change', e => {
      const s = e.target.dataset.scen; if (!s) return;
      st.scenarios[s] = e.target.checked; save();
      e.target.closest('.switch').classList.add('press-bounce');
      setTimeout(() => render(true), 260);
    });
    view.addEventListener('input', e => {
      const k = e.target.dataset.range; if (!k) return;
      st[k] = +e.target.value; save();
      const res = Calc.calculer(st, st.scenarios).total;
      const budget = res / 1000 * st.prixTonne;
      $('#prix-out').textContent = `${st.prixTonne} € / tCO2e`;
      $('#plant-out').textContent = `${nf(st.coutPlant, 2)} €`;
      $('#budget-out').textContent = eur(budget);
      const tb = $$('.three-box b'); if (tb[2]) tb[2].textContent = eur(budget);
      $('#plants-out').textContent = Math.floor(budget / st.coutPlant).toLocaleString('fr-FR');
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
    const prix = [15, 30, 60, 100];
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
        <table style="max-width:460px"><thead><tr><th>Prix par tonne</th><th class="r">Budget pour ${t(r.total)} t</th></tr></thead><tbody>${prix.map(p => `<tr><td>${p} € / tCO2e</td><td class="r num">${eur(r.total / 1000 * p)}</td></tr>`).join('')}</tbody></table>

        <h2>3. Méthode de calcul</h2>
        ${Viz.chaine()}

        <h2>4. Limites du calcul</h2>
        <ul>
          <li>Les facteurs sont ceux de la Base Empreinte de l'ADEME (${st.rf ? 'avec' : 'sans'} traînées), appliqués par segment de vol selon la distance. Ils ne tiennent compte ni du type d'avion, ni du taux de remplissage réel, ni de la compagnie.</li>
          <li>Les distances sont orthodromiques + ${F.correctionKm} km : elles approchent la trajectoire réelle sans la reproduire.</li>
          <li>Périmètre principal : vols et déplacements terrestres. Hébergement, restauration et achats sur place sont exclus de ce bilan (analyse complémentaire possible).</li>
          <li>Les coefficients par classe (DEFRA) relèvent d'une autre convention et ne servent qu'en analyse complémentaire.</li>
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
          <p>L'ADEME ne distingue pas les classes : son facteur vaut pour un siège moyen. Les coefficients suivants viennent du DEFRA (gouvernement britannique, facteurs de conversion 2025, vols long-courriers) : ils reflètent la place occupée dans l'avion. Chaque coefficient est le rapport entre le facteur DEFRA de la classe et celui du siège moyen. La classe économique reste à 1, c'est-à-dire au facteur ADEME. Ils ne sont à utiliser qu'en analyse complémentaire.</p>
          <ul>${Object.values(F.classes).map(c => `<li>${c.label} : × ${nf(c.coef, 2)}</li>`).join('')}</ul></div></div></div>
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
          <li>Les coefficients de classe viennent d'une autre convention (DEFRA) : ils restent en analyse complémentaire.</li>
          <li>Le train en Amérique du Nord vient de l'EPA (agence américaine de l'environnement), car l'ADEME n'a pas de facteur pour ce pays. L'EPA ne compte que les émissions du train, pas la production du carburant : ce facteur est un peu sous-estimé par rapport à ceux de l'ADEME.</li>
          <li>La voiture et le taxi utilisent le facteur d'une voiture moyenne française. Une voiture américaine consomme en général plus, et un taxi roule aussi à vide entre deux clients : ces trajets sont un peu sous-estimés.</li>
          <li>Le périmètre se limite aux déplacements : hébergement, repas et achats sur place sont exclus.</li></ul></div>
        <div class="note" style="--i:5"><b>Sources :</b> ${esc(F.version)}, <a href="https://base-empreinte.ademe.fr" target="_blank" rel="noopener">Base Empreinte de l'ADEME</a>. Train en Amérique du Nord : <a href="https://www.epa.gov/climateleadership/ghg-emission-factors-hub" target="_blank" rel="noopener">EPA, GHG Emission Factors Hub 2025</a>.</div>
      </div>`;
  }

  // ---------- Routeur ----------
  const ROUTES = {
    synthese: [vSynthese, aSynthese], saisie: [vSaisie, aSaisie], scenarios: [vScenarios, aScenarios],
    rapport: [vRapport, aRapport], methode: [vMethode, () => {}]
  };
  const route = () => { const h = location.hash.replace(/^#\/?/, ''); return ROUTES[h] ? h : 'synthese'; };

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
    const order = ['synthese', 'saisie', 'scenarios', 'rapport', 'methode'];
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
      if (order[i]) location.hash = order[i] === 'synthese' ? '#/' : '#/' + order[i];
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
})();
