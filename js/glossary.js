/* Lexique : chaque terme technique du site reçoit une bulle d'explication au survol (ou au toucher sur téléphone).
   Pour ajouter un terme : une ligne de plus dans LEXIQUE. Les variantes du même terme (pluriel, majuscules) sont
   reconnues grâce au champ `motifs`. */
(function () {
  const LEXIQUE = [
    { terme: 'Traînées', motifs: ['traînées de condensation', 'traînées', 'traînée'], def:
      'Les lignes blanches derrière les avions. À haute altitude, ces traînées, avec la vapeur d’eau et les oxydes d’azote rejetés, retiennent de la chaleur et réchauffent le climat <b>en plus du CO2</b>. L’ADEME publie des facteurs « avec traînées » (environ ×1,8) et « sans traînées ». On choisit une convention et on ne mélange jamais les deux.' },
    { terme: 'Effets hors CO2', motifs: ['effets hors CO2', 'hors CO2', 'effets climatiques autres que le CO2'], def:
      'Tout ce qui réchauffe le climat dans un vol sans être du CO2 : traînées de condensation, cirrus artificiels, oxydes d’azote, vapeur d’eau. Ces effets sont réels mais plus incertains à chiffrer.' },
    { terme: 'Forçage radiatif', motifs: ['forçage radiatif'], def:
      'Mesure de combien un gaz ou un phénomène déséquilibre le bilan d’énergie de la Terre (elle garde plus de chaleur qu’elle n’en renvoie). Les traînées ont leur propre forçage radiatif, qui s’ajoute à celui du CO2.' },
    { terme: 'tCO2e', motifs: ['tCO2e', 'tonnes de CO2e', 'tonne de CO2e'], def:
      '<b>Tonne d’équivalent CO2.</b> Unité commune qui convertit tous les gaz à effet de serre (CO2, méthane, protoxyde d’azote…) en la quantité de CO2 qui aurait le même effet sur le climat. 1 t = 1 000 kg. Un Français émet en moyenne autour de 9 t par an.' },
    { terme: 'kgCO2e', motifs: ['kgCO2e'], def: 'Kilogramme d’équivalent CO2 (1 000 kgCO2e = 1 tCO2e). Voir tCO2e.' },
    { terme: 'CO2e', motifs: ['CO2e', 'équivalent CO2'], def: 'Équivalent CO2 : l’unité qui permet d’additionner des gaz différents selon leur effet sur le climat.' },
    { terme: 'Facteur d’émission', motifs: ['facteurs d’émission', 'facteur d’émission', "facteurs d'émission", "facteur d'émission", 'facteur ADEME', 'facteurs ADEME'], def:
      'Quantité de gaz à effet de serre émise par unité d’activité. Ici, en kgCO2e par passager et par km. Le calcul revient toujours à <b>activité × facteur</b> : 7 150 km × 0,152 kg/km = 1 087 kg.' },
    { terme: 'Passager.km', motifs: ['passager.km'], def: 'Un passager transporté sur un kilomètre. 36 passagers qui font 100 km = 3 600 passager.km.' },
    { terme: 'ADEME', motifs: ['ADEME'], def: 'Agence de la transition écologique : l’organisme public français de référence sur l’environnement et l’énergie.' },
    { terme: 'Base Empreinte', motifs: ['Base Empreinte', 'Base Carbone'], def:
      'Base de données officielle de l’ADEME qui regroupe les facteurs d’émission utilisés en France (anciennement « Base Carbone »). Le cahier des charges impose de s’en servir.' },
    { terme: 'Orthodromie', motifs: ['orthodromique', 'orthodromie'], def:
      'Le plus court chemin entre deux points à la surface de la Terre (un arc de « grand cercle »). Sur une carte plane il paraît courbé : c’est pour cela que les vols vers l’Amérique passent près du Groenland.' },
    { terme: 'Correction de 95 km', motifs: ['+ 95 km', '95 km'], def:
      'L’avion ne vole jamais en ligne parfaitement droite : couloirs aériens, attente, approche. L’ADEME ajoute forfaitairement 95 km à la distance orthodromique de chaque vol.' },
    { terme: 'Court-courrier', motifs: ['court-courrier', 'court courrier'], def:
      'Vol de moins de 1 000 km. C’est la tranche qui émet le plus <b>par km</b>, car le décollage et la montée, très gourmands en kérosène, pèsent lourd sur une courte distance.' },
    { terme: 'Moyen-courrier', motifs: ['moyen-courrier', 'moyen courrier'], def: 'Vol de 1 000 à 5 000 km (ex. Paris–Istanbul).' },
    { terme: 'Long-courrier', motifs: ['long-courrier', 'long courrier'], def: 'Vol de plus de 5 000 km (ex. Paris–Atlanta). Le plus faible facteur par km, mais de très grandes distances.' },
    { terme: 'Tranche de distance', motifs: ['tranche de distance', 'tranche'], def: 'L’ADEME (facteurs 2023) classe les vols en cinq tranches : moins de 500 km, 500 à 1 000, 1 000 à 2 000, 2 000 à 5 000 et plus de 5 000 km, avec un facteur d’émission différent pour chacune.' },
    { terme: 'Segment', motifs: ['segments', 'segment'], def: 'Un vol entre deux aéroports, du décollage à l’atterrissage. Un itinéraire MRS-CDG-YUL compte 2 segments.' },
    { terme: 'Correspondance', motifs: ['correspondances', 'correspondance', 'escales', 'escale'], def:
      'Changement d’avion en cours de route. Chaque escale ajoute un décollage (la phase la plus émettrice) et souvent un détour. Son « poids » est l’écart avec un vol direct.' },
    { terme: 'Équivalent direct', motifs: ['équivalent direct', 'direct théorique', 'vol direct'], def:
      'Les émissions qu’aurait un vol sans escale entre le premier et le dernier aéroport. Sert à mesurer le surplus dû aux correspondances.' },
    { terme: 'Pré-acheminement', motifs: ['pré-acheminement'], def: 'Le trajet pour rejoindre l’aéroport du vol principal, par exemple Marseille → Paris-CDG avant de traverser l’Atlantique.' },
    { terme: 'Code IATA', motifs: ['codes IATA', 'code IATA', 'IATA'], def: 'Code à 3 lettres attribué à chaque aéroport par l’association internationale du transport aérien : MRS = Marseille, CDG = Paris-Charles de Gaulle, YUL = Montréal, IND = Indianapolis.' },
    { terme: 'A/R', motifs: ['A/R', 'aller-retour', 'allers-retours'], def: 'Aller-retour : le trajet est compté deux fois.' },
    { terme: 'Classe de voyage', motifs: ['coefficients par classe', 'coefficient de classe', 'classe économique', 'Premium éco'], def:
      'Un siège en classe affaires occupe plus de place dans l’avion : on lui attribue une plus grande part des émissions du vol (×2,9 environ). L’ADEME ne fait pas cette distinction.' },
    { terme: 'DEFRA', motifs: ['DEFRA'], def: 'Ministère britannique de l’environnement. Il publie ses propres facteurs d’émission, dont des coefficients par classe. C’est une <b>autre convention</b> que l’ADEME : à ne pas mélanger dans le bilan principal.' },
    { terme: 'Convention', motifs: ['conventions', 'convention'], def: 'Un ensemble de choix de calcul (source des facteurs, prise en compte des traînées…). Deux résultats calculés avec des conventions différentes ne se comparent ni ne s’additionnent.' },
    { terme: 'Périmètre', motifs: ['périmètre principal', 'périmètre'], def: 'Ce que le bilan inclut. Ici : les vols et les déplacements terrestres. Exclus : hébergement, repas, achats sur place (possible en analyse complémentaire).' },
    { terme: 'Hypothèse', motifs: ['hypothèses', 'hypothèse'], def: 'Valeur provisoire, utilisée faute de donnée réelle. À remplacer par les informations des responsables des Study Tours avant le bilan définitif.' },
    { terme: 'Accord de Paris', motifs: ['Accord de Paris'], def: 'Accord international de 2015 pour limiter le réchauffement bien en dessous de 2 °C. Pour y arriver, chacun devrait émettre environ <b>2 tCO2e par an</b> vers 2050.' },
    { terme: 'Budget carbone', motifs: ['budget carbone', 'budget climat'], def: 'La quantité de CO2e qu’une personne peut émettre par an en restant compatible avec l’Accord de Paris : environ 2 t.' },
    { terme: 'Réduction potentielle', motifs: ['réduction potentielle'], def: 'Les tCO2e qui seraient évitées <b>si</b> on changeait le voyage (vol direct, train…). C’est une estimation, pas un résultat obtenu.' },
    { terme: 'Émissions résiduelles', motifs: ['émissions résiduelles', 'résiduelles', 'résiduel'], def: 'Ce qui est émis malgré toutes les mesures de réduction. C’est sur cette base que l’on calcule une contribution.' },
    { terme: 'Contribution', motifs: ['contribution financée', 'contribution carbone', 'contributions financées', 'contribution'], def:
      'Financer un projet qui réduit ou retire du CO2 ailleurs (plantation, rénovation…). Le cahier des charges parle de « contribution » et non de « compensation » : on ne peut pas garantir que cela annule exactement nos émissions.' },
    { terme: 'Compensation', motifs: ['compensation', 'compensées', 'compensé'], def: 'Idée qu’un projet financé « annule » nos émissions. Terme à éviter : la séquestration est lente, incertaine et réversible. On parle plutôt de contribution.' },
    { terme: 'Neutralité carbone', motifs: ['neutralité carbone', 'neutre en carbone'], def: 'Équilibre entre ce qu’on émet et ce qu’on retire de l’atmosphère. Ne s’annonce jamais sans démonstration : c’est une règle du cahier des charges.' },
    { terme: 'Crédit carbone', motifs: ['crédits carbone', 'crédit carbone'], def: 'Certificat vérifié par un organisme, qui représente 1 tCO2e évitée ou retirée et peut s’échanger. Financer un projet local n’est <b>pas</b> acheter un crédit carbone.' },
    { terme: 'Séquestration', motifs: ['séquestration', 'séquestre'], def: 'Stockage du carbone par les arbres et les sols. Lent (des décennies), et réversible : incendie, sécheresse ou mort de l’arbre relâchent le carbone.' },
    { terme: 'Prix de la tonne', motifs: ['prix retenu par tonne', 'prix par tonne', 'prix de la tonne'], def: 'Ce que coûte une contribution pour 1 tCO2e. Selon le type de projet et sa qualité, de quelques euros à plus de 100 €. Le pôle compensation doit le choisir et le justifier.' },
    { terme: 'Carbon Footprint Report', motifs: ['Carbon Footprint Report'], def: 'Le livrable stratégique du pôle (cahier des charges, § 4.5) : le bilan des émissions, sur lequel s’appuient toutes les décisions des autres pôles.' },
    { terme: 'JSON', motifs: ['.json', 'JSON'], def: 'Format de fichier texte qui contient toutes les données saisies. On l’exporte pour l’envoyer au pôle, qui l’importe de son côté.' },
    { terme: 'CSV', motifs: ['.csv', 'CSV'], def: 'Tableau au format texte, qui s’ouvre directement dans Excel.' }
  ];

  const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const index = new Map();
  LEXIQUE.forEach(e => e.motifs.forEach(m => index.set(m.toLowerCase(), e)));
  const motifs = [...index.keys()].sort((a, b) => b.length - a.length);
  const RE = new RegExp(`(?<![\\p{L}\\p{N}])(${motifs.map(escRe).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
  const bulle = e => `<b>${e.terme}</b><br>${e.def}`;

  const SKIP = 'script, style, svg, code, input, select, textarea, button, .seg, [data-tip], .term, .calc, .legs, .viz-tip, .toast, a, .lexique';
  const BLOC = '.card, .note, .report > p, .report li, .report > h2, .head, .step, .three-box, .fc-box, .scenario';

  // Souligne la première occurrence de chaque terme dans chaque bloc (carte, note, paragraphe…).
  function annoter(root) {
    const vus = new WeakMap();
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (!n.nodeValue.trim() || n.parentElement.closest(SKIP)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const textes = [];
    while (walker.nextNode()) textes.push(walker.currentNode);
    for (const node of textes) {
      const bloc = node.parentElement.closest(BLOC) || root;
      if (!vus.has(bloc)) vus.set(bloc, new Set());
      const deja = vus.get(bloc);
      const s = node.nodeValue;
      RE.lastIndex = 0;
      let m, last = 0, frag = null;
      while ((m = RE.exec(s))) {
        const e = index.get(m[1].toLowerCase());
        if (!e || deja.has(e.terme)) continue;
        deja.add(e.terme);
        frag = frag || document.createDocumentFragment();
        frag.append(s.slice(last, m.index));
        const span = document.createElement('span');
        span.className = 'term'; span.tabIndex = 0;
        span.dataset.tip = bulle(e);
        span.textContent = m[1];
        frag.append(span);
        last = m.index + m[1].length;
      }
      if (frag) { frag.append(s.slice(last)); node.replaceWith(frag); }
    }
  }

  // Lexique complet, pour l'onglet Méthode.
  const lexiqueHTML = () => `<dl class="lexique">${[...LEXIQUE].sort((a, b) => a.terme.localeCompare(b.terme, 'fr'))
    .map(e => `<div><dt>${e.terme}</dt><dd>${e.def}</dd></div>`).join('')}</dl>`;

  const definition = terme => { const e = index.get(terme.toLowerCase()); return e ? bulle(e) : ''; };

  window.Lexique = { annoter, lexiqueHTML, definition, LEXIQUE };
})();
