# Operación Remi 🍽️

Sistema de autoservicio digital para restaurante. El cliente accede desde su celular vía código QR, hace su pedido y lo personaliza sin necesidad de instalar ninguna app.

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + TypeScript |
| Backend | NestJS 11 + TypeORM |
| Base de datos | PostgreSQL (Neon en la nube) |
| Estilos | CSS Modules |

---

## Requisitos previos

- **Node.js** v20 o superior
- **npm** v10 o superior
- Credenciales de la base de datos (pedírselas al líder del equipo)

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

> Las credenciales de la base de datos **nunca van en el repositorio**. El archivo `.env` ya está en `.gitignore`. Pídele los valores al líder del equipo por WhatsApp o Discord.

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
│   │   │   └── MenuPage.tsx      # Vista del cliente (galería de platos)
│   │   └── components/
│   │       ├── PlatoModal.tsx    # Modal de detalle + personalización
│   │       └── PersonalizedSection.tsx
│   │
│   ├── admin/
│   │   ├── components/
│   │   │   └── AdminLayout.tsx   # Shell con sidebar — usado en todas las páginas admin
│   │   └── pages/
│   │       ├── AdminDashboard.tsx
│   │       ├── MenuGestion.tsx
│   │       ├── IngredientesGestion.tsx
│   │       ├── PedidosAdmin.tsx
│   │       ├── DomiciliosAdmin.tsx
│   │       ├── UsuariosGestion.tsx
│   │       └── EstadisticasPage.tsx
│   │
│   ├── cocina/
│   │   └── pages/
│   │       └── CocinaDashboard.tsx  # KDS — comandas en tiempo real
│   │
│   ├── domicilios/
│   │   └── pages/
│   │       └── DomiciliosDashboard.tsx
│   │
│   ├── carrito/
│   │   ├── context/
│   │   │   └── CarritoContext.tsx   # Estado global del carrito (localStorage)
│   │   ├── components/
│   │   │   └── CartDrawer.tsx       # Panel lateral del carrito
│   │   └── types/
│   │       └── carrito.types.ts     # CartItem, CartExtra, CarritoContextValue
│   │
│   └── pedido/                      # Flujo de confirmación / seguimiento
│
└── shared/
    ├── components/
    │   ├── ProtectedRoute.tsx   # Redirige si el rol no está permitido
    │   ├── AppShell.tsx         # Header genérico para staff
    │   └── PlatoImage.tsx       # Imagen de plato con fallback SVG por categoría
    └── (hooks/, utils/ si hacen falta)
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
    │   ├── auth.controller.ts    # POST /auth/login, POST /auth/registro
    │   ├── auth.service.ts       # Lógica de login, generación de JWT
    │   ├── guards/               # JwtAuthGuard, RolesGuard
    │   ├── decorators/           # @Roles(), @CurrentUser()
    │   └── entities/
    │       ├── user-staff.entity.ts   # Tabla: user_staff
    │       ├── cliente.entity.ts      # Tabla: clientes
    │       └── sesion-cliente.entity.ts
    │
    ├── menu/
    │   ├── menu.module.ts
    │   ├── menu.controller.ts    # GET /menu, GET /menu/:id
    │   ├── menu.service.ts
    │   └── entities/
    │       ├── categoria.entity.ts    # Tabla: categorias
    │       ├── plato.entity.ts        # Tabla: platos
    │       ├── ingrediente.entity.ts  # Tabla: ingredientes
    │       └── extra.entity.ts        # Tabla: extras
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

## Roles del sistema

| Rol | Ruta principal | Descripción |
|---|---|---|
| `admin` | `/admin` | Gestión completa del sistema |
| `cocinero` | `/cocina` | Vista KDS de comandas |
| `domiciliario` | `/domicilios` | Gestión de entregas |
| `cliente` | `/menu` | Hacer pedidos vía QR |

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
DB_HOST=        # Host de PostgreSQL (Neon u otro)
DB_PORT=5432
DB_NAME=operacion_remi
DB_USER=
DB_PASSWORD=
DB_SSL=true     # true para Neon/cloud, false para local

PORT=3000
NODE_ENV=development

JWT_SECRET=     # Cadena larga y aleatoria
JWT_EXPIRES_IN=7d
```

---

## Flujo de trabajo en equipo

```
main
 └── dev              ← rama de integración
      ├── feat/menu-api
      ├── feat/auth-jwt
      ├── feat/kds-cocina
      └── fix/cart-subtotal
```

1. Crea tu rama desde `dev`: `git checkout -b feat/nombre-de-la-feature`
2. Haz commits pequeños y descriptivos
3. Abre un Pull Request hacia `dev` cuando termines
4. Nunca hagas push directo a `main`

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
