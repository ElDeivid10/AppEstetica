-- =============================================================================
-- ESQUEMA COMPLETO DE BASE DE DATOS: YOSS BEAUTY SALON
-- Motor compatible: PostgreSQL 14+ / Supabase
-- Incluye: Usuarios, Citas con Automatización, Métodos de Pago (Efectivo & Mercado Pago),
--          Control de Saturación, Mensajería/Chatbot, Recompensas y Favoritos.
-- =============================================================================

-- 1. EXTENSIONES NECESARIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 2. TABLA DE USUARIOS Y PERFILES (users / usuarios)
-- =============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'cliente' CHECK (rol IN ('admin', 'cliente')),
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(30),
    alergias TEXT DEFAULT 'Ninguna registrada',
    perfil_cabello TEXT DEFAULT 'Cabello teñido · ondulado · cuidado de color',
    total_gastado DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_visitas INT NOT NULL DEFAULT 0,
    nivel VARCHAR(50) NOT NULL DEFAULT 'Plata',
    siguiente_nivel VARCHAR(50) NOT NULL DEFAULT 'Oro',
    meta_siguiente_nivel DECIMAL(10, 2) NOT NULL DEFAULT 2000.00,
    avatar_uri TEXT,
    avatar_preset_id VARCHAR(50),
    guia_completada BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 3. TABLA DE SERVICIOS DEL CATÁLOGO (services / servicios)
