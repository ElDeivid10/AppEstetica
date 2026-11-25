-- =============================================================================
-- RESTAURAR CATÁLOGO OFICIAL Y ACTUALIZAR FUNCIÓN DE GUÍA COMPLETADA
-- Ejecutar en el SQL Editor de Supabase (idempotente: no borra usuarios ni citas)
-- =============================================================================

-- 1. RPC segura para marcar la guía de bienvenida como completada
CREATE OR REPLACE FUNCTION public.marcar_guia_completada()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.usuarios
  SET guia_completada = TRUE,
      actualizado_en = NOW()
  WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.marcar_guia_completada() TO authenticated;

-- 2. Restaurar catálogo oficial de SERVICIOS (tal como estaba originalmente)
INSERT INTO public.servicios (
  id, nombre, duracion_texto, duracion_min, icono, tags,
  requiere_anticipo, monto_anticipo, tiene_precio_fijo, descripcion, activo
)
VALUES
('srv-001', 'Cortes de Cabello', '30 MIN', 30, '✂️', '["Dama", "Caballero", "Niños", "Niñas"]'::jsonb, FALSE, 0.00, FALSE, 'Cortes modernos y clásicos adaptados a cada persona.', TRUE),
('srv-002', 'Perfilado de Barba', '20 MIN', 20, '🪒', '["Caballero"]'::jsonb, FALSE, 0.00, FALSE, 'Definición y perfilado para un acabado limpio y estilizado.', TRUE),
('srv-003', 'Colorimetría', '2H 30M', 150, '🎨', '["Mechas", "Tintes", "Balayage", "Baby Lights", "Rayos"]'::jsonb, TRUE, 300.00, FALSE, 'Colores personalizados con técnicas de última generación. Requiere anticipo.', TRUE),
('srv-004', 'Maquillaje y Peinado', '60 MIN', 60, '💄', '["Social", "Novia", "Graduación"]'::jsonb, FALSE, 0.00, FALSE, 'Realza tu belleza natural para cualquier ocasión especial.', TRUE),
('srv-005', 'Depilaciones', '30 MIN', 30, '✨', '["Cejas", "Bigote", "Axilas", "Piernas"]'::jsonb, FALSE, 0.00, FALSE, 'Técnicas suaves y eficaces para una piel perfectamente suave.', TRUE),
('srv-006', 'Alaciados Progresivos', '3 HORAS', 180, '💆', '["Keratina", "Botox Capilar", "Nanoplastia"]'::jsonb, TRUE, 500.00, FALSE, 'Alisa y suaviza el cabello de forma duradera y profunda. Requiere anticipo.', TRUE)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  duracion_texto = EXCLUDED.duracion_texto,
  duracion_min = EXCLUDED.duracion_min,
  icono = EXCLUDED.icono,
  tags = EXCLUDED.tags,
  requiere_anticipo = EXCLUDED.requiere_anticipo,
  monto_anticipo = EXCLUDED.monto_anticipo,
  tiene_precio_fijo = EXCLUDED.tiene_precio_fijo,
  descripcion = EXCLUDED.descripcion,
  activo = EXCLUDED.activo;

-- 3. Restaurar catálogo oficial de PRODUCTOS
INSERT INTO public.productos (id, marca, nombre, precio, stock, imagen_url, activo)
VALUES
('prod-1', 'L’Oréal Professionnel', 'Vitamino Color Spectrum · Acondicionador', 520.00, TRUE, 'https://www.sephora.com/productimages/sku/s2717411-main-zoom.jpg', TRUE),
('prod-2', 'Wella Professionals', 'Color Fresh Mask · Copper Glow', 690.00, TRUE, 'https://wella.bynder.com/m/cdb6a5785d08b9f5/original/Wella_Professionals_Color_Fresh_Mask_Copper_Glow_150ml_PI_1.png', TRUE),
('prod-3', 'Olaplex', 'No.5 Bond Maintenance · Acondicionador', 780.00, FALSE, 'https://olaplex.com/cdn/shop/articles/Large_JPG-TEXTURE_N5_WHITE_BG_W_PRODUCT_3000x3000_0faafb22-1f16-42ff-b774-7361fdaa005f.jpg', TRUE),
('prod-4', 'Kérastase', 'Chroma Absolu Fondant', 1150.00, TRUE, 'https://www.kerastase.com.br/dw/image/v2/AAFM_PRD/on/demandware.static/-/Sites-kerastase-master-catalog/pt_BR/dw831df1bc/images/KRBR00119/condicionador-kerastase-%20chroma-absolu-fondant-cica-chroma.jpg', TRUE)
ON CONFLICT (id) DO UPDATE SET
  marca = EXCLUDED.marca,
  nombre = EXCLUDED.nombre,
  precio = EXCLUDED.precio,
  stock = EXCLUDED.stock,
  imagen_url = EXCLUDED.imagen_url,
  activo = EXCLUDED.activo;

