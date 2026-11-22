-- Semilla del menú para la base de datos de PRUEBA (contenedor remi-test-db).
-- La usan las pruebas de métricas externas (sección 3.3). No se ejecuta en Supabase.
-- Borra los datos y deja 4 categorías, 9 platos, 6 ingredientes, 10 mesas y 1 promoción.
TRUNCATE categorias, platos, ingredientes, plato_ingredientes, extras, mesas, promos_banner,
         pedidos, detalles_pedido, historial_estado, pagos, tokens_qr
  RESTART IDENTITY CASCADE;

INSERT INTO categorias (nombre) VALUES
  ('Platos fuertes'), ('Entradas'), ('Bebidas'), ('Postres');

INSERT INTO platos (nombre, precio, descripcion, disponible, "tasaIva", id_categoria) VALUES
  ('Bandeja Paisa', 32000, 'Frijoles, arroz, carne molida, chicharrón, huevo y aguacate', true, 0.19, 1),
  ('Ajiaco Colombiano', 28000, 'Sopa de tres papas con pollo, guascas y mazorca', true, 0.19, 1),
  ('Sancocho de Gallina', 30000, 'Gallina criolla con yuca, plátano y papa', true, 0.19, 1),
  ('Empanadas x3', 9000, 'Empanadas de carne con ají', true, 0.19, 2),
  ('Patacones con Hogao', 12000, 'Patacones con hogao y queso costeño', true, 0.19, 2),
  ('Limonada de Coco', 9500, 'Limonada natural con crema de coco', true, 0.19, 3),
  ('Jugo de Lulo', 7000, 'Jugo natural de lulo en agua o en leche', true, 0.19, 3),
  ('Postre de Natas', 8500, 'Postre tradicional de natas', true, 0.19, 4),
  ('Arroz con Leche', 7500, 'Arroz con leche y canela', true, 0.19, 4);

INSERT INTO ingredientes (nombre, "unidadCompra", "gramosPorUnidad", "stockUnidades", "stockMinimoPorciones") VALUES
  ('Frijol cargamanto', 'Kg', 1000, 20, 10),
  ('Arroz blanco', 'Bulto', 25000, 4, 10),
  ('Papa criolla', 'Kg', 1000, 15, 10),
  ('Pechuga de pollo', 'Kg', 1000, 12, 10),
  ('Plátano verde', 'Caja', 10000, 3, 10),
  ('Lulo', 'Kg', 1000, 8, 10);

INSERT INTO mesas (numero) SELECT generate_series(1, 10);

INSERT INTO promos_banner (tag, titulo, subtitulo, cta, "ctaAccion", "ctaValor", activo, orden)
VALUES ('Promo', 'Martes de ajiaco', 'Ajiaco con 15 % de descuento', 'Ver plato', 'plato', '2', true, 1);
