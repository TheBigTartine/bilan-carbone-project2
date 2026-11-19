# Project 2 – Pôle Bilan Carbone : page web interactive

## Contexte
- Master MG FF & ISDBC 2026-2027 : 70 étudiants, 36 à Kelley University (USA) et 34 à HEC Montréal (Canada)
- Pôle bilan carbone (10 pers.) : collecte des données et calcul
- Bilan provisoire attendu en déc. 2026 ; consolidation en avril 2027 ; date de référence : 26/03/2027

## Choix validés (19/11/2026)
- Rôle : calculateur avec dashboard, simulateur de scénarios et page de restitution (Carbon Footprint Report)
- Utilisateurs : le pôle seulement, avec import/export CSV et Excel (pas de base partagée)
- Hébergement : GitHub Pages (Martin a un compte)
- Méthode : ADEME Base Empreinte avec traînées par défaut, et une bascule « sans traînées »
- Données de vol : pas encore reçues, donc hypothèses pré-remplies et modifiables
- Langue : français

## Proposition de structure (une seule page, 4 onglets)
1. **Saisie** : tableau des segments par groupe (départ, arrivée, escales, passagers, classe, appareil), avec la distance calculée automatiquement (orthodromie + correction ADEME de 95 km) et les trajets terrestres (domicile → aéroport, transports sur place)
2. **Bilan** : tCO2e Kelley / HEC / global, répartition par poste (aérien, escales, terrestre), tCO2e par étudiant, comparaison avec ou sans traînées
3. **Scénarios** : curseurs (vol direct ou avec escale, train vers l'aéroport, classe, prix de la tonne) qui donnent les émissions évitées et le budget de contribution. Les trois résultats (évité, réduit, contribué) restent toujours séparés.
4. **Méthodologie et limites** : facteurs utilisés, sources ADEME, hypothèses, ce qui est exclu du périmètre

Technique : HTML, CSS et JS statiques (Chart.js), sans serveur, prêts pour GitHub Pages.
