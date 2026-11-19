# Bilan Carbone · Project 2

Outil du **pôle bilan carbone** (Masters MG FF & ISDBC, 2026-2027) pour mesurer l'empreinte des Study Tours :
36 étudiants à Kelley University (États-Unis) et 34 à HEC Montréal (Canada).

Site statique, sans installation : `index.html`, `css/style.css`, `js/data.js`, `js/calc.js`, `js/presentation.js` (deck de restitution) et `js/app.js`.

## Les 5 onglets

| Onglet | Contenu |
|---|---|
| **Synthèse** | Le bilan global, Kelley et HEC, la part de l'aérien, le poids des correspondances et des trajets terrestres, et la bascule avec ou sans traînées |
| **Saisie** | Le tableau des déplacements : vols (itinéraire en codes IATA, ex. `MRS-CDG-ATL-IND`) et trajets terrestres, avec export et import |
| **Scénarios** | Les leviers de réduction (vols directs, TGV, navettes, classe éco) et le budget de contribution selon le prix de la tonne |
| **Rapport** | Le Carbon Footprint Report, qui répond aux questions du cahier des charges, à imprimer en PDF. Boutons **Voir la présentation** et **Exporter la présentation (.html)** : un deck de 12 slides généré avec les chiffres du moment (fichier unique, sans internet ; flèches pour avancer, N notes orateur, F plein écran, Ctrl+P pour un PDF) |
| **Méthode** | La note méthodologique : formules, facteurs ADEME, limites, règles de communication |

## Travailler à plusieurs

Les données saisies restent **dans le navigateur de chacun**. Pour les partager :
1. Onglet Saisie → **Exporter (.json)**, puis envoyer le fichier au pôle.
2. La personne suivante fait **Importer (.json)**.

Pour fixer une version de référence pour tout le monde, remplacer les hypothèses dans `js/data.js` (bloc `HYPOTHESES`) et publier.

## Modifier les facteurs d'émission

Tous les facteurs sont dans `js/data.js` (bloc `FACTEURS`). ⚠️ Avant le bilan définitif, le pôle doit les vérifier
un par un dans la version en vigueur de la [Base Empreinte ADEME](https://base-empreinte.ademe.fr).

## Voir en local

```bash
python3 -m http.server 8781
```

Puis ouvrir http://localhost:8781.

## En ligne (GitHub Pages)

Chaque push sur `main` met le site à jour (Settings → Pages → Deploy from a branch → `main` / root).
