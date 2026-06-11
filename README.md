# Operación Remi 🍽️

Sistema de autoservicio digital para restaurante. El cliente accede desde su celular vía código QR, hace su pedido y lo personaliza sin necesidad de instalar ninguna app.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Backend | NestJS 11 + TypeORM |
| Base de datos | PostgreSQL (Supabase) |
| Auth | Supabase Auth + JWT |
| Storage | Supabase Storage (bucket `platos`) |
| IA / Chatbot | Groq API — `llama-3.3-70b-versatile` |
| Estilos | CSS Modules |

---

## Requisitos previos

- **Node.js** v20 o superior
- **npm** v10 o superior
- Credenciales de Supabase y Groq (pedírselas al líder del equipo)

---

## Cómo arrancar el proyecto

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd Operacion_Remi
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre `http://localhost:5173` en el navegador.

### 3. Backend

```bash
cd backend
cp .env.example .env   # Luego rellena con las credenciales reales
npm install
npm run start:dev
```

La API queda en `http://localhost:3000`.

> Las credenciales **nunca van en el repositorio**. El archivo `.env` ya está en `.gitignore`. Pídele los valores al líder del equipo.

---

## Estructura del proyecto

```
Operacion_Remi/
├── frontend/          # React + Vite
└── backend/           # NestJS + TypeORM
```

---

## Frontend — dónde va cada cosa

El frontend sigue la arquitectura **SCREAM**: la estructura de carpetas refleja el dominio del negocio, no el tipo de archivo.

