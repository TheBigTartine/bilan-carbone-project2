/* Référentiels du calcul : facteurs d'émission, aéroports et hypothèses de départ.
   ⚠️ Les facteurs viennent de la Base Empreinte / Base Carbone de l'ADEME. Le pôle doit vérifier chaque
   valeur avec la version en vigueur (https://base-empreinte.ademe.fr) avant le bilan définitif.
   Pour modifier un facteur, changer la valeur ici : tout le site se recalcule. */

window.FACTEURS = {
  version: 'ADEME Base Empreinte, facteurs « Avion passagers » 2023 (vérifiés le 19/11/2026 sur data.ademe.fr)',
  // Correction : distance orthodromique + 95 km (détours, attentes, approche).
  // Source : arrêté du 10 avril 2012 (information GES des prestations de transport), repris par l'ADEME.
  correctionKm: 95,
  // kgCO2e par passager.km, selon la distance du segment (Base Empreinte, « Avion passagers », 2023).
  // L'ADEME donne un facteur par taille d'avion. Choix du pôle : 101-220 sièges (type A320) jusqu'à 5 000 km,
  // plus de 220 sièges (gros-porteur) au-delà.
  // id = famille d'affichage (couleurs des schémas) : court < 1 000 km, moyen 1 000 – 5 000 km, long > 5 000 km.
  // ADEME = identifiants Base Empreinte [avec traînées, sans traînées].
  avion: [
    { id: 'court', label: '< 500 km (101-220 sièges)', max: 500, avec: 0.289, sans: 0.159, ademe: [43745, 43746] },
    { id: 'court', label: '500 – 1 000 km (101-220 sièges)', max: 1000, avec: 0.225, sans: 0.124, ademe: [43743, 43744] },
    { id: 'moyen', label: '1 000 – 2 000 km (101-220 sièges)', max: 2000, avec: 0.185, sans: 0.102, ademe: [43741, 43742] },
    { id: 'moyen', label: '2 000 – 5 000 km (101-220 sièges)', max: 5000, avec: 0.167, sans: 0.0918, ademe: [43747, 43748] },
    { id: 'long', label: '> 5 000 km (plus de 220 sièges)', max: Infinity, avec: 0.151, sans: 0.0832, ademe: [43773, 43774] }
  ],
  // Coefficient par classe. ADEME ne distingue pas les classes : ces ratios viennent du DEFRA / DESNZ (UK),
  // « Greenhouse gas reporting: conversion factors 2025 », vols long-courriers.
  // C'est une autre convention, donc ils ne servent qu'en analyse complémentaire (voir Méthodologie).
  classes: {
    eco: { label: 'Économique', coef: 1 },
    premium: { label: 'Premium éco', coef: 1.6 },
    affaires: { label: 'Affaires', coef: 2.9 },
    premiere: { label: 'Première', coef: 4.0 }
  },
  // Modes terrestres. parVehicule = facteur au km par véhicule (divisé ensuite par le nombre d'occupants).
  // source = élément de la Base Empreinte (identifiant), ou mention « à vérifier » quand le pôle n'a pas encore de source.
  terrestre: {
    tgv: { label: 'TGV', f: 0.00293, source: 'ADEME 43256 (TGV, 2022)' },
    intercites: { label: 'Intercités', f: 0.0075, source: 'ADEME 43272 (Intercités, 2022)' },
    ter: { label: 'TER', f: 0.0277, source: 'ADEME 43255 (TER, traction moyenne, 2022)' },
    train_us: { label: 'Train (Amérique du Nord)', f: 0.041, source: 'À vérifier : pas de facteur ADEME pour les États-Unis ni le Canada' },
    autocar: { label: 'Autocar / navette', f: 0.0376, source: 'ADEME 43740 (Autocar, gazole)' },
    bus: { label: 'Bus urbain', f: 0.122, source: 'ADEME 43739 (Autobus, gazole)' },
    metro: { label: 'Métro / tram', f: 0.00442, source: 'ADEME 43778 (Métro, Île-de-France, 2022)' },
    voiture: { label: 'Voiture thermique', f: 0.218, parVehicule: true, source: 'À vérifier : valeur non retrouvée dans la base en vigueur' },
    voiture_elec: { label: 'Voiture électrique', f: 0.103, parVehicule: true, source: 'ADEME 28007 (Voiture particulière compacte, électrique)' },
    taxi: { label: 'Taxi / VTC', f: 0.218, parVehicule: true, source: 'À vérifier : même valeur que la voiture thermique' }
  },
  // Repères pédagogiques (affichés avec leur source, sans les additionner au bilan).
  reperes: {
    objectifParisKg: 2000, // ≈ 2 tCO2e / personne / an : budget compatible avec l'Accord de Paris (2050)
    tgvParisMarseilleKg: 2 * 750 * 0.00293 // aller-retour Paris–Marseille en TGV ≈ 750 km
  },
  // Coût historique d'un plant (devis d'octobre 2025, Centre forestier : 1 283,75 € HT / 250 arbres).
  coutPlantHistorique: 1283.75 / 250
};

