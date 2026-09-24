-- ─── Permutas entre miembros (intercambiar turnos) ───
-- Ejecuta esto en Supabase Console → SQL Editor (después de equipo.sql).
-- Permite a cualquier miembro de un equipo intercambiar un día de su calendario
-- con el día equivalente de otro miembro (deben estar en el mismo equipo).

-- Intercambia el contenido del día (year-month-day) entre dos usuarios del equipo.
-- Returns: true si se hizo, error si no comparten equipo o no existe el día.
create or replace function public.intercambiar_turnos_miembros(
  p_equipo_id uuid,
  p_user_a uuid,
  p_user_b uuid,
  p_year int,
  p_month int,
  p_day int
)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_a_datos jsonb;
  v_b_datos jsonb;
  v_dia_a jsonb;
  v_dia_b jsonb;
  v_clave_month text;
  v_clave_day text;
begin
  -- Ambos deben pertenecer al equipo (incluyendo al que llama)
  if not exists (
    select 1 from public.miembros_equipo a
    join public.miembros_equipo b on b.equipo_id = a.equipo_id
    join public.miembros_equipo c on c.equipo_id = a.equipo_id
    where a.equipo_id = p_equipo_id
      and a.user_id = p_user_a
      and b.user_id = p_user_b
      and c.user_id = auth.uid()
  ) then
    raise exception 'Todos deben pertenecer al mismo equipo';
  end if;

  v_clave_month := p_month::text;
  v_clave_day := p_day::text;

  -- Leer datos actuales
  select coalesce(datos_turnos, '{}'::jsonb) into v_a_datos
  from public.usuarios_turnos where user_id = p_user_a;

  select coalesce(datos_turnos, '{}'::jsonb) into v_b_datos
  from public.usuarios_turnos where user_id = p_user_b;

  -- El día de cada uno en esa fecha (puede no existir manual; el auto lo calcula la app)
  v_dia_a := v_a_datos -> p_year::text -> v_clave_month -> v_clave_day;
  v_dia_b := v_b_datos -> p_year::text -> v_clave_month -> v_clave_day;

  -- Si ambos son nulos no hay nada que permutar
  if (v_dia_a is null and v_dia_b is null) then
    raise exception 'Ninguno de los dos tiene turno manual en esa fecha';
  end if;

  -- Intercambio: A recibe lo que tenía B (null → borramos la clave de A)
  if v_dia_b is null then
    v_a_datos := v_a_datos #- array[p_year::text, v_clave_month, v_clave_day];
  else
    v_a_datos := jsonb_set(v_a_datos, array[p_year::text, v_clave_month, v_clave_day], v_dia_b);
  end if;

  if v_dia_a is null then
    v_b_datos := v_b_datos #- array[p_year::text, v_clave_month, v_clave_day];
  else
    v_b_datos := jsonb_set(v_b_datos, array[p_year::text, v_clave_month, v_clave_day], v_dia_a);
  end if;

  update public.usuarios_turnos set datos_turnos = v_a_datos where user_id = p_user_a;
  update public.usuarios_turnos set datos_turnos = v_b_datos where user_id = p_user_b;

  return true;
end $$;