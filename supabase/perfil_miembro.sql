-- ─── Perfil de miembro editable por el dueño ───
-- Ejecuta esto en Supabase Console → SQL Editor (después de equipo.sql).
-- Le permite al dueño del equipo actualizar nombre/cargo/empresa de un miembro.

create or replace function public.actualizar_perfil_miembro(
  p_equipo_id uuid,
  p_user_id uuid,
  p_nombre text default null,
  p_cargo text default null,
  p_empresa text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_perfil jsonb;
begin
  -- Solo el dueño del equipo puede editar perfiles de sus miembros
  if not exists (
    select 1 from public.equipos e
    where e.id = p_equipo_id and e.owner_user_id = auth.uid()
  ) then
    raise exception 'No eres el dueño de este equipo';
  end if;

  -- El usuario debe pertenecer al equipo
  if not exists (
    select 1 from public.miembros_equipo m
    where m.equipo_id = p_equipo_id and m.user_id = p_user_id
  ) then
    raise exception 'El usuario no pertenece a este equipo';
  end if;

  -- Leer el perfil actual (o crear uno nuevo)
  select coalesce(datos_perfil, '{}'::jsonb) into v_perfil
  from public.usuarios_turnos where user_id = p_user_id;

  if p_nombre is not null then
    v_perfil := jsonb_set(v_perfil, '{nombre}', to_jsonb(p_nombre));
  end if;
  if p_cargo is not null then
    v_perfil := jsonb_set(v_perfil, '{cargo}', to_jsonb(p_cargo));
  end if;
  if p_empresa is not null then
    v_perfil := jsonb_set(v_perfil, '{empresa}', to_jsonb(p_empresa));
  end if;

  insert into public.usuarios_turnos (user_id, datos_perfil)
  values (p_user_id, v_perfil)
  on conflict (user_id) do update set datos_perfil = excluded.datos_perfil;
end $$;