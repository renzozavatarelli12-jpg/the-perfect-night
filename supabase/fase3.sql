-- The Perfect Night · Fase 3: Boliches 2.0 (fotos y comentarios), Rankings y temporadas FLAMA, Previa Games (¿Quién es quién?).
-- Se corre UNA vez, después de planes.sql. Solo SUMA tablas y funciones: no cambia ni borra nada de lo que ya hay
-- (el registro viejo de estadísticas, "log" en tpn_rows, queda intacto; acá solo se COPIA a la tabla nueva).
-- Va en una transacción: si algo falla, no queda nada aplicado. Vuelta atrás: fase3-volver-atras.sql.
-- Igual que antes: tablas con RLS activado SIN políticas y sin permisos para el navegador. Todo pasa por funciones que
-- sacan la persona, su perfil y su rol de la sesión (tpn_gctx), nunca de lo que mande el navegador.

begin;

-- ======================= BOLICHES 2.0 =======================
-- Los datos del boliche (nombre, dirección, descripción, entradas...) siguen en su fila "boliches" de tpn_rows
-- (así no se tocan votos, planes ni la sincronización). Fotos y comentarios van aparte porque necesitan dueño y permisos.

create table public.tpn_bphotos (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tpn_groups (id) on delete cascade,
  boliche_id text not null,
  data text not null check (data ~ '^data:image/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$' and length(data) <= 350000), -- ~250 KB
  member_id text not null,
  created_at timestamptz not null default now()
);
create index on public.tpn_bphotos (group_id, boliche_id, created_at);

create table public.tpn_bcomments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tpn_groups (id) on delete cascade,
  boliche_id text not null,
  member_id text not null,
  body text not null check (length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index on public.tpn_bcomments (group_id, boliche_id, created_at);

-- ======================= RANKINGS Y TEMPORADAS =======================
-- Cada cosa que suma a un ranking es un registro propio, con fecha y autor. Corregir = anular con motivo (no se borra).
create table public.tpn_stats (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tpn_groups (id) on delete cascade,
  member_id text not null,                                        -- de quién es el registro
  kind text not null check (kind in ('cubatas', 'besos', 'salidas', 'boliches')),
  day date not null,
  n int not null check (n between 1 and 100),
  boliche_id text,                                                -- visita: a qué boliche fue
  plan_id uuid references public.tpn_plans (id) on delete set null,
  by_member text not null,                                        -- quién lo cargó (lo pone el servidor)
  note text not null default '' check (length(note) <= 200),
  legacy_id text,                                                 -- copiado del registro viejo (id de la fila "log")
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by text,
  void_reason text not null default '' check (length(void_reason) <= 200),
  check (kind <> 'boliches' or legacy_id is not null or boliche_id is not null),
  check (kind not in ('salidas', 'boliches') or legacy_id is not null or n = 1)
);
create index on public.tpn_stats (group_id, day);
create unique index tpn_stats_legacy on public.tpn_stats (group_id, legacy_id) where legacy_id is not null;
-- Una salida por persona y noche; una visita por persona, noche y boliche (los registros viejos no entran en la regla).
create unique index tpn_stats_salida on public.tpn_stats (group_id, member_id, day) where kind = 'salidas' and voided_at is null and legacy_id is null;
create unique index tpn_stats_visita on public.tpn_stats (group_id, member_id, day, boliche_id) where kind = 'boliches' and voided_at is null and legacy_id is null;

create table public.tpn_seasons (
  group_id uuid not null references public.tpn_groups (id) on delete cascade,
  year int not null check (year between 2000 and 2100),
  closed boolean not null default false,
  summary jsonb,                                                  -- foto fija al cerrar (totales y nombres de ese momento)
  logro text not null default '' check (length(logro) <= 300),    -- lo escribe un admin
  anecdote text not null default '' check (length(anecdote) <= 1000),
  closed_at timestamptz,
  closed_by text,
  history jsonb not null default '[]',                            -- cierres y reaperturas con motivo
  primary key (group_id, year)
);

-- ======================= PREVIA GAMES =======================
create table public.tpn_games (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tpn_groups (id) on delete cascade,
  kind text not null check (kind in ('quien')),                  -- para sumar otro juego: agregarlo acá y en la app
  status text not null default 'play' check (status in ('play', 'done', 'canc')),
  players text[] not null,                                        -- perfiles del grupo, en orden de turno
  by_member text not null,
  req uuid not null unique,                                       -- lo manda la app: tocar dos veces "Empezar" no crea dos partidas
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create index on public.tpn_games (group_id, created_at desc);

-- Secreto: a quién imita cada uno. Ninguna función devuelve esta tabla entera; solo tpn_game_reveal, de a uno.
create table public.tpn_game_secrets (
  game_id uuid not null references public.tpn_games (id) on delete cascade,
  member_id text not null,
  target text not null,
  seen boolean not null default false,
  primary key (game_id, member_id),
  unique (game_id, target),
  check (member_id <> target)
);

create table public.tpn_game_rounds (
  game_id uuid not null references public.tpn_games (id) on delete cascade,
  imitator text not null,
  target text not null,                                           -- se copia recién cuando se juega la ronda (ya es público)
  guesses jsonb not null,                                         -- { perfil que adivina: perfil que dijo }
  created_at timestamptz not null default now(),
  primary key (game_id, imitator)                                 -- una ronda por imitador: no se duplica
);

alter table public.tpn_bphotos enable row level security;
alter table public.tpn_bcomments enable row level security;
alter table public.tpn_stats enable row level security;
alter table public.tpn_seasons enable row level security;
alter table public.tpn_games enable row level security;
alter table public.tpn_game_secrets enable row level security;
alter table public.tpn_game_rounds enable row level security;
revoke all on public.tpn_bphotos, public.tpn_bcomments, public.tpn_stats, public.tpn_seasons, public.tpn_games, public.tpn_game_secrets, public.tpn_game_rounds from anon, authenticated;

-- ---------- ayudas internas ----------
create function public.tpn_member_ok(p_group uuid, p_member text, p_guests boolean) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tpn_rows where group_id = p_group and col = 'members' and id = p_member and not deleted
    and (p_guests or coalesce((data->>'guest')::boolean, false) = false))
$$;
create function public.tpn_boliche_ok(p_group uuid, p_boliche text) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tpn_rows where group_id = p_group and col = 'boliches' and id = p_boliche and not deleted)
$$;
create function public.tpn_mname(p_group uuid, p_member text) returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select data->>'name' from public.tpn_rows where group_id = p_group and col = 'members' and id = p_member), '¿?')
$$;

