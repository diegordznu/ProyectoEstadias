-- Pruebas de ubicaciones, movimientos y vistas. Todo se deshace al final (RAISE 'deshacer'); no queda ningún dato.
CREATE OR REPLACE FUNCTION pg_temp.probar_inventario()
RETURNS TABLE (n int, prueba text, esperado text, resultado text)
LANGUAGE plpgsql AS $fn$
DECLARE
  r text[] := '{}';
  p1 bigint; p2 bigint; cons bigint;
  x text;
BEGIN
  SELECT id INTO p1   FROM public.ubicaciones WHERE nombre = 'Planta 1';
  SELECT id INTO p2   FROM public.ubicaciones WHERE nombre = 'Planta 2';
  SELECT id INTO cons FROM public.ubicaciones WHERE nombre = 'Consumo';
  BEGIN
    INSERT INTO public.materiales (id, sku, nombre) VALUES (-1, 'TEST-MAT', 'MATERIAL DE PRUEBA');
    INSERT INTO public.ubicaciones (id, nombre, tipo) VALUES (-1, 'TEST-PROVEEDOR', 'PROVEEDOR');

    -- 1-3: movimientos válidos (ejemplo: entran 50 a Planta 1, salen 20 a Planta 2, Planta 2 consume 5)
    BEGIN INSERT INTO public.movimientos (id, fecha, material_id, lote, origen_id, origen_tipo, destino_id, destino_tipo, cantidad)
          VALUES (-1, '2026-11-18 08:15', -1, 'L-TEST', -1, 'PROVEEDOR', p1, 'PLANTA', 50); r := r || 'ACEPTADO'::text;
    EXCEPTION WHEN others THEN r := r || ('RECHAZADO: ' || SQLERRM); END;
    BEGIN INSERT INTO public.movimientos (id, fecha, material_id, lote, origen_id, origen_tipo, destino_id, destino_tipo, cantidad)
          VALUES (-2, '2026-11-18 09:30', -1, 'L-TEST', p1, 'PLANTA', p2, 'PLANTA', 20); r := r || 'ACEPTADO'::text;
    EXCEPTION WHEN others THEN r := r || ('RECHAZADO: ' || SQLERRM); END;
    BEGIN INSERT INTO public.movimientos (id, fecha, material_id, lote, origen_id, origen_tipo, destino_id, destino_tipo, cantidad)
          VALUES (-3, '2026-11-18 10:45', -1, 'L-TEST', p2, 'PLANTA', cons, 'CONSUMO', 5); r := r || 'ACEPTADO'::text;
    EXCEPTION WHEN others THEN r := r || ('RECHAZADO: ' || SQLERRM); END;

    -- 4-5: vistas
    SELECT string_agg(planta || '=' || existencia, ' ' ORDER BY planta) INTO x FROM public.v_inventario WHERE sku = 'TEST-MAT';
    r := r || x;
    SELECT count(*)::text || ' movimientos, origen ' || min(origen) INTO x FROM public.v_movimientos WHERE material = 'TEST-MAT' AND (origen = 'Planta 1' OR destino = 'Planta 1');
    r := r || x;

    -- 6-16: casos inválidos
    BEGIN INSERT INTO public.movimientos (fecha, material_id, lote, origen_id, origen_tipo, destino_id, destino_tipo, cantidad)
          VALUES (now(), -1, 'L-TEST', p1, 'PLANTA', -1, 'PROVEEDOR', 5); r := r || 'ACEPTADO'::text;
    EXCEPTION WHEN others THEN r := r || ('RECHAZADO: ' || SQLERRM); END;
    BEGIN INSERT INTO public.movimientos (fecha, material_id, lote, origen_id, origen_tipo, destino_id, destino_tipo, cantidad)
          VALUES (now(), -1, 'L-TEST', p1, 'PLANTA', -1, 'PLANTA', 5); r := r || 'ACEPTADO'::text;
    EXCEPTION WHEN others THEN r := r || ('RECHAZADO: ' || SQLERRM); END;
    BEGIN INSERT INTO public.movimientos (fecha, material_id, lote, origen_id, origen_tipo, destino_id, destino_tipo, cantidad)
          VALUES (now(), -1, 'L-TEST', cons, 'PLANTA', p1, 'PLANTA', 5); r := r || 'ACEPTADO'::text;
    EXCEPTION WHEN others THEN r := r || ('RECHAZADO: ' || SQLERRM); END;
    BEGIN INSERT INTO public.movimientos (fecha, material_id, lote, origen_id, origen_tipo, destino_id, destino_tipo, cantidad)
          VALUES (now(), -1, 'L-TEST', -1, 'PROVEEDOR', cons, 'CONSUMO', 5); r := r || 'ACEPTADO'::text;
    EXCEPTION WHEN others THEN r := r || ('RECHAZADO: ' || SQLERRM); END;
    BEGIN INSERT INTO public.movimientos (fecha, material_id, lote, origen_id, origen_tipo, destino_id, destino_tipo, cantidad)
          VALUES (now(), -1, 'L-TEST', p1, 'PLANTA', p1, 'PLANTA', 5); r := r || 'ACEPTADO'::text;
    EXCEPTION WHEN others THEN r := r || ('RECHAZADO: ' || SQLERRM); END;
    BEGIN INSERT INTO public.movimientos (fecha, material_id, lote, origen_id, origen_tipo, destino_id, destino_tipo, cantidad)
          VALUES (now(), -1, 'L-TEST', p1, 'PLANTA', p2, 'PLANTA', 0); r := r || 'ACEPTADO'::text;
    EXCEPTION WHEN others THEN r := r || ('RECHAZADO: ' || SQLERRM); END;
    BEGIN INSERT INTO public.movimientos (fecha, material_id, lote, origen_id, origen_tipo, destino_id, destino_tipo, cantidad)
          VALUES (now(), -999, 'L-TEST', p1, 'PLANTA', p2, 'PLANTA', 5); r := r || 'ACEPTADO'::text;
    EXCEPTION WHEN others THEN r := r || ('RECHAZADO: ' || SQLERRM); END;
    BEGIN INSERT INTO public.movimientos (fecha, material_id, lote, origen_id, origen_tipo, destino_id, destino_tipo, cantidad)
          VALUES (now(), -1, '  ', p1, 'PLANTA', p2, 'PLANTA', 5); r := r || 'ACEPTADO'::text;
    EXCEPTION WHEN others THEN r := r || ('RECHAZADO: ' || SQLERRM); END;
    BEGIN INSERT INTO public.movimientos (fecha, material_id, lote, origen_id, origen_tipo, destino_id, destino_tipo, cantidad)
          VALUES (NULL, -1, 'L-TEST', p1, 'PLANTA', p2, 'PLANTA', 5); r := r || 'ACEPTADO'::text;
    EXCEPTION WHEN others THEN r := r || ('RECHAZADO: ' || SQLERRM); END;
    BEGIN INSERT INTO public.ubicaciones (id, nombre, tipo) VALUES (-2, 'Planta 1', 'PLANTA'); r := r || 'ACEPTADO'::text;
    EXCEPTION WHEN others THEN r := r || ('RECHAZADO: ' || SQLERRM); END;
    BEGIN INSERT INTO public.ubicaciones (id, nombre, tipo) VALUES (-3, 'TEST-ALMACEN', 'ALMACEN'); r := r || 'ACEPTADO'::text;
    EXCEPTION WHEN others THEN r := r || ('RECHAZADO: ' || SQLERRM); END;

    RAISE EXCEPTION 'deshacer';
  EXCEPTION WHEN raise_exception THEN NULL;
  END;
  RETURN QUERY
  SELECT t.i, t.p, t.e, r[t.i] FROM (VALUES
    (1,  'Entrada: proveedor → Planta 1 (50)', 'ACEPTADO'),
    (2,  'Traspaso: Planta 1 → Planta 2 (20)', 'ACEPTADO'),
    (3,  'Consumo: Planta 2 → Consumo (5)', 'ACEPTADO'),
    (4,  'v_inventario del material', 'Planta 1=30 Planta 2=15 Planta 3=0 Planta 6=0'),
    (5,  'v_movimientos de Planta 1', '2 movimientos'),
    (6,  'Proveedor como destino', 'RECHAZADO'),
    (7,  'Proveedor disfrazado de planta', 'RECHAZADO'),
    (8,  'Consumo como origen', 'RECHAZADO'),
    (9,  'Proveedor directo a Consumo', 'RECHAZADO'),
    (10, 'Origen igual a destino', 'RECHAZADO'),
    (11, 'Cantidad 0', 'RECHAZADO'),
    (12, 'Material inexistente', 'RECHAZADO'),
    (13, 'Lote en blanco', 'RECHAZADO'),
    (14, 'Sin fecha', 'RECHAZADO'),
    (15, 'Ubicación repetida (Planta 1)', 'RECHAZADO'),
    (16, 'Tipo de ubicación inválido', 'RECHAZADO')) AS t(i, p, e)
  UNION ALL
  SELECT 17, 'Datos de prueba que quedaron', '0',
         ((SELECT count(*) FROM public.materiales  WHERE id < 0) +
          (SELECT count(*) FROM public.ubicaciones WHERE id < 0) +
          (SELECT count(*) FROM public.movimientos))::text
  UNION ALL
  SELECT 18, 'Ubicaciones iniciales', 'Consumo, Planta 1, Planta 2, Planta 3, Planta 6',
         (SELECT string_agg(nombre, ', ' ORDER BY nombre) FROM public.ubicaciones)
  ORDER BY 1;
END
$fn$;
SELECT * FROM pg_temp.probar_inventario();
