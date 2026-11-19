/* Leviers de réduction et repères de prix (onglet Scénarios). Responsable : Quentin.
   Chaque valeur est sourcée ; le détail et les calculs de vérification sont dans docs/leviers-reduction.md.
   Pour ajouter une ligne aérienne : l'ajouter à « liaisons » avec sa source. Tout le site se recalcule. */
(function () {
  // Sources (dates de consultation : 19/11/2026).
  const S = {
    ind: 'Aéroport d’Indianapolis, destinations sans escale (liste de juillet 2026) : https://www.ind.com/flights',
    indDub: 'Aéroport d’Indianapolis, ligne Dublin 2026 : https://www.ind.com/about/media/media-releases/indy-to-dublin-flight-to-expand-in-2026',
    cdg: 'Wikipédia, Aéroport Paris-Charles-de-Gaulle, compagnies et destinations (version du 10/11/2026)',
    mrs: 'Wikipédia, Aéroport Marseille-Provence, compagnies et destinations',
    transat: 'MisterTravel, programme Air Transat hiver 2026 et été 2027 (02/11/2026)',
    sncf: 'SNCF Connect, trajet Marseille → Roissy-Charles-de-Gaulle ; Omio, horaires TGV Marseille Saint-Charles → Aéroport CDG 2 TGV',
    trainAir: 'Air-Journal, « Train + Air » ouvert à tous les OUIGO desservant Paris-CDG (21/09/2026)'
  };

  window.LEVIERS = {
    maj: '19/11/2026',
    // Lignes aériennes sans escale, valables dans les deux sens.
    // statut : 'verifie' (source datée) ou 'a_verifier'. toutLAnnee : false si la ligne ne vole pas toute l'année.
    // Le levier « Meilleur itinéraire existant » n'utilise que les lignes vérifiées ET ouvertes toute l'année
    // (les dates des Study Tours ne sont pas connues). Les autres apparaissent comme « pistes selon les dates ».
    liaisons: [
      // France
      { route: 'MRS-CDG', statut: 'verifie', toutLAnnee: true, cie: 'Air France', source: S.mrs },
      // Montréal
      { route: 'MRS-YUL', statut: 'verifie', toutLAnnee: true, cie: 'Air Transat', note: 'hiver (jusqu’au 30 avril) : jusqu’à 3 vols par semaine ; été (mai-octobre) : 1 vol par jour', source: S.transat },
      { route: 'CDG-YUL', statut: 'verifie', toutLAnnee: true, cie: 'Air France, Air Canada, Air Transat', note: 'Air Transat seule : jusqu’à 2 vols par jour', source: `${S.transat} ; ${S.cdg}` },
      // Paris → États-Unis et Canada
      { route: 'CDG-ATL', statut: 'verifie', toutLAnnee: true, cie: 'Air France, Delta', source: S.cdg },
      { route: 'CDG-DTW', statut: 'verifie', toutLAnnee: true, cie: 'Air France, Delta', source: S.cdg },
      { route: 'CDG-JFK', statut: 'verifie', toutLAnnee: true, cie: 'Air France, American, Delta, JetBlue', source: S.cdg },
      { route: 'CDG-BOS', statut: 'verifie', toutLAnnee: true, cie: 'Air France, Delta, JetBlue', source: S.cdg },
      { route: 'CDG-ORD', statut: 'verifie', toutLAnnee: true, cie: 'Air France, United', source: S.cdg },
      { route: 'CDG-MSP', statut: 'verifie', toutLAnnee: true, cie: 'Delta (Air France en saison)', source: S.cdg },
      { route: 'CDG-YYZ', statut: 'verifie', toutLAnnee: true, cie: 'Air Canada, Air France, Air Transat', source: S.cdg },
      { route: 'CDG-DUB', statut: 'verifie', toutLAnnee: true, cie: 'Aer Lingus, Air France', source: S.cdg },
      // Indianapolis (compagnies non précisées par l'aéroport)
      { route: 'ATL-IND', statut: 'verifie', toutLAnnee: true, source: S.ind },
      { route: 'DTW-IND', statut: 'verifie', toutLAnnee: true, source: S.ind },
      { route: 'JFK-IND', statut: 'verifie', toutLAnnee: true, source: S.ind },
      { route: 'BOS-IND', statut: 'verifie', toutLAnnee: true, source: S.ind },
      { route: 'ORD-IND', statut: 'verifie', toutLAnnee: true, source: S.ind },
      { route: 'MSP-IND', statut: 'verifie', toutLAnnee: true, source: S.ind },
      { route: 'YYZ-IND', statut: 'verifie', toutLAnnee: false, note: 'ligne saisonnière', source: S.ind },
      { route: 'DUB-IND', statut: 'verifie', toutLAnnee: false, cie: 'Aer Lingus', note: 'courte pause en janvier-février', source: `${S.ind} ; ${S.indDub}` },
      // À vérifier (source secondaire ou ancienne)
      { route: 'MRS-AMS', statut: 'a_verifier', toutLAnnee: true, cie: 'KLM', source: S.mrs },
      { route: 'AMS-DTW', statut: 'a_verifier', toutLAnnee: true, cie: 'Delta', source: 'Wikipédia, Aéroport d’Amsterdam-Schiphol (non relu en détail)' },
      { route: 'MRS-DUB', statut: 'a_verifier', toutLAnnee: true, cie: 'Ryanair ; Aer Lingus en saison', note: 'donnée Ryanair de 2023', source: S.mrs }
    ],

    // TGV jusqu'à l'aéroport Paris-CDG (levier « TGV »).
    tgv: {
      texte: 'TGV sans changement Marseille Saint-Charles → gare Aéroport CDG 2 TGV, environ 3 h 50 à 4 h. Billet unique « Train + Air » avec Air France depuis Marseille, Aix-en-Provence TGV et Avignon TGV.',
      // Distance en train : pas de chiffre officiel SNCF pour ce trajet. Le moteur garde vol d'oiseau × 1,2 (≈ 783 km) ;
      // les sites de réservation annoncent ≈ 670 km. Écart sur le bilan : 0,05 tCO2e pour 70 étudiants A/R (négligeable).
      source: `${S.sncf} ; ${S.trainAir}`
    },

    // Repères pour le prix de la tonne (bloc « Contribution à financer » et onglet Rapport).
    // Le prix définitif est à fixer avec le pôle compensation, selon le projet réellement financé.
    prix: {
      max: 300,
      reperes: [
        { id: 'lbc', prix: 35, label: 'Label Bas-Carbone', court: 'Projets certifiés en France (forêt, agriculture)', desc: 'Prix moyen d’un crédit de projet certifié en France (forêt, agriculture). Projets forestiers : 20 à 70 €.', source: 'I4CE, « Le Label Bas-Carbone : quel bilan après 6 ans d’existence ? », juin 2025, p. 60' },
        { id: 'ets', prix: 81, label: 'Quotas européens', court: 'Prix du marché européen du carbone', desc: 'Prix moyen sur le marché européen du carbone, mai à octobre 2026 (81,17 €).', source: 'Toute l’Europe, 05/11/2026, d’après la Commission européenne' },
        { id: 'vac', prix: 273, label: 'Valeur de l’action pour le climat', court: 'Valeur de référence de l’État', desc: 'Valeur de référence de l’État pour 2027 : 256 € en 2025, + 3,2 % par an (euros 2023).', source: 'Avis n° 2025-2 du Conseil scientifique de l’évaluation socioéconomique, 21/05/2025 (rapport Quinet, mars 2025)' }
      ],
      // Repère bas, affiché pour comparaison seulement.
      plancher: { prix: 8, desc: 'Crédits volontaires tous standards, surtout internationaux, de qualité très variable', source: 'I4CE, juin 2025, p. 60' }
    }
  };
})();
