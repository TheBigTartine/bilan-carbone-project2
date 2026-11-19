/* Accueil « Mon voyage » et formulaire « Saisir mon trajet » (4 étapes). Responsable : Théo (accueil : prévenir Martin).
   Le trajet envoyé part dans la base partagée (js/partage.js) ; il remplace, dans le bilan, un passager en hypothèse.
   Ce téléphone garde la dernière saisie (clé bilan-carbone.moi) pour pouvoir la modifier. */

(function () {
  const CLE = 'bilan-carbone.moi';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = (v, d = 1) => (+v || 0).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const t = (kg, d = 1) => nf(kg / 1000, d);
  const lireMoi = () => { try { return JSON.parse(localStorage.getItem(CLE)); } catch (e) { return null; } };
  const ecrireMoi = m => { try { localStorage.setItem(CLE, JSON.stringify(m)); } catch (e) {} };
  const MODES = [['avion', 'Avion'], ['train', 'Train'], ['autocar', 'Autocar']];
  const ETAPES = ['Qui es-tu ?', 'Ton itinéraire', 'Ton billet', 'Vérifie'];
  const nomCourt = g => g.nom.split(' (')[0];
  const ville = code => window.Trajets ? Trajets.villeAeroport(code) : code;

  // =====================================================================
  // Accueil
  // =====================================================================
  function jauge(st, r) {
    if (!window.Partage || Partage.etat === 'hors-ligne') return `<div class="note warn">Base en ligne injoignable : le bilan est calculé avec les hypothèses, et la collecte ne s'affiche pas.</div>`;
    if (Partage.etat !== 'ok') return `<p class="muted">Chargement de la collecte…</p>`;
    const cols = ['--c-kelley', '--c-hec'];
    return `
      <div class="jauge-tete"><span class="jauge-n num">${r.saisis}</span><span>trajet${r.saisis > 1 ? 's' : ''} saisi${r.saisis > 1 ? 's' : ''} sur <b class="num">${r.participants}</b></span></div>
      ${r.groupes.map((g, i) => {
        const p = g.participants ? Math.min(1, g.saisis / g.participants) : 0;
        return `<div class="jauge-ligne"><span>${esc(nomCourt(g))}</span>
          <div class="jauge-barre"><span style="width:${(p * 100).toFixed(1)}%;background:var(${cols[i] || '--accent'})"></span></div>
          <span class="num">${g.saisis} / ${g.participants}</span></div>`;
      }).join('')}`;
  }

  function view(ctx) {
    const st = ctx.st(), r = Calc.calculer(st), moi = lireMoi();
    return `
      <div class="head"><div><div class="page-title">Study Tours 2026-2027 · Kelley et HEC Montréal</div><h1 style="font-size:28px">Mon voyage</h1></div></div>
      <div class="mv-grille">
        <div class="card glass hero-card" style="--i:0">
          <div class="page-title">Bilan carbone des deux voyages · ${st.rf ? 'avec' : 'sans'} traînées</div>
          <div class="hero-value num" data-count="${t(r.total)}">${t(r.total)} <small>tCO2e</small></div>
          <div class="hero-sub"><span class="pill accent">${t(r.parEtudiant, 2)} t par étudiant</span></div>
          <a class="btn primary mv-cta" href="#/mon-trajet">${moi ? 'Modifier mon trajet' : 'Saisir mon trajet'}</a>
          ${moi ? `<p class="muted mv-deja">Trajet envoyé par ${esc(moi.prenom)} ${esc(moi.initiale)}. depuis ce téléphone.</p>` : ''}
        </div>
        <div class="card" style="--i:1">
          <h3>La collecte des trajets</h3>
          <div class="jauge mt">${jauge(st, r)}</div>
        </div>
      </div>`;
  }
  function bind() {}

  // =====================================================================
  // Formulaire « Saisir mon trajet »
  // =====================================================================
  let f = null; // brouillon en mémoire

  function depuisTrajet(tr) {
    const etapes = String(tr.route || '').split('-').filter(Boolean);
    return { etapes, modes: etapes.slice(1).map((_, i) => (tr.legModes || [])[i] || 'avion') };
  }
  function itinGroupe(st, id) {
    const g = st.groupes.find(x => x.id === id);
    const v = g && (g.vols.find(x => /hypoth/i.test(x.source || '') && x.route) || g.vols.find(x => x.route));
    return v ? depuisTrajet(v) : { etapes: ['', ''], modes: ['avion'] };
  }
  function brouillon(st) {
    const moi = lireMoi();
    if (moi && moi.trajet) return { etape: 1, groupe: moi.groupe, prenom: moi.prenom, initiale: moi.initiale, code: moi.code || '', ...depuisTrajet(moi.trajet), classe: moi.trajet.classe || 'eco', ar: moi.trajet.ar !== false, itinDe: moi.groupe };
    return { etape: 1, groupe: '', prenom: '', initiale: '', code: '', etapes: [], modes: [], classe: 'eco', ar: true, itinDe: '' };
  }
  const route = () => f.etapes.join('-');

  // Contrôle d'une étape avant de passer à la suivante : renvoie le message d'erreur, ou ''.
  function erreurEtape(st, n) {
    if (n === 1) {
      if (!f.groupe) return 'Choisis ton groupe.';
      if (!f.prenom.trim()) return 'Indique ton prénom.';
      if (!/^\p{L}$/u.test(f.initiale.trim())) return 'Indique l’initiale de ton nom (une lettre).';
      if (!f.code.trim()) return 'Indique le code du groupe (donné par le responsable du Study Tour).';
    }
    if (n === 2) {
      if (f.etapes.some(c => !/^[A-Z]{3}$/.test(c))) return 'Choisis un aéroport pour chaque étape.';
      const it = Calc.itineraire(route(), st);
      if (it.err) return it.err;
    }
    return '';
  }

  function progression() {
    return `<ol class="mt-prog">${ETAPES.map((e, i) => `<li class="${i + 1 < f.etape ? 'fait' : i + 1 === f.etape ? 'ici' : ''}"><span class="num">${i + 1}</span><b>${e}</b></li>`).join('')}</ol>`;
  }

  function etape1(st) {
    return `
      <h2>Qui es-tu ?</h2>
      <p class="muted">Ton prénom n'est jamais affiché sur le site : seul le pôle bilan carbone le voit.</p>
      <div class="mt-groupes">${st.groupes.map((g, i) => `
        <button type="button" class="mt-groupe${f.groupe === g.id ? ' on' : ''}" data-groupe="${esc(g.id)}" style="--c:var(${i ? '--c-hec' : '--c-kelley'})">${esc(nomCourt(g))}<small>${esc((g.nom.match(/\(([^)]+)\)/) || [])[1] || '')}</small></button>`).join('')}
      </div>
      <label class="mt-champ">Prénom<input class="field" data-f="prenom" value="${esc(f.prenom)}" autocomplete="given-name" maxlength="40"></label>
      <label class="mt-champ">Initiale du nom<input class="field mt-court" data-f="initiale" value="${esc(f.initiale)}" maxlength="1" autocapitalize="characters"></label>
      <label class="mt-champ">Code du groupe<input class="field" data-f="code" value="${esc(f.code)}" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="40"></label>`;
  }

  function etape2(st) {
    const it = f.etapes.every(c => /^[A-Z]{3}$/.test(c)) ? Calc.itineraire(route(), st) : null;
    return `
      <h2>Ton itinéraire</h2>
      <p class="muted">Prérempli avec le trajet prévu pour ton groupe. Change une étape si ton billet est différent (tape une ville ou un code d'aéroport).</p>
      <div class="mt-itin">${f.etapes.map((c, i) => `
        ${i ? `<div class="mt-mode seg" role="group" aria-label="Mode entre l'étape ${i} et l'étape ${i + 1}">${MODES.map(([k, l]) => `<button type="button" class="${(f.modes[i - 1] || 'avion') === k ? 'on' : ''}" data-mode="${i - 1}" data-m="${k}">${l}</button>`).join('')}</div>` : ''}
        <div class="mt-etape"><span class="mt-num num">${i + 1}</span>
          <input class="field" data-aero="${i}" value="${esc(c ? `${ville(c)} (${c})` : '')}" placeholder="${i ? 'Ville ou aéroport' : 'Ville de départ'}" autocomplete="off" aria-label="Étape ${i + 1}">
          ${f.etapes.length > 2 ? `<button type="button" class="icon-x" data-retirer="${i}" aria-label="Retirer cette étape"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>` : ''}
        </div>`).join('')}
      </div>
      <button type="button" class="btn sm mt" data-escale>+ Ajouter une escale</button>
      ${it && !it.err ? `<p class="muted mt">${it.legs.length} segment${it.legs.length > 1 ? 's' : ''} · ${nf(it.legs.reduce((s, l) => s + l.d, 0), 0)} km par trajet${it.legs.length > 1 ? ` · ${it.legs.length - 1} correspondance${it.legs.length > 2 ? 's' : ''}` : ''}</p>` : ''}`;
  }

  function etape3() {
    return `
      <h2>Ton billet</h2>
      <h3 class="mt2">Classe</h3>
      <div class="mt-choix">${Object.entries(window.FACTEURS.classes).map(([k, c]) => `<button type="button" class="mt-opt${f.classe === k ? ' on' : ''}" data-classe="${k}">${esc(c.label)}</button>`).join('')}</div>
      <h3 class="mt2">Aller-retour ?</h3>
      <div class="mt-choix"><button type="button" class="mt-opt${f.ar ? ' on' : ''}" data-ar="1">Oui, aller et retour</button><button type="button" class="mt-opt${f.ar ? '' : ' on'}" data-ar="">Aller simple</button></div>`;
  }

  function etape4(st) {
    const g = st.groupes.find(x => x.id === f.groupe);
    const legs = f.etapes.slice(1).map((c, i) => `${ville(f.etapes[i])} → ${ville(c)} <span class="faint">(${(MODES.find(m => m[0] === (f.modes[i] || 'avion')) || MODES[0])[1].toLowerCase()})</span>`);
    return `
      <h2>Vérifie avant d'envoyer</h2>
      <dl class="mt-resume">
        <dt>Groupe</dt><dd>${esc(g ? nomCourt(g) : f.groupe)}</dd>
        <dt>Toi</dt><dd>${esc(f.prenom.trim())} ${esc(f.initiale.trim().toUpperCase())}.</dd>
        <dt>Itinéraire</dt><dd>${legs.join('<br>')}</dd>
        <dt>Billet</dt><dd>${esc(window.FACTEURS.classes[f.classe]?.label || 'Économique')} · ${f.ar ? 'aller et retour' : 'aller simple'}</dd>
      </dl>
      <p class="muted">Si tu renvoies plus tard avec le même prénom et la même initiale, ta nouvelle saisie remplace celle-ci.</p>`;
  }

  function fin(ctx) {
    const st = ctx.st(), r = Calc.calculer(st);
    return `
      <div class="card mt-carte" style="--i:0">
        <h2>C'est enregistré, merci !</h2>
        <p>Ton trajet compte maintenant dans le bilan, à la place d'une hypothèse.</p>
        <div class="jauge mt2">${jauge(st, r)}</div>
        <a class="btn primary mt2 mv-cta" href="#/">Retour à l'accueil</a>
      </div>`;
  }

  function form(ctx) {
    const st = ctx.st();
    if (!f) f = brouillon(st);
    if (f.etape === 5) return fin(ctx);
    const corps = [etape1, etape2, etape3, etape4][f.etape - 1](st);
    return `
      <div class="head"><div><div class="page-title">Mon voyage</div><h1 style="font-size:28px">Saisir mon trajet</h1></div></div>
      ${progression()}
      <div class="card mt-carte" style="--i:0">
        ${corps}
        ${f.erreur ? `<p class="down mt-err" role="alert">${esc(f.erreur)}</p>` : ''}
        <div class="mt-nav">
          ${f.etape > 1 ? `<button type="button" class="btn" data-retour>Retour</button>` : `<a class="btn" href="#/">Annuler</a>`}
          ${f.etape < 4 ? `<button type="button" class="btn primary" data-suivant>Suivant</button>`
            : `<button type="button" class="btn primary" data-envoyer ${f.envoi ? 'disabled' : ''}>${f.envoi ? 'Envoi…' : 'Envoyer mon trajet'}</button>`}
        </div>
      </div>`;
  }

  function bindForm(view, ctx) {
    const st = () => ctx.st();
    const redessiner = () => ctx.render(true);

    view.addEventListener('input', e => {
      const el = e.target;
      if (el.dataset.f) { f[el.dataset.f] = el.value; return; }
      if (el.dataset.aero != null) {
        const i = +el.dataset.aero;
        Trajets.suggerer(el, st(), a => { f.etapes[i] = a.code; f.erreur = ''; redessiner(); });
        // Un code d'aéroport connu tapé en entier est accepté sans passer par le menu ; sinon l'étape attend un choix.
        const v = el.value.trim().toUpperCase(), code = (v.match(/^([A-Z]{3})$/) || v.match(/\(([A-Z]{3})\)$/) || [])[1];
        f.etapes[i] = code && Calc.aeroport(code, st()) ? code : '';
      }
    });
    view.addEventListener('keydown', e => { if (window.Trajets) Trajets.clavierMenu(e); });

    view.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const s = st();
      if (b.dataset.groupe) {
        f.groupe = b.dataset.groupe;
        if (f.itinDe !== f.groupe) { Object.assign(f, itinGroupe(s, f.groupe)); f.itinDe = f.groupe; }
        f.erreur = ''; redessiner();
      } else if (b.dataset.mode != null) { f.modes[+b.dataset.mode] = b.dataset.m; redessiner(); }
      else if (b.dataset.retirer != null) { const i = +b.dataset.retirer; f.etapes.splice(i, 1); f.modes.splice(Math.max(0, i - 1), 1); redessiner(); }
      else if ('escale' in b.dataset) { f.etapes.splice(f.etapes.length - 1, 0, ''); f.modes.splice(f.modes.length - 1, 0, 'avion'); redessiner(); setTimeout(() => { const v = [...document.querySelectorAll('#view [data-aero]')].find(x => !x.value); if (v) v.focus(); }, 0); }
      else if (b.dataset.classe) { f.classe = b.dataset.classe; redessiner(); }
      else if (b.dataset.ar != null) { f.ar = !!b.dataset.ar; redessiner(); }
      else if ('retour' in b.dataset) { f.erreur = ''; f.etape--; redessiner(); window.scrollTo(0, 0); }
      else if ('suivant' in b.dataset) {
        const err = erreurEtape(s, f.etape);
        f.erreur = err; if (!err) { f.etape++; window.scrollTo(0, 0); }
        redessiner();
      } else if ('envoyer' in b.dataset) envoyer(ctx);
    });
  }

  function envoyer(ctx) {
    const s = ctx.st();
    const err = erreurEtape(s, 1) || erreurEtape(s, 2);
    if (err) { f.erreur = err; return ctx.render(true); }
    const trajet = { route: route(), legModes: f.modes.slice(0, f.etapes.length - 1), classe: f.classe, ar: f.ar };
    const prenom = f.prenom.trim(), initiale = f.initiale.trim().toUpperCase(), code = f.code.trim();
    f.envoi = true; f.erreur = ''; ctx.render(true);
    Partage.enregistrer(f.groupe, prenom, initiale, code, trajet)
      .then(() => { ecrireMoi({ groupe: f.groupe, prenom, initiale, code, trajet }); return Partage.charger(); })
      .then(() => { f.envoi = false; f.etape = 5; ctx.render(true); window.scrollTo(0, 0); })
      .catch(e => {
        f.envoi = false;
        f.erreur = /Code de groupe/.test(e.message) ? 'Code du groupe incorrect : vérifie-le auprès du responsable du Study Tour.'
          : /Trajet non reconnu/.test(e.message) ? 'Itinéraire refusé par la base : reviens à l’étape 2.'
          : 'Pas de connexion avec la base : réessaie dans un moment.';
        ctx.render(true);
      });
  }

  // Quitter le formulaire (autre onglet) : le brouillon repart de zéro la prochaine fois, sauf pendant un envoi.
  const quitter = () => { if (f && !f.envoi) f = null; };

  window.Accueil = { view, bind, form, bindForm, quitter };
})();
