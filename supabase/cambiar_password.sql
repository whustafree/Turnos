-- ─── Cambiar contraseña de un miembro por el dueño ───
-- Ejecuta esto en Supabase Console → SQL Editor.
-- Permite que el dueño (admin) del equipo restablezca la contraseña de un miembro
-- directamente desde la app, sin tener que usar el flujo de recuperación por correo.

-- ¿Existe la función admin nativa de Supabase para actualizar usuarios?
do $$ begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'admin_update_user_by_id'
  ) then
    raise notice 'auth.admin_update_user_by_id no existe; instalando una nueva versión de Supabase o usando el update directo a auth.users';
  end if;
end $$;

-- Función RPC: el dueño cambia la contraseña de un miembro de SU equipo.
create or replace function public.cambiar_password_miembro(p_user_id uuid, p_nueva_password text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_es_owner boolean;
  v_comparten boolean;
begin
  if p_nueva_password is null or length(p_nueva_password) < 6 then
    raise exception 'La contraseña debe tener al menos 6 caracteres';
  end if;

  -- Solo el dueño del equipo puede cambiar contraseñas, y solo de miembros de SU equipo.
  select exists (
    select 1
    from public.equipos e
    where e.owner_user_id = auth.uid()
  ) into v_es_owner;

  select public.comparten_equipo(p_user_id, auth.uid()) into v_comparten;

  if not v_es_owner then
    raise exception 'Solo el dueño del equipo puede cambiar contraseñas';
  end if;

  if not v_comparten then
    raise exception 'Ese usuario no pertenece a tu equipo';
  end if;

  -- Llama a la función admin nativa de GoTrue (requiere el sitio en versiones nuevas).
  -- Si no existe, actualizamos directamente auth.users con el hash bcrypt.
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'admin_update_user_by_id'
  ) then
    perform auth.admin_update_user_by_id(
      p_user_id,
      jsonb_build_object('password', p_nueva_password)
    );
  else
    update auth.users
    set encrypted_password = crypt(p_nueva_password, gen_salt('bf')),
        updated_at = now()
    where id = p_user_id;
  end if;

  return true;
end $$;

-- Accesible para usuarios autenticados (la app lo llama con supabase.rpc)
grant execute on function public.cambiar_password_miembro(uuid, text) to authenticated;