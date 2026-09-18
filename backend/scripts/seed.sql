-- ════════════════════════════════════════════════════════════
-- Seed inicial de Operación Remi — pegar en Supabase SQL Editor
-- Idempotente: se puede correr varias veces sin duplicar datos
-- ════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── 1. USUARIOS (Supabase Auth + user_staff / clientes) ───────

do $$
declare v_id uuid;
begin
  if not exists (select 1 from auth.users where email = 'admin@remi.local') then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', 'admin@remi.local', crypt('Admin123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Admin Remi","rol":"admin"}', now(), now());
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_id, v_id::text, jsonb_build_object('sub', v_id::text, 'email', 'admin@remi.local'), 'email', now(), now(), now());
    insert into public.user_staff (supabase_uid, nombre, correo, rol) values (v_id, 'Admin Remi', 'admin@remi.local', 'admin');
  end if;
end $$;

do $$
declare v_id uuid;
begin
  if not exists (select 1 from auth.users where email = 'cocina@remi.local') then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', 'cocina@remi.local', crypt('Cocina123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Cocina Remi","rol":"cocinero"}', now(), now());
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_id, v_id::text, jsonb_build_object('sub', v_id::text, 'email', 'cocina@remi.local'), 'email', now(), now(), now());
    insert into public.user_staff (supabase_uid, nombre, correo, rol) values (v_id, 'Cocina Remi', 'cocina@remi.local', 'cocinero');
  end if;
end $$;

do $$
declare v_id uuid;
begin
  if not exists (select 1 from auth.users where email = 'domicilios@remi.local') then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', 'domicilios@remi.local', crypt('Domicilio123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Domicilios Remi","rol":"domiciliario"}', now(), now());
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_id, v_id::text, jsonb_build_object('sub', v_id::text, 'email', 'domicilios@remi.local'), 'email', now(), now(), now());
    insert into public.user_staff (supabase_uid, nombre, correo, rol) values (v_id, 'Domicilios Remi', 'domicilios@remi.local', 'domiciliario');
  end if;
end $$;

do $$
declare v_id uuid;
begin
  if not exists (select 1 from auth.users where email = 'cliente@remi.local') then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', 'cliente@remi.local', crypt('Cliente123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Cliente Demo","rol":"cliente"}', now(), now());
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_id, v_id::text, jsonb_build_object('sub', v_id::text, 'email', 'cliente@remi.local'), 'email', now(), now(), now());
    insert into public.clientes (supabase_uid, nombre, correo) values (v_id, 'Cliente Demo', 'cliente@remi.local');
  end if;
end $$;

-- ── 2. CATEGORÍAS ───────────────────────────────────────────

insert into categorias (nombre) values
  ('Entradas'), ('Platos fuertes'), ('Bebidas'), ('Postres')
on conflict (nombre) do nothing;

-- ── 3. PLATOS ────────────────────────────────────────────────

insert into platos (nombre, precio, descripcion, disponible, "tasaIva", id_categoria)
select v.nombre, v.precio, v.descripcion, true, 0.19, c.id
from (values
  ('Sopa de guineo',      12000, 'Sopa tradicional con guineo verde y costilla',              'Entradas'),
  ('Patacones con hogao', 10000, 'Patacones crocantes con hogao casero',                      'Entradas'),
  ('Bandeja paisa',       32000, 'Frijoles, arroz, carne molida, chicharrón, huevo, aguacate', 'Platos fuertes'),
  ('Sancocho de gallina', 28000, 'Sancocho tradicional con gallina criolla',                   'Platos fuertes'),
  ('Limonada de coco',     9000, 'Limonada natural con leche de coco',                         'Bebidas'),
  ('Jugo de mora',         7000, 'Jugo natural de mora en agua o leche',                       'Bebidas'),
  ('Tres leches',         11000, 'Postre clásico bañado en tres leches',                       'Postres'),
  ('Obleas',                6000, 'Oblea con arequipe, queso y frutas',                         'Postres')
) as v(nombre, precio, descripcion, categoria)
join categorias c on c.nombre = v.categoria
where not exists (select 1 from platos p where p.nombre = v.nombre);

-- ── 4. MESAS ─────────────────────────────────────────────────

insert into mesas (numero)
select generate_series(1, 10)
on conflict (numero) do nothing;