```
frontend/src/
├── app/
│   ├── router.tsx              # Rutas de la app y protección por rol
│   └── RoleRedirect.tsx        # Redirige "/" según el rol del usuario
│
├── features/                   # ← AQUÍ va casi todo
│   ├── landingpages/
│   │   └── Pages/
│   │       └── RemiLandingPage.tsx  # "/" — landing pública del producto
│   │
│   ├── auth/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegistroPage.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx   # useAuth hook — estado global de sesión
│   │   ├── services/
│   │   │   └── auth.service.ts   # Llamadas a POST /auth/login, /auth/registro
│   │   └── types/
│   │       └── auth.types.ts     # UserRole, User, AuthState
│   │
│   ├── menu/
│   │   ├── pages/
│   │   │   └── MenuPage.tsx      # Vista del cliente (galería de platos + banner)
│   │   ├── components/
│   │   │   ├── PlatoModal.tsx    # Modal de detalle + personalización
│   │   │   ├── MenuBanner.tsx    # Carrusel de banners promocionales (autoplay)
│   │   │   └── PersonalizedSection.tsx
│   │   ├── context/
│   │   │   ├── PlatosContext.tsx  # Platos globales (usado en admin y menú)
│   │   │   └── PromosContext.tsx  # Promos activas desde GET /menu/promos
│   │   ├── services/
│   │   │   ├── menu.service.ts
│   │   │   └── promo.service.ts  # CRUD de banners promocionales
│   │   └── types/
│   │       ├── plato.types.ts
│   │       └── promo.types.ts    # Interfaz Promo con imageUrl opcional
│   │
│   ├── admin/
│   │   ├── styles/
│   │   │   └── admin.css            # Design system global del panel admin (variables, paleta)
│   │   ├── utils/
│   │   │   └── estadisticasExport.ts # Exporta reportes a Excel (xlsx) y PDF (jsPDF + autoTable)
│   │   ├── components/
│   │   │   ├── AdminLayout.tsx      # Shell con sidebar — usado en todas las páginas admin
│   │   │   └── QRScannerModal.tsx   # Escáner QR con webcam para confirmar entregas
│   │   └── pages/
│   │       ├── AdminDashboard.tsx
│   │       ├── MenuGestion.tsx      # CRUD de platos e ingredientes
│   │       ├── IngredientesGestion.tsx
│   │       ├── PromosAdmin.tsx      # CRUD de banners promocionales con upload de imagen
│   │       ├── PedidosAdmin.tsx     # Botón "📷 Escanear QR" para pedidos mesa/llevar en Listo
│   │       ├── DomiciliosAdmin.tsx
│   │       ├── EntregaLocalAdminPage.tsx  # /admin/local — asignación de casilleros y entrega para llevar
│   │       ├── MesasAdmin.tsx
│   │       ├── UsuariosGestion.tsx
│   │       └── EstadisticasPage.tsx
│   │
│   ├── asistente/
│   │   ├── components/
│   │   │   └── ChatWidget.tsx       # Botón flotante + panel de chat con Remi
│   │   ├── hooks/
│   │   │   └── useChatbot.ts        # Lógica de envío, historial y acciones de carrito
│   │   └── services/
│   │       └── asistente.service.ts # POST /asistente/chat vía apiFetch
│   │
│   ├── cocina/
│   │   └── pages/
│   │       └── CocinaDashboard.tsx  # KDS — comandas en tiempo real
│   │
│   ├── domicilios/
│   │   └── pages/
│   │       └── DomiciliosDashboard.tsx
│   │
│   ├── entrega-local/
│   │   └── EntregaLocalPage.tsx     # /escanear-entrega — escáner de casillero para "para llevar"
│   │
│   ├── pedidos/
│   │   └── services/
│   │       └── pedidos.service.ts
│   │
│   ├── carrito/
│   │   ├── context/
│   │   │   └── CarritoContext.tsx   # Estado global del carrito (localStorage)
│   │   ├── components/
│   │   │   └── CartDrawer.tsx       # Panel lateral del carrito
│   │   └── types/
│   │       └── carrito.types.ts     # CartItem, CartExtra, CarritoContextValue
│   │
│   ├── pedido/
│   │   └── MiPedidoPage.tsx         # /mi-pedido/:id — QR de entrega del cliente
│   │
│   ├── confirmar-entrega/
│   │   └── ConfirmarEntregaPage.tsx  # /confirmar-entrega?token=... — destino del QR escaneado
│   │
│   └── pago/
│       └── pages/
│           └── PagoResultadoPage.tsx # /pago-resultado — resultado del pago MP + QR de entrega
│
└── shared/
    ├── components/
    │   ├── ProtectedRoute.tsx   # Redirige si el rol no está permitido
    │   ├── AppShell.tsx         # Header genérico para staff
    │   └── PlatoImage.tsx       # Imagen de plato con fallback SVG por categoría
    ├── hooks/
    │   ├── useModalClose.ts     # Evita cierre de modal al arrastrar texto (mousedown + click)
    │   ├── usePushNotifications.ts
    │   └── useRealtimePedidos.ts # Suscripción a Supabase Realtime (tabla pedidos) con fallback a polling
    └── lib/
        ├── api.ts               # apiFetch con token Supabase
        ├── storage.ts           # uploadPlatoImage → Supabase Storage bucket "platos"
        ├── supabase.ts          # Cliente Supabase (anon key)
        └── guestSession.ts      # Pedido activo en localStorage (con clienteId para seguridad)
```

### Cómo agregar una nueva feature al frontend

1. Crea la carpeta en `src/features/<nombre>/`
2. Agrega subcarpetas según necesidad: `pages/`, `components/`, `hooks/`, `services/`, `types/`
3. Registra la ruta en `src/app/router.tsx`
4. Si requiere autenticación, envuélvela en `<ProtectedRoute allowedRoles={[...]}>`

### Cómo agregar una nueva página al panel admin

1. Crea `src/features/admin/pages/NuevaPagina.tsx` y su `.module.css`
2. Usa `<AdminLayout title="Título">` como contenedor
3. Agrega la ruta en `router.tsx` con `<AdminRoute>`
4. Agrega el ítem en el array `NAV` de `AdminLayout.tsx` y en `NAV_ITEMS` de `AdminDashboard.tsx`

### Alias de importación

Usa `@/` en vez de rutas relativas largas:

```ts
// Bien
import { useAuth } from '@/features/auth/context/AuthContext';

// Evitar
import { useAuth } from '../../../features/auth/context/AuthContext';
```

---

## Backend — dónde va cada cosa

