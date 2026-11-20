/* Visite guidée de l'accueil (10 bulles), avec driver.js 1.3.1. Responsable : Théo.
   Les chiffres sont calculés en direct avec Calc et FACTEURS : ils suivent le bilan.
   Elle part seule au premier passage sur l'accueil (une fois par navigateur) et se relance avec le bouton « Visite guidée ». */

(function () {
  const CLE = 'bilan-carbone.visite';
  const F = window.FACTEURS;
  const nf = (v, d = 0) => (+v || 0).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const dispo = () => !!(window.driver && window.driver.js && window.driver.js.driver);
  let enCours = null;

  // ---------- Chiffres des bulles ----------
  function chiffres(st) {
    const kelley = st.groupes.find(g => g.id === 'kelley') || st.groupes[0];
    const vol = kelley && kelley.vols.find(v => v.route);
    const route = vol ? vol.route : 'MRS-CDG-ATL-IND';
    const x = Calc.calcVol({ route, legModes: [], pax: 1, classe: 'eco', ar: true }, st, { rf: st.rf });
    const kg = x.err ? 0 : x.air + x.sol;
    const a = Calc.aeroport('CDG', st), b = Calc.aeroport('ATL', st);
    const seg = a && b ? Calc.segment(a, b) : { gc: 0, d: 0 };
    const avec = Calc.calculer({ ...st, rf: true }).total, sans = Calc.calculer({ ...st, rf: false }).total;
    return {
      route, kg, corr: x.err ? 0 : x.corr, gc: seg.gc,
      avec, sans, ratio: sans ? avec / sans : 1,
      tgv: kg / F.reperes.tgvParisMarseilleKg, voiture: kg / F.terrestre.voiture.f
    };
  }

  // ---------- Petits schémas (SVG) ----------
  const svgDistance = c => `
    <svg class="vg-svg" viewBox="0 0 300 120" role="img" aria-label="Distance à vol d'oiseau plus 95 km de détours">
      <path class="vg-detour" d="M30 82 C 80 30, 140 105, 190 55 S 255 40, 270 82" pathLength="1"/>
      <line class="vg-trait" x1="30" y1="82" x2="270" y2="82" pathLength="1"/>
      <circle cx="30" cy="82" r="6" class="vg-pt"/><circle cx="270" cy="82" r="6" class="vg-pt"/>
      <text x="30" y="106" text-anchor="middle">Paris</text><text x="270" y="106" text-anchor="middle">Atlanta</text>
      <text x="150" y="100" text-anchor="middle" class="vg-t1">${nf(c.gc)} km à vol d'oiseau</text>
      <text x="150" y="20" text-anchor="middle" class="vg-t2">+ ${F.correctionKm} km de détours</text>
    </svg>`;

  function svgFacteur(st) {
    const k = st.rf ? 'avec' : 'sans';
    const max = Math.max(...F.avion.map(a => a[k]));
    const noms = ['< 500', '500-1 000', '1 000-2 000', '2 000-5 000', '> 5 000'];
    return `
    <svg class="vg-svg" viewBox="0 0 300 140" role="img" aria-label="Émissions par km selon la longueur du vol">
      ${F.avion.map((a, i) => {
        const h = a[k] / max * 80, x = 14 + i * 58;
        return `<rect class="vg-barre" x="${x}" y="${100 - h}" width="40" height="${h}" rx="5" style="animation-delay:${i * 180}ms"/>
          <text x="${x + 20}" y="${94 - h}" text-anchor="middle" class="vg-val">${nf(a[k] * 1000)} g</text>
          <text x="${x + 20}" y="116" text-anchor="middle" class="vg-pt-t">${noms[i] || ''}</text>`;
      }).join('')}
      <text x="150" y="134" text-anchor="middle" class="vg-pt-t">longueur du vol (km)</text>
    </svg>`;
  }

  const svgTrainees = c => {
    const h1 = 80, h0 = c.ratio ? h1 / c.ratio : 0;
    return `
    <svg class="vg-svg" viewBox="0 0 300 130" role="img" aria-label="Bilan sans et avec les traînées">
      <rect class="vg-barre" x="60" y="${100 - h0}" width="60" height="${h0}" rx="6"/>
      <rect class="vg-barre vg-nuage" x="180" y="${100 - h1}" width="60" height="${h1}" rx="6" style="animation-delay:500ms"/>
      <rect class="vg-barre" x="180" y="${100 - h0}" width="60" height="${h0}" rx="6"/>
      <text x="90" y="${92 - h0}" text-anchor="middle" class="vg-val">${nf(c.sans / 1000, 1)} t</text>
      <text x="210" y="${92 - h1}" text-anchor="middle" class="vg-val">${nf(c.avec / 1000, 1)} t</text>
      <text x="90" y="118" text-anchor="middle">CO2 seul</text>
      <text x="210" y="118" text-anchor="middle">avec le « nuage »</text>
    </svg>`;
  };

  const svgEscale = () => `
    <svg class="vg-svg" viewBox="0 0 300 130" role="img" aria-label="Vol direct et vol avec escale">
      <line class="vg-trait" x1="30" y1="40" x2="270" y2="40" pathLength="1"/>
      <path class="vg-detour" d="M30 105 L150 75 L270 105" pathLength="1"/>
      <circle cx="30" cy="40" r="5" class="vg-pt"/><circle cx="270" cy="40" r="5" class="vg-pt"/>
      <circle cx="30" cy="105" r="5" class="vg-pt"/><circle cx="270" cy="105" r="5" class="vg-pt"/>
      <circle cx="150" cy="75" r="7" class="vg-escale"/>
      <text x="150" y="30" text-anchor="middle">vol direct : 1 décollage</text>
      <text x="150" y="124" text-anchor="middle" class="vg-t2">avec escale : 1 décollage de plus</text>
    </svg>`;

  // ---------- Les 10 bulles ----------
  function etapes(st) {
    const c = chiffres(st), conv = st.rf ? 'avec' : 'sans';
    const vis = e => e && e.offsetParent !== null;
    const nav = (...sel) => sel.map(s => document.querySelector(s)).find(vis);
    const bas = () => matchMedia('(max-width: 760px)').matches ? 'top' : 'right';
    return [
      { popover: { showButtons: ['next', 'close'], title: 'Bienvenue !', description: '<p>Ce site calcule le <b>bilan carbone des déplacements</b> des deux Study Tours (Kelley et HEC Montréal) : combien de CO2 nos trajets envoient dans l\'air.</p><p>En 10 bulles, on voit comment saisir ton trajet et comment le chiffre est calculé.</p>' } },
      { element: '#view .hero-card', popover: { title: 'Le grand total', description: `<p>Voici le bilan des deux voyages, ${conv} traînées. Il additionne tous les vols, les trains, les bus et les voitures de location.</p>`, side: 'bottom' } },
      { element: '#view .mv-cta', popover: { title: 'Ton trajet compte', description: '<p>Ici, tu entres ton vrai trajet. Il <b>remplace une hypothèse</b> dans le bilan, qui devient plus juste.</p><p>Ton prénom n\'est jamais affiché sur le site.</p>', side: 'bottom' } },
      { popover: { title: '1. La distance', description: `<p>On mesure la ligne droite entre les deux aéroports, puis on ajoute <b>${F.correctionKm} km</b> : un avion ne vole jamais tout droit (attente, détours, approche).</p>${svgDistance(c)}` } },
      { popover: { title: '2. Le facteur', description: `<p>Chaque km en avion émet un peu de CO2 par passager. Un <b>vol court émet plus par km</b> : le décollage pèse lourd, comme une voiture en ville qui freine et redémarre.</p>${svgFacteur(st)}<p class="vg-src">Grammes de CO2e par km et par passager, ${conv} traînées (ADEME).</p>` } },
      { popover: { title: '3. Les traînées', description: `<p>En altitude, l'avion laisse un « nuage » de traînées qui réchauffe aussi le climat. Avec lui, le bilan est <b>multiplié par environ ${nf(c.ratio, 1)}</b>.</p>${svgTrainees(c)}` } },
      { popover: { title: '4. Les escales', description: `<p>Chaque escale, c'est <b>un décollage en plus</b>, et souvent un détour. Pour un étudiant Kelley (aller et retour), les escales ajoutent environ <b>${nf(c.corr)} kg</b>.</p>${svgEscale()}` } },
      { popover: { title: '5. Le résultat', description: `<p>Au bout du calcul, l'aller-retour en avion d'un étudiant Kelley émet <b>${nf(c.kg)} kg</b>.</p><div class="vg-grand"><b class="num">${nf(c.tgv)}</b><span>allers-retours Paris–Marseille en TGV</span></div><p>ou ${nf(c.voiture)} km seul en voiture thermique.</p>` } },
      { element: nav('.nav a[data-route="synthese"]'), popover: { title: 'Les résultats', description: '<p>La <b>Synthèse</b> détaille le bilan : par groupe, par mode de transport, et le poids des escales.</p><p>Les <b>Scénarios</b> montrent comment le réduire (train, meilleur itinéraire) et le budget pour financer ce qui reste.</p>', side: bas() } },
      { element: nav('#nav-plus', '.nav a[data-route="methode"]'), popover: { title: 'Pour aller plus loin', description: '<p>La <b>Méthode</b> explique chaque calcul et ses sources. Les autres outils (Trajets, Saisie, Rapport) servent au pôle bilan carbone.</p>', side: bas() } }
    ];
  }

  function lancer(ctx) {
    if (!dispo() || enCours) return;
    try { localStorage.setItem(CLE, 'vue'); } catch (e) {}
    enCours = window.driver.js.driver({
      showProgress: true, progressText: '{{current}} / {{total}}',
      nextBtnText: 'Suivant', prevBtnText: 'Retour', doneBtnText: 'Terminer',
      popoverClass: 'vg-pop', disableActiveInteraction: true, smoothScroll: true,
      animate: !matchMedia('(prefers-reduced-motion: reduce)').matches,
      steps: etapes(ctx.st()),
      onDestroyed: () => { enCours = null; }
    });
    enCours.drive();
  }

  // Premier passage sur l'accueil : attend la fin de l'écran d'ouverture et le chargement de la collecte.
  let attente = false, demande = false;
  function auto(ctx) {
    let vue = false; try { vue = localStorage.getItem(CLE) === 'vue'; } catch (e) { vue = true; }
    if ((vue && !demande) || attente || enCours || !dispo()) return;
    demande = false;
    attente = true;
    let n = 0;
    const essai = () => {
      n++;
      const pret = !document.getElementById('splash') && (!window.Partage || Partage.etat !== 'attente');
      if (!pret && n < 40) return setTimeout(essai, 250);
      attente = false;
      const h = location.hash.replace(/^#\/?/, '');
      if (h === 'mon-voyage') setTimeout(() => lancer(ctx), 400);
    };
    setTimeout(essai, 250);
  }
  const fermer = () => { if (enCours) enCours.destroy(); };
  // Porte « Je veux comprendre » de l'accueil : ouvre « Mon voyage » et y lance la visite.
  const demander = () => { demande = true; location.hash = '#/mon-voyage'; };

  window.Visite = { lancer, auto, fermer, demander, dispo, chiffres };
})();
