# Guía de Conexión de Base de Datos — Yoss Beauty Salon

Esta carpeta contiene el script SQL de producción [`schema.sql`](file:///c:/Users/angel/Documents/Antigravity%20Proyect/App%20Yoss/AppEstetica/database/schema.sql) listo para ejecutar en **PostgreSQL / Supabase** o cualquier servicio en la nube (Neon, Railway, Cloud SQL, etc.).

---

## 1. Estructura de Tablas Creadas

El script crea y configura 10 tablas optimizadas con índices y llaves foráneas:

| Tabla | Propósito | Características Clave |
| :--- | :--- | :--- |
| `usuarios` | Cuentas de clientes y administrador | Roles (`admin` / `cliente`), perfil capilar, alergias, nivel Club (`Plata`, `Oro`), avatar y guía completada. |
| `servicios` | Catálogo de servicios de Yoss | Duración en minutos (`duracion_min`), flag `requiere_anticipo`, monto de anticipo y flag `tiene_precio_fijo`. |
| `productos` | Catálogo de productos capilares | Marca, precio, stock activo e imagen referencial. |
| `horarios_salon` | Jornadas laborales oficiales | Lunes a Viernes (11:00–14:00 y 16:00–19:00), Sábados (11:00–18:00), Domingos cerrado. |
| `citas` | Agenda y citas del salón | Estados automáticos, método (`efectivo` o `mercadopago`), campo `expira_en` para temporizador de 15 min y flag `puede_cambiar_a_efectivo`. |
| `pagos_mercadopago` | Registro de transacciones digitales | IDs de pago Mercado Pago, titular, alias `yoss.beauty.salon.mp`, CLABE STP y montos de anticipo. |
| `recompensas` | Beneficios del Club de Lealtad | Metas por visitas o gasto acumulado, tipo (`servicio` o `producto`). |
| `recompensas_usuario` | Progreso y canjes de clientes | Historial de recompensas desbloqueadas y canjeadas. |
| `mensajes_chat` | Mensajería y asistente interactivo | Mensajes de bienvenida, confirmaciones automáticas, recordatorios y ubicación con Google Maps. |
| `favoritos` | Favoritos del cliente | Servicios y productos marcados como favoritos por cada usuario. |

---

## 2. Automatizaciones y Reglas de Negocio en la Base de Datos

1. **Liberación de citas no pagadas (Hold 15 min):**
   * Función `liberar_citas_expiradas()` que pasa a `'Expirada'` las citas en estado `'Pendiente anticipo'` cuando `expira_en < NOW()`.
2. **Métodos de pago según el tipo de servicio:**
   * **Servicios cotidianos sin anticipo (Cortes, Barba, Depilaciones, etc.):**
     * **Efectivo:** Confirmación inmediata (`Aceptada`), no se suma a la contabilidad digital de la app ya que no tienen precio fijo y se cobran en mano en salón.
     * **Mercado Pago:** Se registra como `'En proceso'` (Pendiente de cotización según evaluación física del cabello).
   * **Servicios con anticipo (Colorimetría, Alaciados Progresivos):**
     * **Mercado Pago:** Validación automática al confirmar pago de anticipo ($300 o $500 MXN) o temporizador de 15 minutos para asegurar el lugar.
3. **Métricas en Panel de Gestión:**
   * Solo contabiliza los ingresos digitales validados por Mercado Pago (anticipos y pagos digitales). El efectivo se gestiona en caja física sin estimaciones ficticias.

---

## 3. Pasos para Enlazar con la App (Recomendado: Supabase)

### Paso 1: Crear el proyecto en Supabase (Gratuito)
1. Entra a [https://supabase.com](https://supabase.com) y crea una cuenta o inicia sesión.
2. Crea un nuevo proyecto llamado `yoss-beauty-salon`.
3. Ve a **SQL Editor** en el menú lateral izquierdo.
4. Pega el contenido completo del archivo [`schema.sql`](file:///c:/Users/angel/Documents/Antigravity%20Proyect/App%20Yoss/AppEstetica/database/schema.sql) y presiona **Run**.
5. Las tablas, relaciones, datos semilla y políticas de seguridad quedarán creadas al instante.

### Paso 2: Instalar el cliente en la App de Expo
En la terminal de `AppEstetica`:
```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
```

### Paso 3: Configurar Variables de Entorno (`.env`)
Crea un archivo `.env` en la raíz de `AppEstetica`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-llave-anonima-publica
```

### Paso 4: Crear el Cliente Supabase en `src/services/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### Paso 5: Suscripción en Tiempo Real (Realtime)
Al activar Supabase Realtime en la tabla `citas`, cuando un cliente agende una cita o confirme un anticipo, el panel de administración de Yoss (`AgendaYossScreen` y `PanelGestionScreen`) se actualizará en vivo en las pantallas de ambos dispositivos sin necesidad de recargar.