```
backend/src/
├── app.module.ts         # Módulo raíz — registra TypeORM, Config y todos los módulos
├── main.ts               # Punto de entrada — puerto, CORS, pipes globales
│
└── modules/
    ├── auth/
    │   ├── auth.module.ts
    │   ├── auth.controller.ts        # POST /auth/login, POST /auth/registro
    │   ├── auth.service.ts           # Lógica de login + tokens Supabase
    │   ├── supabase-admin.service.ts # Cliente Supabase Admin (service role key)
    │   ├── guards/
    │   │   └── supabase.guard.ts     # SupabaseGuard — valida JWT de Supabase
    │   └── entities/
    │       ├── user-staff.entity.ts  # Tabla: user_staff
    │       ├── cliente.entity.ts     # Tabla: clientes
    │       └── sesion-cliente.entity.ts
    │
    ├── menu/
    │   ├── menu.module.ts
    │   ├── menu.controller.ts    # CRUD de platos, categorías, ingredientes y promos
    │   ├── menu.service.ts
    │   ├── dto/
    │   │   └── promo.dto.ts      # CreatePromoDto, UpdatePromoDto
    │   └── entities/
    │       ├── categoria.entity.ts    # Tabla: categorias
    │       ├── plato.entity.ts        # Tabla: platos
    │       ├── ingrediente.entity.ts  # Tabla: ingredientes
    │       ├── extra.entity.ts        # Tabla: extras
    │       └── promo.entity.ts        # Tabla: promos_banner (banners del carrusel)
    │
    ├── asistente/
    │   ├── asistente.module.ts
    │   ├── asistente.controller.ts   # POST /asistente/chat (requiere auth)
    │   ├── asistente.service.ts      # Groq tool-calling loop (llama-3.3-70b-versatile)
    │   └── dto/
    │       └── chat.dto.ts           # ChatMessageDto, ChatRequestDto, CartActionDto
    │
    ├── pedidos/
    │   ├── pedidos.module.ts
    │   ├── pedidos.controller.ts  # POST /pedidos, GET /pedidos, PATCH /pedidos/:id/estado
    │   ├── pedidos.service.ts
    │   └── entities/
    │       ├── pedido.entity.ts
    │       ├── detalle-pedido.entity.ts
    │       ├── pago.entity.ts
    │       ├── historial-estado.entity.ts
    │       └── token-qr.entity.ts
    │
    ├── mesas/
    │   ├── mesas.module.ts
    │   └── entities/
    │       └── mesa.entity.ts         # Tabla: mesas
    │
    ├── pagos/
    │   ├── pagos.module.ts
    │   ├── pagos.controller.ts   # POST /pagos/generar, /pagos/confirmar, /pagos/efectivo
    │   ├── pagos.service.ts      # Integración con Mercado Pago (preferencias, confirmación)
    │   └── dto/
    │       ├── generar-pago.dto.ts
    │       └── confirmar-pago.dto.ts
    │
    ├── domicilios/
    │   ├── domicilios.module.ts
    │   ├── domicilios.controller.ts  # GET /domicilios/pedidos, PATCH /domicilios/pedidos/:id/entregado
    │   └── domicilios.service.ts
    │
    └── cocina/
        ├── cocina.module.ts
        ├── cocina.controller.ts   # GET /cocina/comandas (para el KDS)
        └── cocina.service.ts
```

### Cómo agregar un nuevo módulo al backend

```bash
# Desde la carpeta backend/
nest generate module modules/nombre
nest generate controller modules/nombre
nest generate service modules/nombre
```

Luego:
1. Crea la entidad en `modules/nombre/entities/nombre.entity.ts`
2. Regístrala en `TypeOrmModule.forRootAsync` → array `entities` en `app.module.ts`
3. Importa `TypeOrmModule.forFeature([NombreEntity])` en el módulo nuevo
4. Si el módulo necesita proteger rutas con `SupabaseGuard`, importa `AuthModule`

### Convenciones de endpoints

| Acción | Método | Ruta |
|---|---|---|
| Listar | GET | `/recurso` |
| Obtener uno | GET | `/recurso/:id` |
| Crear | POST | `/recurso` |
| Editar | PATCH | `/recurso/:id` |
| Eliminar | DELETE | `/recurso/:id` |
| Cambiar estado | PATCH | `/recurso/:id/estado` |

---

## Features principales

### 🤖 Asistente virtual "Remi"

