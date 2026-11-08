-- Vuelta atrás de la Fase 3: saca SOLO lo que agregó fase3.sql (sus funciones y tablas nuevas).
-- No toca nada de antes: tpn_rows (boliches, integrantes, el registro viejo "log"), grupos, invitaciones ni planes siguen igual.
-- OJO: se pierde lo que se haya cargado DESPUÉS de la Fase 3 en esas tablas nuevas (fotos y comentarios de boliches,
-- registros de rankings, temporadas cerradas, partidas). Si querés guardarlo, exportá esas tablas antes.
begin;
drop function if exists
  public.tpn_boliche_view(text, uuid, text), public.tpn_bphoto_add(text, uuid, text, text), public.tpn_bphoto_delete(text, uuid),
  public.tpn_bcomment_add(text, uuid, text, text), public.tpn_bcomment_delete(text, uuid),
  public.tpn_stats_view(text, uuid, int), public.tpn_stat_add(text, uuid, text, date, int, text, text, text), public.tpn_night(text, uuid, date, text, uuid),
  public.tpn_stat_void(text, uuid, text), public.tpn_season_save(text, uuid, int, text, text), public.tpn_season_close(text, uuid, int, boolean, text),
  public.tpn_games_list(text, uuid), public.tpn_game_get(text, uuid), public.tpn_game_new(text, uuid, text, text[], uuid),
  public.tpn_game_reveal(text, uuid, text), public.tpn_game_round(text, uuid, text, jsonb), public.tpn_game_end(text, uuid, boolean),
  public.tpn_game_ctx(text, uuid), public.tpn_game_json(uuid), public.tpn_totals(uuid, int), public.tpn_closed(uuid, date),
  public.tpn_member_ok(uuid, text, boolean), public.tpn_boliche_ok(uuid, text), public.tpn_mname(uuid, text);
drop table if exists public.tpn_game_rounds, public.tpn_game_secrets, public.tpn_games, public.tpn_seasons, public.tpn_stats, public.tpn_bcomments, public.tpn_bphotos;
commit;