-- ======================= BOLICHES: funciones =======================
create function public.tpn_boliche_view(p_token text, p_group uuid, p_boliche text) returns json language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  select * into c from public.tpn_gctx(p_token, p_group);
  return json_build_object('me', c.mid, 'role', c.rol,
    'photos', coalesce((select json_agg(json_build_object('id', id, 'src', data, 'm', member_id, 'at', created_at) order by created_at)
      from public.tpn_bphotos where group_id = p_group and boliche_id = p_boliche), '[]'::json),
    'comments', coalesce((select json_agg(x order by x.at) from (select id, member_id as m, body, created_at as at from public.tpn_bcomments
      where group_id = p_group and boliche_id = p_boliche order by created_at desc limit 200) x), '[]'::json));
end $$;

create function public.tpn_bphoto_add(p_token text, p_group uuid, p_boliche text, p_data text) returns json language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  select * into c from public.tpn_gctx(p_token, p_group);
  if not public.tpn_boliche_ok(p_group, p_boliche) or p_data is null or length(p_data) > 350000 or p_data !~ '^data:image/(jpeg|webp|png);base64,[A-Za-z0-9+/=]+$' then raise exception 'tpn_invalid'; end if;
  perform pg_advisory_xact_lock(hashtext('bphoto:' || p_group));
  if (select count(*) from public.tpn_bphotos where group_id = p_group and boliche_id = p_boliche) >= 6
     or (select count(*) from public.tpn_bphotos where group_id = p_group) >= 150 then raise exception 'tpn_full'; end if;
  insert into public.tpn_bphotos (group_id, boliche_id, data, member_id) values (p_group, p_boliche, p_data, c.mid);
  perform public.tpn_notify(p_group);
  return json_build_object('ok', true);
end $$;

