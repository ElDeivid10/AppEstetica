-- =============================================================================
-- REPARACIÓN COMPLETA · YOSS BEAUTY SALON
-- Ejecutar COMPLETO en Supabase -> SQL Editor (es idempotente, no borra citas ni usuarios)
-- Qué repara:
--   1. Otorga permisos PostgreSQL (GRANT) al esquema, tablas y secuencias para anon/authenticated
--   2. Reconstruye TODAS las políticas RLS limpias en las 10 tablas
--   3. Asegura funciones RPC (is_admin, get_login_email, obtener_slots_ocupados, marcar_guia_completada)
--   4. Corrige roles, nombres y teléfonos en public.usuarios desde auth.users
--   5. Restaura catálogo oficial (6 servicios, 4 productos, 7 horarios, 5 recompensas)
--   6. Configura bucket público avatars y políticas de Storage
--   7. Activa Supabase Realtime en las 10 tablas
-- =============================================================================

-- ── 1. PERMISOS POSTGRESQL (CRÍTICO: resuelve error 42501 permission denied) ──
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON public.servicios, public.productos, public.horarios_salon, public.recompensas TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.usuarios,
  public.servicios,
  public.productos,
  public.horarios_salon,
  public.citas,
  public.pagos_mercadopago,
  public.recompensas,
  public.recompensas_usuario,
  public.mensajes_chat,
  public.favoritos
