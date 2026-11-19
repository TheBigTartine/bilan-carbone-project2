# Leviers de réduction : vérification

*Pôle Bilan Carbone, Project 2 (Master MG 2026-2027). Partie Scénarios : Quentin. État au 19 novembre 2026.*
*Ce document sert de base à la « Note sur les actions de réduction » (livrable de décembre) et à la réunion de janvier avec les pôles réduction et compensation.*

> **À lire avant les chiffres.**
> - Ils partent des **hypothèses actuelles** du site : les vrais itinéraires ne sont pas encore connus (collecte en cours, Adrien). Ils seront recalculés avec les vraies données.
> - Ce sont des **réductions potentielles**. Le pôle ne réserve pas les voyages : il **recommande** aux responsables des Study Tours, qui décident.
> - Chaque gain est donné **avec** et **sans** traînées (effets de l'avion autres que le CO₂).
> - Les dates des Study Tours ne sont pas connues. Certaines lignes ne volent qu'à certaines saisons : c'est indiqué à chaque fois.

**Statuts utilisés :** **Vérifié** (source datée) · **À vérifier** (piste crédible, source manquante ou à confirmer aux dates du voyage) · **Sans objet** (n'existe pas ou n'a pas d'effet sur les données actuelles).

---

## Méthode

- Calculs faits avec le moteur du site (`js/calc.js`), avec les facteurs ADEME vérifiés par Théo et la correction de + 95 km par vol.
- Totaux en tCO₂e pour l'aller-retour de tout le groupe.
- **Kelley** : 36 étudiants. Référence : l'hypothèse actuelle Marseille → Paris-CDG → Atlanta → Indianapolis, puis autocar Indianapolis → Bloomington (85 km).
- **HEC** : 34 étudiants. Référence : l'hypothèse actuelle Marseille → Paris-CDG → Montréal.
- Pour refaire un calcul : saisir l'itinéraire dans l'onglet Saisie. Pour un segment en train ou en car, choisir le mode dans l'onglet Trajets.

---

## 1. Kelley University (Indianapolis)

### Ce que la vérification a montré

- **Aucun vol sans escale entre Paris et Indianapolis.** La page officielle de l'aéroport d'Indianapolis ne cite qu'une destination européenne sans escale : **Dublin** (Aer Lingus). La liste date de juillet 2026 et vaut jusqu'à décembre 2026. La ligne Delta Paris–Indianapolis, ouverte en mai 2018, n'y figure plus.
- **Dublin–Indianapolis (Aer Lingus)** : ligne ouverte en mai 2025, 4 vols par semaine, 5 à partir d'avril 2026, toute l'année **avec une courte pause en janvier-février**. Les horaires 2027 ne sont pas encore publiés.
- **Le levier actuel « Vols directs » invente un vol Marseille → Indianapolis qui n'existe pas.** Son gain ne peut pas être présenté comme réaliste.

### Itinéraires comparés (aller-retour, 36 étudiants)

| Itinéraire | Avec traînées | Gain | Sans traînées | Gain | Vols par aller | Statut |
|---|---:|---:|---:|---:|:---:|---|
| **Référence** : MRS → CDG → Atlanta → IND | 102,9 t | — | 56,8 t | — | 3 | Hypothèse |
| MRS → CDG → Detroit → IND | 92,2 t | −10,7 | 50,9 t | −5,9 | 3 | À vérifier (correspondances) |
| MRS → CDG → New York JFK → IND | 92,3 t | −10,6 | 51,0 t | −5,8 | 3 | À vérifier (correspondances) |
| MRS → CDG → Boston → IND | 92,3 t | −10,6 | 51,0 t | −5,8 | 3 | À vérifier (correspondances) |
| MRS → CDG → Toronto → IND | 91,8 t | −11,1 | 50,7 t | −6,1 | 3 | À vérifier (Toronto–IND est saisonnier) |
| MRS → CDG → Chicago → IND | 93,7 t | −9,1 | 51,8 t | −5,0 | 3 | À vérifier (correspondances) |
| MRS → CDG → Minneapolis → IND | 101,7 t | −1,2 | 56,1 t | −0,7 | 3 | À vérifier (correspondances) |
| MRS → Amsterdam → Detroit → IND | 94,1 t | −8,8 | 52,0 t | −4,8 | 3 | À vérifier (correspondances) |
| MRS → Dublin → IND | 86,0 t | −16,9 | 47,5 t | −9,3 | 2 | À vérifier (Marseille–Dublin ; pause janv.-févr.) |
| **TGV** MRS → CDG, puis CDG → Atlanta → IND | 90,9 t | −11,9 | 50,3 t | −6,5 | 2 | Vérifié pour le TGV (voir § 3) |
| **TGV** MRS → CDG, puis CDG → Detroit ou JFK → IND | 80,3 t | −22,6 | 44,4 t | −12,4 | 2 | À vérifier (correspondances) |
| **TGV** MRS → CDG, puis CDG → Dublin → IND | 80,6 t | −22,3 | 44,6 t | −12,2 | 2 | À vérifier (pause janv.-févr.) |
| **TGV** MRS → CDG, CDG → Chicago, puis **autocar** Chicago → Indianapolis | 74,9 t | −28,0 | 41,9 t | −14,9 | 1 | Piste à étudier (≈ 370 km de car en plus) |
| *Vol direct Marseille → Indianapolis (fictif)* | *79,7 t* | *−23,2* | *44,0 t* | *−12,8* | *1* | **Sans objet** : ce vol n'existe pas |

### Ce qu'il faut en retenir

1. **Le choix de l'escale compte.** Atlanta impose un grand détour vers le sud. Une escale plus au nord (Detroit, New York, Boston, Toronto) économise **environ 11 t avec traînées (6 t sans)**, pour le même nombre de vols.
2. **Le TGV jusqu'à CDG supprime le vol court**, celui qui émet le plus par kilomètre : **environ −12 t avec traînées (−6,5 t sans)**.
3. **Les deux combinés** (TGV, puis une escale au nord) : **environ −22 t avec traînées (−12 t sans), soit −22 % du bilan de Kelley.** C'est autant que le vol direct fictif, mais avec des vols qui existent.
4. **La piste Chicago + autocar** va plus loin (−28 t). Elle demande environ 370 km de car (estimation : 285 km à vol d'oiseau × 1,3). La durée, le coût d'un autocar affrété et l'acceptabilité restent à étudier.

---

## 2. HEC Montréal

### Ce que la vérification a montré

- **Marseille → Montréal sans escale existe (Air Transat)** :
  - hiver 2026 (jusqu'au 30 avril) : jusqu'à 3 vols par semaine ;
  - été 2027 (de mai à octobre) : 1 vol par jour.
- **Paris → Montréal sans escale** : Air Transat seule assure jusqu'à 2 vols par jour, hiver comme été.
- Source : MisterTravel, 2 novembre 2026. À reconfirmer sur le site d'Air Transat une fois les dates connues.

### Itinéraires comparés (aller-retour, 34 étudiants)

| Itinéraire | Avec traînées | Gain | Sans traînées | Gain | Vols par aller | Statut |
|---|---:|---:|---:|---:|:---:|---|
| **Référence** : MRS → CDG → Montréal | 69,1 t | — | 38,1 t | — | 2 | Hypothèse |
| MRS → Montréal sans escale (Air Transat) | 62,6 t | −6,5 | 34,5 t | −3,6 | 1 | Vérifié (fréquence selon la saison) |
| **TGV** MRS → CDG, puis CDG → Montréal sans escale | 57,8 t | −11,3 | 31,9 t | −6,1 | 1 | Vérifié |
| MRS → Amsterdam → Montréal | 71,1 t | +2,0 | 39,2 t | +1,1 | 2 | Moins bon : à éviter |

### Ce qu'il faut en retenir

**Le TGV, puis le vol sans escale depuis Paris, réduit presque deux fois plus que le vol sans escale depuis Marseille** : −11,3 t contre −6,5 t avec traînées.

Pourquoi : on supprime entièrement le vol court Marseille → Paris, et Paris est plus proche de Montréal que Marseille. Le résultat n'est pas intuitif. C'est un message important pour les responsables des Study Tours.

---

## 3. TGV jusqu'à l'aéroport Paris-CDG (les deux groupes)

| Point vérifié | Résultat | Statut |
|---|---|---|
| TGV sans changement Marseille Saint-Charles → gare Aéroport CDG 2 TGV | Environ 3 h 50 à 4 h. Plusieurs trains par jour ; SNCF Connect annonce jusqu'à 12 départs par jour, en comptant les trajets avec changement. | Vérifié (horaires à reconfirmer aux dates) |
| Offre **« Train + Air »** d'Air France et de SNCF Voyageurs | Un seul billet pour le train et le vol, et une nouvelle place sans frais en cas de retard. Gares concernées : Marseille Saint-Charles, Aix-en-Provence TGV et Avignon TGV. Depuis le 21 septembre 2026, tous les OUIGO qui desservent CDG en font partie. | À vérifier : ne concerne que les vols Air France ; conditions à confirmer sur airfrance.fr |
| Distance en train Marseille → CDG | Pas de chiffre officiel SNCF pour ce trajet. Le site calcule 783 km (vol d'oiseau 653 km × 1,2) ; les sites de réservation annoncent environ 670 km. **Sur le bilan, l'écart ne pèse que 0,05 t pour les 70 étudiants aller-retour : il est négligeable.** On garde la formule du site et on note cette limite. | Hypothèse sans effet notable |
| Interdiction des vols intérieurs (loi Climat et résilience) | Elle ne vise que les trajets ayant une alternative en train de moins de 2 h 30. Marseille–Paris n'est pas concerné : le TGV est un choix, pas une obligation. | Contexte |

**Gain du TGV sur les hypothèses actuelles, pour les deux groupes réunis : −23,2 t avec traînées, −12,7 t sans.**

---

## 4. Navettes et classe économique

- **Navettes** : **sans objet** pour l'instant, car aucune voiture, aucun taxi et aucune location n'est saisi. Depuis la mise à jour d'Adrien, le levier s'applique aussi aux voitures de location de l'onglet Trajets. À réévaluer avec les vraies données.
- **Classe économique** : **sans objet** pour l'instant, car tout le monde voyage en éco dans les hypothèses. Les coefficients par classe viennent du gouvernement britannique (DESNZ), une autre convention que l'ADEME. Ils ne servent donc qu'en analyse complémentaire.

---

## 5. Prix de la tonne : repères sourcés

Aujourd'hui, le site utilise 30 € par défaut dans les Scénarios, et 15 / 30 / 60 / 100 € dans le Rapport, sans source. Voici des repères vérifiés :

| Repère | Prix | Ce que ce prix représente | Source |
|---|---:|---|---|
| Crédits carbone volontaires, tous standards (achats d'opérateurs français) | 8 €/t | Surtout des crédits internationaux, de qualité très variable | I4CE, juin 2025, p. 60 (d'après Info Contribution Neutralité Carbone, 2024) |
| Marché volontaire mondial, prix moyen 2023 | 6,5 $/t | Même remarque | I4CE, juin 2025, p. 60 (d'après Ecosystem Marketplace, 2024) |
| **Label Bas-Carbone**, prix moyen d'un crédit | **35 €/t** | Projets certifiés en France (forêt, agriculture) | I4CE, juin 2025, p. 60 |
| Label Bas-Carbone, projets forestiers | 20 à 70 €/t | Le prix suit le coût réel du projet : essences, protections, entretien | I4CE, juin 2025, p. 60 |
| **Quotas européens (EU ETS)**, moyenne mai-octobre 2026 | **81,17 €/t** | Prix payé par l'industrie et les vols intra-européens | Toute l'Europe, 5 novembre 2026, d'après la Commission européenne |
| **Valeur de l'action pour le climat** (référence de l'État) | **≈ 273 €/t en 2027** (en euros 2023) | Ce que l'État compte par tonne évitée pour évaluer ses projets. Calcul : 256 € en 2025, + 3,2 % par an ; le jalon 2030 est à 300 € | Avis n° 2025-2 du Conseil scientifique de l'évaluation socioéconomique, 21 mai 2025 (rapport Quinet, mars 2025) |

**Budget correspondant aux hypothèses actuelles**, sans aucune réduction :

| Prix | Avec traînées (172,4 t) | Sans traînées (95,3 t) |
|---:|---:|---:|
| 8 €/t | 1 379 € | 762 € |
| 35 €/t | 6 034 € | 3 336 € |
| 81,17 €/t | 13 994 € | 7 736 € |
| 273 €/t | 46 996 € | 25 979 € |

### Proposition à discuter avec le pôle compensation

- **Il n'y a pas de « bon » prix unique** : il dépend de ce qu'on finance. Pour un projet local comme le Centre forestier, le vrai prix est le coût du projet divisé par les tonnes séquestrées documentées. On ne peut le calculer qu'avec un devis à jour et une estimation sérieuse de la séquestration.
- **Afficher trois repères sourcés** à la place de 15 / 30 / 60 / 100 € : 35 € (Label Bas-Carbone), 81 € (quotas européens), 273 € (valeur de l'action pour le climat). Le tableau du Rapport relève de l'onglet de Maxime : à lui proposer.
- **Porter le maximum du curseur** de 200 € à 300 €, pour inclure la valeur de l'action pour le climat.
- **Rappel du cahier des charges** : un budget de contribution n'est pas un nombre de tonnes compensées. Un arbre planté ne compense pas immédiatement une tonne de CO₂.

---

## 6. Ce qui a changé sur le site (phase 2, branche `scenarios-quentin`)

**Les leviers ne reposent plus que sur des lignes qui existent.** Elles sont listées, avec leur source, dans `js/leviers.js`.

| Levier | Ce qu'il fait | Gain seul, hypothèses actuelles (avec / sans traînées) |
|---|---|---|
| **TGV jusqu'à l'aéroport Paris-CDG** | Les vols intérieurs à la France passent en TGV (distance : vol d'oiseau × 1,2) | − 23,2 t / − 12,7 t |
| **Meilleur itinéraire existant** (remplace « Vols directs ») | Même départ, même arrivée, pas plus de vols. Le site cherche l'itinéraire le moins émetteur parmi les lignes **vérifiées qui volent toute l'année** : escale plus courte ou vol sans escale. | − 17,2 t / − 9,5 t (Kelley par Detroit ; HEC en vol sans escale Marseille → Montréal) |
| Navettes | Inchangé ; s'applique aussi aux voitures de location | Sans objet pour l'instant |
| Classe économique | Inchangé | Sans objet pour l'instant |

- **Les deux premiers leviers combinés** : − 33,9 t avec traînées. Le TGV s'applique d'abord, puis l'itinéraire est optimisé à partir de Paris : Kelley passe par CDG → Detroit → Indianapolis, HEC par CDG → Montréal.
- **Les lignes saisonnières ou à vérifier** (Dublin → Indianapolis, Toronto → Indianapolis, Marseille → Dublin…) ne sont pas comptées. Le site les affiche comme « piste selon les dates », avec leur gain approximatif.
- **Pour chaque levier**, le site affiche :
  - son statut : vérifié, à vérifier, à décider, sans objet, ou déjà dans le bilan si le segment est déjà saisi en train ;
  - qui décide ;
  - les itinéraires avant et après ;
  - les lignes utilisées et leurs sources ;
  - le gain avec et sans traînées.
- **Prix de la tonne** :
  - curseur de 1 à 300 € ;
  - trois boutons de repères (35 €, 81 €, 273 €) qui affichent leur source ;
  - prix par défaut à 35 € (Label Bas-Carbone) au lieu de 30 € sans source ;
  - budget affiché avec et sans traînées.
  - Dans l'onglet Rapport, le tableau des budgets utilise ces trois repères au lieu de 15 / 30 / 60 / 100 €. Le site arrondit le prix des quotas européens à 81 € : 13 964 € au lieu de 13 994 €.
- **La carte avant/après** lit maintenant l'itinéraire calculé par le moteur, au lieu de refaire le calcul de son côté.

**Fichiers touchés :**
- `js/leviers.js` (nouveau), `js/calc.js` (moteur), `js/app.js` (onglets Scénarios et Rapport) ;
- `js/visuals.js` (carte, libellé « Réduire ») : fichier de Maxime, à le prévenir ; la mise en page de l’onglet est dans un fichier à part, `css/scenarios.css` (nouveau) ;
- `js/data.js` (deux lignes du bloc HYPOTHESES : leviers par défaut et prix par défaut) : à signaler à Adrien ;
- `js/glossary.js` (définition du prix de la tonne) et `index.html` (nouveau script et numéro de version).

---

## 7. Questions ouvertes

- **Dates des Study Tours.** Marseille–Montréal passe de 3 vols par semaine en hiver à 1 par jour en été, et Dublin–Indianapolis s'arrête en janvier-février.
- **Compagnie retenue.** « Train + Air » ne vaut qu'avec Air France.
- **Correspondances vers Indianapolis** (Detroit, New York, Boston, Chicago) : à vérifier dans les horaires réels.
- **Marseille–Dublin sans escale** : à vérifier.
- **Chicago → Bloomington en car** : distance, durée et coût d'un autocar affrété.

---

## Sources

- Aéroport d'Indianapolis, destinations sans escale (liste de juillet 2026) : https://www.ind.com/flights
- Aéroport d'Indianapolis, extension de la ligne Dublin en 2026 : https://www.ind.com/about/media/media-releases/indy-to-dublin-flight-to-expand-in-2026
- WISH-TV, Aer Lingus Indianapolis–Dublin été 2026 : https://www.wishtv.com/news/local-news/indianapolis-dublin-aer-lingus-expansion/
- Lancement de Delta Paris–Indianapolis en mai 2018 : https://www.aviationpros.com/airlines/press-release/12365815/delta-air-lines-delta-to-launch-nonstop-year-round-service-from-indianapolis-to-paris-beginning-may
- MisterTravel, programme Air Transat hiver 2026 et été 2027 (2 novembre 2026) : https://mistertravel.news/2026/11/02/le-canada-encore-plus-accessible-avec-air-transat/
- SNCF Connect, trajet Marseille → Roissy-Charles-de-Gaulle : https://www.sncf-connect.com/fr-lu/train/trajet/marseille/roissy-charles-de-gaulle
- Omio, TGV Marseille Saint-Charles → Aéroport CDG 2 TGV : https://www.omio.co.uk/trains/gare-de-marseille-saint-charles/aeroport-charles-de-gaulle-2-tgv-bzo3p
- Air-Journal, « Train + Air » ouvert à tous les OUIGO desservant Paris-CDG (21 septembre 2026) : https://www.air-journal.fr/2026-09-21-air-france-ouvre-train-air-a-tous-les-ouigo-desservant-paris-cdg-5277638.html
- Air France, communiqué du 21 septembre 2026 : https://corporate.airfrance.com/en/press-releases/air-france-and-sncf-voyageurs-expand-train-air-intermodal-service-all-ouigo-trains
- Interdiction des vols intérieurs : loi n° 2021-1104 du 22 août 2021 (article 145) et décret n° 2023-385 du 22 mai 2023, article L. 6412-3 du code des transports (Légifrance)
- I4CE, « Le Label Bas-Carbone : quel bilan après 6 ans d'existence ? », juin 2025 (p. 60) : https://www.i4ce.org/wp-content/uploads/2025/06/Le-Label-bas-carbone-quel-bilan-apres-6-ans-dexistence_V2.pdf
- Toute l'Europe, marché du carbone européen (5 novembre 2026) : https://www.touteleurope.eu/environnement/marche-du-carbone-comment-l-union-europeenne-met-un-prix-sur-la-pollution/
- Conseil scientifique de l'évaluation socioéconomique, avis n° 2025-2 sur la valeur de l'action pour le climat (21 mai 2025) : https://www.strategie-plan.gouv.fr/files/files/Publications/ESE%20-%20Juin%202025/Avis%20du%20CS%20ESE%20FS%20du%2021%20mai%202025%20-%20VAC%20V2bis.pdf
