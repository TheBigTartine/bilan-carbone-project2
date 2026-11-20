/* Calculateur libre (#/calculer) : l'empreinte d'un trajet quelconque, en dehors du Study Tour. Responsable : Théo.
   Rien n'est enregistré et rien n'entre dans le bilan. Mêmes règles de calcul que le reste du site :
   - avion : vol d'oiseau + 95 km, facteur ADEME selon la longueur du vol, coefficient de classe, traînées comme dans le bilan ;
   - train : vol d'oiseau × 1,2 ; TGV en France, train d'Amérique du Nord (EPA) là-bas, Intercités ailleurs ;
   - autocar et voiture : vol d'oiseau × 1,3 ; la voiture est comptée par véhicule puis divisée par le nombre de personnes ;
   - traversée de l'Atlantique : seul l'avion est possible. */
(function () {
  const F = window.FACTEURS;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = (v, d = 0) => (+v || 0).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const kgTxt = kg => nf(kg, kg < 10 ? 1 : 0);

  const MODES = [['avion', 'Avion'], ['train', 'Train'], ['autocar', 'Autocar'], ['voiture', 'Voiture']];

  // ---------- Calcul (sans affichage, testé à part) ----------
  // a, b : { lat, lon, pays } ; o : { ar, classe, moteur, pers } ; rf : traînées comptées ou non.
  function resultat(a, b, o, rf) {
    const gc = Calc.orthodromie(a, b);
    if (gc < 1) return { err: 'Le départ et l\'arrivée sont au même endroit.' };
    const trajets = o.ar ? 2 : 1;
    const ocean = Calc.transat(a, b);
    const seg = Calc.segment(a, b);
    const coef = (F.classes[o.classe] || F.classes.eco).coef;
    const modes = {
      avion: { km: seg.d * trajets, kg: seg.d * (rf ? seg.tranche.avec : seg.tranche.sans) * coef * trajets, label: 'Avion' }
    };
    const sol = (mode, cle, parPers) => {
      if (ocean) return { impossible: true };
      const m = F.terrestre[cle];
      const km = gc * Calc.MODES_SOL[mode] * trajets;
      return { km, kg: km * m.f / parPers, label: m.label };
    };
    const nordAm = p => p === 'US' || p === 'CA';
    const train = a.pays === 'FR' && b.pays === 'FR' ? 'tgv' : nordAm(a.pays) && nordAm(b.pays) ? 'train_us' : 'intercites';
    modes.train = sol('train', train, 1);
    modes.autocar = sol('autocar', 'autocar', 1);
    modes.voiture = sol('voiture', o.moteur === 'electrique' ? 'voiture_elec' : 'voiture', Math.max(1, +o.pers || 1));
    return { gc, ocean, modes };
  }

  // ---------- État de la page (en mémoire seulement) ----------
  const c = { de: null, a: null, deTxt: '', aTxt: '', mode: 'avion', ar: false, classe: 'eco', moteur: 'thermique', pers: 1 };

  const choix = (attr, val, actuel, label) => `<button type="button" class="${val === actuel ? 'on' : ''}" data-${attr}="${val}">${label}</button>`;

  function options() {
    if (c.mode === 'avion') return `
      <div class="calc-opt"><span>Classe</span><div class="seg calc-seg2">${Object.entries(F.classes).map(([k, v]) => choix('classe', k, c.classe, esc(v.label))).join('')}</div></div>`;
    if (c.mode === 'voiture') return `
      <div class="calc-opt"><span>Moteur</span><div class="seg">${choix('moteur', 'thermique', c.moteur, 'Thermique')}${choix('moteur', 'electrique', c.moteur, 'Électrique')}</div></div>
      <div class="calc-opt"><span>Personnes dans la voiture</span><div class="seg">${[1, 2, 3, 4, 5].map(n => choix('pers', n, c.pers, n)).join('')}</div></div>`;
    return '';
  }

  function carteResultat(st) {
    if (!c.de || !c.a) return `<div class="card calc-vide muted">Choisis un départ et une arrivée pour voir le résultat.</div>`;
    const r = resultat(c.de, c.a, c, st.rf);
    if (r.err) return `<div class="card calc-vide">${esc(r.err)}</div>`;
    const m = r.modes[c.mode];
    const sens = c.ar ? 'aller-retour' : 'aller simple';
    const principal = m.impossible
      ? `<p class="calc-impossible">Impossible en ${MODES.find(x => x[0] === c.mode)[1].toLowerCase()} : il faut traverser l'océan. Seul l'avion est possible.</p>`
      : `<div class="hero-value num">${kgTxt(m.kg)} <small>kgCO2e</small></div>
         <p class="calc-detail">${esc(m.label)}${c.mode === 'avion' ? ` · ${st.rf ? 'avec' : 'sans'} traînées` : ''} · ${sens} · ${nf(m.km)} km${c.mode === 'voiture' && c.pers > 1 ? ` · pour 1 personne sur ${c.pers}` : ' · pour 1 personne'}</p>
         <p class="hero-eq">C'est autant que <b class="num">${nf(m.kg / F.terrestre.voiture.f)} km</b> seul en voiture thermique ou <b class="num">${nf(m.kg / F.reperes.repasBoeufKg)}</b> repas avec du bœuf.</p>`;
    const max = Math.max(...MODES.map(([k]) => r.modes[k].kg || 0));
    const lignes = MODES.map(([k, l]) => {
      const x = r.modes[k];
      return `<div class="calc-ligne${k === c.mode ? ' ici' : ''}">
        <span class="calc-nom">${l}</span>
        ${x.impossible
          ? `<span class="calc-barre"></span><span class="calc-val muted">océan</span>`
          : `<span class="calc-barre"><span style="width:${Math.max(1, x.kg / max * 100)}%;--b:${k === 'avion' ? 'var(--c-air)' : 'var(--c-ground)'}"></span></span><span class="calc-val num">${kgTxt(x.kg)} kg</span>`}
      </div>`;
    }).join('');
    return `
      <div class="card glass calc-res" style="--i:1">
        <div class="page-title">${esc(c.deTxt)} → ${esc(c.aTxt)} · ${nf(r.gc)} km à vol d'oiseau</div>
        ${principal}
      </div>
      <div class="card calc-comp" style="--i:2">
        <h3>Les 4 modes pour ce trajet</h3>
        ${lignes}
      </div>`;
  }

  function view(ctx) {
    const st = ctx.st();
    return `
      <div class="head"><div><div class="page-title">Calculateur libre · hors bilan</div><h1 style="font-size:28px">Calculer un trajet</h1></div></div>
      <p class="portes-intro">Pour n'importe quel trajet, en dehors du Study Tour. Rien n'est enregistré et rien n'entre dans le bilan.</p>
      <div class="calc-grille">
        <div class="card calc-form" style="--i:0">
          <label class="mt-champ">Départ<input class="field" data-lieu="de" value="${esc(c.deTxt)}" placeholder="Ville ou aéroport" autocomplete="off"></label>
          <label class="mt-champ">Arrivée<input class="field" data-lieu="a" value="${esc(c.aTxt)}" placeholder="Ville ou aéroport" autocomplete="off"></label>
          <div class="calc-opt"><span>Mode</span><div class="seg calc-modes">${MODES.map(([k, l]) => choix('mode', k, c.mode, l)).join('')}</div></div>
          ${options()}
          <div class="calc-opt"><span>Trajet</span><div class="seg">${choix('ar', 'non', c.ar ? 'oui' : 'non', 'Aller simple')}${choix('ar', 'oui', c.ar ? 'oui' : 'non', 'Aller-retour')}</div></div>
        </div>
        <div class="calc-droite">${carteResultat(st)}</div>
      </div>`;
  }

  function bind(view, ctx) {
    const redessiner = () => ctx.render(true);
    view.addEventListener('input', e => {
      const el = e.target, k = el.dataset.lieu; if (!k) return;
      c[k + 'Txt'] = el.value; c[k] = null;
      Trajets.suggererLieu(el, ctx.st(), p => {
        c[k] = { lat: p.lat, lon: p.lon, pays: p.pays };
        c[k + 'Txt'] = p.code ? `${p.ville} (${p.code})` : p.ville;
        redessiner();
        // Trajet complet : on montre le résultat (au téléphone, il est sous le formulaire).
        if (c.de && c.a) setTimeout(() => { const r = document.querySelector('#view .calc-res, #view .calc-vide'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
      });
    });
    view.addEventListener('keydown', e => Trajets.clavierMenu(e));
    view.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset;
      if (d.mode) c.mode = d.mode;
      else if (d.classe) c.classe = d.classe;
      else if (d.moteur) c.moteur = d.moteur;
      else if (d.pers) c.pers = +d.pers;
      else if (d.ar) c.ar = d.ar === 'oui';
      else return;
      redessiner();
    });
  }

  window.Calculateur = { view, bind, resultat };
})();