create function public.tpn_bphoto_delete(p_token text, p_photo uuid) returns json language plpgsql security definer set search_path = '' as $$
declare c record; ph public.tpn_bphotos;
begin
  select * into ph from public.tpn_bphotos where id = p_photo;
  if ph.id is null then raise exception 'tpn_forbidden'; end if;
  select * into c from public.tpn_gctx(p_token, ph.group_id);
  if ph.member_id <> c.mid and c.rol <> 'admin' then raise exception 'tpn_forbidden'; end if;
  delete from public.tpn_bphotos where id = p_photo;
  perform public.tpn_notify(ph.group_id);
  return json_build_object('ok', true);
end $$;

create function public.tpn_bcomment_add(p_token text, p_group uuid, p_boliche text, p_body text) returns json language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  select * into c from public.tpn_gctx(p_token, p_group);
  if not public.tpn_boliche_ok(p_group, p_boliche) or length(btrim(coalesce(p_body, ''))) not between 1 and 500 then raise exception 'tpn_invalid'; end if;
  if (select count(*) from public.tpn_bcomments where group_id = p_group) >= 5000 then raise exception 'tpn_full'; end if;
  insert into public.tpn_bcomments (group_id, boliche_id, member_id, body) values (p_group, p_boliche, c.mid, btrim(p_body));
  perform public.tpn_notify(p_group);
  return json_build_object('ok', true);
end $$;

-- Borrar un comentario: quien lo escribió o un admin (igual que en los planes).
create function public.tpn_bcomment_delete(p_token text, p_comment uuid) returns json language plpgsql security definer set search_path = '' as $$
declare c record; cm public.tpn_bcomments;
begin
  select * into cm from public.tpn_bcomments where id = p_comment;
  if cm.id is null then raise exception 'tpn_forbidden'; end if;
  select * into c from public.tpn_gctx(p_token, cm.group_id);
  if cm.member_id <> c.mid and c.rol <> 'admin' then raise exception 'tpn_forbidden'; end if;
  delete from public.tpn_bcomments where id = p_comment;
  perform public.tpn_notify(cm.group_id);
  return json_build_object('ok', true);
end $$;

-- ======================= RANKINGS: funciones =======================
-- Totales de un año (o de siempre si p_year es null), por integrante del grupo (sin invitados). Solo registros sin anular.
create function public.tpn_totals(p_group uuid, p_year int) returns json language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(json_build_object('m', r.id, 'name', r.data->>'name',
      'cubatas', coalesce(t.cubatas, 0), 'besos', coalesce(t.besos, 0), 'salidas', coalesce(t.salidas, 0), 'boliches', coalesce(t.boliches, 0))
      order by r.created), '[]'::json)
  from public.tpn_rows r
  left join (
    select member_id,
      sum(n) filter (where kind = 'cubatas') cubatas, sum(n) filter (where kind = 'besos') besos,
      sum(n) filter (where kind = 'salidas') salidas, sum(n) filter (where kind = 'boliches') boliches
    from public.tpn_stats
    where group_id = p_group and voided_at is null and (p_year is null or extract(year from day) = p_year)
    group by member_id) t on t.member_id = r.id
  where r.group_id = p_group and r.col = 'members' and not r.deleted and coalesce((r.data->>'guest')::boolean, false) = false
$$;

create function public.tpn_closed(p_group uuid, p_day date) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.tpn_seasons where group_id = p_group and year = extract(year from p_day) and closed)
$$;

