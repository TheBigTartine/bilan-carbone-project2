/* Base de véhicules de location (onglet Trajets) : consommation moyenne, énergie et norme de pollution.
   Responsable : Adrien. Les facteurs d'énergie sont à faire valider par Théo (facteurs ADEME).

   Calcul d'une ligne de location :
     énergie consommée = km × trajets × voitures × consommation / 100
     kgCO2e           = énergie × facteur de l'énergie + km véhicule × fabrication
     polluants (g)    = km véhicule × valeur de la norme (mg/km) / 1000

   ⚠️ Les polluants (NOx, particules, CO) sont les VALEURS LIMITES de la norme d'homologation, pas des mesures :
   en conduite réelle, les émissions sont souvent plus élevées. Ils sont affichés à titre indicatif et
   ne s'additionnent JAMAIS aux tCO2e du bilan (ce sont des polluants locaux, pas des gaz à effet de serre). */

window.VEHICULES = {
  // Distance par la route ≈ distance à vol d'oiseau × 1,3 (hypothèse, à remplacer par la distance réelle
  // d'un calculateur d'itinéraire quand elle est connue : le champ km reste modifiable).
  detourRoute: 1.3,

  // Fabrication du véhicule, par km : part « fabrication » du facteur ADEME 43791 (voiture moyenne, 2023),
  // déjà utilisée par le site pour la voiture thermique. La batterie d'une électrique n'est pas comptée à part.
  fabricationKm: 0.041,

  // Facteurs par unité d'énergie (kgCO2e, amont + combustion).
  energies: {
    // Vérifiés par Théo le 19/11/2026 sur data.ademe.fr (Base Empreinte, statut « Valide générique », France continentale).
    essence: { label: 'Essence', unite: 'L', f: 2.69, source: 'ADEME 25763 (supercarburant sans plomb 95, E10, 98 : amont 0,491 + combustion 2,2)' },
    gazole: { label: 'Gazole', unite: 'L', f: 3.10, source: 'ADEME 25775 (gazole routier B7 : amont 0,609 + combustion 2,49)' },
    elec_us: { label: 'Électricité (réseau US)', unite: 'kWh', f: 0.373, source: 'EPA eGRID 2022, moyenne nationale (823 lb CO2/MWh), CO2 seul. À vérifier (Théo)' },
    elec_qc: { label: 'Électricité (Québec)', unite: 'kWh', f: 0.0017, source: 'Hydro-Québec / Inventaire canadien des GES, réseau québécois (≈ 1,7 g/kWh). À vérifier (Théo)' }
  },

  // Valeurs limites d'homologation, en mg par km. NOx : aux États-Unis et au Canada, la norme fixe NMOG + NOx ensemble.
  normes: {
    tier3: { label: 'Tier 3 (US / Canada), moyenne de flotte Bin 30', nox: 18.6, pm: 1.9, co: 621, source: 'EPA Tier 3 : 30 mg/mi NMOG+NOx, 3 mg/mi PM, 1,0 g/mi CO' },
    tier3hd: { label: 'Tier 3 utilitaire lourd (classe 2b)', nox: 111, pm: 5.0, co: 1988, source: 'EPA Tier 3 HD classe 2b : 178 mg/mi NMOG+NOx, 8 mg/mi PM, 3,2 g/mi CO' },
    euro6_ess: { label: 'Euro 6 essence', nox: 60, pm: 4.5, co: 1000, source: 'Règlement (CE) 715/2007, Euro 6' },
    euro6_dsl: { label: 'Euro 6 diesel', nox: 80, pm: 4.5, co: 500, source: 'Règlement (CE) 715/2007, Euro 6' },
    zero: { label: 'Électrique (aucune émission à l’échappement)', nox: 0, pm: 0, co: 0, source: 'Pas d’échappement. Les particules de freins et de pneus ne sont pas comptées' }
  },

  // Consommation mixte homologuée. Aux États-Unis : fueleconomy.gov (EPA), L/100 km = 235,21 ÷ mpg.
  // Les modèles sont des exemples typiques de chaque catégorie de loueur (« ou similaire »).
  modeles: [
    { id: 'eco', cat: 'Économique', label: 'Mitsubishi Mirage', places: 4, energie: 'essence', conso: 6.0, norme: 'tier3', source: 'EPA, 39 mpg mixte' },
    { id: 'compacte', cat: 'Compacte', label: 'Toyota Corolla', places: 5, energie: 'essence', conso: 6.7, norme: 'tier3', source: 'EPA, 35 mpg mixte' },
    { id: 'inter', cat: 'Intermédiaire', label: 'Nissan Sentra', places: 5, energie: 'essence', conso: 6.9, norme: 'tier3', source: 'EPA, 34 mpg mixte' },
    { id: 'berline', cat: 'Berline (full-size)', label: 'Toyota Camry', places: 5, energie: 'essence', conso: 7.4, norme: 'tier3', source: 'EPA, 32 mpg mixte' },
    { id: 'berline_malibu', cat: 'Berline (full-size)', label: 'Chevrolet Malibu', places: 5, energie: 'essence', conso: 7.8, norme: 'tier3', source: 'EPA, 30 mpg mixte' },
    { id: 'hybride', cat: 'Hybride', label: 'Toyota Camry Hybrid', places: 5, energie: 'essence', conso: 4.5, norme: 'tier3', source: 'EPA, 52 mpg mixte' },
    { id: 'hybride_prius', cat: 'Hybride', label: 'Toyota Prius', places: 5, energie: 'essence', conso: 4.1, norme: 'tier3', source: 'EPA, 57 mpg mixte' },
    { id: 'suv_compact', cat: 'SUV compact', label: 'Toyota RAV4', places: 5, energie: 'essence', conso: 7.8, norme: 'tier3', source: 'EPA, 30 mpg mixte' },
    { id: 'suv_rogue', cat: 'SUV compact', label: 'Nissan Rogue', places: 5, energie: 'essence', conso: 7.1, norme: 'tier3', source: 'EPA, 33 mpg mixte' },
    { id: 'suv_hybride', cat: 'SUV compact', label: 'Toyota RAV4 Hybrid', places: 5, energie: 'essence', conso: 6.0, norme: 'tier3', source: 'EPA, 39 mpg mixte' },
    { id: 'suv_inter', cat: 'SUV intermédiaire', label: 'Ford Explorer', places: 7, energie: 'essence', conso: 9.8, norme: 'tier3', source: 'EPA, 24 mpg mixte' },
    { id: 'suv_jeep', cat: 'SUV intermédiaire', label: 'Jeep Grand Cherokee', places: 5, energie: 'essence', conso: 10.7, norme: 'tier3', source: 'EPA, 22 mpg mixte' },
    { id: 'suv_grand', cat: 'Grand SUV', label: 'Chevrolet Tahoe', places: 8, energie: 'essence', conso: 13.8, norme: 'tier3', source: 'EPA, 17 mpg mixte' },
    { id: 'suv_suburban', cat: 'Grand SUV', label: 'Chevrolet Suburban', places: 8, energie: 'essence', conso: 13.8, norme: 'tier3', source: 'EPA, 17 mpg mixte' },
    { id: 'minivan', cat: 'Monospace (7-8 places)', label: 'Chrysler Pacifica', places: 7, energie: 'essence', conso: 10.7, norme: 'tier3', source: 'EPA, 22 mpg mixte' },
    { id: 'minivan_hyb', cat: 'Monospace (7-8 places)', label: 'Toyota Sienna Hybrid', places: 8, energie: 'essence', conso: 6.5, norme: 'tier3', source: 'EPA, 36 mpg mixte' },
    { id: 'van15', cat: 'Minibus (12-15 places)', label: 'Ford Transit Passenger Van', places: 15, energie: 'essence', conso: 16.8, norme: 'tier3hd', source: 'Estimation ≈ 14 mpg : véhicule trop lourd pour être noté par l’EPA. À vérifier' },
    { id: 'elec_m3', cat: 'Électrique', label: 'Tesla Model 3', places: 5, energie: 'elec', conso: 15.5, norme: 'zero', source: 'EPA, 25 kWh/100 mi' },
    { id: 'elec_bolt', cat: 'Électrique', label: 'Chevrolet Bolt EV', places: 5, energie: 'elec', conso: 17.4, norme: 'zero', source: 'EPA, 28 kWh/100 mi' }
  ]
};
