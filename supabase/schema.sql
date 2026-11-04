-- Pegar en Supabase > SQL Editor > Run. Una sola fila guarda todo el estado del grupo (mismo formato que localStorage).
create table if not exists tpn_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table tpn_state enable row level security;
-- shortcut: acceso abierto con la anon key (web privada por link), cerrar con auth cuando haga falta.
create policy "grupo lee" on tpn_state for select using (true);
create policy "grupo escribe" on tpn_state for insert with check (true);
create policy "grupo actualiza" on tpn_state for update using (true);
alter publication supabase_realtime add table tpn_state;