Un chatbot de ventas flotante accesible desde el menú (solo usuarios autenticados). Usa **Groq** con el modelo `llama-3.3-70b-versatile` y function calling para agregar platos al carrito directamente desde la conversación.

- El asistente conoce el menú completo en tiempo real (IDs, precios, extras, descripciones).
- Valida que los platos existan antes de agregarlos.
- Los precios se aplican con IVA ya incluido, consistente con el modal de platos.
- Solo responde en español, tono cálido y conciso.

### 📢 Banners promocionales

Carrusel en la parte superior del menú, completamente administrable desde el panel admin (`/admin/promos`):

- Gradiente de dos colores personalizables + color de acento.
- Imagen opcional subida a Supabase Storage.
- El botón CTA puede apuntar a un plato específico o a una categoría del menú.
- Autoplay con pausa al pasar el cursor, barra de progreso animada y dots de navegación.
- Orden configurable, activación/desactivación individual.
- Tipo de descuento opcional (`tipoDescuento`): `porcentaje`, `2x1` o `monto_fijo`, con su `valorDescuento`. Las promos activas se pueden aplicar a un pedido (`promoIds` en `CreatePedidoDto`) y el descuento queda registrado por línea (`descuento` en `detalle_pedido`) y en el total (`descuentoTotal` en `pedido`).

### 🖼️ Subida de imágenes

Las imágenes de platos y banners se almacenan en **Supabase Storage** (bucket `platos`). La función `uploadPlatoImage(file)` en `shared/lib/storage.ts` gestiona la subida y devuelve la URL pública.

### 📊 Estadísticas y exportación

El panel `/admin/estadisticas` permite exportar los reportes a **Excel** (`xlsx`) y **PDF** (`jsPDF` + `jspdf-autotable`) mediante las funciones de `features/admin/utils/estadisticasExport.ts`.

### 🔔 Pedidos en tiempo real

El hook `shared/hooks/useRealtimePedidos.ts` se suscribe al canal de **Supabase Realtime** sobre la tabla `pedidos` (INSERT/UPDATE/DELETE) y refresca las vistas de cocina, domicilios y entrega local automáticamente. Si Realtime no está habilitado en el proyecto de Supabase, hace fallback a polling cada 30s. Requiere activar la réplica de la tabla `pedidos` en *Database → Replication*.

---

## Flujo de pedido y confirmación de entrega

### Tipos de pedido

| Tipo | Cómo se inicia | Cómo se confirma entrega |
|---|---|---|
| **Mesa** | Escaneando el QR de la mesa (URL con `?mesa=N`) | QR del cliente escaneado por el admin |
| **Para llevar** | Selección manual en el carrito | Casillero asignado en `/admin/local`, QR escaneado en `/escanear-entrega` |
| **Domicilio** | Selección manual en el carrito | QR del cliente escaneado por el domiciliario |

> **Importante:** La opción "en mesa" no está disponible en el selector manual del carrito. El cliente llega a ese modo únicamente escaneando el QR físico de la mesa.

### Entrega local con casillero ("para llevar")

Para pedidos **para llevar** listos, el admin asigna un **casillero** (`X` o `Y`) desde `/admin/local` (`EntregaLocalAdminPage`). El cliente recoge su pedido escaneando su QR en `/escanear-entrega` (`EntregaLocalPage`), que valida el token y abre el casillero correspondiente. Ambas vistas se mantienen sincronizadas en tiempo real vía `useRealtimePedidos` y soportan integración con hardware (Web Serial API) para la apertura física del casillero.

### QR de entrega — flujo completo

1. El cliente hace su pedido (efectivo o Mercado Pago).
2. Inmediatamente recibe un **código QR en pantalla**:
   - Pago en efectivo → aparece en el paso de confirmación del carrito.
   - Pago con MP → aparece en la página de resultado (nueva pestaña).
3. Si cierra la página puede volver a su QR desde el **OrderTracker** en el menú → botón "📱 Ver mi QR de entrega" → `/mi-pedido/:id`.
4. Cuando el pedido está **Listo**:
   - El admin abre el escáner en el panel de pedidos (botón **📷 Escanear QR**).
   - La cámara del PC detecta el QR del cliente automáticamente.
   - Se muestra un preview del pedido para verificar antes de confirmar.
   - Al confirmar, el pedido pasa a **Entregado** sin intervención manual.
   - Para domicilios, el domiciliario usa su propio escáner en `/domicilios`.