-- Todo lo de la pantalla de Rankings. p_year null = de siempre.
create function public.tpn_stats_view(p_token text, p_group uuid, p_year int) returns json language plpgsql security definer set search_path = '' as $$
declare c record; s public.tpn_seasons;
begin
  select * into c from public.tpn_gctx(p_token, p_group);
  if p_year is not null then select * into s from public.tpn_seasons where group_id = p_group and year = p_year; end if;
  return json_build_object('me', c.mid, 'role', c.rol, 'year', p_year,
    'totals', case when s.closed then (s.summary->'totals')::json else public.tpn_totals(p_group, p_year) end,
    'season', case when p_year is null then null else json_build_object('closed', coalesce(s.closed, false), 'logro', coalesce(s.logro, ''),
      'anecdote', coalesce(s.anecdote, ''), 'closed_at', s.closed_at, 'closed_by', s.closed_by, 'history', coalesce(s.history, '[]')) end,
    'years', (select coalesce(json_agg(y order by y desc), '[]'::json) from (
      select distinct extract(year from day)::int y from public.tpn_stats where group_id = p_group
      union select year from public.tpn_seasons where group_id = p_group
      union select extract(year from current_date)::int) yy),
    -- últimos registros: los míos (para corregir) y, si soy admin, los de todos
    'recent', coalesce((select json_agg(x order by x.at desc) from (
      select id, member_id as m, kind as k, day as d, n, boliche_id as b, note, by_member as by, legacy_id is not null as old, created_at as at,
             public.tpn_closed(p_group, day) as locked
        from public.tpn_stats where group_id = p_group and voided_at is null and (c.rol = 'admin' or member_id = c.mid)
        order by created_at desc limit 60) x), '[]'::json));
end $$;

-- Cargar algo. Para uno mismo, cualquiera. Para otro, solo un admin y con motivo.
-- salidas y boliches: de a 1 (una salida por noche; una visita por noche y boliche). cubatas y besos: 1 a 20 por carga.
create function public.tpn_stat_add(p_token text, p_group uuid, p_kind text, p_day date, p_n int, p_boliche text, p_member text, p_note text) returns json language plpgsql security definer set search_path = '' as $$
declare c record; who text;
begin
  select * into c from public.tpn_gctx(p_token, p_group);
  who := coalesce(nullif(p_member, ''), c.mid);
  if who <> c.mid and (c.rol <> 'admin' or length(btrim(coalesce(p_note, ''))) = 0) then raise exception 'tpn_forbidden'; end if;
  if not public.tpn_member_ok(p_group, who, false) or p_kind is null or p_kind not in ('cubatas', 'besos', 'salidas', 'boliches')
     or p_day is null or p_day not between date '2000-01-01' and current_date + 1 or length(coalesce(p_note, '')) > 200
     or (p_kind in ('cubatas', 'besos') and coalesce(p_n, 0) not between 1 and 20)
     or (p_kind in ('salidas', 'boliches') and coalesce(p_n, 1) <> 1)
     or (p_kind = 'boliches' and not public.tpn_boliche_ok(p_group, coalesce(p_boliche, '')))
     or (p_kind <> 'boliches' and p_boliche is not null) then raise exception 'tpn_invalid'; end if;
  if public.tpn_closed(p_group, p_day) then raise exception 'tpn_closed'; end if;
  begin
    insert into public.tpn_stats (group_id, member_id, kind, day, n, boliche_id, by_member, note)
      values (p_group, who, p_kind, p_day, coalesce(p_n, 1), p_boliche, c.mid, btrim(coalesce(p_note, '')));
  exception when unique_violation then raise exception 'tpn_dup';
  end;
  perform public.tpn_notify(p_group);
  return json_build_object('ok', true);
end $$;

-- "Salí": anota la salida de esa noche (si no estaba) y, si se elige, la visita al boliche. Todo junto o nada.
-- Desde un plan (p_plan): usa el día y el boliche del plan. Siempre es para uno mismo: confirmar "Voy" no cuenta, hay que tocar "Fui".
create function public.tpn_night(p_token text, p_group uuid, p_day date, p_boliche text, p_plan uuid) returns json language plpgsql security definer set search_path = '' as $$
declare c record; d date := p_day; b text := nullif(p_boliche, ''); added int := 0; k int;
begin
  select * into c from public.tpn_gctx(p_token, p_group);
  if p_plan is not null then
    select p.day, coalesce(b, p.boliche_id) into d, b from public.tpn_plans p where p.id = p_plan and p.group_id = p_group;
    if not found then raise exception 'tpn_forbidden'; end if;
    if b is not null and not public.tpn_boliche_ok(p_group, b) then b := null; end if; -- el boliche del plan ya no está en la lista
  end if;
  if d is null or d not between date '2000-01-01' and current_date + 1 or (b is not null and not public.tpn_boliche_ok(p_group, b))
     or not public.tpn_member_ok(p_group, c.mid, false) then raise exception 'tpn_invalid'; end if;
  if public.tpn_closed(p_group, d) then raise exception 'tpn_closed'; end if;
  insert into public.tpn_stats (group_id, member_id, kind, day, n, plan_id, by_member)
    values (p_group, c.mid, 'salidas', d, 1, p_plan, c.mid) on conflict do nothing;
  get diagnostics k = row_count; added := added + k;
  if b is not null then
    insert into public.tpn_stats (group_id, member_id, kind, day, n, boliche_id, plan_id, by_member)
      values (p_group, c.mid, 'boliches', d, 1, b, p_plan, c.mid) on conflict do nothing;
    get diagnostics k = row_count; added := added + k;
  end if;
  if added = 0 then raise exception 'tpn_dup'; end if;
  perform public.tpn_notify(p_group);
  return json_build_object('ok', true, 'added', added);