// Aéroports : code IATA → nom, coordonnées. On peut en ajouter dans l'onglet Saisie.
window.AEROPORTS = {
  MRS: ['Marseille Provence', 43.4393, 5.2214, 'FR'],
  NCE: ['Nice Côte d’Azur', 43.6584, 7.2159, 'FR'],
  MPL: ['Montpellier', 43.5762, 3.9630, 'FR'],
  TLN: ['Toulon-Hyères', 43.0973, 6.1460, 'FR'],
  AVN: ['Avignon', 43.9073, 4.9018, 'FR'],
  LYS: ['Lyon Saint-Exupéry', 45.7256, 5.0811, 'FR'],
  CDG: ['Paris-Charles de Gaulle', 49.0097, 2.5479, 'FR'],
  ORY: ['Paris-Orly', 48.7262, 2.3652, 'FR'],
  AMS: ['Amsterdam Schiphol', 52.3105, 4.7683, 'NL'],
  FRA: ['Francfort', 50.0379, 8.5622, 'DE'],
  MUC: ['Munich', 48.3538, 11.7861, 'DE'],
  LHR: ['Londres Heathrow', 51.4700, -0.4543, 'GB'],
  ZRH: ['Zurich', 47.4582, 8.5555, 'CH'],
  MAD: ['Madrid', 40.4983, -3.5676, 'ES'],
  BCN: ['Barcelone', 41.2974, 2.0833, 'ES'],
  LIS: ['Lisbonne', 38.7742, -9.1342, 'PT'],
  DUB: ['Dublin', 53.4213, -6.2701, 'IE'],
  KEF: ['Reykjavik Keflavik', 63.9850, -22.6056, 'IS'],
  IST: ['Istanbul', 41.2753, 28.7519, 'TR'],
  IND: ['Indianapolis', 39.7173, -86.2944, 'US'],
  ORD: ['Chicago O’Hare', 41.9742, -87.9073, 'US'],
  ATL: ['Atlanta', 33.6407, -84.4277, 'US'],
  DTW: ['Detroit', 42.2162, -83.3554, 'US'],
  CVG: ['Cincinnati', 39.0489, -84.6678, 'US'],
  SDF: ['Louisville', 38.1744, -85.7360, 'US'],
  JFK: ['New York JFK', 40.6413, -73.7781, 'US'],
  EWR: ['Newark', 40.6895, -74.1745, 'US'],
  IAD: ['Washington Dulles', 38.9531, -77.4565, 'US'],
  BOS: ['Boston', 42.3656, -71.0096, 'US'],
  PHL: ['Philadelphie', 39.8744, -75.2424, 'US'],
  CLT: ['Charlotte', 35.2140, -80.9431, 'US'],
  MSP: ['Minneapolis', 44.8848, -93.2223, 'US'],
  YUL: ['Montréal-Trudeau', 45.4706, -73.7408, 'CA'],
  YYZ: ['Toronto Pearson', 43.6777, -79.6248, 'CA'],
  YQB: ['Québec', 46.7911, -71.3933, 'CA'],
  YOW: ['Ottawa', 45.3225, -75.6692, 'CA']
};

// Hypothèses de départ : à remplacer par les données des responsables des Study Tours.
window.HYPOTHESES = {
  rf: true, // traînées (forçage radiatif) incluses dans le bilan principal
  groupes: [
    {
      id: 'kelley', nom: 'Kelley University (États-Unis)', participants: 36,
      vols: [
        { label: 'Vol principal', route: 'MRS-CDG-ATL-IND', pax: 36, classe: 'eco', ar: true, source: 'Hypothèse' }
      ],
      terrestres: [
        { label: 'Domicile / IAE → aéroport de Marseille', mode: 'autocar', km: 30, pax: 36, ar: true, occ: 1, source: 'Hypothèse' },
        { label: 'Indianapolis → Bloomington', mode: 'autocar', km: 85, pax: 36, ar: true, occ: 1, source: 'Hypothèse' },
        { label: 'Déplacements sur place (visites)', mode: 'autocar', km: 120, pax: 36, ar: false, occ: 1, source: 'Hypothèse' }
      ]
    },
    {
      id: 'hec', nom: 'HEC Montréal (Canada)', participants: 34,
      vols: [
        { label: 'Vol principal', route: 'MRS-CDG-YUL', pax: 34, classe: 'eco', ar: true, source: 'Hypothèse' }
      ],
      terrestres: [
        { label: 'Domicile / IAE → aéroport de Marseille', mode: 'autocar', km: 30, pax: 34, ar: true, occ: 1, source: 'Hypothèse' },
        { label: 'Aéroport → centre de Montréal', mode: 'autocar', km: 20, pax: 34, ar: true, occ: 1, source: 'Hypothèse' },
        { label: 'Transports sur place (métro)', mode: 'metro', km: 60, pax: 34, ar: false, occ: 1, source: 'Hypothèse' }
      ]
    }
  ],
  scenarios: { direct: false, trainFr: false, carToBus: false, eco: false },
  prixTonne: 30,
  coutPlant: +(1283.75 / 250).toFixed(2),
  aeroportsPerso: {}
};