TO authenticated;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- ── 2. FUNCIONES AUXILIARES Y RPCs ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios
    WHERE id = auth.uid()
      AND rol = 'admin'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_login_email(p_identifier TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_clean TEXT;
  v_email TEXT;
BEGIN
  v_clean := trim(coalesce(p_identifier, ''));
  IF v_clean = '' THEN
    RETURN NULL;
  END IF;

  IF position('@' IN v_clean) > 0 THEN
    RETURN lower(v_clean);
  END IF;

  v_clean := regexp_replace(v_clean, '[^0-9]', '', 'g');
  SELECT email INTO v_email
  FROM public.usuarios
  WHERE regexp_replace(coalesce(telefono, ''), '[^0-9]', '', 'g') = v_clean
  LIMIT 1;

  RETURN v_email;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_login_email(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.obtener_slots_ocupados(
  p_fecha_inicio DATE DEFAULT CURRENT_DATE,
  p_fecha_fin DATE DEFAULT (CURRENT_DATE + INTERVAL '90 days')::DATE
)
RETURNS TABLE (
  id VARCHAR,
  iso_date TEXT,
  hora_cita VARCHAR,
  duracion_min INT,
  servicio_nombre VARCHAR,
  estado VARCHAR,
  expira_en TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    c.id,
    to_char(c.fecha_cita, 'YYYY-MM-DD') AS iso_date,
    c.hora_cita,
    c.duracion_min,
    c.servicio_nombre,
    c.estado,
    c.expira_en
  FROM public.citas c
  WHERE c.fecha_cita BETWEEN p_fecha_inicio AND p_fecha_fin
    AND c.estado NOT IN ('Cancelada', 'No asistió', 'Expirada');
$$;
GRANT EXECUTE ON FUNCTION public.obtener_slots_ocupados(DATE, DATE) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.marcar_guia_completada()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.usuarios
  SET guia_completada = TRUE, actualizado_en = NOW()
  WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.marcar_guia_completada() TO authenticated;

-- ── 3. LIMPIAR Y RECREAR TODAS LAS POLÍTICAS RLS EN LAS 10 TABLAS ────────────
ALTER TABLE public.usuarios             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_salon       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_mercadopago    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recompensas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recompensas_usuario  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_chat        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favoritos            ENABLE ROW LEVEL SECURITY;

-- Eliminar cualquier política previa en estas 10 tablas para evitar conflictos
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'usuarios','servicios','productos','horarios_salon','citas',
        'pagos_mercadopago','recompensas','recompensas_usuario','mensajes_chat','favoritos'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- Catálogos públicos (lectura para todos; escritura solo admin)
CREATE POLICY "Servicios visibles para todos" ON public.servicios FOR SELECT USING (true);
CREATE POLICY "Admin gestiona servicios" ON public.servicios FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Productos visibles para todos" ON public.productos FOR SELECT USING (true);
CREATE POLICY "Admin gestiona productos" ON public.productos FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Horarios visibles para todos" ON public.horarios_salon FOR SELECT USING (true);
CREATE POLICY "Admin gestiona horarios" ON public.horarios_salon FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Recompensas visibles para todos" ON public.recompensas FOR SELECT USING (true);
CREATE POLICY "Admin gestiona recompensas" ON public.recompensas FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Usuarios
CREATE POLICY "Usuarios ven su perfil o admin ve todos" ON public.usuarios
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Usuarios crean su propio perfil" ON public.usuarios
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuarios actualizan su perfil o admin" ON public.usuarios
  FOR UPDATE USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    public.is_admin()
    OR (auth.uid() = id AND rol = 'cliente')
  );

-- Citas
CREATE POLICY "Clientes ven sus propias citas" ON public.citas
  FOR SELECT USING (auth.uid() = cliente_id OR public.is_admin());

CREATE POLICY "Clientes crean sus citas" ON public.citas
  FOR INSERT WITH CHECK (auth.uid() = cliente_id OR public.is_admin());

CREATE POLICY "Clientes y admin actualizan citas" ON public.citas
  FOR UPDATE USING (auth.uid() = cliente_id OR public.is_admin())
  WITH CHECK (auth.uid() = cliente_id OR public.is_admin());

-- Pagos Mercado Pago
CREATE POLICY "Pagos visibles por dueño o admin" ON public.pagos_mercadopago
  FOR SELECT USING (auth.uid() = cliente_id OR public.is_admin());

CREATE POLICY "Clientes y admin registran pagos" ON public.pagos_mercadopago
  FOR INSERT WITH CHECK (auth.uid() = cliente_id OR public.is_admin());

CREATE POLICY "Admin o dueño actualiza pagos" ON public.pagos_mercadopago
  FOR UPDATE USING (auth.uid() = cliente_id OR public.is_admin())
  WITH CHECK (auth.uid() = cliente_id OR public.is_admin());

-- Recompensas por usuario
CREATE POLICY "Progreso recompensas propio o admin" ON public.recompensas_usuario
  FOR ALL USING (auth.uid() = usuario_id OR public.is_admin())
  WITH CHECK (auth.uid() = usuario_id OR public.is_admin());

-- Mensajes de chat
CREATE POLICY "Chat propio o admin" ON public.mensajes_chat
  FOR ALL USING (auth.uid() = cliente_id OR public.is_admin())
  WITH CHECK (auth.uid() = cliente_id OR public.is_admin());

-- Favoritos
CREATE POLICY "Favoritos propios o admin" ON public.favoritos
  FOR ALL USING (auth.uid() = usuario_id OR public.is_admin())
  WITH CHECK (auth.uid() = usuario_id OR public.is_admin());

-- ── 4. CORREGIR ROLES Y NOMBRE EN public.usuarios ────────────────────────────
UPDATE public.usuarios u
SET
  nombre = CASE
    WHEN u.nombre IS NULL OR u.nombre = '' OR u.nombre = split_part(u.email, '@', 1)
    THEN coalesce(
           nullif(trim(au.raw_user_meta_data->>'nombre'), ''),
           split_part(u.email, '@', 1)
         )
    ELSE u.nombre
  END,
  telefono = CASE
    WHEN u.telefono IS NULL OR u.telefono = ''
    THEN nullif(trim(coalesce(au.raw_user_meta_data->>'telefono', '')), '')
    ELSE u.telefono
  END,
  rol = CASE
    WHEN lower(u.email) = 'yoss@yossbeautysalon.com' THEN 'admin'
    WHEN u.rol IS NULL OR u.rol = '' THEN
      coalesce(nullif(trim(au.raw_user_meta_data->>'rol'), ''), 'cliente')
    ELSE u.rol
  END,
  perfil_cabello = CASE
    WHEN u.perfil_cabello IS NULL OR u.perfil_cabello = ''
    THEN coalesce(nullif(trim(au.raw_user_meta_data->>'perfil_cabello'), ''), 'Por definir')
    ELSE u.perfil_cabello
  END,
  alergias = CASE
    WHEN u.alergias IS NULL OR u.alergias = ''
    THEN coalesce(nullif(trim(au.raw_user_meta_data->>'alergias'), ''), 'Ninguna registrada')
    ELSE u.alergias
  END
FROM auth.users au
WHERE au.id = u.id;

UPDATE public.usuarios
SET rol = 'cliente'
WHERE rol IS NULL OR rol = '';

UPDATE public.usuarios
SET rol = 'admin',
    telefono = '123',
    nombre = coalesce(nullif(nombre, ''), 'Yoss (Dueña)'),
    guia_completada = TRUE
WHERE lower(email) = 'yoss@yossbeautysalon.com';

-- Insertar filas faltantes en public.usuarios para auth.users sin fila
INSERT INTO public.usuarios (
  id, email, password_hash, rol, nombre, telefono, alergias, perfil_cabello, guia_completada
)
SELECT
  au.id,
  au.email,
  'supabase_auth',
  CASE
    WHEN lower(au.email) = 'yoss@yossbeautysalon.com' THEN 'admin'
    ELSE coalesce(nullif(trim(au.raw_user_meta_data->>'rol'), ''), 'cliente')
  END,
  coalesce(nullif(trim(au.raw_user_meta_data->>'nombre'), ''), split_part(au.email, '@', 1)),
  nullif(trim(coalesce(au.raw_user_meta_data->>'telefono', '')), ''),
  coalesce(nullif(trim(au.raw_user_meta_data->>'alergias'), ''), 'Ninguna registrada'),
  coalesce(nullif(trim(au.raw_user_meta_data->>'perfil_cabello'), ''), 'Por definir'),
  CASE WHEN lower(au.email) = 'yoss@yossbeautysalon.com' THEN TRUE ELSE FALSE END
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.usuarios u WHERE u.id = au.id);

-- ── 5. RESTAURAR CATÁLOGO DE SERVICIOS ───────────────────────────────────────
INSERT INTO public.servicios (
  id, nombre, duracion_texto, duracion_min, icono, tags,
  requiere_anticipo, monto_anticipo, tiene_precio_fijo, descripcion, activo
) VALUES
('srv-001','Cortes de Cabello','30 MIN',30,'✂️','["Dama","Caballero","Niños","Niñas"]'::jsonb,FALSE,0.00,FALSE,'Cortes modernos y clásicos adaptados a cada persona.',TRUE),
('srv-002','Perfilado de Barba','20 MIN',20,'🪒','["Caballero"]'::jsonb,FALSE,0.00,FALSE,'Definición y perfilado para un acabado limpio y estilizado.',TRUE),
('srv-003','Colorimetría','2H 30M',150,'🎨','["Mechas","Tintes","Balayage","Baby Lights","Rayos"]'::jsonb,TRUE,300.00,FALSE,'Colores personalizados con técnicas de última generación. Requiere anticipo.',TRUE),
('srv-004','Maquillaje y Peinado','60 MIN',60,'💄','["Social","Novia","Graduación"]'::jsonb,FALSE,0.00,FALSE,'Realza tu belleza natural para cualquier ocasión especial.',TRUE),
('srv-005','Depilaciones','30 MIN',30,'✨','["Cejas","Bigote","Axilas","Piernas"]'::jsonb,FALSE,0.00,FALSE,'Técnicas suaves y eficaces para una piel perfectamente suave.',TRUE),
('srv-006','Alaciados Progresivos','3 HORAS',180,'💆','["Keratina","Botox Capilar","Nanoplastia"]'::jsonb,TRUE,500.00,FALSE,'Alisa y suaviza el cabello de forma duradera y profunda. Requiere anticipo.',TRUE)
ON CONFLICT (id) DO UPDATE SET
  nombre             = EXCLUDED.nombre,
  duracion_texto     = EXCLUDED.duracion_texto,
  duracion_min       = EXCLUDED.duracion_min,
  icono              = EXCLUDED.icono,
  tags               = EXCLUDED.tags,
  requiere_anticipo  = EXCLUDED.requiere_anticipo,
  monto_anticipo     = EXCLUDED.monto_anticipo,
  tiene_precio_fijo  = EXCLUDED.tiene_precio_fijo,
  descripcion        = EXCLUDED.descripcion,
  activo             = EXCLUDED.activo;

-- ── 6. RESTAURAR CATÁLOGO DE PRODUCTOS ───────────────────────────────────────
INSERT INTO public.productos (id, marca, nombre, precio, stock, imagen_url, activo) VALUES
('prod-1','L''Oréal Professionnel','Vitamino Color Spectrum · Acondicionador',520.00,TRUE,'https://www.sephora.com/productimages/sku/s2717411-main-zoom.jpg',TRUE),
('prod-2','Wella Professionals','Color Fresh Mask · Copper Glow',690.00,TRUE,'https://wella.bynder.com/m/cdb6a5785d08b9f5/original/Wella_Professionals_Color_Fresh_Mask_Copper_Glow_150ml_PI_1.png',TRUE),
('prod-3','Olaplex','No.5 Bond Maintenance · Acondicionador',780.00,FALSE,'https://olaplex.com/cdn/shop/articles/Large_JPG-TEXTURE_N5_WHITE_BG_W_PRODUCT_3000x3000_0faafb22-1f16-42ff-b774-7361fdaa005f.jpg',TRUE),
('prod-4','Kérastase','Chroma Absolu Fondant',1150.00,TRUE,'https://www.kerastase.com.br/dw/image/v2/AAFM_PRD/on/demandware.static/-/Sites-kerastase-master-catalog/pt_BR/dw831df1bc/images/KRBR00119/condicionador-kerastase-%20chroma-absolu-fondant-cica-chroma.jpg',TRUE)
ON CONFLICT (id) DO UPDATE SET
  marca      = EXCLUDED.marca,
  nombre     = EXCLUDED.nombre,
  precio     = EXCLUDED.precio,
  stock      = EXCLUDED.stock,
  imagen_url = EXCLUDED.imagen_url,
  activo     = EXCLUDED.activo;

-- ── 7. RESTAURAR HORARIOS DEL SALÓN ──────────────────────────────────────────
DELETE FROM public.horarios_salon;
INSERT INTO public.horarios_salon (dia_semana, dia_nombre, apertura_turno1, cierre_turno1, apertura_turno2, cierre_turno2, es_cerrado) VALUES
(0,'Domingo',   NULL,          NULL,          NULL,          NULL,          TRUE),
(1,'Lunes',     '11:00'::time, '14:00'::time, '16:00'::time, '19:00'::time, FALSE),
(2,'Martes',    '11:00'::time, '14:00'::time, '16:00'::time, '19:00'::time, FALSE),
(3,'Miércoles', '11:00'::time, '14:00'::time, '16:00'::time, '19:00'::time, FALSE),
(4,'Jueves',    '11:00'::time, '14:00'::time, '16:00'::time, '19:00'::time, FALSE),
(5,'Viernes',   '11:00'::time, '14:00'::time, '16:00'::time, '19:00'::time, FALSE),
(6,'Sábado',    '11:00'::time, '18:00'::time, NULL,          NULL,          FALSE);

-- ── 8. RESTAURAR RECOMPENSAS ──────────────────────────────────────────────────
INSERT INTO public.recompensas (id, icono, titulo, descripcion, tipo, categoria, servicio_match_id, meta, unidad, nivel_tier, activo) VALUES
('r1','✂️','Corte de cabello gratis','Un corte profesional de dama o caballero sin costo para ti.','visitas','servicio','srv-001',10,'visitas',1,TRUE),
('r2','🧴','Producto capilar a elegir','Llévate un tratamiento o acondicionador del catálogo.','gasto','producto',NULL,2000,'MXN en compras',1,TRUE),
('r3','✨','Tratamiento capilar gratis','Sesión de hidratación profunda o mascarilla reconstructora.','gasto','servicio','srv-006',3500,'MXN en compras',1,TRUE),
('r4','💅','Diseño de cejas gratis','Perfilado y diseño completo de cejas sin costo.','visitas','servicio','srv-005',5,'visitas',1,TRUE),
('r5','🎁','Kit de productos premium','Set completo de cuidado capilar valorado en $1,500.','gasto','producto',NULL,6000,'MXN en compras',1,TRUE)
ON CONFLICT (id) DO UPDATE SET
  icono              = EXCLUDED.icono,
  titulo             = EXCLUDED.titulo,
  descripcion        = EXCLUDED.descripcion,
  tipo               = EXCLUDED.tipo,
  categoria          = EXCLUDED.categoria,
  servicio_match_id  = EXCLUDED.servicio_match_id,
  meta               = EXCLUDED.meta,
  unidad             = EXCLUDED.unidad,
  nivel_tier         = EXCLUDED.nivel_tier,
  activo             = EXCLUDED.activo;

-- ── 9. TRIGGER ROBUSTO PARA NUEVOS USUARIOS ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nombre   TEXT;
  v_telefono TEXT;
  v_cabello  TEXT;
  v_alergias TEXT;
  v_rol      TEXT;
BEGIN
  v_nombre   := coalesce(nullif(trim(NEW.raw_user_meta_data->>'nombre'),   ''), split_part(coalesce(NEW.email,'Clienta'),'@',1));
  v_telefono := nullif(trim(coalesce(NEW.raw_user_meta_data->>'telefono',  '')), '');
  v_cabello  := coalesce(nullif(trim(NEW.raw_user_meta_data->>'perfil_cabello',''),''), 'Por definir');
  v_alergias := coalesce(nullif(trim(NEW.raw_user_meta_data->>'alergias',  ''), ''), 'Ninguna registrada');

  v_rol := CASE
    WHEN lower(coalesce(NEW.email,'')) = 'yoss@yossbeautysalon.com' THEN 'admin'
    ELSE coalesce(nullif(trim(NEW.raw_user_meta_data->>'rol',''),''), 'cliente')
  END;

  INSERT INTO public.usuarios (
    id, email, password_hash, rol, nombre, telefono, alergias, perfil_cabello, guia_completada
  ) VALUES (
    NEW.id, NEW.email, 'supabase_auth', v_rol,
    v_nombre, v_telefono, v_alergias, v_cabello, FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    nombre         = CASE WHEN public.usuarios.nombre IS NULL OR public.usuarios.nombre = ''
                          THEN EXCLUDED.nombre ELSE public.usuarios.nombre END,
    telefono       = CASE WHEN public.usuarios.telefono IS NULL OR public.usuarios.telefono = ''
                          THEN EXCLUDED.telefono ELSE public.usuarios.telefono END,
    alergias       = CASE WHEN public.usuarios.alergias IS NULL OR public.usuarios.alergias = ''
                          THEN EXCLUDED.alergias ELSE public.usuarios.alergias END,
    perfil_cabello = CASE WHEN public.usuarios.perfil_cabello IS NULL OR public.usuarios.perfil_cabello = ''
                          THEN EXCLUDED.perfil_cabello ELSE public.usuarios.perfil_cabello END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ── 10. BUCKET AVATARS Y STORAGE ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Avatares públicos visibles para todos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios suben su propio avatar"       ON storage.objects;
DROP POLICY IF EXISTS "Usuarios actualizan su propio avatar"  ON storage.objects;
DROP POLICY IF EXISTS "Usuarios borran su propio avatar"      ON storage.objects;

CREATE POLICY "Avatares públicos visibles para todos" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Usuarios suben su propio avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Usuarios actualizan su propio avatar" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Usuarios borran su propio avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- ── 11. REALTIME EN TODAS LAS TABLAS ─────────────────────────────────────────
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.citas;               EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes_chat;       EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pagos_mercadopago;   EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.servicios;           EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.productos;           EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.recompensas;         EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.recompensas_usuario; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.horarios_salon;      EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.favoritos;           EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.usuarios;            EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ── 12. VERIFICACIÓN UNIFICADA EN UNA SOLA TABLA ──────────────────────────────
SELECT * FROM (
  SELECT '1. TABLA servicios'      AS verificacion, count(*)::text || ' registros' AS detalle FROM public.servicios
  UNION ALL
  SELECT '2. TABLA productos',      count(*)::text || ' registros' FROM public.productos
  UNION ALL
  SELECT '3. TABLA horarios_salon', count(*)::text || ' registros' FROM public.horarios_salon
  UNION ALL
  SELECT '4. TABLA recompensas',    count(*)::text || ' registros' FROM public.recompensas
  UNION ALL
  SELECT '5. TABLA usuarios',
    count(*)::text || ' total (' ||
    count(*) FILTER (WHERE rol = 'admin')::text || ' admin, ' ||
    count(*) FILTER (WHERE rol = 'cliente')::text || ' clientas)'
  FROM public.usuarios
  UNION ALL
  SELECT '6. USUARIO: ' || coalesce(nombre, email),
    'rol=' || coalesce(rol, 'NULL') ||
    ' | tel=' || coalesce(telefono, '-') ||
    ' | guia=' || guia_completada::text ||
    ' | avatar=' || CASE WHEN avatar_uri IS NOT NULL AND avatar_uri <> '' THEN 'SI' ELSE 'NO' END
  FROM public.usuarios
) AS reporte
ORDER BY verificacion;