end $$;

-- Corregir = anular (queda guardado quién, cuándo y por qué). Lo mío lo anulo yo; lo de otro, solo un admin y con motivo.
create function public.tpn_stat_void(p_token text, p_stat uuid, p_reason text) returns json language plpgsql security definer set search_path = '' as $$
declare c record; s public.tpn_stats;
begin
  select * into s from public.tpn_stats where id = p_stat for update;
  if s.id is null then raise exception 'tpn_forbidden'; end if;
  select * into c from public.tpn_gctx(p_token, s.group_id);
  if s.member_id <> c.mid and (c.rol <> 'admin' or length(btrim(coalesce(p_reason, ''))) = 0) then raise exception 'tpn_forbidden'; end if;
  if length(coalesce(p_reason, '')) > 200 then raise exception 'tpn_invalid'; end if;
  if s.voided_at is not null then return json_build_object('ok', true); end if; -- ya estaba anulado (doble toque)
  if public.tpn_closed(s.group_id, s.day) then raise exception 'tpn_closed'; end if;
  update public.tpn_stats set voided_at = now(), voided_by = c.mid, void_reason = btrim(coalesce(p_reason, '')) where id = p_stat;
  perform public.tpn_notify(s.group_id);
  return json_build_object('ok', true);
end $$;

-- Logro más difícil y anécdota del año: los escribe un admin mientras la temporada está abierta.
create function public.tpn_season_save(p_token text, p_group uuid, p_year int, p_logro text, p_anecdote text) returns json language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  select * into c from public.tpn_gctx(p_token, p_group);
  if c.rol <> 'admin' then raise exception 'tpn_forbidden'; end if;
  if p_year not between 2000 and extract(year from current_date)::int or length(coalesce(p_logro, '')) > 300 or length(coalesce(p_anecdote, '')) > 1000 then raise exception 'tpn_invalid'; end if;
  insert into public.tpn_seasons (group_id, year, logro, anecdote) values (p_group, p_year, coalesce(p_logro, ''), coalesce(p_anecdote, ''))
    on conflict (group_id, year) do update set logro = excluded.logro, anecdote = excluded.anecdote where not public.tpn_seasons.closed;
  if (select closed from public.tpn_seasons where group_id = p_group and year = p_year) then raise exception 'tpn_closed'; end if;
  perform public.tpn_notify(p_group);
  return json_build_object('ok', true);
end $$;

-- Cerrar: congela los totales y los nombres de ese momento. Después no se puede cargar ni anular nada de ese año.
-- Reabrir (p_open true): solo un admin y con motivo; queda en el historial de la temporada.
create function public.tpn_season_close(p_token text, p_group uuid, p_year int, p_open boolean, p_reason text) returns json language plpgsql security definer set search_path = '' as $$
declare c record; s public.tpn_seasons;
begin
  select * into c from public.tpn_gctx(p_token, p_group);
  if c.rol <> 'admin' then raise exception 'tpn_forbidden'; end if;
  if p_year not between 2000 and extract(year from current_date)::int or length(coalesce(p_reason, '')) > 200 then raise exception 'tpn_invalid'; end if;
  perform pg_advisory_xact_lock(hashtext('season:' || p_group || p_year));
  insert into public.tpn_seasons (group_id, year) values (p_group, p_year) on conflict do nothing;
  select * into s from public.tpn_seasons where group_id = p_group and year = p_year for update;
  if coalesce(p_open, false) then
    if not s.closed then return json_build_object('ok', true); end if;
    if length(btrim(coalesce(p_reason, ''))) = 0 then raise exception 'tpn_invalid'; end if;
    update public.tpn_seasons set closed = false,
      history = history || jsonb_build_object('reopened_at', now(), 'by', c.mid, 'reason', btrim(p_reason)) where group_id = p_group and year = p_year;
  else
    if s.closed then return json_build_object('ok', true); end if; -- doble toque
    update public.tpn_seasons set closed = true, closed_at = now(), closed_by = c.mid,
      summary = jsonb_build_object('totals', public.tpn_totals(p_group, p_year)::jsonb),
      history = history || jsonb_build_object('closed_at', now(), 'by', c.mid) where group_id = p_group and year = p_year;
  end if;
  perform public.tpn_notify(p_group);
  return json_build_object('ok', true);
