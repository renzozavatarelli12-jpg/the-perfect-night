-- The Perfect Night: datos compartidos del grupo.
-- Diseño: una fila por cosa (integrante, boliche, voto, registro de estadística…) en tpn_rows, con número de versión (rev).
-- Nadie toca las tablas directo: RLS activado SIN políticas y sin permisos para anon. Todo pasa por 3 funciones
-- (tpn_join, tpn_pull, tpn_push) que validan una sesión obtenida con el código del grupo (verificado acá, nunca en el navegador).
-- El código del grupo NO está en este archivo: se carga aparte (ver README.md, "Código del grupo").

create extension if not exists pgcrypto with schema extensions;

create table public.tpn_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code_hash text not null,                                                   -- bcrypt del código
  topic text not null default encode(extensions.gen_random_bytes(12), 'hex'), -- canal de avisos en tiempo real (solo dice "cambió algo")
  created_at timestamptz not null default now()
);

create table public.tpn_sessions (
  token_hash bytea primary key, -- sha256 del token: si se filtra la tabla, los tokens no sirven
  group_id uuid not null references public.tpn_groups (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index on public.tpn_sessions (group_id);

create table public.tpn_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  at timestamptz not null default now()
);
create index on public.tpn_attempts (ip, at);
create index on public.tpn_attempts (at);

create sequence public.tpn_rev;

create table public.tpn_rows (
  group_id uuid not null references public.tpn_groups (id) on delete cascade,
  col text not null,   -- members, boliches, favDrinks, probable, quien, log, stories, partidas, previa, pvoto, voto, flama
  id text not null,
  data jsonb,          -- al borrar se conserva el último valor (deleted = true) para poder recuperarlo
  rev bigint not null, -- versión: cambia en cada escritura; sirve para detectar choques
  created bigint not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (group_id, col, id)
);
create index on public.tpn_rows (group_id, rev);

-- Historial: cada versión pisada queda guardada (recuperación ante errores).
create table public.tpn_history (
  hid bigint generated always as identity primary key,
  group_id uuid not null,
  col text not null,
  id text not null,
  data jsonb,
  rev bigint not null,
  deleted boolean not null,
  saved_at timestamptz not null default now()
);
create index on public.tpn_history (group_id, col, id);

create function public.tpn_keep() returns trigger language plpgsql set search_path = '' as $$
begin
  insert into public.tpn_history (group_id, col, id, data, rev, deleted) values (old.group_id, old.col, old.id, old.data, old.rev, old.deleted);
  return new;
end $$;
create trigger tpn_rows_keep before update on public.tpn_rows for each row execute function public.tpn_keep();

-- Cerrado por defecto.
alter table public.tpn_groups enable row level security;
alter table public.tpn_sessions enable row level security;
alter table public.tpn_attempts enable row level security;
alter table public.tpn_rows enable row level security;
alter table public.tpn_history enable row level security;
revoke all on public.tpn_groups, public.tpn_sessions, public.tpn_attempts, public.tpn_rows, public.tpn_history from anon, authenticated;
revoke all on sequence public.tpn_rev from anon, authenticated;

-- Sesión -> grupo. Interna (no la puede llamar el navegador).
create function public.tpn_gid(p_token text) returns uuid language plpgsql security definer set search_path = '' as $$
declare g uuid;
begin
  update public.tpn_sessions set last_seen = now()
    where token_hash = extensions.digest(coalesce(p_token, ''), 'sha256') and last_seen > now() - interval '180 days'
    returning group_id into g;
  if g is null then raise exception 'tpn_session'; end if;
  return g;
end $$;

-- Entrar con el código del grupo. Máx. 8 intentos fallidos cada 15 min por IP (y 300 en total, por si reparten el ataque).
create function public.tpn_join(p_code text) returns json language plpgsql security definer set search_path = '' as $$
declare
  h json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  v_ip text := coalesce(h->>'cf-connecting-ip', split_part(h->>'x-forwarded-for', ',', 1), 'desconocida');
  v_code text := lower(btrim(coalesce(p_code, '')));
  g public.tpn_groups;
  tok text;
begin
  if (select count(*) from public.tpn_attempts where ip = v_ip and at > now() - interval '15 minutes') >= 8
     or (select count(*) from public.tpn_attempts where at > now() - interval '15 minutes') >= 300 then
    return json_build_object('error', 'rate');
  end if;
  if length(v_code) between 4 and 100 then
    select * into g from public.tpn_groups where code_hash = extensions.crypt(v_code, code_hash) limit 1;
  end if;
  if g.id is null then
    insert into public.tpn_attempts (ip) values (v_ip);
    delete from public.tpn_attempts where at < now() - interval '1 day';
    return json_build_object('error', 'code');
  end if;
  tok := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.tpn_sessions (token_hash, group_id) values (extensions.digest(tok, 'sha256'), g.id);
  return json_build_object('token', tok, 'topic', g.topic, 'name', g.name);
end $$;

-- Bajar lo que cambió desde la versión p_since (0 = todo). Incluye borrados (v = null).
create function public.tpn_pull(p_token text, p_since bigint) returns json language plpgsql security definer set search_path = '' as $$
declare g uuid := public.tpn_gid(p_token);
begin
  return json_build_object(
    'topic', (select topic from public.tpn_groups where id = g),
    'rows', coalesce((
      select json_agg(json_build_object('c', col, 'i', id, 'v', case when deleted then null else data end, 'r', rev, 'o', created) order by rev)
      from public.tpn_rows where group_id = g and rev > coalesce(p_since, 0)), '[]'::json));
end $$;

-- Subir cambios: [{c, i, v (null = borrar), b (versión sobre la que se hizo el cambio; 0 = nuevo)}].
-- Todo o nada: si alguna fila cambió en el servidor desde b, no se aplica nada y se devuelven esas filas (nadie pisa a nadie sin enterarse).
create function public.tpn_push(p_token text, p_changes jsonb) returns json language plpgsql security definer set search_path = '' as $$
declare
  g uuid := public.tpn_gid(p_token);
  ch jsonb; v jsonb; r bigint; o bigint;
  bad json;
  res jsonb := '[]';
  items constant text[] := array['members', 'boliches', 'favDrinks', 'probable', 'quien', 'log', 'stories', 'partidas', 'previa'];
begin
  if jsonb_typeof(p_changes) is distinct from 'array' or jsonb_array_length(p_changes) not between 1 and 500 then raise exception 'tpn_invalid'; end if;
  perform pg_advisory_xact_lock(hashtext(g::text)); -- un push por grupo a la vez: versiones en orden y sin carreras
  for ch in select * from jsonb_array_elements(p_changes) loop
    v := ch->'v';
    if jsonb_typeof(ch) <> 'object' or coalesce(ch->>'i', '') !~ '^[A-Za-z0-9_|.-]{1,80}$' or jsonb_typeof(ch->'b') is distinct from 'number'
       or not (ch->>'c' = any(items || array['pvoto', 'voto', 'flama']))
       or (v is not null and jsonb_typeof(v) <> 'null' and (
            pg_column_size(v) > 20000
         or (ch->>'c' = any(items) and (jsonb_typeof(v) <> 'object' or v->>'id' is distinct from ch->>'i'))
         or (ch->>'c' = 'pvoto' and v <> 'true'::jsonb)
         or (ch->>'c' in ('voto', 'flama') and (jsonb_typeof(v) <> 'string' or length(v #>> '{}') > 4000)))) then
      raise exception 'tpn_invalid';
    end if;
  end loop;

  select json_agg(json_build_object('c', x.e->>'c', 'i', x.e->>'i', 'v', case when t.deleted then null else t.data end, 'r', coalesce(t.rev, 0), 'o', coalesce(t.created, 0)))
    into bad
    from jsonb_array_elements(p_changes) as x (e)
    left join public.tpn_rows t on t.group_id = g and t.col = x.e->>'c' and t.id = x.e->>'i'
    where coalesce(t.rev, 0) <> (x.e->>'b')::bigint;
  if bad is not null then return json_build_object('ok', false, 'rows', bad); end if;

  if (select count(*) from public.tpn_rows where group_id = g) > 20000 then raise exception 'tpn_full'; end if;

  for ch in select * from jsonb_array_elements(p_changes) loop
    v := case when jsonb_typeof(ch->'v') = 'null' then null else ch->'v' end;
    r := nextval('public.tpn_rev');
    insert into public.tpn_rows as t (group_id, col, id, data, rev, created, deleted)
      values (g, ch->>'c', ch->>'i', v, r, r, v is null)
      on conflict (group_id, col, id) do update
        set data = coalesce(excluded.data, t.data), rev = excluded.rev, deleted = excluded.deleted, updated_at = now()
      returning t.created into o;
    res := res || jsonb_build_object('c', ch->>'c', 'i', ch->>'i', 'r', r, 'o', o);
  end loop;

  begin -- aviso en tiempo real; si falla, igual se guardó (los demás lo ven en el próximo chequeo)
    perform realtime.send(jsonb_build_object('r', r), 'changed', (select topic from public.tpn_groups where id = g), false);
  exception when others then null;
  end;
  return json_build_object('ok', true, 'rows', res);
end $$;

revoke all on function public.tpn_gid(text), public.tpn_join(text), public.tpn_pull(text, bigint), public.tpn_push(text, jsonb), public.tpn_keep() from public, anon, authenticated;
grant execute on function public.tpn_join(text), public.tpn_pull(text, bigint), public.tpn_push(text, jsonb) to anon, authenticated;
