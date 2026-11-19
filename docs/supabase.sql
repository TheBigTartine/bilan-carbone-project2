-- Base partagée des trajets saisis par les étudiants (phase 4 de l'audit).
-- À coller une fois dans Supabase → SQL Editor → Run. On peut le relancer sans rien casser.
--
-- Principe de sécurité : la clé publique du site est lisible par tout le monde (site statique).
-- Le public n'a donc AUCUN droit direct sur les tables. Il passe par deux fonctions :
--   enregistrer_saisie(...) : vérifie le code du groupe, puis ajoute ou remplace la saisie de l'étudiant ;
--   lire_saisies()          : rend le groupe et le trajet, jamais le prénom ni l'initiale.
-- Seul un compte du pôle (email listé dans la table pole) lit les prénoms et peut masquer une saisie.
--
-- Les vrais codes de groupe ne sont PAS écrits ici (le dépôt est public) : les saisir dans
-- Table Editor → codes_groupes, ou avec la requête en bas de ce fichier.

-- 1. Tables ----------------------------------------------------------------

create table if not exists public.saisies (
  id uuid primary key default gen_random_uuid(),
  groupe text not null check (groupe in ('kelley', 'hec')),
  prenom text not null check (char_length(prenom) between 1 and 40),
  initiale text not null check (char_length(initiale) between 1 and 3),
  trajet jsonb not null,
  masquee boolean not null default false,
  cree timestamptz not null default now()
);

-- Une seule saisie par étudiant et par groupe, sans tenir compte des majuscules.
create unique index if not exists saisies_un_par_etudiant
  on public.saisies (groupe, lower(prenom), lower(initiale));

create table if not exists public.codes_groupes (
  groupe text primary key check (groupe in ('kelley', 'hec')),
  code text not null
);

create table if not exists public.pole (
  email text primary key
);

-- 2. Règles d'accès ---------------------------------------------------------

alter table public.saisies enable row level security;
alter table public.codes_groupes enable row level security;
alter table public.pole enable row level security;

revoke all on public.saisies, public.codes_groupes, public.pole from anon, authenticated;

-- Vrai si le compte connecté est un membre du pôle.
create or replace function public.est_pole() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pole where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

grant select on public.saisies to authenticated;
grant update (masquee) on public.saisies to authenticated;

drop policy if exists pole_lit on public.saisies;
create policy pole_lit on public.saisies for select to authenticated using (public.est_pole());

drop policy if exists pole_masque on public.saisies;
create policy pole_masque on public.saisies for update to authenticated
  using (public.est_pole()) with check (public.est_pole());

-- 3. Fonctions du public ----------------------------------------------------

create or replace function public.enregistrer_saisie(
  p_groupe text, p_prenom text, p_initiale text, p_code text, p_trajet jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.codes_groupes
                 where groupe = p_groupe and lower(code) = lower(trim(p_code))) then
    raise exception 'Code de groupe incorrect';
  end if;
  if jsonb_typeof(p_trajet) <> 'object'
     or length(p_trajet::text) > 2000
     or coalesce(p_trajet ->> 'route', '') !~ '^[A-Z]{3}(-[A-Z]{3}){1,5}$'
     or coalesce(p_trajet ->> 'classe', 'eco') not in ('eco', 'premium', 'affaires', 'premiere') then
    raise exception 'Trajet non reconnu';
  end if;
  insert into public.saisies (groupe, prenom, initiale, trajet)
  values (p_groupe, trim(p_prenom), upper(trim(p_initiale)), p_trajet)
  on conflict (groupe, lower(prenom), lower(initiale))
  do update set trajet = excluded.trajet, cree = now();  -- une saisie masquée par le pôle le reste
end;
$$;

create or replace function public.lire_saisies()
returns table (groupe text, trajet jsonb)
language sql stable security definer set search_path = public as $$
  select s.groupe, s.trajet from public.saisies s where not s.masquee order by s.cree;
$$;

revoke execute on function public.enregistrer_saisie(text, text, text, text, jsonb) from public;
revoke execute on function public.lire_saisies() from public;
revoke execute on function public.est_pole() from public;
grant execute on function public.enregistrer_saisie(text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.lire_saisies() to anon, authenticated;
grant execute on function public.est_pole() to authenticated;

-- 4. À faire à la main, avec les vraies valeurs (ne pas les commiter) ------
-- insert into public.codes_groupes (groupe, code) values ('kelley', '…'), ('hec', '…')
--   on conflict (groupe) do update set code = excluded.code;
-- insert into public.pole (email) values ('…') on conflict do nothing;