### Seguridad del pedido activo (localStorage)

El pedido activo se guarda en `localStorage` con un campo `clienteId` opcional (ID de Supabase):

- **Pedido de invitado** (`clienteId` ausente): visible en cualquier sesión del mismo dispositivo.
- **Pedido de cliente logueado** (`clienteId` presente): solo visible cuando ese mismo usuario está autenticado. Si cierra sesión el tracker desaparece; al volver a entrar reaparece automáticamente.

---

## Convención de precios e IVA

Los precios se almacenan **sin IVA** en la base de datos (`platos.precio`). El IVA se aplica al mostrar el precio al cliente y al agregar al carrito:

```
precioConIva = Math.round(precio * (1 + tasaIva))
```

El ítem en el carrito guarda `precio = precioConIva` y `tasaIva = 0` para evitar aplicar el IVA dos veces. El asistente IA sigue la misma convención.

---

## Pasarela de pago

El checkout de **Mercado Pago** se abre en una **nueva pestaña** (`window.open`). La pestaña original con el menú permanece abierta. El resultado del pago se procesa en `/pago-resultado`.

El módulo `backend/src/modules/pagos` gestiona la integración:

| Endpoint | Descripción |
|---|---|
| `POST /pagos/generar` | Crea una preferencia en Mercado Pago y devuelve la URL de checkout (público) |
| `POST /pagos/confirmar` | Verifica el pago con la API de MP tras el redirect y crea el pedido |
| `POST /pagos/efectivo` | Crea el pedido directamente con pago en efectivo (sin MP) |

---

## Roles del sistema

| Rol | Ruta principal | Descripción |
|---|---|---|
| `admin` | `/admin` | Gestión completa + escáner QR de entrega para mesa/llevar y asignación de casilleros (`/admin/local`) |
| `cocinero` | `/cocina` | Vista KDS de comandas |
| `domiciliario` | `/domicilios` | Gestión de entregas + escáner QR de entrega |
| `cliente` | `/menu` | Hacer pedidos vía QR o directamente |

> `/` es la landing page pública (`RemiLandingPage`) y `/escanear-entrega` es el escáner público de casillero para recoger pedidos "para llevar".

---

## Base de datos

El esquema está definido en `BASE.dia` (abrir con [Dia Diagram](https://wiki.gnome.org/Apps/Dia)).

En desarrollo, TypeORM sincroniza el esquema automáticamente (`synchronize: true`).  
**En producción esto debe desactivarse** y usar migraciones.

### Generar una migración (cuando el esquema cambie)

```bash
cd backend
npm run typeorm migration:generate -- -n NombreDeLaMigracion
npm run typeorm migration:run
```

---

## Variables de entorno

Copia `.env.example` como `.env` y rellena los valores. Nunca commitees `.env`.

```env
# Base de datos
DB_HOST=
DB_PORT=5432
DB_NAME=operacion_remi
DB_USER=
DB_PASSWORD=
DB_SSL=true        # true para Supabase/Neon, false para local

# Servidor
PORT=3000
NODE_ENV=development

# Auth (legacy JWT — se mantiene por compatibilidad con staff)
JWT_SECRET=        # Cadena larga y aleatoria
JWT_EXPIRES_IN=7d

# Supabase
SUPABASE_URL=      # https://<proyecto>.supabase.co
SUPABASE_ANON_KEY= # Clave anon pública
SUPABASE_SERVICE_ROLE_KEY= # Clave secreta (solo backend, nunca en frontend)

# Groq (chatbot IA)
GROQ_API_KEY=      # Obtener en console.groq.com
```

> El frontend también necesita `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en un archivo `frontend/.env`.

---

## Scripts disponibles

### Frontend

```bash
npm run dev       # Servidor de desarrollo
npm run build     # Build de producción
npm run preview   # Vista previa del build
```

### Backend

```bash
npm run start:dev   # Modo watch (reinicia al guardar)
npm run build       # Compilar a JavaScript
npm run start:prod  # Ejecutar build de producción
npm run lint        # Revisar estilo de código
```