end $$;

-- ======================= PREVIA GAMES: funciones =======================
-- Lo público de una partida. NUNCA incluye tpn_game_secrets (solo si cada uno ya vio lo suyo, sí/no).
create function public.tpn_game_json(p_game uuid) returns json language sql stable security definer set search_path = '' as $$
  select json_build_object('id', g.id, 'kind', g.kind, 'status', g.status, 'by', g.by_member, 'at', g.created_at, 'ended_at', g.ended_at,
    'players', (select json_agg(json_build_object('m', p.m, 'name', public.tpn_mname(g.group_id, p.m),
        'seen', (select s.seen from public.tpn_game_secrets s where s.game_id = g.id and s.member_id = p.m)) order by p.o)
      from unnest(g.players) with ordinality as p (m, o)),
    'rounds', coalesce((select json_agg(json_build_object('imitator', r.imitator, 'target', r.target, 'guesses', r.guesses) order by r.created_at)
      from public.tpn_game_rounds r where r.game_id = g.id), '[]'::json))
  from public.tpn_games g where g.id = p_game
$$;

create function public.tpn_game_ctx(p_token text, p_game uuid, out g public.tpn_games, out mid text, out rol text) language plpgsql security definer set search_path = '' as $$
begin
  select * into g from public.tpn_games where id = p_game;
  if g.id is null then raise exception 'tpn_forbidden'; end if;
  select c.mid, c.rol into mid, rol from public.tpn_gctx(p_token, g.group_id) c;
end $$;

create function public.tpn_games_list(p_token text, p_group uuid) returns json language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  select * into c from public.tpn_gctx(p_token, p_group);
  return json_build_object('me', c.mid, 'role', c.rol, 'games', coalesce((select json_agg(public.tpn_game_json(x.id) order by x.created_at desc) from (
    select id, created_at from public.tpn_games where group_id = p_group and status <> 'canc' order by created_at desc limit 30) x), '[]'::json));
end $$;

create function public.tpn_game_get(p_token text, p_game uuid) returns json language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  select * into c from public.tpn_game_ctx(p_token, p_game);
  return json_build_object('me', c.mid, 'role', c.rol, 'game', public.tpn_game_json(p_game));
end $$;

