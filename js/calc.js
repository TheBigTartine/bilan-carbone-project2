/* Moteur de calcul du bilan carbone. Aucune dépendance : lisible et vérifiable par tout le pôle.
   Unité interne : kgCO2e. Affichage : tCO2e. */
(function () {
  const F = window.FACTEURS;
  const R = 6371; // rayon terrestre moyen (km)
  const rad = x => x * Math.PI / 180;

  function aeroport(code, st) {
    const c = String(code || '').trim().toUpperCase();
    const p = (st.aeroportsPerso || {})[c] || window.AEROPORTS[c];
    return p ? { code: c, nom: p[0], lat: +p[1], lon: +p[2], pays: p[3] || '' } : null;
  }

  // Distance orthodromique (formule de haversine), en km.
  function orthodromie(a, b) {
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  const tranche = d => F.avion.find(t => d < t.max);

  function segment(a, b) {
    const gc = orthodromie(a, b);
    const d = gc + F.correctionKm;
    return { from: a, to: b, gc, d, tranche: tranche(d) };
  }

  // « MRS-CDG-ATL-IND » → segments. Chaque segment est compté comme un vol (décollage + atterrissage).
  function itineraire(route, st) {
    const codes = String(route || '').toUpperCase().split(/[^A-Z]+/).filter(Boolean);
    if (codes.length < 2) return { err: 'Indiquer au moins 2 codes aéroport (ex. MRS-YUL)' };
    const pts = [];
    for (const c of codes) {
      const a = aeroport(c, st);
      if (!a) return { err: `Code inconnu : ${c} (l'ajouter plus bas)` };
      pts.push(a);
    }
    const legs = [];
    for (let i = 0; i < pts.length - 1; i++) legs.push(segment(pts[i], pts[i + 1]));
    return { codes, pts, legs, direct: segment(pts[0], pts[pts.length - 1]) };
  }

  const fAvion = (leg, rf) => rf ? leg.tranche.avec : leg.tranche.sans;

  // Un vol (itinéraire) d'un groupe. opts : rf, direct, trainFr, eco.
  function calcVol(v, st, opts) {
    const it = itineraire(v.route, st);
    if (it.err) return { err: it.err, air: 0, train: 0, corr: 0, km: 0, legs: [] };
    const trajets = v.ar ? 2 : 1;
    const pax = Math.max(0, +v.pax || 0);
    const coef = opts.eco ? 1 : (F.classes[v.classe] || F.classes.eco).coef;
    let legs = it.legs;
    if (opts.direct && legs.length > 1) legs = [it.direct];
    let air = 0, train = 0, km = 0;
    for (const leg of legs) {
      const fr = leg.from.pays === 'FR' && leg.to.pays === 'FR';
      if (opts.trainFr && fr && legs.length > 1) {
        // Pré-acheminement en TGV : distance ferroviaire ≈ orthodromie × 1,2 (hypothèse).
        train += leg.gc * 1.2 * F.terrestre.tgv.f * pax * trajets;
      } else {
        air += leg.d * fAvion(leg, opts.rf) * coef * pax * trajets;
        km += leg.d * trajets;
      }
    }
    // Poids des correspondances : écart avec un vol direct entre le premier et le dernier aéroport.
    let corr = 0;
    if (!opts.direct && !opts.trainFr && it.legs.length > 1) {
      const directKg = it.direct.d * fAvion(it.direct, opts.rf) * coef * pax * trajets;
      corr = Math.max(0, air - directKg);
    }
    return { air, train, corr, km, legs: it.legs, nCorr: it.legs.length - 1, trajets, pax };
  }

  function calcTerrestre(t, opts) {
    let m = F.terrestre[t.mode] || F.terrestre.autocar;
    if (opts.carToBus && m.parVehicule && t.mode !== 'voiture_elec') m = F.terrestre.autocar;
    const trajets = t.ar ? 2 : 1;
    const pax = Math.max(0, +t.pax || 0);
    const km = Math.max(0, +t.km || 0);
    if (m.parVehicule) {
      const vehicules = Math.ceil(pax / Math.max(1, +t.occ || 1));
      return km * trajets * vehicules * m.f;
    }
    return km * trajets * pax * m.f;
  }

  // Voiture de location (onglet Trajets). Base de véhicules : js/vehicules.js.
  // Les polluants (NOx, PM, CO, en g) sont indicatifs et ne s'ajoutent jamais aux kgCO2e.
  function calcLocation(l, g, opts = {}) {
    const V = window.VEHICULES;
    const z = { kg: 0, qty: 0, unite: 'L', nox: 0, pm: 0, co: 0, personnes: 0, parPers: 0, km: 0 };
    const m = V && V.modeles.find(x => x.id === l.modele);
    if (!m) return z;
    const trajets = l.ar ? 2 : 1;
    const nv = Math.max(0, +l.nv || 0), pers = Math.max(0, +l.pers || 0), km = Math.max(0, +l.km || 0);
    const personnes = nv * pers, kmVeh = km * trajets * nv;
    if (opts.carToBus && m.energie !== 'elec') {
      // Scénario « navette » : les mêmes personnes font le trajet en autocar.
      const kg = km * trajets * personnes * F.terrestre.autocar.f;
      return { ...z, kg, personnes, parPers: personnes ? kg / personnes : 0, km: kmVeh, bus: true };
    }
    const pays = g && (g.pays || (g.id === 'hec' ? 'CA' : 'US'));
    const e = V.energies[m.energie === 'elec' ? (pays === 'CA' ? 'elec_qc' : 'elec_us') : m.energie];
    const qty = kmVeh * m.conso / 100;
    const kg = qty * e.f + kmVeh * V.fabricationKm;
    const n = V.normes[m.norme] || {};
    return { kg, qty, unite: e.unite, energie: e, modele: m, km: kmVeh, personnes, parPers: personnes ? kg / personnes : 0,
      nox: kmVeh * (n.nox || 0) / 1000, pm: kmVeh * (n.pm || 0) / 1000, co: kmVeh * (n.co || 0) / 1000 };
  }

  function calculer(st, extra = {}) {
    const opts = { rf: st.rf, ...extra };
    const res = { groupes: [], total: 0, air: 0, corr: 0, terrestre: 0, train: 0, participants: 0, erreurs: [], hypotheses: 0 };
    for (const g of st.groupes) {
      const r = { id: g.id, nom: g.nom, participants: +g.participants || 0, air: 0, corr: 0, terrestre: 0, train: 0, vols: [], terr: [] };
      for (const v of g.vols) {
        const x = calcVol(v, st, opts);
        if (x.err) res.erreurs.push(`${g.nom} — ${v.label || 'vol'} : ${x.err}`);
        r.vols.push(x); r.air += x.air; r.train += x.train; r.corr += x.corr;
        if (/hypoth/i.test(v.source || '')) res.hypotheses++;
      }
      for (const t of g.terrestres) {
        const kg = calcTerrestre(t, opts);
        r.terr.push(kg); r.terrestre += kg;
        if (/hypoth/i.test(t.source || '')) res.hypotheses++;
      }
      r.loc = []; r.location = 0;
      for (const l of g.locations || []) {
        const x = calcLocation(l, g, opts);
        r.loc.push(x); r.location += x.kg; r.terrestre += x.kg;
        if (/hypoth/i.test(l.source || '')) res.hypotheses++;
      }
      r.terrestre += r.train; // le train du scénario « pré-acheminement » est un déplacement terrestre
      r.total = r.air + r.terrestre;
      r.parEtudiant = r.participants ? r.total / r.participants : 0;
      res.groupes.push(r);
      res.total += r.total; res.air += r.air; res.corr += r.corr; res.terrestre += r.terrestre; res.train += r.train;
      res.participants += r.participants;
    }
    res.parEtudiant = res.participants ? res.total / res.participants : 0;
    res.partAir = res.total ? res.air / res.total : 0;
    return res;
  }

  window.Calc = { aeroport, orthodromie, itineraire, calcVol, calcTerrestre, calcLocation, calculer };
})();
