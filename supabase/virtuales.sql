-- ─── Miembros virtuales (personas sin app que aparecen en la planilla) ───
-- Ejecuta esto en Supabase Console → SQL Editor (después de supabase/equipo.sql).
-- Cada uno tiene nombre + ciclo de turnos (parado por el admin) y se calcula
-- solo su fila en la planilla del mes.

-- Personas del equipo que NO tienen la app
create table if not exists public.miembros_virtuales (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  nombre text not null,
  ciclo_id text not null default '10',
  fecha_inicio text not null default '2025-01-01',
  created_at timestamptz not null default now()
);

-- ─── RLS ───
alter table public.miembros_virtuales enable row level security;
-- Requiere las funciones auxiliares de supabase/equipo.sql:
--   public.es_owner_equipo(equipo_id, uid), public.es_miembro_equipo(equipo_id, uid)

-- El dueño del equipo crea/edita/borra miembros virtuales
drop policy if exists "owner gestiona virtuales" on public.miembros_virtuales;
create policy "owner gestiona virtuales"
  on public.miembros_virtuales
  for all
  using (public.es_owner_equipo(equipo_id, auth.uid()))
  with check (public.es_owner_equipo(equipo_id, auth.uid()));

-- Los miembros del equipo leen los virtuales (para ver la planilla)
drop policy if exists "miembros leen virtuales" on public.miembros_virtuales;
create policy "miembros leen virtuales"
  on public.miembros_virtuales
  for select
  using (public.es_miembro_equipo(equipo_id, auth.uid()));

-- ─── RPCs para el admin ───

-- Crea un miembro virtual (solo el dueño del equipo)
create or replace function public.crear_virtual(p_equipo_id uuid, p_nombre text, p_ciclo_id text default '10', p_fecha_inicio text default '2025-01-01')
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if not exists (
    select 1 from public.equipos e
    where e.id = p_equipo_id and e.owner_user_id = auth.uid()
  ) then
    raise exception 'No eres el dueño de este equipo';
  end if;

  insert into public.miembros_virtuales (equipo_id, nombre, ciclo_id, fecha_inicio)
  values (p_equipo_id, coalesce(nullif(p_nombre, ''), 'Trabajador'), p_ciclo_id, p_fecha_inicio)
  returning id into v_id;

  return v_id;
end $$;

-- Edita un miembro virtual (solo el dueño del equipo)
create or replace function public.actualizar_virtual(p_id uuid, p_nombre text, p_ciclo_id text, p_fecha_inicio text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.miembros_virtuales mv
    join public.equipos e on e.id = mv.equipo_id
    where mv.id = p_id and e.owner_user_id = auth.uid()
  ) then
    raise exception 'No eres el dueño de este equipo';
  end if;

  update public.miembros_virtuales
  set nombre = coalesce(nullif(p_nombre, ''), nombre),
      ciclo_id = coalesce(p_ciclo_id, ciclo_id),
      fecha_inicio = coalesce(p_fecha_inicio, fecha_inicio)
  where id = p_id;
end $$;

-- Elimina un miembro virtual (solo el dueño del equipo)
create or replace function public.eliminar_virtual(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.miembros_virtuales mv
    join public.equipos e on e.id = mv.equipo_id
    where mv.id = p_id and e.owner_user_id = auth.uid()
  ) then
    raise exception 'No eres el dueño de este equipo';
  end if;

  delete from public.miembros_virtuales where id = p_id;
end $$;