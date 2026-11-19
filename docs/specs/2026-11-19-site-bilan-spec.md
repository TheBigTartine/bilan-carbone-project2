# Site du bilan carbone : corrections, ergonomie et nouveautés

19/11/2026, branche `main`, commit de départ `d905781`. Ce document réunit les constats 1 à 15 de l'audit, les gênes A1 à D4, les améliorations G1 à G4 et les nouveautés F1 à F7.

## 1. Décisions

### Tranchées par toi

| Sujet | Décision |
|---|---|
| Constats de l'audit | Les 15 sont gardés |
| Orientation | Gamifier le site ; chaque étudiant saisit lui-même son trajet sur le site |
| Partage des trajets | Base partagée en ligne |
| Service | Supabase |
| Identité de l'étudiant | Prénom + initiale du nom |
| Bilan | Trajets saisis par les étudiants + hypothèse actuelle pour ceux qui n'ont pas encore saisi |
| Page d'accueil | Nouvel accueil « Mon voyage » (bilan, jauge de collecte, « Saisir mon trajet », « Visite guidée ») ; Trajets reste un onglet pour le pôle |
| Visite guidée | Oui : parcours qui montre comment saisir ses données et comment le bilan se calcule, ludique, pour des non-ingénieurs |
| Modèle qui exécute | Opus |
| Interdit | Pas de push sur `main` sans ton accord |

### Prises par moi, à contester avant la phase concernée

| # | Sujet | Valeur retenue | Pourquoi |
|---|---|---|---|
| P1 | Classe de voyage (constat 2) | Le coefficient reste dans le bilan principal ; les textes (Méthode, Rapport, `data.js`) sont corrigés pour le dire | Un siège affaires occupe plus de place et émet plus ; aujourd'hui tout le monde est en éco, donc le bilan ne bouge pas |
| P2 | Train hors France et hors Amérique (constat 3) | Facteur Intercités ADEME (0,0075) au lieu d'Amtrak | Seul facteur ADEME de train grandes lignes déjà sourcé dans le site ; prudent par rapport au TGV |
| P3 | Sensibilité « vols en direct » (constat 1) | Remplacée par « Meilleur itinéraire existant » (le levier de Quentin) | L'option `direct` n'existe plus dans le calcul |
| P4 | Double comptage location + autocar (constat 4) | Avertissement sur la fiche de location quand une ligne terrestre a le même départ et la même arrivée ; pas de suppression automatique | Le pôle garde la main sur ses lignes |
| P5 | Lecture des prénoms | Les prénoms ne sont jamais lisibles par le public : la base accepte les ajouts, mais le site public ne lit que les trajets sans prénom ; seul le pôle (compte connecté) voit les prénoms | La clé Supabase est visible dans un site statique : sans cette règle, tout le monde pourrait lire la liste des prénoms (RGPD) |
| P6 | Fausses saisies | Code de groupe demandé à la saisie (ex. donné par le responsable du Study Tour) + le pôle peut masquer une saisie | Évite qu'un inconnu remplisse le bilan |
| P7 | Doublon d'un étudiant | Une saisie par prénom + initiale et par groupe : une nouvelle saisie remplace l'ancienne | Un étudiant peut corriger son trajet |
| P8 | Bibliothèque de la visite guidée | driver.js 1.3.1 (cdnjs ou jsDelivr, licence MIT) | Légère, en français possible, fonctionne au téléphone |
| P9 | Points des badges | Points = kg évités par un choix bas-carbone, affichés à part, jamais retirés du bilan | Règle de l'équipe : ne jamais additionner émissions évitées et émissions mesurées |
| P10 | Prix de la tonne enregistré (constat 7) | Un ancien prix enregistré qui n'est pas un repère est remplacé par le nouveau défaut une seule fois | Les anciens visiteurs voyaient 30 € et « Prix libre » |

## 2. Plan commun

| Phase | Contenu | Constats | Gênes |
|---|---|---|---|
| 1 | Chiffres faux et cas limites | 1, 2, 3, 4, 8, 14 | |
| 2 | Ergonomie rapide au téléphone | | B1, B2, C3, D1, D3, D4 |
| 3 | Textes et données cohérents | 5, 6, 7, 9, 10, 11, 12, 13, 15 | |
| 4 | Base partagée (Supabase) et calcul « saisies + hypothèse » | | C1 |
| 5 | Accueil « Mon voyage », « Saisir mon trajet », jauge de collecte | | A1, A2 |
| 6 | Jeu : mon empreinte, badges, duel, quiz | | |
| 7 | Améliorations des fonctions existantes | | C2, D2 |
| 8 | Visite guidée, en dernier, sur le site fini | | |

### Où va chaque point

