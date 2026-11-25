-- =============================================================================
-- SUPABASE SETUP PRODUCTION: YOSS BEAUTY SALON
-- Ejecutar COMPLETO en el SQL Editor de Supabase (una sola vez o cuando actualices).
-- NO reemplaza schema.sql: completa RLS, RPCs, Trigger de registro,
-- cuenta única de Administrador, limpieza de datos de prueba y Realtime.
-- =============================================================================

-- 1. Ajustes de columnas opcionales para convivir con Supabase Auth y permisos SQL
ALTER TABLE public.usuarios
  ALTER COLUMN password_hash SET DEFAULT 'supabase_auth';

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

-- 2. Función auxiliar para verificar si el usuario autenticado es admin (sin recursión RLS)
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

-- 3. Función RPC para iniciar sesión usando Teléfono o Correo electrónico
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

  -- Buscar por teléfono (solo dígitos)
  v_clean := regexp_replace(v_clean, '[^0-9]', '', 'g');
  SELECT email INTO v_email
  FROM public.usuarios
  WHERE regexp_replace(coalesce(telefono, ''), '[^0-9]', '', 'g') = v_clean
  LIMIT 1;

  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_login_email(TEXT) TO anon, authenticated;

-- 4. Función RPC para calcular saturación real y horarios ocupados SIN exponer datos personales
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

-- 5. Trigger automático al crear usuario en auth.users -> crea perfil en public.usuarios
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nombre TEXT;
  v_telefono TEXT;
  v_cabello TEXT;
  v_alergias TEXT;
  v_rol TEXT;
