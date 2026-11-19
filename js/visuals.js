/* Schémas en SVG / HTML : carte des trajets, flux, anatomie des vols, cascade, équivalences, chaîne de calcul,
   détail pas à pas. Chaque fonction renvoie du HTML ; les couleurs viennent des variables CSS (thème clair / sombre). */
(function () {
  const F = window.FACTEURS;
  const nf = (v, d = 1) => (+v || 0).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const t = (kg, d = 1) => nf(kg / 1000, d);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const GC = ['var(--c-kelley)', 'var(--c-hec)'];
  const BAND = { court: 'var(--c-corr)', moyen: 'var(--c-ground)', long: 'var(--c-air)' };

  // ---------------------------------------------------------------------
  // 1. Carte des trajets (projection équirectangulaire simplifiée)
  // ---------------------------------------------------------------------
  function carte(st, r) {
    const W = 860, H = 360, L0 = -96, L1 = 24, A0 = 28, A1 = 60;
    const px = lon => (lon - L0) / (L1 - L0) * W, py = lat => (A1 - lat) / (A1 - A0) * H;
    const segs = new Map(), pts = new Map();
    st.groupes.forEach((g, gi) => g.vols.forEach((v, vi) => {
      const x = r.groupes[gi].vols[vi]; if (!x.legs) return;
      x.legs.forEach(l => {
        const coef = (F.classes[v.classe] || F.classes.eco).coef;
        const kg = l.d * (st.rf ? l.tranche.avec : l.tranche.sans) * coef * (+v.pax || 0) * (v.ar ? 2 : 1);
        const k = `${gi}|${l.from.code}|${l.to.code}`;
        const o = segs.get(k) || { gi, a: l.from, b: l.to, kg: 0, d: l.d, tr: l.tranche.label };
        o.kg += kg; segs.set(k, o);
        pts.set(l.from.code, l.from); pts.set(l.to.code, l.to);
      });
    }));
    if (!segs.size) return '<p class="muted">Aucun vol valide à afficher.</p>';
    const max = Math.max(...[...segs.values()].map(s => s.kg));
    let grid = '';
    for (let lon = -90; lon <= 10; lon += 10) grid += `<line x1="${px(lon)}" y1="0" x2="${px(lon)}" y2="${H}"/>`;
    for (let lat = 30; lat <= 55; lat += 5) grid += `<line x1="0" y1="${py(lat)}" x2="${W}" y2="${py(lat)}"/>`;
    const arcs = [...segs.values()].map((s, i) => {
      const x1 = px(s.a.lon), y1 = py(s.a.lat), x2 = px(s.b.lon), y2 = py(s.b.lat);
      const dist = Math.hypot(x2 - x1, y2 - y1);
      const off = s.gi ? 0.26 : 0.18; // les deux groupes ne se superposent pas
      const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2 - dist * off;
      const w = 1.5 + 9 * Math.sqrt(s.kg / max);
      return `<path class="draw" pathLength="1" style="--d:${300 + i * 160}ms" d="M${x1},${y1} Q${cx},${cy} ${x2},${y2}" stroke="${GC[s.gi]}" stroke-width="${w.toFixed(1)}" fill="none" stroke-linecap="round" opacity=".9"
        data-tip="<b>${s.a.code} → ${s.b.code}</b><br>${esc(st.groupes[s.gi].nom)}<br>${nf(s.d, 0)} km · ${esc(s.tr)}<br><b>${t(s.kg, 2)} tCO2e</b> (A/R, tout le groupe)"/>`;
    }).join('');
    const dots = [...pts.values()].map((p, i) => {
      const x = px(p.lon), y = py(p.lat), left = p.lon > -20;
      return `<g class="pop" style="animation-delay:${200 + i * 70}ms"><circle cx="${x}" cy="${y}" r="5.5" fill="var(--surface)" stroke="var(--text)" stroke-width="2"/>
        <text x="${x + (left ? 9 : -9)}" y="${y + 4}" text-anchor="${left ? 'start' : 'end'}" class="map-code">${p.code}</text></g>`;
    }).join('');
    return `<div class="viz-scroll"><svg class="viz map" viewBox="0 0 ${W} ${H}" role="img" aria-label="Carte des trajets aériens des deux groupes">
      <g class="grid">${grid}</g>
      <text x="${px(-80)}" y="${py(52)}" class="map-zone">AMÉRIQUE DU NORD</text>
      <text x="${px(-42)}" y="${py(36)}" class="map-zone">OCÉAN ATLANTIQUE</text>
      <text x="${px(-4)}" y="${py(55.5)}" class="map-zone">EUROPE</text>
      ${arcs}${dots}</svg></div>
      <div class="legend mt"><span><i class="dot" style="background:var(--c-kelley)"></i>Kelley</span><span><i class="dot" style="background:var(--c-hec)"></i>HEC Montréal</span><span class="faint">Épaisseur du trait = émissions du segment · survoler un trait pour le détail</span></div>`;
  }

  // ---------------------------------------------------------------------
  // 2. Flux : total → groupes → postes (diagramme de Sankey)
  // ---------------------------------------------------------------------
  function flux(r) {
    const W = 860, H = 300, NW = 14, GAP = 18, X = [0, 320, W - 240];
    if (!r.total) return '';
    const postes = [
      { k: 'direct', label: 'Vols (équiv. direct)', c: 'var(--c-air)', v: g => g.air - g.corr },
      { k: 'corr', label: 'Correspondances', c: 'var(--c-corr)', v: g => g.corr },
      { k: 'terr', label: 'Terrestre', c: 'var(--c-ground)', v: g => g.terrestre }
    ];
    const minH = 3;
    const usable = H - GAP * 2;
    const s = usable / r.total;
    const h = v => Math.max(minH, v * s);
    // Colonne 2 : groupes
    let y = 0;
    const G = r.groupes.map((g, i) => { const n = { g, i, y, h: h(g.total) }; y += n.h + GAP; return n; });
    const totH = G.reduce((a, n) => a + n.h, 0) + GAP * (G.length - 1);
    // Colonne 3 : postes
    y = 0;
    const P = postes.map(p => { const v = r.groupes.reduce((a, g) => a + p.v(g), 0); const n = { ...p, val: v, y, h: h(v) }; y += n.h + GAP; return n; });
    const band = (x1, y1, h1, x2, y2, h2, c, tip, d) => {
      const m = (x1 + x2) / 2;
      return `<path class="flow" style="animation-delay:${d}ms" d="M${x1},${y1} C${m},${y1} ${m},${y2} ${x2},${y2} L${x2},${y2 + h2} C${m},${y2 + h2} ${m},${y1 + h1} ${x1},${y1 + h1}Z" fill="${c}" data-tip="${tip}"/>`;
    };
    let links = '', off0 = 0;
    // total → groupes
    G.forEach(n => { links += band(X[0] + NW, off0, n.h, X[1], n.y, n.h, GC[n.i], `<b>${esc(n.g.nom)}</b><br>${t(n.g.total)} tCO2e`, 200 + n.i * 120); off0 += n.h; });
    // groupes → postes
    const pOff = P.map(() => 0);
    G.forEach(n => {
      let o = 0;
      P.forEach((p, pi) => {
        const v = p.v(n.g); if (v <= 0) return;
        const hh = Math.max(1.5, v * s);
        links += band(X[1] + NW, n.y + o, hh, X[2], p.y + pOff[pi], hh, GC[n.i], `<b>${esc(n.g.nom.split(' (')[0])} → ${p.label}</b><br>${t(v, 2)} tCO2e`, 500 + pi * 100);
        o += hh; pOff[pi] += hh;
      });
    });
    const node = (x, y, hh, c, tip) => `<rect x="${x}" y="${y}" width="${NW}" height="${hh}" rx="4" fill="${c}" data-tip="${tip}"/>`;
    const nodes = node(X[0], 0, totH - GAP * (G.length - 1), 'var(--text)', `<b>Total</b><br>${t(r.total)} tCO2e`)
      + G.map(n => node(X[1], n.y, n.h, GC[n.i], `${esc(n.g.nom)} : ${t(n.g.total)} t`)).join('')
      + P.map(p => node(X[2], p.y, p.h, p.c, `${p.label} : ${t(p.val, 2)} t`)).join('');
    const labels = `<text x="${X[0] + NW + 8}" y="16" class="sk-label">Total · ${t(r.total)} t</text>`
      + G.map(n => `<text x="${X[1] - 8}" y="${n.y + n.h / 2 + 4}" text-anchor="end" class="sk-label">${esc(n.g.nom.split(' (')[0])} · ${t(n.g.total)} t</text>`).join('')
      + P.map(p => `<text x="${X[2] + NW + 8}" y="${p.y + p.h / 2 + 4}" class="sk-label">${p.label} · ${t(p.val, p.val < 1000 ? 2 : 1)} t</text>`).join('');
    return `<div class="viz-scroll"><svg class="viz" viewBox="0 0 ${W} ${H + 16}" role="img" aria-label="Flux des émissions du total vers les groupes puis vers les postes">${links}${nodes}${labels}</svg></div>`;
  }

  // ---------------------------------------------------------------------
  // 3. Anatomie d'un itinéraire : kg par passager et par aller, segment par segment
  // ---------------------------------------------------------------------
  function anatomie(st, r) {
    const rows = [];
    st.groupes.forEach((g, gi) => g.vols.forEach((v, vi) => {
      const x = r.groupes[gi].vols[vi]; if (!x.legs || !x.legs.length) return;
      const coef = (F.classes[v.classe] || F.classes.eco).coef;
      const f = l => (st.rf ? l.tranche.avec : l.tranche.sans);
      const legs = x.legs.map(l => ({ l, kg: l.d * f(l) * coef }));
      const it = Calc.itineraire(v.route, st);
      const direct = it.direct.d * f(it.direct) * coef;
      rows.push({ gi, label: `${g.nom.split(' (')[0]} · ${v.label}`, legs, direct, sum: legs.reduce((a, b) => a + b.kg, 0), n: legs.length });
    }));
    if (!rows.length) return '';
    const max = Math.max(...rows.map(r => Math.max(r.sum, r.direct)));
    return `<div class="anat">${rows.map((row, ri) => `
      <div class="anat-row">
        <div class="anat-head"><span><i class="dot" style="background:${GC[row.gi]}"></i> ${esc(row.label)}</span><b class="num">${nf(row.sum, 0)} kg</b></div>
        <div class="anat-bar">${row.legs.map((x, i) => `<span class="seg-${x.l.tranche.id}" style="width:${x.kg / max * 100}%;background:${BAND[x.l.tranche.id]};animation-delay:${ri * 150 + i * 120}ms"
          data-tip="<b>${x.l.from.code} → ${x.l.to.code}</b><br>${nf(x.l.gc, 0)} km + ${F.correctionKm} = ${nf(x.l.d, 0)} km<br>${esc(x.l.tranche.label)} : ${nf(st.rf ? x.l.tranche.avec : x.l.tranche.sans, 4)} kg/km<br><b>${nf(x.kg, 0)} kgCO2e</b> par passager">${x.kg / max > .12 ? `${x.l.from.code}→${x.l.to.code}` : ''}</span>`).join('')}</div>
        ${row.n > 1 ? `<div class="anat-bar ghost"><span style="width:${row.direct / max * 100}%" data-tip="Vol direct théorique ${row.legs[0].l.from.code} → ${row.legs[row.n - 1].l.to.code} : ${nf(row.direct, 0)} kg">Direct théorique · ${nf(row.direct, 0)} kg</span></div>
        <div class="anat-diff">+ ${nf(row.sum - row.direct, 0)} kg par passager et par aller à cause de ${row.n - 1} correspondance${row.n > 2 ? 's' : ''} (+${nf((row.sum / row.direct - 1) * 100, 0)} %)</div>` : ''}
      </div>`).join('')}</div>
      <div class="legend mt"><span><i class="dot" style="background:var(--c-corr)"></i>Court-courrier (&lt; 1 000 km)</span><span><i class="dot" style="background:var(--c-ground)"></i>Moyen-courrier</span><span><i class="dot" style="background:var(--c-air)"></i>Long-courrier (&gt; 3 500 km)</span><span class="faint">Émissions par passager, pour un aller</span></div>`;
  }

  // ---------------------------------------------------------------------
  // 4. Équivalences : pictogrammes + carrés de 100 kg
  // ---------------------------------------------------------------------
  const ICON = {
    train: '<path d="M12 2C8 2 4 2.5 4 6v9.5A3.5 3.5 0 0 0 7.5 19L6 20.5v.5h2l2-2h4l2 2h2v-.5L16.5 19a3.5 3.5 0 0 0 3.5-3.5V6c0-3.5-4-4-8-4zM7.5 17a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3.5-7H6V6h5zm2 0V6h5v4zm3.5 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>',
    car: '<path d="M18.9 6c-.2-.6-.8-1-1.4-1h-11c-.7 0-1.2.4-1.4 1L3 12v8a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h12v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-8zM6.5 16a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm11 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM5 11l1.5-4.5h11L19 11z"/>',
    cal: '<path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14zM7 12h5v5H7z"/>'
  };
  function equivalences(r) {
    const per = r.parEtudiant;
    const tgv = per / F.reperes.tgvParisMarseilleKg;
    const car = per / F.terrestre.voiture.f;
    const mois = per / F.reperes.objectifParisKg * 12;
    const tile = (ic, big, unit, txt, i) => `<div class="eq card tilt" style="--i:${i}"><svg viewBox="0 0 24 24" class="eq-ic">${ICON[ic]}</svg><div class="kpi-value num" data-count="${big}">${big}</div><div class="eq-unit">${unit}</div><div class="kpi-sub">${txt}</div></div>`;
    const sq = Math.round(per / 100), budget = 20;
    const n = Math.max(sq, budget);
    const cells = Array.from({ length: n }, (_, i) => `<i class="${i < sq ? 'on' : ''} ${i < budget ? 'in' : ''}" style="animation-delay:${i * 22}ms"></i>`).join('');
    const tiles = `
        ${tile('train', nf(tgv, 0), 'allers-retours Paris–Marseille en TGV', 'pour égaler le voyage d’un seul étudiant', 0)}
        ${tile('car', nf(car, 0), 'km seul en voiture thermique', `soit ${nf(car / 40075 * 100, 0)} % du tour de la Terre`, 1)}
        ${tile('cal', nf(mois, 0), 'mois de budget climat', 'budget compatible avec l’Accord de Paris : 2 t par an et par personne', 2)}`;
    const waffle = `<div class="card" style="--i:3"><h2 class="section">Le voyage d’un étudiant, en carrés de 100 kg</h2>
        <div class="waffle">${cells}</div>
        <div class="legend mt"><span><i class="dot" style="background:var(--accent)"></i>${nf(per / 1000, 2)} t pour le voyage (${sq} carrés)</span><span><i class="dot" style="background:transparent;border:1.5px dashed var(--text-2)"></i>Budget climat d'une année entière : 2 t (20 carrés)</span></div></div>`;
    return { tiles, waffle };
  }

  // ---------------------------------------------------------------------
  // 5. Cascade des scénarios (leviers cochés, appliqués l'un après l'autre)
  // ---------------------------------------------------------------------
  function cascade(st, SCEN) {
    const steps = [];
    const base = Calc.calculer(st).total;
    let opts = {}, prev = base;
    SCEN.filter(s => st.scenarios[s.id]).forEach(s => {
      opts = { ...opts, [s.id]: true };
      const v = Calc.calculer(st, opts).total;
      steps.push({ label: s.court, from: prev, to: v }); prev = v;
    });
    const W = 620, H = 280, P = 34, top = 18;
    const cols = [{ label: 'Bilan mesuré', from: 0, to: base, kind: 'base' }, ...steps.map(s => ({ ...s, kind: 'red' })), { label: 'Résiduel', from: 0, to: prev, kind: 'res' }];
    const bw = Math.min(90, (W - P) / cols.length - 18);
    const y = v => top + (H - top - P) * (1 - v / base);
    const bars = cols.map((c, i) => {
      const x = P + i * ((W - P) / cols.length) + 9;
      const y1 = y(Math.max(c.from, c.to)), y2 = y(Math.min(c.from, c.to));
      const fill = c.kind === 'red' ? 'var(--accent)' : c.kind === 'res' ? 'var(--text-2)' : 'var(--text)';
      const val = c.kind === 'red' ? `− ${t(c.from - c.to)}` : t(c.to);
      const link = i < cols.length - 1 ? `<line x1="${x + bw}" x2="${x + (W - P) / cols.length + 9}" y1="${y(c.kind === 'red' ? c.to : c.to)}" y2="${y(c.to)}" class="wf-link"/>` : '';
      return `<g><rect class="wf-bar" style="animation-delay:${i * 140}ms" x="${x}" y="${y1}" width="${bw}" height="${Math.max(2, y2 - y1)}" rx="5" fill="${fill}" opacity="${c.kind === 'res' ? .55 : 1}" data-tip="<b>${esc(c.label)}</b><br>${val} tCO2e"/>
        <text x="${x + bw / 2}" y="${y1 - 6}" text-anchor="middle" class="wf-val">${val} t</text>
        <text x="${x + bw / 2}" y="${H - 12}" text-anchor="middle" class="wf-lab">${esc(c.label)}</text>${link}</g>`;
    }).join('');
    return `<svg class="viz" viewBox="0 0 ${W} ${H}" role="img" aria-label="Cascade du bilan mesuré vers les émissions résiduelles">${bars}</svg>
      ${steps.length ? '' : '<p class="muted" style="font-size:12.5px">Active un levier à gauche pour voir la cascade se construire.</p>'}`;
  }

  // ---------------------------------------------------------------------
  // 6. Schémas de méthode (HTML)
  // ---------------------------------------------------------------------
  const demarche = active => `<div class="steps">${[
    ['1', 'Mesurer', 'Bilan carbone documenté (ce site)'], ['2', 'Éviter', 'Supprimer un déplacement ou un segment'],
    ['3', 'Réduire', 'Vol direct, train, navette, classe éco'], ['4', 'Contribuer', 'Financer des projets pour le résiduel']
  ].map(([n, h, p], i) => `<div class="step ${active.includes(i) ? 'on' : ''}" style="--i:${i}"><span class="step-n">${n}</span><b>${h}</b><small>${p}</small></div>`).join('<span class="step-arrow" aria-hidden="true">›</span>')}</div>`;

  const troisResultats = (red, res, eur) => `<div class="three">
      <div class="three-box"><small>Réduction potentielle</small><b class="num">${t(red)} t</b><span>tCO2e évitées si on change le voyage</span></div>
      <span class="neq" aria-label="ne s'additionne pas avec">≠</span>
      <div class="three-box"><small>Émissions résiduelles</small><b class="num">${t(res)} t</b><span>tCO2e émises malgré tout</span></div>
      <span class="neq" aria-label="ne s'additionne pas avec">≠</span>
      <div class="three-box"><small>Contribution financée</small><b class="num">${eur}</b><span>en euros, pas en tonnes</span></div></div>`;

  const chaine = () => `<div class="flowchart">${[
    ['Itinéraire', 'MRS-CDG-YUL', 'codes IATA saisis'], ['Distance', 'orthodromie + 95 km', 'par segment'],
    ['Facteur ADEME', 'selon la tranche', 'avec ou sans traînées'], ['× classe × passagers × A/R', 'coefficient, effectif, 1 ou 2', ''],
    ['Émissions', 'kgCO2e → tCO2e', 'par groupe, puis total']
  ].map(([h, m, s], i) => `<div class="fc-box" style="--i:${i}"><b>${h}</b><code>${m}</code>${s ? `<small>${s}</small>` : ''}</div>`).join('<span class="fc-arrow" aria-hidden="true"></span>')}</div>`;

  // Distance orthodromique vs trajectoire réelle (schéma)
  const schemaDistance = () => `<svg class="viz" viewBox="0 0 620 170" role="img" aria-label="Distance orthodromique et correction de 95 km">
      <path d="M40,130 Q310,-20 580,130" fill="none" stroke="var(--text-2)" stroke-width="2" stroke-dasharray="6 6"/>
      <path class="draw" pathLength="1" style="--d:200ms" d="M40,130 C90,120 110,70 170,60 S300,10 360,22 S520,40 545,95 S575,128 580,130" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
      <circle cx="40" cy="130" r="6" fill="var(--text)"/><circle cx="580" cy="130" r="6" fill="var(--text)"/>
      <text x="40" y="155" text-anchor="middle" class="sk-label">Départ</text><text x="580" y="155" text-anchor="middle" class="sk-label">Arrivée</text>
      <text x="310" y="118" text-anchor="middle" class="sk-label" style="fill:var(--text-2)">Orthodromie : le plus court chemin sur la sphère</text>
      <text x="310" y="12" text-anchor="middle" class="sk-label" style="fill:var(--accent)">Trajet réel : détours, attente, approche ≈ + 95 km (ADEME)</text></svg>`;

  // Facteurs par tranche (escalier) + segments saisis
  function escalier(st, r) {
    const W = 620, H = 240, P = 44, B = 30, xmax = 9000, ymax = 0.3;
    const x = d => P + (W - P - 10) * Math.min(d, xmax) / xmax, y = f => H - B - (H - B - 12) * f / ymax;
    const path = k => { let d = `M${x(0)},${y(F.avion[0][k])}`, prev = 0; F.avion.forEach(a => { const end = Math.min(a.max, xmax); d += ` L${x(prev)},${y(a[k])} L${x(end)},${y(a[k])}`; prev = end; }); return d; };
    const dots = [];
    st.groupes.forEach((g, gi) => r.groupes[gi].vols.forEach(v => (v.legs || []).forEach(l => dots.push({ l, gi }))));
    let ax = '';
    for (let d = 0; d <= xmax; d += 1500) ax += `<line x1="${x(d)}" x2="${x(d)}" y1="${y(0)}" y2="${y(0) + 4}" class="axis"/><text x="${x(d)}" y="${H - 8}" text-anchor="middle" class="wf-lab">${nf(d, 0)}</text>`;
    for (let f = 0; f <= ymax + 1e-9; f += 0.1) ax += `<line x1="${P}" x2="${W - 10}" y1="${y(f)}" y2="${y(f)}" class="gridl"/><text x="${P - 6}" y="${y(f) + 4}" text-anchor="end" class="wf-lab">${nf(f, 1)}</text>`;
    return `<svg class="viz" viewBox="0 0 ${W} ${H}" role="img" aria-label="Facteur d'émission selon la distance du segment">${ax}
      <path class="draw" pathLength="1" style="--d:100ms" d="${path('sans')}" fill="none" stroke="var(--text-2)" stroke-width="2.5"/>
      <path class="draw" pathLength="1" style="--d:300ms" d="${path('avec')}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
      ${dots.map((o, i) => `<circle class="pop" style="animation-delay:${600 + i * 80}ms" cx="${x(o.l.d)}" cy="${y(st.rf ? o.l.tranche.avec : o.l.tranche.sans)}" r="6" fill="${GC[o.gi]}" stroke="var(--surface)" stroke-width="2" data-tip="<b>${o.l.from.code} → ${o.l.to.code}</b><br>${nf(o.l.d, 0)} km · ${nf(st.rf ? o.l.tranche.avec : o.l.tranche.sans, 4)} kg/km"/>`).join('')}
      <text x="${W - 12}" y="${H - 30}" text-anchor="end" class="wf-lab">distance du segment (km)</text>
      <text x="${P}" y="10" class="wf-lab">kgCO2e / passager.km</text></svg>
      <div class="legend mt"><span><i class="dot" style="background:var(--accent)"></i>Avec traînées</span><span><i class="dot" style="background:var(--text-2)"></i>Sans traînées</span><span><i class="dot" style="background:var(--c-kelley)"></i><i class="dot" style="background:var(--c-hec)"></i>Segments saisis (Kelley, HEC)</span></div>
      <p class="muted" style="font-size:12.5px;margin-top:8px">Un segment court émet plus <b>par km</b> : le décollage et la montée consomment beaucoup de kérosène. C'est pourquoi les escales pèsent lourd.</p>`;
  }

  // ---------------------------------------------------------------------
  // 7. Détail des calculs, segment par segment (pour montrer le travail)
  // ---------------------------------------------------------------------
  function detail(st, r) {
    const rf = st.rf ? 'avec' : 'sans';
    return st.groupes.map((g, gi) => {
      const R = r.groupes[gi];
      const volRows = g.vols.map((v, vi) => {
        const x = R.vols[vi];
        if (x.err) return `<tr><td colspan="9" class="down">${esc(v.label)} : ${esc(x.err)}</td></tr>`;
        const coef = (F.classes[v.classe] || F.classes.eco).coef, tr = v.ar ? 2 : 1;
        return x.legs.map(l => {
          const f = l.tranche[rf], kg = l.d * f * coef * v.pax * tr;
          return `<tr><td><b>${l.from.code} → ${l.to.code}</b><div class="faint" style="font-size:11px">${esc(l.from.nom)} → ${esc(l.to.nom)}</div></td>
            <td class="r num">${nf(l.gc, 0)}</td><td class="r num">+ ${F.correctionKm}</td><td class="r num">${nf(l.d, 0)}</td>
            <td>${esc(l.tranche.label.split(' (')[0])}</td><td class="r num">${nf(f, 4)}</td>
            <td class="r num">${nf(coef, 1)} × ${v.pax} × ${tr}</td>
            <td class="calc num">${nf(l.d, 0)} × ${nf(f, 4)} × ${nf(coef, 1)} × ${v.pax} × ${tr}</td><td class="r num"><b>${nf(kg, 0)}</b></td></tr>`;
        }).join('');
      }).join('');
      const terRows = g.terrestres.map((x, i) => {
        const m = F.terrestre[x.mode] || F.terrestre.autocar, tr = x.ar ? 2 : 1;
        const n = m.parVehicule ? Math.ceil(x.pax / Math.max(1, x.occ || 1)) : x.pax;
        return `<tr><td>${esc(x.label)}</td><td>${esc(m.label)}</td><td class="r num">${nf(m.f, 4)}</td>
          <td class="calc num">${x.km} km × ${tr} × ${n} ${m.parVehicule ? 'véh.' : 'pers.'} × ${nf(m.f, 4)}</td><td class="r num"><b>${nf(R.terr[i], 1)}</b></td></tr>`;
      }).join('');
      return `<div class="card mt" style="--i:${gi}">
        <h3 style="margin-bottom:10px"><i class="dot" style="background:${GC[gi]}"></i> ${esc(g.nom)} · ${R.participants} participants</h3>
        <div class="table-wrap"><table class="detail"><thead><tr><th>Segment</th><th class="r">Orthodromie (km)</th><th class="r">Correction</th><th class="r">Distance retenue</th><th>Tranche</th><th class="r">Facteur (${rf} traînées)</th><th class="r">Classe × pax × trajets</th><th>Calcul</th><th class="r">kgCO2e</th></tr></thead>
          <tbody>${volRows}</tbody><tfoot><tr><td colspan="8">Sous-total aérien</td><td class="r num">${nf(R.air, 0)}</td></tr></tfoot></table></div>
        <div class="table-wrap mt"><table class="detail"><thead><tr><th>Trajet terrestre</th><th>Mode</th><th class="r">Facteur</th><th>Calcul</th><th class="r">kgCO2e</th></tr></thead>
          <tbody>${terRows}</tbody><tfoot><tr><td colspan="4">Sous-total terrestre</td><td class="r num">${nf(R.terrestre, 1)}</td></tr></tfoot></table></div>
        <div class="total-line"><span>Total ${esc(g.nom.split(' (')[0])}</span><span class="calc">${nf(R.air, 0)} + ${nf(R.terrestre, 1)} = <b>${nf(R.total, 0)} kgCO2e</b> = <b>${t(R.total, 2)} tCO2e</b> · ${t(R.parEtudiant, 3)} t / étudiant</span></div>
      </div>`;
    }).join('') + `<div class="card mt total-card"><span>Bilan global</span><span class="calc">${r.groupes.map(g => t(g.total, 2)).join(' + ')} = <b>${t(r.total, 2)} tCO2e</b></span></div>`;
  }

  // ---------------------------------------------------------------------
  // Info-bulle partagée (survol des schémas)
  // ---------------------------------------------------------------------
  const tip = document.createElement('div');
  tip.className = 'viz-tip'; document.body.appendChild(tip);
  let cur = null;
  const place = (cx, cy) => {
    const w = tip.offsetWidth, h = tip.offsetHeight;
    const x = Math.max(8, Math.min(innerWidth - w - 8, cx + 14));
    const y = cy + 16 + h > innerHeight - 90 ? cy - h - 12 : cy + 16;
    tip.style.transform = `translate(${x}px, ${Math.max(8, y)}px)`;
  };
  const show = (el, cx, cy) => {
    if (cur && cur !== el) cur.classList.remove('hot');
    cur = el; tip.innerHTML = el.dataset.tip; tip.classList.add('show'); el.classList.add('hot'); place(cx, cy);
  };
  const hide = () => { tip.classList.remove('show'); if (cur) cur.classList.remove('hot'); cur = null; };
  // Souris : survol
  document.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const el = e.target.closest('[data-tip]'); if (!el) return;
    show(el, e.clientX, e.clientY);
    el.addEventListener('pointerleave', hide, { once: true });
  });
  document.addEventListener('pointermove', e => { if (cur && e.pointerType !== 'touch') place(e.clientX, e.clientY); });
  // Téléphone : un toucher ouvre la bulle, un second (ou ailleurs) la ferme
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-tip]');
    if (!el) { if (cur) hide(); return; }
    if (matchMedia('(hover: hover)').matches && !el.classList.contains('term')) return;
    if (cur === el) return hide();
    const r = el.getBoundingClientRect(); show(el, r.left, r.bottom - 8);
  });
  addEventListener('scroll', () => { if (cur && !matchMedia('(hover: hover)').matches) hide(); }, { passive: true });
  // Clavier : Tab sur un terme
  document.addEventListener('focusin', e => { const el = e.target.closest?.('.term'); if (el) { const r = el.getBoundingClientRect(); show(el, r.left, r.bottom - 8); } });
  document.addEventListener('focusout', e => { if (e.target.closest?.('.term')) hide(); });

  window.Viz = { carte, flux, anatomie, equivalences, cascade, demarche, troisResultats, chaine, schemaDistance, escalier, detail };
})();
