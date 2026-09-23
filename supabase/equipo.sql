-- ─── Modo Equipo: tablas + RLS ───
-- Ejecuta esto en Supabase Console → SQL Editor.
-- Permite juntar a varios usuarios en un equipo y que vean los calendarios de sus compañeros.

-- Equipos
create table if not exists public.equipos (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  nombre text not null default 'Mi Equipo',
  created_at timestamptz not null default now()
);

-- Miembros de cada equipo
create table if not exists public.miembros_equipo (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references public.equipos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rol text not null default 'miembro' check (rol in ('owner', 'miembro')),
  creado_por uuid not null references auth.users(id) on delete cascade,
  unique (equipo_id, user_id)
);

-- ─── RLS ───
alter table public.equipos enable row level security;
alter table public.miembros_equipo enable row level security;

-- El dueño lee/actualiza/borra su equipo
drop policy if exists "owner gestiona equipos" on public.equipos;
create policy "owner gestiona equipos"
  on public.equipos
  for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- Cualquier miembro lee el equipo (para ver quién está)
drop policy if exists "miembros leen equipo" on public.equipos;
create policy "miembros leen equipo"
  on public.equipos
  for select
  using (
    exists (
      select 1 from public.miembros_equipo m
      where m.equipo_id = equipos.id and m.user_id = auth.uid()
    )
  );

-- El owner crea/invita/quita miembros
drop policy if exists "owner gestiona miembros" on public.miembros_equipo;
create policy "owner gestiona miembros"
  on public.miembros_equipo
  for all
  using (
    exists (
      select 1 from public.equipos e
      where e.id = miembros_equipo.equipo_id and e.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.equipos e
      where e.id = miembros_equipo.equipo_id and e.owner_user_id = auth.uid()
    )
  );

-- Los miembros leen quién integra el equipo
drop policy if exists "miembros leen miembros" on public.miembros_equipo;
create policy "miembros leen miembros"
  on public.miembros_equipo
  for select
  using (
    exists (
      select 1 from public.equipos e
      where e.id = miembros_equipo.equipo_id
      and e.owner_user_id = auth.uid()
    )
    or exists (
      select 1 from public.equipos e
      where e.id = miembros_equipo.equipo_id
      and exists (
        select 1 from public.miembros_equipo m
        where m.equipo_id = e.id and m.user_id = auth.uid()
      )
    )
  );

-- El usuario comparte su perfil/turnos con su equipo (lectura)
alter table public.usuarios_turnos enable row level security;

drop policy if exists "equipo lee turnos" on public.usuarios_turnos;
create policy "equipo lee turnos"
  on public.usuarios_turnos
  for select
  using (
    auth.uid() = user_id
    or (
      select count(*)
      from public.miembros_equipo me
      where me.user_id = usuarios_turnos.user_id
        and exists (
          select 1 from public.miembros_equipo m2
          where m2.equipo_id = me.equipo_id and m2.user_id = auth.uid()
        )
    ) > 0
  );