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

-- Funciones auxiliares con SECURITY DEFINER (evitan la recursión infinita
-- de RLS 42P17 que ocurre si las políticas consultan las tablas entre sí).

-- ¿El usuario es dueño del equipo?
create or replace function public.es_owner_equipo(p_equipo_id uuid, p_uid uuid default auth.uid())
returns boolean
language sql security definer set search_path = public
as $$
  select exists (select 1 from public.equipos e where e.id = p_equipo_id and e.owner_user_id = p_uid);
$$;

-- ¿El usuario es miembro (incl. dueño) del equipo?
create or replace function public.es_miembro_equipo(p_equipo_id uuid, p_uid uuid default auth.uid())
returns boolean
language sql security definer set search_path = public
as $$
  select exists (select 1 from public.miembros_equipo m where m.equipo_id = p_equipo_id and m.user_id = p_uid);
$$;

-- ¿Dos usuarios comparten algún equipo?
create or replace function public.comparten_equipo(p_uid uuid, p_uid2 uuid default auth.uid())
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from public.miembros_equipo a
    join public.miembros_equipo b on b.equipo_id = a.equipo_id
    where a.user_id = p_uid and b.user_id = p_uid2
  );
$$;

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
  using (public.es_miembro_equipo(id, auth.uid()));

-- El owner crea/invita/quita miembros
drop policy if exists "owner gestiona miembros" on public.miembros_equipo;
create policy "owner gestiona miembros"
  on public.miembros_equipo
  for all
  using (public.es_owner_equipo(equipo_id, auth.uid()))
  with check (public.es_owner_equipo(equipo_id, auth.uid()));

-- Los miembros leen quién integra el equipo
drop policy if exists "miembros leen miembros" on public.miembros_equipo;
create policy "miembros leen miembros"
  on public.miembros_equipo
  for select
  using (
    public.es_owner_equipo(equipo_id, auth.uid())
    or public.es_miembro_equipo(equipo_id, auth.uid())
  );

-- El usuario comparte su perfil/turnos con su equipo (lectura)
alter table public.usuarios_turnos enable row level security;

drop policy if exists "equipo lee turnos" on public.usuarios_turnos;
create policy "equipo lee turnos"
  on public.usuarios_turnos
  for select
  using (
    auth.uid() = user_id
    or public.comparten_equipo(user_id, auth.uid())
  );

-- ─── Funciones RPC para el admin ───

-- Crea un equipo y su dueño (miembro rol 'owner')
create or replace function public.crear_equipo(p_nombre text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_equipo_id uuid;
begin
  insert into public.equipos (owner_user_id, nombre)
  values (auth.uid(), coalesce(nullif(p_nombre, ''), 'Mi Equipo'))
  returning id into v_equipo_id;

  insert into public.miembros_equipo (equipo_id, user_id, rol, creado_por)
  values (v_equipo_id, auth.uid(), 'owner', auth.uid());

  return v_equipo_id;
end $$;

-- Agrega un miembro existente por su correo (solo el dueño del equipo)
create or replace function public.agregar_miembro(p_equipo_id uuid, p_email text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_uid uuid;
begin
  if not exists (
    select 1 from public.equipos e
    where e.id = p_equipo_id and e.owner_user_id = auth.uid()
  ) then
    raise exception 'No eres el dueño de este equipo';
  end if;

  select id into v_uid from auth.users where lower(email) = lower(p_email);
  if v_uid is null then
    raise exception 'No existe una cuenta con ese correo: %', p_email;
  end if;

  insert into public.miembros_equipo (equipo_id, user_id, rol, creado_por)
  values (p_equipo_id, v_uid, 'miembro', auth.uid())
  on conflict (equipo_id, user_id) do nothing;

  return v_uid;
end $$;

-- Quita un miembro del equipo (solo el dueño)
create or replace function public.quitar_miembro(p_equipo_id uuid, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.equipos e
    where e.id = p_equipo_id and e.owner_user_id = auth.uid()
  ) then
    raise exception 'No eres el dueño de este equipo';
  end if;

  delete from public.miembros_equipo
  where equipo_id = p_equipo_id and user_id = p_user_id;
end $$;

-- Usuarios con invite: el correo ya debe tener cuenta (se registran en la app).
-- Para crear la cuenta el admin usa el botón "Crear cuenta" dentro de la app,
-- que llama a signUp con la clave pública (sin necesidad de role service).