-- Nueva partida: 3 a 12 perfiles del mismo grupo, sin repetir. El servidor sortea el orden y a quién imita cada uno
-- (nadie a sí mismo y nadie imitado dos veces).
create function public.tpn_game_new(p_token text, p_group uuid, p_kind text, p_players text[], p_req uuid) returns json language plpgsql security definer set search_path = '' as $$
declare c record; gid uuid; ord text[]; tgt text[]; n int; i int; tries int := 0;
begin
  select * into c from public.tpn_gctx(p_token, p_group);
  if p_req is null or p_kind is distinct from 'quien' then raise exception 'tpn_invalid'; end if;
  select id into gid from public.tpn_games where req = p_req and group_id = p_group;
  if gid is not null then return public.tpn_game_get(p_token, gid); end if; -- doble toque: la misma partida
  n := coalesce(cardinality(p_players), 0);
  if n not between 3 and 12 or (select count(distinct x) from unnest(p_players) x) <> n
     or exists (select 1 from unnest(p_players) x where not public.tpn_member_ok(p_group, x, true)) then raise exception 'tpn_invalid'; end if;
  if (select count(*) from public.tpn_games where group_id = p_group and status = 'play') >= 5
     or (select count(*) from public.tpn_games where group_id = p_group) >= 2000 then raise exception 'tpn_full'; end if;
  select array_agg(x order by random()) into ord from unnest(p_players) x;
  loop -- reordenar hasta que nadie quede consigo mismo (con 3 o más sale en pocos intentos)
    select array_agg(x order by random()) into tgt from unnest(ord) x;
    exit when not exists (select 1 from generate_subscripts(ord, 1) k where ord[k] = tgt[k]);
    tries := tries + 1; if tries > 1000 then raise exception 'tpn_invalid'; end if;
  end loop;
  begin
    insert into public.tpn_games (group_id, kind, players, by_member, req) values (p_group, p_kind, ord, c.mid, p_req) returning id into gid;
  exception when unique_violation then raise exception 'tpn_invalid'; -- ese req ya es de otro grupo
  end;
  for i in 1..n loop insert into public.tpn_game_secrets (game_id, member_id, target) values (gid, ord[i], tgt[i]); end loop;
  perform public.tpn_notify(p_group);
  return public.tpn_game_get(p_token, gid);
end $$;

-- Ver a quién imita alguien. El propio perfil lo puede ver cuantas veces quiera (en su celu).
-- En el celu compartido, el de otro se puede mostrar UNA sola vez: después ya nadie más lo puede pedir.
create function public.tpn_game_reveal(p_token text, p_game uuid, p_member text) returns json language plpgsql security definer set search_path = '' as $$
declare c record; s public.tpn_game_secrets;
begin
  select * into c from public.tpn_game_ctx(p_token, p_game);
  if (c.g).status <> 'play' then raise exception 'tpn_closed'; end if;
  select * into s from public.tpn_game_secrets where game_id = p_game and member_id = p_member for update;
  if s.game_id is null then raise exception 'tpn_invalid'; end if;
  if s.member_id <> c.mid and s.seen then raise exception 'tpn_seen'; end if;
  update public.tpn_game_secrets set seen = true where game_id = p_game and member_id = p_member;
  perform public.tpn_notify((c.g).group_id);
  return json_build_object('target', s.target, 'name', public.tpn_mname((c.g).group_id, s.target));
end $$;

-- Cerrar una ronda: quién imitó y qué dijo cada uno. El servidor sabe la respuesta; recién acá se hace pública.
-- La persona imitada no cuenta (ni acierto ni error). Tocar dos veces devuelve la misma ronda.
create function public.tpn_game_round(p_token text, p_game uuid, p_imitator text, p_guesses jsonb) returns json language plpgsql security definer set search_path = '' as $$
declare c record; g public.tpn_games; t text; k text; v text; valid int := 0;
begin
  select * into c from public.tpn_game_ctx(p_token, p_game);
  select * into g from public.tpn_games where id = p_game for update;
  if exists (select 1 from public.tpn_game_rounds where game_id = p_game and imitator = p_imitator) then return public.tpn_game_get(p_token, p_game); end if;
  if g.status <> 'play' then raise exception 'tpn_closed'; end if;
  if not p_imitator = any (g.players) or jsonb_typeof(p_guesses) is distinct from 'object' then raise exception 'tpn_invalid'; end if;
  select target into t from public.tpn_game_secrets where game_id = p_game and member_id = p_imitator;
  for k, v in select key, value #>> '{}' from jsonb_each(p_guesses) loop
    if k = p_imitator or not k = any (g.players) or v is null or not v = any (g.players) or v = p_imitator then raise exception 'tpn_invalid'; end if;
    if k <> t then valid := valid + 1; end if;
  end loop;
  if valid = 0 then raise exception 'tpn_invalid'; end if;
  insert into public.tpn_game_rounds (game_id, imitator, target, guesses) values (p_game, p_imitator, t, p_guesses);
  perform public.tpn_notify(g.group_id);
  return public.tpn_game_get(p_token, p_game);
end $$;

