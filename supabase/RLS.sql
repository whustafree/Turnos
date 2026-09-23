-- ─── Políticas RLS recomendadas para turnos ───
-- Ejecuta esto en Supabase Console → SQL Editor.
-- Garantiza que cada usuario solo lee/escribe sus propios turnos.

alter table public.usuarios_turnos enable row level security;

-- Leer solo tus propios datos
drop policy if exists "lectura propia" on public.usuarios_turnos;
create policy "lectura propia"
  on public.usuarios_turnos
  for select
  using (auth.uid() = user_id);

-- Insertar solo tus propios datos
drop policy if exists "insercion propia" on public.usuarios_turnos;
create policy "insercion propia"
  on public.usuarios_turnos
  for insert
  with check (auth.uid() = user_id);

-- Actualizar solo tus propios datos
drop policy if exists "actualizacion propia" on public.usuarios_turnos;
create policy "actualizacion propia"
  on public.usuarios_turnos
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);