-- 4. Restaurar horarios del salón si no existen
INSERT INTO public.horarios_salon (dia_semana, dia_nombre, apertura_turno1, cierre_turno1, apertura_turno2, cierre_turno2, es_cerrado)
SELECT * FROM (VALUES
  (1, 'Lunes',     '11:00'::time, '14:00'::time, '16:00'::time, '19:00'::time, FALSE),
  (2, 'Martes',    '11:00'::time, '14:00'::time, '16:00'::time, '19:00'::time, FALSE),
  (3, 'Miércoles', '11:00'::time, '14:00'::time, '16:00'::time, '19:00'::time, FALSE),
  (4, 'Jueves',    '11:00'::time, '14:00'::time, '16:00'::time, '19:00'::time, FALSE),
  (5, 'Viernes',   '11:00'::time, '14:00'::time, '16:00'::time, '19:00'::time, FALSE),
  (6, 'Sábado',    '11:00'::time, '18:00'::time, NULL::time,    NULL::time,    FALSE),
  (0, 'Domingo',   NULL::time,    NULL::time,    NULL::time,    NULL::time,    TRUE)
) AS v(dia_semana, dia_nombre, apertura_turno1, cierre_turno1, apertura_turno2, cierre_turno2, es_cerrado)
WHERE NOT EXISTS (SELECT 1 FROM public.horarios_salon);

-- 5. Restaurar catálogo oficial de RECOMPENSAS
INSERT INTO public.recompensas (id, icono, titulo, descripcion, tipo, categoria, servicio_match_id, meta, unidad, nivel_tier, activo)
VALUES
('r1', '✂️', 'Corte de cabello gratis', 'Un corte profesional de dama o caballero sin costo para ti.', 'visitas', 'servicio', 'srv-001', 10, 'visitas', 1, TRUE),
('r2', '🧴', 'Producto capilar a elegir', 'Llévate un tratamiento o acondicionador del catálogo.', 'gasto', 'producto', NULL, 2000, 'MXN en compras', 1, TRUE),
('r3', '✨', 'Tratamiento capilar gratis', 'Sesión de hidratación profunda o mascarilla reconstructora.', 'gasto', 'servicio', 'srv-006', 3500, 'MXN en compras', 1, TRUE),
('r4', '💅', 'Diseño de cejas gratis', 'Perfilado y diseño completo de cejas sin costo.', 'visitas', 'servicio', 'srv-005', 5, 'visitas', 1, TRUE),
('r5', '🎁', 'Kit de productos premium', 'Set completo de cuidado capilar valorado en $1,500.', 'gasto', 'producto', NULL, 6000, 'MXN en compras', 1, TRUE)
ON CONFLICT (id) DO UPDATE SET
  icono = EXCLUDED.icono,
  titulo = EXCLUDED.titulo,
  descripcion = EXCLUDED.descripcion,
  tipo = EXCLUDED.tipo,
  categoria = EXCLUDED.categoria,
  servicio_match_id = EXCLUDED.servicio_match_id,
  meta = EXCLUDED.meta,
  unidad = EXCLUDED.unidad,
  activo = EXCLUDED.activo;

-- 6. Bucket público en Supabase Storage para fotos de perfil
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Avatares públicos visibles para todos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios suben su propio avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios actualizan su propio avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios borran su propio avatar" ON storage.objects;

CREATE POLICY "Avatares públicos visibles para todos" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Usuarios suben su propio avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Usuarios actualizan su propio avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Usuarios borran su propio avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND auth.role() = 'authenticated'
  );

-- 7. Activar Supabase Realtime en TODAS las tablas de la app
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.citas; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes_chat; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pagos_mercadopago; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.servicios; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.productos; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.recompensas; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.recompensas_usuario; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.horarios_salon; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.favoritos; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.usuarios; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