-- Terminar (aunque falten rondas) o cancelar. Quien la creó o un admin. Tocar dos veces no hace nada más.
create function public.tpn_game_end(p_token text, p_game uuid, p_cancel boolean) returns json language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  select * into c from public.tpn_game_ctx(p_token, p_game);
  if (c.g).by_member <> c.mid and c.rol <> 'admin' then raise exception 'tpn_forbidden'; end if;
  update public.tpn_games set status = case when coalesce(p_cancel, false) then 'canc' else 'done' end, ended_at = now() where id = p_game and status = 'play';
  perform public.tpn_notify((c.g).group_id);
  return public.tpn_game_get(p_token, p_game);
end $$;

-- ======================= copia del registro viejo =======================
-- Lo que ya se había cargado con el + / − de antes ("log" en tpn_rows) se COPIA tal cual (mismo integrante, fecha y cantidad),
-- marcado como registro anterior. La fila vieja no se toca. La anécdota del año (fila "flama") se copia a su temporada.
insert into public.tpn_stats (group_id, member_id, kind, day, n, by_member, note, legacy_id)
  select r.group_id, r.data->>'m', r.data->>'k', (r.data->>'d')::date, (r.data->>'n')::int, r.data->>'m', 'Cargado antes de la Fase 3', r.id
  from public.tpn_rows r
  where r.col = 'log' and not r.deleted and r.data->>'k' in ('cubatas', 'besos', 'salidas', 'boliches')
    and r.data->>'d' ~ '^\d{4}-\d{2}-\d{2}$' and r.data->>'n' ~ '^\d{1,2}$' and (r.data->>'n')::int between 1 and 100 and coalesce(r.data->>'m', '') <> ''
  on conflict do nothing;
insert into public.tpn_seasons (group_id, year, anecdote)
  select r.group_id, r.id::int, left(r.data #>> '{}', 1000) from public.tpn_rows r
  where r.col = 'flama' and not r.deleted and r.id ~ '^\d{4}$' and r.id::int between 2000 and 2100 and jsonb_typeof(r.data) = 'string' and length(r.data #>> '{}') > 0
  on conflict do nothing;

-- ---------- permisos ----------
revoke all on function
  public.tpn_member_ok(uuid, text, boolean), public.tpn_boliche_ok(uuid, text), public.tpn_mname(uuid, text),
  public.tpn_totals(uuid, int), public.tpn_closed(uuid, date), public.tpn_game_json(uuid), public.tpn_game_ctx(text, uuid),
  public.tpn_boliche_view(text, uuid, text), public.tpn_bphoto_add(text, uuid, text, text), public.tpn_bphoto_delete(text, uuid),
  public.tpn_bcomment_add(text, uuid, text, text), public.tpn_bcomment_delete(text, uuid),
  public.tpn_stats_view(text, uuid, int), public.tpn_stat_add(text, uuid, text, date, int, text, text, text), public.tpn_night(text, uuid, date, text, uuid),
  public.tpn_stat_void(text, uuid, text), public.tpn_season_save(text, uuid, int, text, text), public.tpn_season_close(text, uuid, int, boolean, text),
  public.tpn_games_list(text, uuid), public.tpn_game_get(text, uuid), public.tpn_game_new(text, uuid, text, text[], uuid),
  public.tpn_game_reveal(text, uuid, text), public.tpn_game_round(text, uuid, text, jsonb), public.tpn_game_end(text, uuid, boolean)
  from public, anon, authenticated;
grant execute on function
  public.tpn_boliche_view(text, uuid, text), public.tpn_bphoto_add(text, uuid, text, text), public.tpn_bphoto_delete(text, uuid),
  public.tpn_bcomment_add(text, uuid, text, text), public.tpn_bcomment_delete(text, uuid),
  public.tpn_stats_view(text, uuid, int), public.tpn_stat_add(text, uuid, text, date, int, text, text, text), public.tpn_night(text, uuid, date, text, uuid),
  public.tpn_stat_void(text, uuid, text), public.tpn_season_save(text, uuid, int, text, text), public.tpn_season_close(text, uuid, int, boolean, text),
  public.tpn_games_list(text, uuid), public.tpn_game_get(text, uuid), public.tpn_game_new(text, uuid, text, text[], uuid),
  public.tpn_game_reveal(text, uuid, text), public.tpn_game_round(text, uuid, text, jsonb), public.tpn_game_end(text, uuid, boolean)
  to anon, authenticated;

commit;