| Point | Phase |
|---|---|
| Constats 1, 2, 3, 4, 8, 14 | 1 |
| B1, B2, C3, D1, D3, D4 | 2 |
| Constats 5, 6, 7, 9, 10, 11, 12, 13, 15 | 3 |
| C1, F1 (stockage) | 4 |
| A1, A2, F1 (écran), F3 | 5 |
| F2, F4, F5, F6 | 6 |
| G1 à G4, C2, D2 | 7 |
| F7 | 8 |

### Hors plan

- Connexion par email de l'école : remplacée par prénom + initiale et code de groupe (ton choix).
- Changement d'hébergement : le site reste sur GitHub Pages.
- Hébergement, repas et achats sur place : hors du périmètre du bilan.
- Création des comptes Supabase : c'est toi ou Martin qui la faites, pas Claude.

## 3. Améliorations des fonctions existantes (G)

| # | Fonction | Aujourd'hui | Proposé |
|---|---|---|---|
| G1 | Import d'un fichier (Saisie) | Remplace toutes les données | Choix « remplacer » ou « ajouter aux données » |
| G2 | Itinéraire dans Trajets | Classe et aller-retour réglables seulement dans Saisie | Réglables sur la fiche de l'itinéraire |
| G3 | Onglet Méthode | Une page de 12 782 px au téléphone | Sommaire en haut et sections repliables |
| G4 | Onglet Scénarios | Le budget est en bas d'une page de 4 142 px | Rappel du budget dans le bandeau du haut |

## 4. Nouveautés (F)

| # | Nouveauté | Première version | Limites |
|---|---|---|---|
| F1 | Saisir mon trajet | Formulaire en 4 étapes (qui je suis, d'où je pars, mon itinéraire, mes trajets sur place), enregistré dans Supabase | Il faut Internet ; un étudiant sans code de groupe ne peut pas saisir |
| F2 | Mon empreinte | Après la saisie : mon total, comparé à la moyenne de mon groupe et au budget climat de 2 t par an, avec les équivalences existantes | Jamais présenté comme « neutre » ou « compensé » |
| F3 | Jauge de la collecte | « 28 trajets saisis sur 70 », par groupe, en direct | Dépend des effectifs saisis par le pôle |
| F4 | Badges bas-carbone | « TGV jusqu'à Paris », « Vol sans escale », « Navette », points = kg évités | Les points ne se retirent jamais du bilan |
| F5 | Duel Kelley / HEC | Taux de saisie et part des choix bas-carbone par groupe | Comparer les choix, pas seulement les tonnes (les distances diffèrent) |
| F6 | Quiz « Devine ton empreinte » | 3 ou 4 questions, réponse expliquée en une phrase | Questions à faire relire par le pôle |
| F7 | Visite guidée | 8 à 10 bulles qui montrent, sur le vrai site, comment saisir et comment le bilan se calcule. Chaque étape de calcul est expliquée avec un petit schéma animé et des mots de tous les jours, pas au niveau ingénieur : la distance (le trait droit + 95 km de détours), le facteur (un vol court consomme plus par km, comme une voiture en ville), les traînées (le « nuage » en plus), les correspondances (un décollage en plus), le résultat (« ton vol = X allers-retours Paris–Marseille en TGV ») | À relancer depuis un bouton ; pas de vidéo ; schémas en SVG légers |

## 5. Critères de fin

| Phase | Ce qui doit être vrai (chiffré) |
|---|---|
| 1 | La barre de sensibilité du levier itinéraire montre − 17,2 t ; Paris → Amsterdam en train vaut 0,0075 kg/km ; le détail affiche « × 2,22 » ; l'itinéraire MRS-MRS est refusé ; le total des hypothèses reste 172,4 t avec traînées et 95,3 t sans |
| 2 | Aucune page plus large que 375 px au téléphone ; tout bouton fait au moins 40 × 40 px ; supprimer un vol demande confirmation dans les deux onglets |
| 3 | Plus aucune contradiction texte / calcul parmi les constats 5 à 15 ; la Méthode décrit les trajets au sol, les locations et leurs hypothèses ; l'ancien prix de 30 € enregistré passe à 35 € |
| 4 | Une saisie de test arrive dans la base ; le site public ne lit aucun prénom (vérifié avec la clé publique) ; 1 saisie Kelley MRS-CDG-ATL-IND fait passer le bilan à : 1 trajet saisi + 35 en hypothèse, même total qu'avant |
| 5 | L'accueil montre le bilan global, la jauge et les deux boutons ; un étudiant saisit son trajet en moins de 3 minutes au téléphone |
| 6 | Mon empreinte, badges, duel et quiz s'affichent après une saisie ; aucun point n'est soustrait du bilan |
| 7 | G1 à G4 en place ; la Méthode tient en un sommaire + sections repliées au téléphone |
| 8 | La visite se lance au premier passage et depuis un bouton ; elle marche en avant et en arrière, au téléphone et à l'ordinateur |
