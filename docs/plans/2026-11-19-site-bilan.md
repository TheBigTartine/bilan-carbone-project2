# Site du bilan carbone — plan d'implémentation

> Pour celui qui exécute : modèle prévu Opus. Le détail de chaque phase s'écrit au début de la phase, sur le code à jour (voir le skill audit-app, « Plan juste à temps »). STOP et validation après chaque phase.

**But :** corriger les chiffres et les textes, rendre le site agréable au téléphone, puis laisser chaque étudiant saisir son trajet dans une base partagée, avec un jeu et une visite guidée.
**Architecture :** site statique (GitHub Pages) en JavaScript sans compilation ; calcul dans `js/calc.js` ; nouvelle base Supabase lue et écrite depuis le navigateur ; nouveaux fichiers `js/partage.js` (base), `js/accueil.js` (accueil, saisie, jeu), `js/visite.js` (visite guidée).
**Spec :** [docs/specs/2026-11-19-site-bilan-spec.md](../specs/2026-11-19-site-bilan-spec.md).

## Contraintes globales

- Pas de push sur `main` sans l'accord de Théo, qui est admin du dépôt et peut fusionner lui-même. Pas de création de compte Supabase par Claude : Théo la fait et donne l'URL et la clé publique.
- Chaque fichier a un responsable : prévenir celui dont on modifie le fichier (Maxime `visuals.js`, Martin `glossary.js` et l'accueil, Adrien `trajets.js` et `vehicules.js`, Quentin `leviers.js` et Scénarios). Les phases 4 et 5 changent l'accueil et ajoutent un service : Théo décide (admin), en prévenant Martin.
- Pas de tests automatiques dans le projet : vérification par un script de recalcul dans le dossier temporaire, puis dans l'aperçu (`python -m http.server 8000`, http://localhost:8000), à 375 px et à l'ordinateur, navigation avant et arrière, console sans erreur.
- Après chaque modification d'un fichier JS ou CSS, changer le `?v=` de tous les liens de `index.html`.
- Un commit par phase, après validation de Théo sur le site.

## Points de vigilance

1. Le total des hypothèses doit rester 172,4 t avec traînées et 95,3 t sans, tant qu'aucune donnée réelle n'est saisie → phases 1, 3 et 4.
2. Anciennes sauvegardes du navigateur (sans `locations`, avec `scenarios.direct`, avec prix 30 €) → phases 3 et 4.
3. Prénoms jamais lisibles avec la clé publique, même en appelant la base directement → phase 4.
4. Base hors ligne ou en panne : le site doit rester utilisable avec les hypothèses → phases 4 et 5.
5. Un étudiant qui saisit deux fois ne doit compter qu'une fois → phase 4.

## Phase 1 — Chiffres faux et cas limites

But : plus aucun chiffre faux affiché. Points : constats 1, 2, 3, 4, 8, 14.

| Fichier | Changement |
|---|---|
| `js/visuals.js` | Sensibilité : levier itinéraire au lieu de « vols en direct » ; coefficient de classe à 2 décimales dans le détail |
| `js/calc.js` | Train hors France et hors Amérique au facteur Intercités ; refus d'un segment de 0 km ; trajet au sol impossible vers l'Islande ou l'Irlande |
| `js/trajets.js` | Avertissement de double comptage sur une fiche de location |
| `js/app.js`, `js/data.js` | Textes sur les classes alignés sur le calcul (P1) |

Tâches :
- La barre de sensibilité montre l'effet réel du meilleur itinéraire.
- Le détail des calculs se refait à la calculatrice au kilo près.
- Un trajet impossible (MRS-MRS, autocar vers l'Islande) affiche une erreur au lieu d'un chiffre.
- Une location qui double une ligne terrestre est signalée.

Critères de fin : voir la spec, phase 1.

### Détail de la phase 1 (écrit le 19/11/2026 sur `d905781`)

1. **Sensibilité (constat 1).** Modifier `js/visuals.js` (`sensibilite`). But : la ligne « Tous les vols en direct » devient « Meilleur itinéraire existant » (option `itineraire`), avec la raison « Lignes vérifiées les moins émettrices ». Test : hypothèses, avec traînées → − 17,2 t (aujourd'hui 0,0 t).
2. **Classe (constat 2, décision P1).** Modifier `js/data.js` (commentaire des classes), `js/app.js` (Méthode : paragraphe des classes et limite DEFRA ; Rapport : limite DEFRA). But : les textes disent que le coefficient s'applique au bilan principal et qu'il n'a aucun effet tant que tout le monde est en éco. Le calcul ne change pas. Test : HEC en affaires → 256,7 t ; hypothèses → 172,4 t.
3. **Train hors France et hors Amérique (constat 3, décision P2).** Modifier `js/calc.js` (`legSol`). But : train entre deux villes françaises → TGV ; entre deux villes d'Amérique du Nord → Amtrak ; sinon → Intercités. Test : CDG → AMS en train, 1 personne, aller simple → facteur 0,0075 (aujourd'hui 0,093).
4. **Double comptage (constat 4, décision P4).** Modifier `js/trajets.js` (fiche de location). But : si une ligne terrestre du même groupe cite les mêmes villes de départ et d'arrivée (mots du libellé, sans les mots génériques « aéroport », « gare », « centre »), la fiche affiche un avertissement qui nomme cette ligne, sans rien supprimer. Test : exemple « Aéroport → campus Kelley » → avertissement sur la ligne « Indianapolis → Bloomington » ; exemple « Visite d'entreprise à Chicago » → aucun avertissement.
5. **Détail des calculs (constat 8).** Modifier `js/visuals.js` (`detail`). But : coefficient de classe à 2 décimales dans les colonnes « Classe × pax × trajets » et « Calcul ». Test : MRS-CDG, 34 pers., A/R, affaires → ligne « 748 × 0,2250 × 2,22 × 34 × 2 » = 25 391 kg.
6. **Cas limites (constat 14).** Modifier `js/calc.js`. But : deux étapes identiques à la suite → erreur « Deux étapes identiques à la suite » au lieu d'un chiffre ; l'Islande compte comme une traversée (avion obligatoire, comme l'Atlantique) ; un groupe à 0 participant avec des trajets → message d'erreur. Test : MRS-MRS → erreur, 0 t ; CDG → KEF en autocar → compté en avion ; Kelley à 0 participant → message.
7. **Versions.** `index.html` : tous les `?v=` passent à `2026-11-19n`.

Contrôles : script de recalcul (dossier temporaire) sur les 6 tests ; total des hypothèses 172,4 t avec traînées et 95,3 t sans ; aperçu : 6 onglets en avant et en arrière, console sans erreur. Prévenir Maxime (`visuals.js`) et Adrien (`trajets.js`, `calc.js`).
Message de commit : « Phase 1 de l'audit : chiffres faux et cas limites ».
### STOP — fin de la phase 1

## Phase 2 — Ergonomie rapide au téléphone

But : le site se lit et se touche facilement à 375 px. Points : B1, B2, C3, D1, D3, D4.

| Fichier | Changement |
|---|---|
| `css/style.css`, `css/trajets.css` | Zones tactiles d'au moins 40 px ; plus de débordement horizontal ; tableau d'itinéraire en cartes au téléphone |
| `js/app.js` | Confirmation avant de supprimer un vol ou un trajet dans Saisie |
| `js/trajets.js` | Nouvel itinéraire avec les passagers qui restent, pas tout l'effectif |

Tâches :
- Méthode, Rapport et Saisie tiennent dans la largeur de l'écran.
- Les croix, cases et curseurs se touchent du doigt sans viser.
- L'itinéraire de l'accueil se remplit sans défiler de côté.

Critères de fin : voir la spec, phase 2.

### Détail de la phase 2 (écrit le 19/11/2026 sur `4d81802`)

1. **Débordement de Méthode et Rapport (D1).** Modifier `css/style.css`. But : au téléphone, les lignes de total du détail des calculs (`.total-line`, `.total-card`, police à chasse fixe sans retour à la ligne) passent à la ligne au lieu d'élargir la page. Test : à 375 px, largeur de page Méthode et Rapport = 375 px (aujourd'hui 494 px).
2. **Parcours d'un étudiant (D3).** Modifier `css/style.css`. But : au téléphone, les étapes du parcours passent à la ligne au lieu de défiler de côté ; le voyage se voit en entier. Test : à 375 px, aucune étape au-delà du bord droit de la carte (aujourd'hui jusqu'à 401 px).
3. **Itinéraire de l'accueil en cartes (D4).** Modifier `css/trajets.css`. But : au téléphone, chaque étape du tableau d'itinéraire s'affiche en bloc (ville, code, moyen de transport et km l'un sous l'autre), sans défilement de côté. Test : à 375 px, largeur utile du tableau ≤ largeur de la carte (aujourd'hui 483 px dans 279 px).
4. **Zones tactiles (B1).** Modifier `css/style.css`, `css/trajets.css`. But : sur écran tactile, croix de suppression, boutons Avec / Sans traînées, menus de mode et curseurs de prix font au moins 40 px de haut ; cases à cocher agrandies avec une zone de toucher de 40 px. À l'ordinateur, rien ne change. Test : à 375 px en mode tactile, aucun bouton, menu ou curseur sous 40 px.
5. **Confirmation avant suppression (B2).** Modifier `js/app.js` (Saisie). But : supprimer un vol ou un trajet terrestre demande confirmation, comme dans Trajets. Test : clic sur la croix puis « Annuler » → la ligne reste.
6. **Nouvel itinéraire (C3).** Modifier `js/trajets.js` et `js/app.js` (Saisie, « + Ajouter un vol »). But : un nouvel itinéraire reçoit les participants qui n'ont pas encore d'itinéraire, et non tout l'effectif. Test : Kelley 36 participants, vol principal 36 → nouvel itinéraire à 0 pers. ; vol principal 30 → nouvel itinéraire à 6 pers.
7. **Versions.** `index.html` : tous les `?v=` passent à `2026-11-19o`.

Contrôles : mesures à 375 px dans l'aperçu (largeur de page, tailles des zones tactiles) ; total des hypothèses 172,4 t / 95,3 t ; 6 onglets en avant et en arrière, à 375 px et à l'ordinateur, console sans erreur. Prévenir Adrien (`trajets.js`, `trajets.css`).
Message de commit : « Phase 2 de l'audit : ergonomie au téléphone ».
### STOP — fin de la phase 2

## Phase 3 — Textes et données cohérents

But : chaque texte dit ce que fait le calcul. Points : constats 5, 6, 7, 9, 10, 11, 12, 13, 15.

| Fichier | Changement |
|---|---|
| `js/app.js` | Limites du Rapport ; budget Rapport / Scénarios expliqué ; Méthode : trajets au sol, locations, leviers ; textes TGV selon la ligne réelle ; reprise de l'ancien prix |
| `js/vehicules.js` | Facteurs carburant vérifiés dans la Base Empreinte, avec identifiants |
| `js/visuals.js` | Parcours et fiabilité avec trajets au sol et locations |
| `js/app.js` (Saisie) | tCO2e d'un itinéraire = avion + sol, comme dans Trajets |

Tâches :
- Rapport et Méthode ne se contredisent plus.
- La Méthode explique chaque hypothèse (× 1,2, × 1,3, 4 personnes par voiture) avec sa source ou la mention « hypothèse ».
- Le même itinéraire affiche le même chiffre partout.

Critères de fin : voir la spec, phase 3.

### Détail de la phase 3 (écrit le 19/11/2026 sur `91091e5`)

1. **Limites du Rapport (constat 5).** Modifier `js/app.js` (`vRapport`). But : la limite ne dit plus « ni du type d'avion » ; elle dit, comme la Méthode, que la taille d'avion est choisie selon la distance et non selon l'avion réellement utilisé. Test : plus aucune occurrence de « type d'avion » dans le site.
2. **Budget Rapport / Scénarios (constat 6).** Modifier `js/app.js`. But : une phrase sous le tableau du Rapport précise que ce budget porte sur le bilan entier, et que l'onglet Scénarios le calcule sur ce qui reste après les leviers cochés. Test : leviers TGV + itinéraire cochés, 35 €/t → Rapport 6 034 €, Scénarios 4 847 €, chaque montant avec sa base écrite à côté.
3. **Ancien prix de la tonne (constat 7, décision P10).** Modifier `js/app.js` (lecture de la sauvegarde). But : une sauvegarde qui contient l'ancien défaut (30 €) passe au nouveau défaut (35 €), une seule fois ; un prix choisi autrement n'est pas touché. Test : sauvegarde à 30 € → 35 € et repère « Label Bas-Carbone » coché ; sauvegarde à 50 € → reste 50 €.
4. **Méthode complétée (constat 9).** Modifier `js/app.js` (`vMethode`). But : une carte « Trajets au sol et voitures de location » donne les formules et les hypothèses, chacune marquée « hypothèse » ou avec sa source : vol d'oiseau × 1,2 (train) ou × 1,3 (route), 4 personnes par voiture, facteur train selon le pays (TGV, Intercités, Amtrak), location = carburant × facteur + km × fabrication (0,041, ADEME 43791), électricité (EPA eGRID, Hydro-Québec), polluants jamais ajoutés aux tCO2e ; les sources de la note finale citent aussi l'EPA (consommations des véhicules, eGRID). Test : chaque nombre de `MODES_SOL`, `legSol` et `vehicules.js` apparaît dans la Méthode.
5. **Facteurs carburant (constat 10).** Modifier `js/vehicules.js`. But : essence et gazole vérifiés dans la Base Empreinte (data.ademe.fr), valeur et identifiant dans la source, mention « À vérifier » retirée pour ces deux lignes. Test : Toyota Corolla → 0,221 kgCO2e/km si l'essence vaut 2,69 (valeur à confirmer dans la base au moment de la phase).
6. **Parcours d'un étudiant (constat 11).** Modifier `js/visuals.js` (`parcours`). But : les trajets au sol d'un itinéraire apparaissent à leur place et les locations à la fin. Test : MRS → CDG en train → total du parcours = total du groupe ÷ participants (2 533 kg, aujourd'hui 2 528 kg).
7. **Même chiffre partout (constat 12).** Modifier `js/app.js` (Saisie). But : la colonne tCO2e d'un itinéraire = avion + trajets au sol, comme dans Trajets. Test : MRS → CDG en train → même chiffre dans Saisie et dans Trajets.
8. **Fiabilité (constat 13).** Modifier `js/visuals.js` (`fiabilite`). But : les trajets au sol et les locations comptent dans la part sourcée ou en hypothèse. Test : avec l'exemple de location (hypothèse), la part en hypothèse augmente de son poids.
9. **Textes du levier TGV (constat 15).** Modifier `js/app.js` (Scénarios). But : la durée « ≈ 4 h » n'apparaît que pour la ligne Marseille → Paris-CDG documentée dans `js/leviers.js` ; pour une autre ligne, « durée à vérifier ». Le titre ne cite plus Paris-CDG : « TGV au lieu des vols en France ». Test : NCE-ORY-JFK → pas de « ≈ 4 h ».
10. **Versions.** `index.html` : tous les `?v=` passent à `2026-11-19p`.

Contrôles : script de recalcul (tests 2, 3, 6, 7, 8) ; total des hypothèses 172,4 / 95,3 t ; aperçu des 6 onglets en avant et en arrière, à 375 px et à l'ordinateur, console sans erreur. Prévenir Quentin (Scénarios dans `app.js`), Maxime (`visuals.js`), Adrien (`vehicules.js`).
Message de commit : « Phase 3 de l'audit : textes et données cohérents ».
### STOP — fin de la phase 3

## Phase 4 — Base partagée et calcul « saisies + hypothèse »

But : les trajets saisis par les étudiants entrent dans le bilan, sans exposer leurs prénoms. Points : C1, F1 (stockage).

Préalable : compte Supabase créé par Théo ; Martin prévenu.

| Fichier | Changement |
|---|---|
| `docs/supabase.sql` (nouveau) | Table des trajets, vue publique sans prénom, règles d'accès (ajout public, lecture des prénoms pour le pôle seulement), une saisie par prénom + groupe |
| `js/partage.js` (nouveau) | Lecture des trajets publics, envoi d'une saisie, mode hors ligne |
| `js/calc.js` | Bilan = trajets saisis + hypothèse pour les participants restants |
| `js/app.js` (Saisie) | Liste des saisies pour le pôle connecté, avec « masquer » ; import qui ajoute au lieu de remplacer |
| `index.html` | Client Supabase (version fixe) et nouveaux scripts |

Tâches :
- Une saisie de test arrive dans la base et compte dans le bilan.
- Le site public ne voit aucun prénom.
- Sans Internet, le site affiche les hypothèses et le dit.

Critères de fin : voir la spec, phase 4.
<!-- DÉTAIL : à écrire au début de la phase -->
### STOP — fin de la phase 4

## Phase 5 — Accueil « Mon voyage » et « Saisir mon trajet »

But : un étudiant ouvre le site et saisit son trajet en moins de 3 minutes. Points : A1, A2, F1 (écran), F3.

| Fichier | Changement |
|---|---|
| `js/accueil.js` (nouveau) | Accueil : bilan global, jauge de collecte, boutons « Saisir mon trajet » et « Visite guidée » ; formulaire en 4 étapes |
| `js/app.js`, `index.html` | Nouvelle route d'accueil ; Trajets devient un onglet du pôle |
| `css/accueil.css` (nouveau) | Mise en page de l'accueil et du formulaire |

Tâches :
- L'étudiant choisit son groupe, entre prénom + initiale et code de groupe, puis ses villes avec la recherche existante.
- La jauge « X trajets saisis sur 70 » se met à jour après l'envoi.

Critères de fin : voir la spec, phase 5.
<!-- DÉTAIL : à écrire au début de la phase -->
### STOP — fin de la phase 5

## Phase 6 — Jeu

But : rendre la saisie et le bilan amusants sans tricher sur les chiffres. Points : F2, F4, F5, F6.

| Fichier | Changement |
|---|---|
| `js/accueil.js` | Écran « Mon empreinte » ; badges ; duel Kelley / HEC ; quiz |
| `css/accueil.css` | Badges, duel, quiz |

Tâches :
- Après sa saisie, l'étudiant voit son empreinte, ses badges et sa place dans le duel.
- Le quiz pose 3 ou 4 questions avant de montrer la réponse.

Critères de fin : voir la spec, phase 6.
<!-- DÉTAIL : à écrire au début de la phase -->
### STOP — fin de la phase 6

## Phase 7 — Améliorations des fonctions existantes

But : finir les irritants restants. Points : G1 à G4, C2, D2.

| Fichier | Changement |
|---|---|
| `js/trajets.js` | Classe et aller-retour sur la fiche d'itinéraire |
| `js/app.js` | Sommaire et sections repliables dans Méthode ; budget rappelé en haut de Scénarios |

Critères de fin : voir la spec, phase 7.
<!-- DÉTAIL : à écrire au début de la phase -->
### STOP — fin de la phase 7

## Phase 8 — Visite guidée (en dernier, sur le site fini)

But : un non-ingénieur comprend comment saisir et comment le bilan se calcule. Point : F7.

| Fichier | Changement |
|---|---|
| `js/visite.js` (nouveau) | 8 à 10 étapes sur le vrai site, textes simples et images parlantes |
| `index.html` | driver.js (version fixe) |

Tâches :
- La visite part au premier passage et se relance depuis l'accueil.
- Elle traverse : accueil, saisie, distance + 95 km, facteur selon la distance, traînées, correspondances, leviers, budget.
- Chaque étape de calcul a son petit schéma animé et une explication ludique en mots simples (niveau non-ingénieur, pas de formule brute).

Critères de fin : voir la spec, phase 8.
<!-- DÉTAIL : à écrire au début de la phase -->
### STOP — fin de la phase 8