-- =============================================================================
CREATE TABLE IF NOT EXISTS servicios (
    id VARCHAR(50) PRIMARY KEY, -- 'srv-001', 'srv-002', etc.
    nombre VARCHAR(150) NOT NULL,
    duracion_texto VARCHAR(50) NOT NULL,   -- '30 MIN', '2H 30M', etc.
    duracion_min INT NOT NULL,              -- Para cálculo autónomo de capacidad humana
    icono VARCHAR(10) NOT NULL DEFAULT '✂️',
    tags JSONB NOT NULL DEFAULT '[]'::jsonb, -- ['Dama', 'Caballero', etc.]
    requiere_anticipo BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE para Colorimetría y Alaciados
    monto_anticipo DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    tiene_precio_fijo BOOLEAN NOT NULL DEFAULT FALSE, -- FALSE para servicios cotidianos que varían según largo
    precio_base DECIMAL(10, 2),             -- NULL si requiere valoración personalizada
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 4. TABLA DE PRODUCTOS (products / productos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS productos (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'prod-' || gen_random_uuid(),
    marca VARCHAR(150) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    stock BOOLEAN NOT NULL DEFAULT TRUE,
    imagen_url TEXT,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 5. HORARIOS Y JORNADAS LABORALES DEL SALÓN
-- =============================================================================
CREATE TABLE IF NOT EXISTS horarios_salon (
    id SERIAL PRIMARY KEY,
    dia_semana INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=Domingo, 1=Lunes, 6=Sábado
    dia_nombre VARCHAR(20) NOT NULL,
    apertura_turno1 TIME,    -- 11:00:00
    cierre_turno1 TIME,      -- 14:00:00
    apertura_turno2 TIME,    -- 16:00:00 (NULL en sábados de turno corrido)
    cierre_turno2 TIME,      -- 19:00:00
    es_cerrado BOOLEAN NOT NULL DEFAULT FALSE
);

-- =============================================================================
-- 6. TABLA DE CITAS (appointments / citas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS citas (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'apt-' || extract(epoch from now())::bigint,
    cliente_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    cliente_nombre VARCHAR(150) NOT NULL,
    servicio_id VARCHAR(50) REFERENCES servicios(id) ON DELETE RESTRICT,
    servicio_nombre VARCHAR(150) NOT NULL,
    fecha_cita DATE NOT NULL,               -- YYYY-MM-DD
    hora_cita VARCHAR(10) NOT NULL,         -- '11:00', '16:30', etc.
    duracion_min INT NOT NULL DEFAULT 30,
    
    -- Estados soportados en la App
    estado VARCHAR(40) NOT NULL DEFAULT 'Solicitud' CHECK (
        estado IN (
            'Solicitud',
            'En proceso',
            'Aceptada',
            'Finalizada',
            'No asistió',
            'Pendiente anticipo',
            'Expirada',
            'Cancelada'
        )
    ),
    
    -- Métodos de pago oficiales
    metodo_pago VARCHAR(30) CHECK (metodo_pago IN ('efectivo', 'mercadopago')),
    monto_anticipo DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    precio_total DECIMAL(10, 2),
    nota_pago TEXT,
    
    -- Temporizador de apartado (Hold 15 min para anticipos de Mercado Pago)
    expira_en TIMESTAMP WITH TIME ZONE,
    puede_cambiar_a_efectivo BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Recompensas del Club Yoss
    es_recompensa BOOLEAN NOT NULL DEFAULT FALSE,
    nota_recompensa VARCHAR(200),
    
    notas_cliente TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para agilizar consultas de disponibilidad y saturación por fecha
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha_cita);
CREATE INDEX IF NOT EXISTS idx_citas_cliente ON citas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado);

-- =============================================================================
-- 7. TABLA DE REGISTROS DE PAGO POR MERCADO PAGO (mp_payments)
-- =============================================================================
CREATE TABLE IF NOT EXISTS pagos_mercadopago (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'pay-' || extract(epoch from now())::bigint,
    cita_id VARCHAR(50) REFERENCES citas(id) ON DELETE CASCADE,
    cliente_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo_pago VARCHAR(30) NOT NULL CHECK (tipo_pago IN ('anticipo', 'pago_completo')),
    monto DECIMAL(10, 2) NOT NULL,
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente' CHECK (
        estado IN ('pendiente', 'aprobado', 'rechazado', 'expirado', 'reembolsado')
    ),
    mp_payment_id VARCHAR(100),       -- ID asignado por la API de Mercado Pago
    mp_preference_id VARCHAR(100),    -- ID de preferencia de checkout
    mp_status_detail VARCHAR(100),
    titular_cuenta VARCHAR(150) DEFAULT 'Yosselin ...',
    alias_mp VARCHAR(100) DEFAULT 'yoss.beauty.salon.mp',
    clabe_stp VARCHAR(30) DEFAULT '646010123456789012',
    fecha_pago TIMESTAMP WITH TIME ZONE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 8. TABLA DE CATÁLOGO DE RECOMPENSAS (rewards / recompensas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS recompensas (
    id VARCHAR(50) PRIMARY KEY, -- 'r1', 'r2', etc.
    icono VARCHAR(10) NOT NULL DEFAULT '✦',
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('visitas', 'gasto')),
    categoria VARCHAR(20) NOT NULL CHECK (categoria IN ('servicio', 'producto')),
    servicio_match_id VARCHAR(50) REFERENCES servicios(id) ON DELETE SET NULL,
    meta INT NOT NULL,
    unidad VARCHAR(50) NOT NULL,
    nivel_tier INT NOT NULL DEFAULT 1,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- 9. TABLA DE RECOMPENSAS POR USUARIO (user_rewards / recompensas_usuario)
-- =============================================================================
CREATE TABLE IF NOT EXISTS recompensas_usuario (
    id SERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    recompensa_id VARCHAR(50) NOT NULL REFERENCES recompensas(id) ON DELETE CASCADE,
    progreso_actual INT NOT NULL DEFAULT 0,
    desbloqueado BOOLEAN NOT NULL DEFAULT FALSE,
    canjeado BOOLEAN NOT NULL DEFAULT FALSE,
    canjeado_en TIMESTAMP WITH TIME ZONE,
    nivel_tier INT NOT NULL DEFAULT 1,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_usuario_recompensa UNIQUE (usuario_id, recompensa_id)
);

-- =============================================================================
-- 10. TABLA DE MENSAJES Y CHATBOT (messages / mensajes_chat)
-- =============================================================================
CREATE TABLE IF NOT EXISTS mensajes_chat (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'msg-' || extract(epoch from now())::bigint || '-' || floor(random() * 1000)::text,
    cliente_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    remitente VARCHAR(20) NOT NULL CHECK (remitente IN ('bot', 'yoss', 'cliente')),
    nombre_remitente VARCHAR(100) NOT NULL,
    texto TEXT NOT NULL,
    tipo VARCHAR(30) NOT NULL DEFAULT 'chat' CHECK (
        tipo IN ('chat', 'welcome', 'reminder', 'confirmation', 'reward')
    ),
    leido_cliente BOOLEAN NOT NULL DEFAULT FALSE,
    leido_admin BOOLEAN NOT NULL DEFAULT FALSE,
    map_url TEXT,
    map_address TEXT,
    map_title TEXT,
    payment_url TEXT,
    payment_title TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensajes_cliente ON mensajes_chat(cliente_id);

-- =============================================================================
-- 11. TABLA DE FAVORITOS (user_favorites / favoritos)
-- =============================================================================
CREATE TABLE IF NOT EXISTS favoritos (
    id SERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_item VARCHAR(20) NOT NULL CHECK (tipo_item IN ('servicio', 'producto')),
    item_id VARCHAR(50) NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_usuario_favorito UNIQUE (usuario_id, tipo_item, item_id)
);

-- =============================================================================
-- 12. TRIGGERS Y FUNCIONES AUTOMÁTICAS
-- =============================================================================

-- Actualización automática de 'actualizado_en'
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_actualizado
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE PROCEDURE actualizar_timestamp();

CREATE TRIGGER trg_citas_actualizado
BEFORE UPDATE ON citas
FOR EACH ROW EXECUTE PROCEDURE actualizar_timestamp();

-- Función para liberar automáticamente citas con anticipo vencido (Hold 15 min)
CREATE OR REPLACE FUNCTION liberar_citas_expiradas()
RETURNS INT AS $$
DECLARE
    afectadas INT;
BEGIN
    UPDATE citas
    SET estado = 'Expirada',
        actualizado_en = NOW()
    WHERE estado = 'Pendiente anticipo'
      AND expira_en IS NOT NULL
      AND expira_en < NOW();
    
    GET DIAGNOSTICS afectadas = ROW_COUNT;
    RETURN afectadas;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 13. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS) PARA SUPABASE
-- =============================================================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_mercadopago ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE favoritos ENABLE ROW LEVEL SECURITY;

-- Catálogos públicos de lectura
CREATE POLICY "Servicios visibles para todos" ON servicios FOR SELECT USING (true);
CREATE POLICY "Productos visibles para todos" ON productos FOR SELECT USING (true);

-- Citas: los clientes leen y crean sus propias citas; el administrador lee y edita todas
CREATE POLICY "Clientes ven sus propias citas" ON citas
    FOR SELECT USING (auth.uid() = cliente_id OR auth.jwt() ->> 'rol' = 'admin');

CREATE POLICY "Clientes crean sus citas" ON citas
    FOR INSERT WITH CHECK (auth.uid() = cliente_id OR auth.jwt() ->> 'rol' = 'admin');

CREATE POLICY "Clientes y admin actualizan citas" ON citas
    FOR UPDATE USING (auth.uid() = cliente_id OR auth.jwt() ->> 'rol' = 'admin');

-- =============================================================================
-- 14. DATOS INICIALES (SEED DATA)
-- =============================================================================

-- Servicios iniciales con sus duraciones y reglas de anticipo
INSERT INTO servicios (id, nombre, duracion_texto, duracion_min, icono, tags, requiere_anticipo, monto_anticipo, tiene_precio_fijo, descripcion)
VALUES
('srv-001', 'Cortes de Cabello', '30 MIN', 30, '✂️', '["Dama", "Caballero", "Niños", "Niñas"]'::jsonb, FALSE, 0.00, FALSE, 'Cortes modernos y clásicos adaptados a cada persona.'),
('srv-002', 'Perfilado de Barba', '20 MIN', 20, '🪒', '["Caballero"]'::jsonb, FALSE, 0.00, FALSE, 'Definición y perfilado para un acabado limpio y estilizado.'),
('srv-003', 'Colorimetría', '2H 30M', 150, '🎨', '["Mechas", "Tintes", "Balayage", "Baby Lights", "Rayos"]'::jsonb, TRUE, 300.00, FALSE, 'Colores personalizados con técnicas de última generación. Requiere anticipo.'),
('srv-004', 'Maquillaje y Peinado', '60 MIN', 60, '💄', '["Social", "Novia", "Graduación"]'::jsonb, FALSE, 0.00, FALSE, 'Realza tu belleza natural para cualquier ocasión especial.'),
('srv-005', 'Depilaciones', '30 MIN', 30, '✨', '["Cejas", "Bigote", "Axilas", "Piernas"]'::jsonb, FALSE, 0.00, FALSE, 'Técnicas suaves y eficaces para una piel perfectamente suave.'),
('srv-006', 'Alaciados Progresivos', '3 HORAS', 180, '💆', '["Keratina", "Botox Capilar", "Nanoplastia"]'::jsonb, TRUE, 500.00, FALSE, 'Alisa y suaviza el cabello de forma duradera y profunda. Requiere anticipo.')
ON CONFLICT (id) DO NOTHING;

-- Productos iniciales
INSERT INTO productos (id, marca, nombre, precio, stock, imagen_url)
VALUES
('prod-1', 'L’Oréal Professionnel', 'Vitamino Color Spectrum · Acondicionador', 520.00, TRUE, 'https://www.sephora.com/productimages/sku/s2717411-main-zoom.jpg'),
('prod-2', 'Wella Professionals', 'Color Fresh Mask · Copper Glow', 690.00, TRUE, 'https://wella.bynder.com/m/cdb6a5785d08b9f5/original/Wella_Professionals_Color_Fresh_Mask_Copper_Glow_150ml_PI_1.png'),
('prod-3', 'Olaplex', 'No.5 Bond Maintenance · Acondicionador', 780.00, FALSE, 'https://olaplex.com/cdn/shop/articles/Large_JPG-TEXTURE_N5_WHITE_BG_W_PRODUCT_3000x3000_0faafb22-1f16-42ff-b774-7361fdaa005f.jpg'),
('prod-4', 'Kérastase', 'Chroma Absolu Fondant', 1150.00, TRUE, 'https://www.kerastase.com.br/dw/image/v2/AAFM_PRD/on/demandware.static/-/Sites-kerastase-master-catalog/pt_BR/dw831df1bc/images/KRBR00119/condicionador-kerastase-%20chroma-absolu-fondant-cica-chroma.jpg')
ON CONFLICT (id) DO NOTHING;

-- Horarios oficiales del salón
INSERT INTO horarios_salon (dia_semana, dia_nombre, apertura_turno1, cierre_turno1, apertura_turno2, cierre_turno2, es_cerrado)
VALUES
(1, 'Lunes',     '11:00', '14:00', '16:00', '19:00', FALSE),
(2, 'Martes',    '11:00', '14:00', '16:00', '19:00', FALSE),
(3, 'Miércoles', '11:00', '14:00', '16:00', '19:00', FALSE),
(4, 'Jueves',    '11:00', '14:00', '16:00', '19:00', FALSE),
(5, 'Viernes',   '11:00', '14:00', '16:00', '19:00', FALSE),
(6, 'Sábado',    '11:00', '18:00', NULL,    NULL,    FALSE),
(0, 'Domingo',   NULL,    NULL,    NULL,    NULL,    TRUE)
ON CONFLICT DO NOTHING;

-- Recompensas del Club
INSERT INTO recompensas (id, icono, titulo, descripcion, tipo, categoria, servicio_match_id, meta, unidad, nivel_tier)
VALUES
('r1', '✂️', 'Corte de cabello gratis', 'Un corte profesional de dama o caballero sin costo para ti.', 'visitas', 'servicio', 'srv-001', 10, 'visitas', 1),
('r2', '🧴', 'Producto capilar a elegir', 'Llévate un tratamiento o acondicionador del catálogo.', 'gasto', 'producto', NULL, 2000, 'MXN en compras', 1),
('r3', '✨', 'Tratamiento capilar gratis', 'Sesión de hidratación profunda o mascarilla reconstructora.', 'gasto', 'servicio', 'srv-006', 3500, 'MXN en compras', 1),
('r4', '💅', 'Diseño de cejas gratis', 'Perfilado y diseño completo de cejas sin costo.', 'visitas', 'servicio', 'srv-005', 5, 'visitas', 1),
('r5', '🎁', 'Kit de productos premium', 'Set completo de cuidado capilar valorado en $1,500.', 'gasto', 'producto', NULL, 6000, 'MXN en compras', 1)
ON CONFLICT (id) DO NOTHING;
