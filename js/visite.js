/* Visite guidée du site (18 bulles), avec driver.js 1.3.1. Responsable : Théo.
   1. Le site (Mon voyage) ; 2. quatre notions de science (CO2e et PRG, combustion et amont, traînées,
   distance et taille d'avion) ; 3. le tour des onglets (Calculer, Synthèse, Scénarios, Méthode).
   La visite change de page elle-même, en avant comme en arrière.
   Les chiffres du bilan sont calculés en direct avec Calc et FACTEURS : ils suivent le bilan.
   Elle part seule au premier passage sur « Mon voyage » (une fois par navigateur) et se relance avec le bouton « Visite guidée ». */

(function () {
  const CLE = 'bilan-carbone.visite';
  const F = window.FACTEURS;
  const nf = (v, d = 0) => (+v || 0).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const dispo = () => !!(window.driver && window.driver.js && window.driver.js.driver);
  let enCours = null;

  // ---------- Détail des facteurs par poste, en g CO2e par km ----------
  // Source : ADEME, Base Empreinte, détail par poste et par gaz (data.ademe.fr, jeu « base-carboner », lu le 20/11/2026).
  // Avion 43741 : 101-220 sièges, vol de 1 000 à 2 000 km, par passager. TGV 43256 : par passager. Voiture 43791 : par voiture.
  const POSTES = {
    avion: { amont: 18.3, combustion: 83, trainees: 83, fabrication: 0.361, n2oCombustion: 0.74 },
    tgv: { amont: 2.3, combustion: 0, fabrication: 0.63 },
    voiture: { amont: 53.2, combustion: 161, fabrication: 41 }
  };
  // PRG à 100 ans : GIEC, 6e rapport (AR6, groupe 1, 2021, tableau 7.15). Méthane fossile 29,8 (non fossile 27,0), N2O 273.
  // La bulle affiche des ordres de grandeur (≈ 30 et ≈ 270), justes aussi avec le 5e rapport (28 et 265).
  const PRG = { co2: 1, ch4: 29.8, n2o: 273 };

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
    const court = F.avion[0], long = F.avion[F.avion.length - 1];
    return {
      route, kg, corr: x.err ? 0 : x.corr, gc: seg.gc,
      avec, sans, ratio: sans ? avec / sans : 1,
      tgv: kg / F.reperes.tgvParisMarseilleKg, voiture: kg / F.terrestre.voiture.f,
      partN2O: POSTES.avion.n2oCombustion / POSTES.avion.combustion,
      courtLong: court.avec / long.avec
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
      <text x="90" y="118" text-anchor="middle">sans traînées</text>
      <text x="210" y="118" text-anchor="middle">avec traînées</text>
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

  // Barres horizontales : [libellé, valeur, texte affiché, classe de couleur].
  function barresH(lignes, max, aria) {
    const pas = 30, x0 = 92, L = 160;
    return `
    <svg class="vg-svg" viewBox="0 0 300 ${lignes.length * pas + 6}" role="img" aria-label="${aria}">
      ${lignes.map(([nom, v, txt, cls], i) => {
        const y = 6 + i * pas, w = Math.max(2, v / max * L);
        return `<text x="0" y="${y + 13}">${nom}</text>
          <rect class="vg-barre-h ${cls}" x="${x0}" y="${y}" width="${w}" height="18" rx="5" style="animation-delay:${i * 250}ms"/>
          <text x="${x0 + w + 6}" y="${y + 13}" class="vg-val">${txt}</text>`;
      }).join('')}
    </svg>`;
  }

  const svgPRG = () => barresH([
    ['CO2', PRG.co2, '1', 'vg-comb'],
    ['Méthane', PRG.ch4, '≈ 30', 'vg-amont'],
    ['N2O', PRG.n2o, '≈ 270', 'vg-fab']
  ], PRG.n2o, 'Pouvoir de réchauffement sur 100 ans : CO2 1, méthane environ 30, N2O environ 270');

  const svgPostes = () => {
    const p = POSTES.avion;
    return barresH([
      ['Amont', p.amont, `${nf(p.amont)} g`, 'vg-amont'],
      ['Combustion', p.combustion, `${nf(p.combustion)} g`, 'vg-comb'],
      ['Traînées', p.trainees, `${nf(p.trainees)} g`, 'vg-nuage'],
      ['Fabrication', p.fabrication, `${nf(p.fabrication, 1)} g`, 'vg-fab']
    ], p.combustion, 'Postes du facteur avion : amont, combustion, traînées, fabrication');
  };

  // Barres empilées : TGV (par passager) et voiture seule, par poste.
  function svgSol() {
    // Total affiché = facteur ADEME du site (la somme des postes arrondis peut différer de moins de 1 g).
    const lignes = [['TGV', POSTES.tgv, F.terrestre.tgv.f * 1000], ['Voiture', POSTES.voiture, F.terrestre.voiture.f * 1000]];
    const max = lignes[1][2], x0 = 64, L = 170;
    return `
    <svg class="vg-svg" viewBox="0 0 300 112" role="img" aria-label="Émissions par km du TGV et de la voiture, par poste">
      ${lignes.map(([nom, p, tot], i) => {
        const y = 6 + i * 34;
        let x = x0;
        const rect = (v, cls) => { const w = v / max * L; const r = w > 0 ? `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="20"/>` : ''; x += w; return r; };
        const parts = rect(p.amont, 'vg-amont') + rect(p.combustion, 'vg-comb') + rect(p.fabrication, 'vg-fab');
        return `<text x="0" y="${y + 14}">${nom}</text>
          <g class="vg-barre-h" style="animation-delay:${i * 300}ms">${parts}</g>
          <text x="${Math.max(x, x0 + 2) + 6}" y="${y + 14}" class="vg-val">${nf(tot, tot < 10 ? 1 : 0)} g</text>`;
      }).join('')}
      <rect class="vg-amont" x="0" y="86" width="10" height="10" rx="2"/><text x="14" y="95">amont</text>
      <rect class="vg-comb" x="70" y="86" width="10" height="10" rx="2"/><text x="84" y="95">combustion</text>
      <rect class="vg-fab" x="162" y="86" width="10" height="10" rx="2"/><text x="176" y="95">fabrication</text>
    </svg>`;
  }

  // ---------- Les 18 bulles ----------
  // page = onglet où la bulle s'affiche ; la visite y va seule.
  function etapes(st) {
    const c = chiffres(st), conv = st.rf ? 'avec' : 'sans';
    const bas = () => matchMedia('(max-width: 760px)').matches ? 'top' : 'right';
    const MV = 'mon-voyage';
    return [
      // 1. Le site
      { page: MV, popover: { showButtons: ['next', 'close'], title: 'Bienvenue !', description: '<p>Ce site a <b>deux parties</b> :</p><p>• le <b>bilan carbone du Study Tour</b> (Kelley et HEC Montréal) : combien de CO2 nos trajets envoient dans l\'air ;<br>• un <b>calculateur libre</b>, pour n\'importe quel trajet.</p><p>En 18 bulles : comment s\'en servir, puis 4 notions de science pour comprendre les chiffres.</p>' } },
      { page: MV, element: '.nav a[data-route="calculer"]', popover: { title: 'Le calculateur libre', description: '<p>Ici, tu calcules <b>n\'importe quel trajet</b> en avion, train, autocar ou voiture.</p><p>C\'est <b>hors bilan</b> : rien n\'est enregistré et le bilan du Study Tour ne bouge pas.</p>', side: bas() } },
      { page: MV, element: '#view .hero-card', popover: { title: 'Le bilan du Study Tour', description: `<p>Voici le bilan des deux voyages, ${conv} traînées. Il additionne tous les vols, les trains, les bus et les voitures de location.</p>`, side: 'bottom' } },
      { page: MV, element: '#view .mv-cta', popover: { title: 'Ton trajet compte', description: '<p>Ici, tu entres ton vrai trajet. Il <b>remplace une hypothèse</b> dans le bilan, qui devient plus juste.</p><p>Ton prénom n\'est jamais affiché sur le site.</p>', side: 'bottom' } },
      // 2. Notion 1 : CO2e et PRG
      { page: MV, popover: { title: 'Notion 1 · Le CO2e', description: '<p>Un moteur n\'émet pas que du CO2 : aussi un peu de <b>méthane</b> (CH4) et de <b>protoxyde d\'azote</b> (N2O).</p><p>Pour les additionner, on convertit chaque gaz en <b>équivalent CO2</b> (CO2e) : la quantité de CO2 qui réchaufferait autant.</p>' } },
      { page: MV, popover: { title: 'Le PRG', description: `<p>Le taux de conversion s'appelle le <b>PRG</b> (pouvoir de réchauffement global), calculé sur 100 ans par le GIEC. 1 kg de méthane réchauffe environ 30 fois plus qu'1 kg de CO2.</p>${svgPRG()}<p>Pour l'avion, le N2O ne fait qu'environ <b>${nf(c.partN2O * 100)} %</b> de la combustion : presque tout est du CO2.</p><p class="vg-src">GIEC, 6e rapport (2021) : méthane 27 à 30, N2O 273. Part du N2O : ADEME 43741.</p>` } },
      // 3. Notion 2 : combustion et amont
      { page: MV, popover: { title: 'Notion 2 · Combustion et amont', description: `<p>Le facteur de l'ADEME additionne plusieurs <b>postes</b> :</p><p>• l'<b>amont</b> : extraire, raffiner et transporter le kérosène ;<br>• la <b>combustion</b> : le kérosène brûlé dans les moteurs ;<br>• la <b>fabrication</b> de l'avion, très faible une fois partagée sur tous ses vols.</p>${svgPostes()}<p class="vg-src">1 km en avion, par passager, vol de 1 000 à 2 000 km (ADEME 43741), en g CO2e.</p>` } },
      { page: MV, popover: { title: 'Pourquoi le train émet si peu', description: `<p>Un TGV roule à l'électricité : <b>pas de combustion</b>. Il reste l'amont (produire l'électricité, peu carbonée en France) et la fabrication.</p>${svgSol()}<p class="vg-src">g CO2e par km : TGV par passager (ADEME 43256), voiture thermique par voiture (ADEME 43791).</p>` } },
      // 4. Notion 3 : traînées
      { page: MV, popover: { title: 'Notion 3 · Les traînées', description: '<p>En altitude, l\'air est très froid (souvent moins de −40 °C). La vapeur d\'eau rejetée par les moteurs <b>gèle en cristaux de glace</b> : c\'est la traînée blanche.</p><p>Si l\'air est humide, elle s\'étale en nuage. Ce nuage renvoie un peu de soleil le jour, mais <b>garde surtout la chaleur</b> de la Terre : au total, il réchauffe. Les oxydes d\'azote des moteurs jouent aussi.</p><p>On parle de <b>forçage radiatif</b> : un déséquilibre d\'énergie qui réchauffe le climat.</p>' } },
      { page: MV, popover: { title: 'Comment on les compte', description: `<p>L'ADEME fait simple : le poste « traînées » est <b>égal au poste combustion</b>. Le facteur avec traînées vaut donc environ <b>${nf(c.ratio, 1)} fois</b> le facteur sans.</p>${svgTrainees(c)}<p>L'effet exact est encore mal connu : le site montre donc les deux versions, sans jamais les mélanger.</p>` } },
      // 5. Notion 4 : distance et taille d'avion
      { page: MV, popover: { title: 'Notion 4 · La distance', description: `<p>On mesure la ligne droite entre les deux aéroports, puis on ajoute <b>${F.correctionKm} km</b> : un avion ne vole jamais tout droit (attente, détours, approche).</p>${svgDistance(c)}` } },
      { page: MV, popover: { title: 'Longueur du vol et taille d\'avion', description: `<p>Un <b>vol court émet plus par km</b> : le décollage, qui brûle beaucoup de kérosène, est partagé sur peu de km. Moins de 500 km : ${nf(c.courtLong, 1)} fois plus par km qu'un long-courrier.</p>${svgFacteur(st)}<p>L'ADEME prend un avion moyen (101 à 220 sièges, type A320) jusqu'à 5 000 km, puis un <b>gros-porteur</b> (plus de 220 sièges) : il emporte plus de passagers.</p><p class="vg-src">g CO2e par km et par passager, ${conv} traînées (ADEME).</p>` } },
      { page: MV, popover: { title: 'Les escales', description: `<p>Chaque escale, c'est <b>un décollage en plus</b>, et souvent un détour. Pour un étudiant Kelley (aller et retour), les escales ajoutent environ <b>${nf(c.corr)} kg</b>.</p>${svgEscale()}` } },
      { page: MV, popover: { title: 'Le résultat', description: `<p>Au bout du calcul, l'aller-retour en avion d'un étudiant Kelley émet <b>${nf(c.kg)} kg</b>.</p><div class="vg-grand"><b class="num">${nf(c.tgv)}</b><span>allers-retours Paris–Marseille en TGV</span></div><p>ou ${nf(c.voiture)} km seul en voiture thermique.</p>` } },
      // 6. Les onglets
      { page: 'calculer', element: '#view .calc-modes', popover: { title: 'Calculer', description: '<p>Choisis deux villes, puis compare les <b>4 modes</b> : avion, train, autocar, voiture. Mêmes règles de calcul que le bilan.</p>' } },
      { page: 'synthese', element: '#view .hero-card', popover: { title: 'La Synthèse', description: '<p>Le détail du bilan : par groupe, par mode de transport, et le poids des escales.</p>' } },
      { page: 'scenarios', element: '#view .sc-hero', popover: { title: 'Les Scénarios', description: '<p>Comment <b>réduire</b> le bilan (train, meilleur itinéraire), puis le budget pour financer ce qui reste.</p>' } },
      { page: 'methode', element: '#view .meth-som', popover: { title: 'La Méthode', description: '<p>Chaque calcul et ses <b>sources</b> (ADEME, GIEC, EPA), à relire quand tu veux.</p><p>Bonne visite !</p>' } }
    ];
  }

  // ---------- Changement de page ----------
  const pageAct = () => location.hash.replace(/^#\/?/, '') || 'accueil';
  let attendu = null;
  // Attend que la page soit affichée (élément visible) avant de montrer la bulle.
  function attendre(sel, fin, n = 0) {
    const e = document.querySelector(sel);
    if ((e && e.offsetParent !== null) || n > 40) return setTimeout(fin, 150);
    setTimeout(() => attendre(sel, fin, n + 1), 100);
  }
  function aller(etape, fin) {
    attendu = etape.page;
    if (pageAct() !== etape.page) location.hash = '#/' + etape.page;
    attendre(etape.element || '#view .head', fin);
  }
  // Appelé par app.js à chaque affichage : la visite se ferme si l'on change de page soi-même.
  function surPage(nom) { if (enCours && nom !== attendu) fermer(); }

  function lancer(ctx) {
    if (!dispo() || enCours) return;
    try { localStorage.setItem(CLE, 'vue'); } catch (e) {}
    const steps = etapes(ctx.st());
    const bouger = (d, sens) => {
      const i = d.getActiveIndex() + sens, s = steps[i];
      if (!s) return d.destroy();
      if (s.page !== pageAct()) aller(s, () => sens > 0 ? d.moveNext() : d.movePrevious());
      else sens > 0 ? d.moveNext() : d.movePrevious();
    };
    attendu = steps[0].page;
    enCours = window.driver.js.driver({
      showProgress: true, progressText: '{{current}} / {{total}}',
      nextBtnText: 'Suivant', prevBtnText: 'Retour', doneBtnText: 'Terminer',
      popoverClass: 'vg-pop', disableActiveInteraction: true, smoothScroll: true,
      animate: !matchMedia('(prefers-reduced-motion: reduce)').matches,
      steps,
      onNextClick: () => bouger(enCours, 1),
      onPrevClick: () => bouger(enCours, -1),
      onDestroyed: () => { enCours = null; attendu = null; }
    });
    enCours.drive();
  }

  // Premier passage sur « Mon voyage » : attend la fin de l'écran d'ouverture et le chargement de la collecte.
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
      if (pageAct() === 'mon-voyage') setTimeout(() => lancer(ctx), 400);
    };
    setTimeout(essai, 250);
  }
  function fermer() { if (enCours) enCours.destroy(); }
  // Porte « Je veux comprendre » de l'accueil : ouvre « Mon voyage » et y lance la visite.
  const demander = () => { demande = true; location.hash = '#/mon-voyage'; };

  window.Visite = { lancer, auto, fermer, demander, dispo, chiffres, etapes, surPage, POSTES, PRG };
})();
