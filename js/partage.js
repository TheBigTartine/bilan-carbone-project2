/* Base partagée des trajets saisis par les étudiants (Supabase). Responsable : Théo.
   La clé ci-dessous est la clé PUBLIQUE : elle est faite pour être dans un site. Elle ne donne accès
   qu'aux deux fonctions prévues (voir docs/supabase.sql) : le public ne lit jamais les prénoms.
   Ne jamais mettre ici la clé secrète (sb_secret_…) ni le mot de passe de la base. */

(function () {
  const URL = 'https://khbtbhvbdievsdxldluq.supabase.co';
  const CLE = 'sb_publishable_NPjpVjnyRkelSo8IsxjCWA_sEL4OX2S';
  const DELAI = 6000; // au-delà, la base est considérée hors ligne
  const SESSION = 'bilan-carbone.pole';

  // Appel à la base, abandonné après DELAI ms.
  async function appel(chemin, { methode = 'POST', corps, jeton, entetes = {} } = {}) {
    const ctrl = new AbortController();
    const minuteur = setTimeout(() => ctrl.abort(), DELAI);
    try {
      const rep = await fetch(URL + chemin, {
        method: methode, signal: ctrl.signal,
        headers: { apikey: CLE, 'Content-Type': 'application/json', ...(jeton ? { Authorization: 'Bearer ' + jeton } : {}), ...entetes },
        body: corps === undefined ? undefined : JSON.stringify(corps)
      });
      const txt = await rep.text();
      const d = txt ? JSON.parse(txt) : null;
      if (!rep.ok) { const e = new Error((d && (d.message || d.msg || d.error_description)) || 'Erreur ' + rep.status); e.statut = rep.status; throw e; }
      return d;
    } finally { clearTimeout(minuteur); }
  }

  const lireSession = () => { try { return JSON.parse(sessionStorage.getItem(SESSION)); } catch (e) { return null; } };
  const ecrireSession = s => { try { s ? sessionStorage.setItem(SESSION, JSON.stringify(s)) : sessionStorage.removeItem(SESSION); } catch (e) {} };

  const P = {
    saisies: [],          // [{ groupe, trajet }] sans prénom, lues par le public
    etat: 'attente',      // 'attente' | 'ok' | 'hors-ligne'

    // Lecture publique des saisies non masquées.
    async charger() {
      try {
        const d = await appel('/rest/v1/rpc/lire_saisies', { corps: {} });
        P.saisies = Array.isArray(d) ? d.filter(s => s && s.trajet && s.groupe) : [];
        P.etat = 'ok';
      } catch (e) { P.saisies = []; P.etat = 'hors-ligne'; }
      return P.saisies;
    },

    // Saisie d'un étudiant. trajet = { route, legModes, classe, ar }.
    enregistrer(groupe, prenom, initiale, code, trajet) {
      return appel('/rest/v1/rpc/enregistrer_saisie', { corps: { p_groupe: groupe, p_prenom: prenom, p_initiale: initiale, p_code: code, p_trajet: trajet } });
    },

    // Pôle : connexion par email et mot de passe (compte créé dans Supabase par l'admin).
    session: lireSession(),
    async connecter(email, mdp) {
      const d = await appel('/auth/v1/token?grant_type=password', { corps: { email, password: mdp } });
      P.session = { jeton: d.access_token, email: d.user?.email || email, fin: Date.now() + (d.expires_in || 3600) * 1000 };
      ecrireSession(P.session);
      return P.session;
    },
    deconnecter() {
      const s = P.session; P.session = null; ecrireSession(null);
      if (s) appel('/auth/v1/logout', { jeton: s.jeton }).catch(() => {});
    },
    connecte: () => !!(P.session && P.session.fin > Date.now()),

    // Pôle : toutes les saisies, avec prénom (refusé si le compte n'est pas dans la table pole).
    async toutes() {
      if (!P.connecte()) { P.deconnecter(); throw new Error('Session expirée : se reconnecter'); }
      return appel('/rest/v1/saisies?select=id,groupe,prenom,initiale,trajet,masquee,cree&order=cree.desc', { methode: 'GET', jeton: P.session.jeton });
    },
    masquer(id, oui) {
      if (!P.connecte()) { P.deconnecter(); return Promise.reject(new Error('Session expirée : se reconnecter')); }
      return appel('/rest/v1/saisies?id=eq.' + encodeURIComponent(id), { methode: 'PATCH', corps: { masquee: !!oui }, jeton: P.session.jeton, entetes: { Prefer: 'return=minimal' } });
    }
  };

  window.Partage = P;
})();
