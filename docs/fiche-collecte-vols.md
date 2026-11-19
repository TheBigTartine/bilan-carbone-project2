# Fiche de collecte : déplacements des Study Tours

*Pôle Bilan Carbone, Project 2 (Master MG 2026-2027). Responsable de la collecte : Adrien.*
*À remplir par les responsables des Study Tours (Kelley University et HEC Montréal). Retour souhaité **avant le 30 novembre 2026**.*

Ces informations servent uniquement à calculer le bilan carbone des deux voyages. Elles remplacent les hypothèses actuellement utilisées sur le site du pôle. Si une information n'est pas encore connue, écrivez « non connu » ou « à confirmer », plutôt que d'estimer.

---

## 1. Informations générales

| Question | Kelley University (États-Unis) | HEC Montréal (Canada) |
|---|---|---|
| Nom du responsable / contact | | |
| Dates du voyage (aller / retour) | | |
| Nombre total de participants (étudiants) | | |
| Nombre d'accompagnateurs (enseignants, staff) | | |
| Les vols sont-ils déjà réservés ? (oui / non / en cours) | | |
| Agence ou compagnie utilisée | | |

## 2. Vols

Remplir **une ligne par itinéraire différent**. Si tout le groupe voyage ensemble, une seule ligne suffit. Si certains partent d'un autre aéroport ou voyagent à part, ajouter une ligne pour eux.

Indiquer **toutes les escales** dans l'ordre, avec les codes d'aéroport à 3 lettres si possible (ex. MRS = Marseille, CDG = Paris-CDG, YUL = Montréal).

### Kelley University

| # | Itinéraire aller (ex. MRS → CDG → ATL → IND) | Itinéraire retour (si différent) | N° de vols / compagnie | Nb de passagers | Classe (éco / premium / affaires) | Justificatif (billet, devis, mail) |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |

### HEC Montréal

| # | Itinéraire aller (ex. MRS → CDG → YUL) | Itinéraire retour (si différent) | N° de vols / compagnie | Nb de passagers | Classe (éco / premium / affaires) | Justificatif (billet, devis, mail) |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |

## 3. Déplacements terrestres

Les trajets en car, train, voiture, taxi ou transports en commun, **avant, pendant et après** les vols.

| Groupe | Trajet (ex. IAE → aéroport MRS) | Mode (car, TGV, TER, voiture, taxi, métro…) | Distance aller (km) si connue | Nb de personnes | Aller-retour ? | Source |
|---|---|---|---|---|---|---|
| Kelley | Domicile / IAE → aéroport de départ | | | | | |
| Kelley | Aéroport d'arrivée → Bloomington | | | | | |
| Kelley | Visites sur place (total) | | | | | |
| HEC | Domicile / IAE → aéroport de départ | | | | | |
| HEC | Aéroport d'arrivée → Montréal | | | | | |
| HEC | Déplacements sur place (total) | | | | | |

## 4. Questions complémentaires

1. Un vol direct a-t-il été envisagé (ex. Paris → Montréal, Paris → Atlanta) ? Si non, pourquoi ?
2. Le trajet Marseille → Paris pourrait-il se faire en TGV plutôt qu'en avion ?
3. Des étudiants prolongent-ils leur séjour, ou rentrent-ils par un autre itinéraire ?
4. Autres remarques :

---

### Réservé au pôle (saisie dans le site)

| Champ de la fiche | Où le saisir (onglet Saisie / `js/data.js` → `HYPOTHESES`) |
|---|---|
| Itinéraire + escales | `route`, codes IATA séparés par des tirets (`MRS-CDG-YUL`) |
| Nb de passagers | `pax` |
| Classe | `classe` : `eco`, `premium`, `affaires`, `premiere` |
| Aller-retour identique | `ar: true`. Si le retour est différent : deux lignes, avec `ar: false` |
| Trajets terrestres | `terrestres`, avec `mode`, `km`, `pax`, `ar` |
| Justificatif | `source`, ex. `'Responsable Study Tour (mail du JJ/MM)'`, `'Billet / réservation'` |

Un aéroport absent de la liste du site s'ajoute dans l'onglet Saisie, rubrique « Ajouter un aéroport manquant ».