BEGIN
  v_nombre := coalesce(NEW.raw_user_meta_data ->> 'nombre', split_part(coalesce(NEW.email, 'Clienta'), '@', 1));
  v_telefono := nullif(trim(coalesce(NEW.raw_user_meta_data ->> 'telefono', '')), '');
  v_cabello := coalesce(nullif(trim(coalesce(NEW.raw_user_meta_data ->> 'perfil_cabello', '')), ''), 'Por definir');
  v_alergias := coalesce(nullif(trim(coalesce(NEW.raw_user_meta_data ->> 'alergias', '')), ''), 'Ninguna registrada');

  IF lower(coalesce(NEW.email, '')) = 'yoss@yossbeautysalon.com' THEN
    v_rol := 'admin';
  ELSE
    v_rol := 'cliente';
  END IF;

  INSERT INTO public.usuarios (
    id, email, password_hash, rol, nombre, telefono, alergias, perfil_cabello, guia_completada
  )
  VALUES (
    NEW.id,
    NEW.email,
    'supabase_auth',
    v_rol,
    v_nombre,
    v_telefono,
    v_alergias,
    v_cabello,
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nombre = COALESCE(NULLIF(EXCLUDED.nombre, ''), public.usuarios.nombre),
    telefono = COALESCE(EXCLUDED.telefono, public.usuarios.telefono),
    alergias = COALESCE(EXCLUDED.alergias, public.usuarios.alergias),
    perfil_cabello = COALESCE(EXCLUDED.perfil_cabello, public.usuarios.perfil_cabello);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 6. Habilitar RLS en todas las tablas y limpiar políticas previas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_salon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_mercadopago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recompensas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recompensas_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas viejas si existen
DROP POLICY IF EXISTS "Servicios visibles para todos" ON public.servicios;
DROP POLICY IF EXISTS "Admin gestiona servicios" ON public.servicios;
DROP POLICY IF EXISTS "Productos visibles para todos" ON public.productos;
DROP POLICY IF EXISTS "Admin gestiona productos" ON public.productos;
DROP POLICY IF EXISTS "Horarios visibles para todos" ON public.horarios_salon;
DROP POLICY IF EXISTS "Admin gestiona horarios" ON public.horarios_salon;
DROP POLICY IF EXISTS "Usuarios ven su perfil o admin ve todos" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios crean su propio perfil" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios actualizan su perfil o admin" ON public.usuarios;
DROP POLICY IF EXISTS "Clientes ven sus propias citas" ON public.citas;
DROP POLICY IF EXISTS "Clientes crean sus citas" ON public.citas;
DROP POLICY IF EXISTS "Clientes y admin actualizan citas" ON public.citas;
DROP POLICY IF EXISTS "Pagos visibles por dueño o admin" ON public.pagos_mercadopago;
DROP POLICY IF EXISTS "Clientes y admin registran pagos" ON public.pagos_mercadopago;
DROP POLICY IF EXISTS "Admin o dueño actualiza pagos" ON public.pagos_mercadopago;
DROP POLICY IF EXISTS "Recompensas visibles para todos" ON public.recompensas;
DROP POLICY IF EXISTS "Admin gestiona recompensas" ON public.recompensas;
DROP POLICY IF EXISTS "Progreso recompensas propio o admin" ON public.recompensas_usuario;
DROP POLICY IF EXISTS "Chat propio o admin" ON public.mensajes_chat;
DROP POLICY IF EXISTS "Favoritos propios o admin" ON public.favoritos;

-- Catálogos
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
  FOR UPDATE USING (auth.uid() = cliente_id OR public.is_admin());

-- Pagos Mercado Pago
CREATE POLICY "Pagos visibles por dueño o admin" ON public.pagos_mercadopago
  FOR SELECT USING (auth.uid() = cliente_id OR public.is_admin());

CREATE POLICY "Clientes y admin registran pagos" ON public.pagos_mercadopago
  FOR INSERT WITH CHECK (auth.uid() = cliente_id OR public.is_admin());

CREATE POLICY "Admin o dueño actualiza pagos" ON public.pagos_mercadopago
  FOR UPDATE USING (auth.uid() = cliente_id OR public.is_admin());

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

-- 7. Limpiar cualquier registro de prueba previo (sin borrar catálogos base)
TRUNCATE TABLE
  public.pagos_mercadopago,
  public.mensajes_chat,
  public.favoritos,
  public.recompensas_usuario,
  public.citas
RESTART IDENTITY CASCADE;

-- Eliminar usuarios previos que no sean el administrador oficial
DELETE FROM public.usuarios WHERE lower(email) <> 'yoss@yossbeautysalon.com';
DELETE FROM auth.users WHERE lower(email) <> 'yoss@yossbeautysalon.com';

-- 8. Crear / asegurar el ÚNICO usuario inicial: ADMINISTRADOR (Yoss)
-- Credenciales de acceso en la App:
--   Teléfono o Correo: 123  (o yoss@yossbeautysalon.com)
--   Contraseña:        admin123
DO $$
DECLARE
  v_admin_id UUID;
  v_admin_email TEXT := 'yoss@yossbeautysalon.com';
  v_encrypted_pw TEXT;
BEGIN
  SELECT id INTO v_admin_id FROM auth.users WHERE lower(email) = v_admin_email LIMIT 1;

  IF v_admin_id IS NULL THEN
    v_admin_id := gen_random_uuid();

    -- Hash compatible con pgcrypto en Supabase
    BEGIN
      v_encrypted_pw := extensions.crypt('admin123', extensions.gen_salt('bf'));
    EXCEPTION WHEN OTHERS THEN
      v_encrypted_pw := crypt('admin123', gen_salt('bf'));
    END;

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_admin_id,
      'authenticated',
      'authenticated',
      v_admin_email,
      v_encrypted_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nombre":"Yoss (Dueña)","telefono":"123","rol":"admin"}'::jsonb,
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      gen_random_uuid(),
      v_admin_id,
      jsonb_build_object('sub', v_admin_id::text, 'email', v_admin_email),
      'email',
      v_admin_id::text,
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.usuarios (
    id, email, password_hash, rol, nombre, telefono, alergias, perfil_cabello, guia_completada
  )
  VALUES (
    v_admin_id,
    v_admin_email,
    'supabase_auth',
    'admin',
    'Yoss (Dueña)',
    '123',
    'Ninguna',
    'Administración Yoss Beauty Salon',
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    rol = 'admin',
    telefono = '123',
    nombre = 'Yoss (Dueña)';
END $$;

-- 9. RPC para marcar la guía de bienvenida como completada
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

-- 10. Asegurar catálogos oficiales de servicios, productos y recompensas
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
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.productos (id, marca, nombre, precio, stock, imagen_url, activo)
VALUES
('prod-1', 'L’Oréal Professionnel', 'Vitamino Color Spectrum · Acondicionador', 520.00, TRUE, 'https://www.sephora.com/productimages/sku/s2717411-main-zoom.jpg', TRUE),
('prod-2', 'Wella Professionals', 'Color Fresh Mask · Copper Glow', 690.00, TRUE, 'https://wella.bynder.com/m/cdb6a5785d08b9f5/original/Wella_Professionals_Color_Fresh_Mask_Copper_Glow_150ml_PI_1.png', TRUE),
('prod-3', 'Olaplex', 'No.5 Bond Maintenance · Acondicionador', 780.00, FALSE, 'https://olaplex.com/cdn/shop/articles/Large_JPG-TEXTURE_N5_WHITE_BG_W_PRODUCT_3000x3000_0faafb22-1f16-42ff-b774-7361fdaa005f.jpg', TRUE),
('prod-4', 'Kérastase', 'Chroma Absolu Fondant', 1150.00, TRUE, 'https://www.kerastase.com.br/dw/image/v2/AAFM_PRD/on/demandware.static/-/Sites-kerastase-master-catalog/pt_BR/dw831df1bc/images/KRBR00119/condicionador-kerastase-%20chroma-absolu-fondant-cica-chroma.jpg', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.recompensas (id, icono, titulo, descripcion, tipo, categoria, servicio_match_id, meta, unidad, nivel_tier, activo)
VALUES
('r1', '✂️', 'Corte de cabello gratis', 'Un corte profesional de dama o caballero sin costo para ti.', 'visitas', 'servicio', 'srv-001', 10, 'visitas', 1, TRUE),
('r2', '🧴', 'Producto capilar a elegir', 'Llévate un tratamiento o acondicionador del catálogo.', 'gasto', 'producto', NULL, 2000, 'MXN en compras', 1, TRUE),
('r3', '✨', 'Tratamiento capilar gratis', 'Sesión de hidratación profunda o mascarilla reconstructora.', 'gasto', 'servicio', 'srv-006', 3500, 'MXN en compras', 1, TRUE),
('r4', '💅', 'Diseño de cejas gratis', 'Perfilado y diseño completo de cejas sin costo.', 'visitas', 'servicio', 'srv-005', 5, 'visitas', 1, TRUE),
('r5', '🎁', 'Kit de productos premium', 'Set completo de cuidado capilar valorado en $1,500.', 'gasto', 'producto', NULL, 6000, 'MXN en compras', 1, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 11. Bucket público en Supabase Storage para fotos de perfil
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
  FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Usuarios borran su propio avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND auth.role() = 'authenticated'
  );

-- 12. Activar Supabase Realtime para actualización en vivo entre Cliente y Admin
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
