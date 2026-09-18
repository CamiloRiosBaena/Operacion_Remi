-- ════════════════════════════════════════════════════════════
-- Ingredientes, relación plato-ingrediente y extras
-- Complemento de seed.sql — pegar en Supabase SQL Editor
-- Idempotente: se puede correr varias veces sin duplicar datos
-- ════════════════════════════════════════════════════════════

-- ── 1. INGREDIENTES ─────────────────────────────────────────

insert into ingredientes (nombre, "unidadCompra", "gramosPorUnidad", "stockUnidades", "stockMinimoPorciones", eliminable)
select v.nombre, v.unidad, v.gramos, v.stock, v.minimo, v.eliminable
from (values
  ('Guineo verde',      'racimo', 12000::numeric, 5::numeric,  10, true),
  ('Costilla de cerdo',  'kg',     1000::numeric, 20::numeric, 10, true),
  ('Plátano verde',      'racimo', 12000::numeric, 4::numeric,  10, true),
  ('Hogao',              'kg',     1000::numeric, 5::numeric,  10, true),
  ('Frijoles',           'bulto',  50000::numeric, 2::numeric,  15, false),
  ('Arroz',              'bulto',  50000::numeric, 3::numeric,  15, false),
  ('Carne molida',       'kg',     1000::numeric, 15::numeric, 10, true),
  ('Chicharrón',         'kg',     1000::numeric, 10::numeric, 10, true),
  ('Huevo',              'unidad', 50::numeric,    100::numeric, 20, true),
  ('Aguacate',           'unidad', 200::numeric,   50::numeric,  10, true),
  ('Gallina criolla',    'kg',     1000::numeric, 20::numeric, 10, false),
  ('Yuca',               'bulto',  25000::numeric, 3::numeric,  10, true),
  ('Mazorca',            'unidad', 300::numeric,   40::numeric,  10, true),
  ('Coco',               'unidad', 500::numeric,   30::numeric,  10, true),
  ('Limón',              'kg',     1000::numeric, 15::numeric, 10, true),
  ('Mora',               'kg',     1000::numeric, 10::numeric, 10, true),
  ('Leche',              'litro',  1000::numeric, 20::numeric, 10, true),
  ('Leche condensada',   'kg',     1000::numeric, 10::numeric, 10, true),
  ('Crema de leche',     'litro',  1000::numeric, 10::numeric, 10, true),
  ('Bizcocho',           'kg',     1000::numeric, 5::numeric,  10, false),
  ('Oblea',              'unidad', 20::numeric,    200::numeric, 20, false),
  ('Arequipe',           'kg',     1000::numeric, 8::numeric,  10, true),
  ('Queso costeño',      'kg',     1000::numeric, 8::numeric,  10, true)
) as v(nombre, unidad, gramos, stock, minimo, eliminable)
where not exists (select 1 from ingredientes i where i.nombre = v.nombre);

-- ── 2. RELACIÓN PLATO ↔ INGREDIENTE (gramos por porción) ────

insert into plato_ingredientes ("gramosPorPorcion", id_plato, id_ingrediente)
select v.gramos, p.id, i.id
from (values
  ('Sopa de guineo',      'Guineo verde',      150::numeric),
  ('Sopa de guineo',      'Costilla de cerdo', 100::numeric),

  ('Patacones con hogao', 'Plátano verde',     200::numeric),
  ('Patacones con hogao', 'Hogao',              50::numeric),

  ('Bandeja paisa',       'Frijoles',          200::numeric),
  ('Bandeja paisa',       'Arroz',             150::numeric),
  ('Bandeja paisa',       'Carne molida',      120::numeric),
  ('Bandeja paisa',       'Chicharrón',         80::numeric),
  ('Bandeja paisa',       'Huevo',              50::numeric),
  ('Bandeja paisa',       'Aguacate',          100::numeric),

  ('Sancocho de gallina', 'Gallina criolla',   250::numeric),
  ('Sancocho de gallina', 'Yuca',              150::numeric),
  ('Sancocho de gallina', 'Plátano verde',     100::numeric),
  ('Sancocho de gallina', 'Mazorca',           100::numeric),

  ('Limonada de coco',    'Limón',              80::numeric),
  ('Limonada de coco',    'Coco',              100::numeric),
  ('Limonada de coco',    'Leche condensada',   50::numeric),

  ('Jugo de mora',        'Mora',              150::numeric),
  ('Jugo de mora',        'Leche',             100::numeric),

  ('Tres leches',         'Bizcocho',          150::numeric),
  ('Tres leches',         'Leche condensada',   80::numeric),
  ('Tres leches',         'Crema de leche',     80::numeric),
  ('Tres leches',         'Leche',             100::numeric),

  ('Obleas',               'Oblea',              20::numeric),
  ('Obleas',               'Arequipe',           40::numeric),
  ('Obleas',               'Queso costeño',      20::numeric)
) as v(plato, ingrediente, gramos)
join platos p on p.nombre = v.plato
join ingredientes i on i.nombre = v.ingrediente
where not exists (
  select 1 from plato_ingredientes pi
  where pi.id_plato = p.id and pi.id_ingrediente = i.id
);

-- ── 3. EXTRAS ────────────────────────────────────────────────

insert into extras (nombre, precio, id_plato)
select v.nombre, v.precio, p.id
from (values
  ('Extra chicharrón',        5000::numeric, 'Bandeja paisa'),
  ('Porción extra de arroz',  4000::numeric, 'Bandeja paisa'),
  ('Extra aguacate',          3000::numeric, 'Bandeja paisa'),
  ('Extra queso costeño',     3000::numeric, 'Obleas'),
  ('Extra arequipe',          2000::numeric, 'Obleas'),
  ('Extra crema de leche',    2000::numeric, 'Tres leches')
) as v(nombre, precio, plato)
join platos p on p.nombre = v.plato
where not exists (
  select 1 from extras e where e.nombre = v.nombre and e.id_plato = p.id
);
