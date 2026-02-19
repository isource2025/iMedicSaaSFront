# Documentación Completa de UI - iMedicWS Frontend

**Versión:** 1.0  
**Fecha:** Febrero 2026  
**Framework:** Next.js 14.1.0  
**Propósito:** Documentación para migración y upgrade de UI

---

## Tabla de Contenidos

1. [Arquitectura General](#arquitectura-general)
2. [Sistema de Diseño](#sistema-de-diseño)
3. [Estructura de Componentes](#estructura-de-componentes)
4. [Páginas y Rutas](#páginas-y-rutas)
5. [Servicios y API](#servicios-y-api)
6. [Hooks Personalizados](#hooks-personalizados)
7. [Tipos y Interfaces](#tipos-y-interfaces)
8. [Nomenclatura y Convenciones](#nomenclatura-y-convenciones)

---

## 1. Arquitectura General

### Stack Tecnológico
- **Framework:** Next.js 14.1.0 (App Router)
- **Lenguaje:** TypeScript 5.2.2
- **Styling:** Tailwind CSS 3.3.0 + CSS Modules
- **Iconos:** Lucide React 0.501.0, React Icons 5.5.0
- **Gráficos:** Recharts 2.15.3
- **HTTP Client:** Axios 1.8.4
- **Manejo de Fechas:** date-fns 4.1.0

### Estructura de Directorios

```
src/app/
├── components/          # Componentes reutilizables
│   ├── admission/       # Componentes de admisión
│   ├── beds/           # Componentes de gestión de camas
│   ├── Carousel/       # Carrusel de login
│   ├── Charts/         # Componentes de gráficos
│   ├── Header/         # Header principal
│   ├── indicaciones/   # Componentes de indicaciones médicas
│   ├── layout/         # Componentes de layout
│   ├── Login/          # Formulario de login
│   ├── modals/         # Modales reutilizables
│   ├── nursing/        # Componentes de enfermería
│   ├── Patients/       # Componentes de pacientes
│   ├── Rendiciones/    # Componentes de rendiciones
│   ├── Sidebar/        # Sidebar de navegación
│   └── UI/             # Componentes UI base
├── config/             # Configuración
├── contexts/           # Context API
├── dashboard/          # Páginas del dashboard
├── hooks/              # Custom hooks
├── services/           # Servicios API
├── types/              # TypeScript types
└── utils/              # Utilidades
```

---

## 2. Sistema de Diseño

### Paleta de Colores

#### Colores Pantone Principales
```css
--pantone-313u: #00B5E2  /* RGB: 0, 181, 226 - Azul turquesa brillante */
--pantone-311u: #61D6EB  /* RGB: 97, 214, 235 - Azul celeste claro */
--pantone-314c: #0083A9  /* RGB: 0, 131, 169 - Azul turquesa oscuro */
--pantone-311c: #2DCCE5  /* RGB: 45, 204, 229 - Azul celeste medio */
```

#### Design Tokens
```css
--bg: #F6FBFD           /* Background principal */
--card: #FFFFFF         /* Background de cards */
--ink: #123             /* Texto principal */
--muted: #6B7A90        /* Texto secundario */
--primary: #2DCCE5      /* Color primario (pantone-311c) */
--primary-600: #0083A9  /* Primary oscuro (pantone-314c) */
--primary-50: #E6FBF8   /* Primary claro */
--border: #E6EEF5       /* Bordes */
--warning: #F59E0B      /* Advertencias */
--danger: #EF4444       /* Errores/Peligro */
--radius: 14px          /* Border radius estándar */
--shadow: 0 6px 24px rgba(2, 23, 42, 0.06)  /* Sombra estándar */
```

### Tipografía

**Fuente Principal:** Roboto (Google Fonts)
- **Weights:** 100-900 (variable)
- **Fallback:** -apple-system, BlinkMacSystemFont, 'Segoe UI', Oxygen, Ubuntu, Cantarell

**Tamaños de Encabezados:**
- `h1`: 2rem (32px)
- `h2`: 1.5rem (24px)
- `h3`: 1.25rem (20px)
- `h4`: 1.125rem (18px)
- Base: 16px

### Clases Utility de Tailwind

#### Botones
```css
.btn-primary {
  @apply bg-pantone-314c hover:bg-pantone-313u text-white 
         font-bold py-2 px-4 rounded shadow-md 
         transition-colors duration-300;
}
```

#### Inputs
```css
.input-field {
  @apply border border-gray-300 rounded-md p-2 
         focus:outline-none focus:ring-2 focus:ring-pantone-311c 
         w-full;
}
```

#### Cards
```css
.card {
  @apply bg-white rounded-lg shadow-md p-6;
}
```

### Responsive Breakpoints

- **Mobile:** < 640px (font-size: 14px)
- **Tablet:** 640px - 1279px
- **Desktop:** ≥ 1280px (max-width: 1200px container)

---

## 3. Estructura de Componentes

### 3.1 Componentes de Layout

#### LayoutShell
**Ubicación:** `components/layout/LayoutShell.tsx`
**Propósito:** Layout principal del dashboard con sidebar y header
**Props:**
- `children: React.ReactNode`

**Características:**
- Manejo de sidebar responsive (collapsed/expanded en desktop, drawer en mobile)
- Header fijo con información de empresa y sector
- Gestión de estado de sidebar con hooks

#### Header
**Ubicación:** `components/Header/Header.tsx`
**Props:**
- `sidebarOpen: boolean`
- `setSidebarOpen: (open: boolean) => void`

**Elementos:**
- Botón de menú hamburguesa (mobile)
- Información de empresa y sector
- Notificaciones
- Avatar y nombre de usuario
- Dropdown de usuario

#### Sidebar
**Ubicación:** `components/Sidebar/Sidebar.tsx`
**Props:**
- `sidebarOpen: boolean`
- `setSidebarOpen: (open: boolean) => void`
- `isDesktop: boolean`

**Navegación:**
1. **Dashboard** - `/dashboard`
2. **Turnos** (submenu)
   - Agenda
   - Administrador de turnos
   - Excepciones
   - Configuración
   - Tablas de turnos
3. **Admisión** (submenu)
   - Pacientes - `/dashboard/patients`
   - Nueva admisión - `/dashboard/admission/new`
   - Admisiones vigentes - `/dashboard/admission/current`
   - Tablas de admisión - `/dashboard/admission/tables`
4. **Internación** (submenu)
   - Gestión de Camas - `/dashboard/beds`
   - Ocupación de camas
   - Tablas de internación
5. **Facturación** (submenu)
   - Convenios
   - Rendiciones - `/dashboard/billing/rendiciones`
   - Liquidaciones
   - Tablas de facturación
6. **Reportes** (submenu)
   - Estadísticas
   - Facturación
   - Ocupación
7. **Configuración** (submenu)
   - General
   - Usuarios
   - Permisos
   - Sectores

**Comportamiento:**
- Desktop: Collapsed por defecto, expande on hover
- Mobile: Drawer que se abre/cierra con backdrop

---

### 3.2 Componentes de Autenticación

#### LoginForm
**Ubicación:** `components/Login/LoginForm.tsx`
**Funcionalidad:**
- Formulario de login con usuario y contraseña
- Selector de sector
- Checkbox "Recordarme"
- Validación de campos
- Integración con `authService`

#### LoginCarousel
**Ubicación:** `components/Carousel/LoginCarousel.tsx`
**Propósito:** Carrusel de imágenes en la página de login

---

### 3.3 Componentes de Pacientes

#### PatientList
**Ubicación:** `components/Patients/PatientList.tsx`
**Funcionalidad:**
- Lista de pacientes con paginación
- Búsqueda y filtros
- Acciones: Ver, Editar, Eliminar

#### PatientForm
**Ubicación:** `components/Patients/PatientForm.tsx`
**Funcionalidad:**
- Formulario completo de paciente
- Tabs para diferentes secciones de datos

#### PatientFormBase
**Ubicación:** `components/Patients/PatientFormBase.tsx`
**Propósito:** Componente base reutilizable para formularios de paciente

#### PatientDetails
**Ubicación:** `components/Patients/PatientDetails.tsx`
**Funcionalidad:** Vista detallada de información del paciente

#### AddPatient (Tabs)
**Ubicación:** `components/Patients/AddPatient/`
**Tabs:**
- Datos personales
- Datos laborales
- Otros datos

---

### 3.4 Componentes de Camas (Beds)

#### BedsList
**Ubicación:** `components/beds/BedsList.tsx`
**Funcionalidad:**
- Grid de camas con estados
- Filtros por sector, estado, etc.

#### BedCard
**Ubicación:** `components/beds/BedCard.tsx`
**Propósito:** Card individual de cama con información del paciente

#### BedDetail / BedDetailView
**Ubicación:** `components/beds/BedDetail.tsx`, `BedDetailView.tsx`
**Funcionalidad:**
- Vista detallada de cama
- Información del paciente internado
- Tabs para diferentes secciones

#### BedFilters
**Ubicación:** `components/beds/BedFilters.tsx`
**Filtros:**
- Por sector
- Por estado de cama
- Por tipo de paciente

#### Subcarpetas de Beds:
- **contexts/**: Context providers para gestión de estado
- **controles/**: Componentes de controles frecuentes
- **evolucion/**: Evolución de enfermería
- **hooks/**: Custom hooks para beds
- **indicaciones/**: Gestión de indicaciones médicas
- **insumos/**: Gestión de insumos
- **medicacion/**: Control de medicación
- **patient/**: Información del paciente en cama
- **shared/**: Componentes compartidos
- **sidebar/**: Sidebar específico de bed detail

---

### 3.5 Componentes de Admisión

#### AdmissionTables
**Ubicación:** `components/admission/AdmissionTables/`
**Funcionalidad:**
- Tablas de configuración de admisión
- CRUD de catálogos

#### ActionModal
**Ubicación:** `components/admission/ActionModal.tsx`
**Propósito:** Modal genérico para acciones de admisión

#### DataTableModal
**Ubicación:** `components/admission/DataTableModal.tsx`
**Funcionalidad:**
- Modal para gestión de tablas de datos
- Agregar/Editar/Eliminar registros

#### AddPredefinedOption
**Ubicación:** `components/admission/AddPredefinedOption.tsx`
**Propósito:** Agregar opciones predefinidas a catálogos

---

### 3.6 Componentes de Indicaciones

#### IndicacionesList
**Ubicación:** `components/indicaciones/IndicacionesList.tsx`
**Funcionalidad:**
- Lista de indicaciones médicas
- Estados: Pendiente, Aplicada, Cancelada

#### NuevaIndicacionModal
**Ubicación:** `components/indicaciones/NuevaIndicacionModal.tsx`
**Propósito:** Modal para crear nueva indicación

#### AplicarIndicacion
**Ubicación:** `components/indicaciones/AplicarIndicacion.tsx`
**Funcionalidad:** Marcar indicación como aplicada

---

### 3.7 Componentes de Enfermería (Nursing)

**Ubicación:** `components/nursing/`
**Componentes:**
- Evolución de enfermería
- Controles frecuentes
- Medicación control
- Reportes de enfermería

---

### 3.8 Componentes de Modales

#### ModalBase
**Ubicación:** `components/modals/ModalBase.tsx`
**Propósito:** Modal base reutilizable

#### ModalBasePaciente
**Ubicación:** `components/modals/ModalBasePaciente.tsx`
**Funcionalidad:** Modal específico para gestión de pacientes

#### ModalCambiarCama
**Ubicación:** `components/modals/ModalCambiarCama.tsx`
**Funcionalidad:** Modal para cambiar paciente de cama

#### ModalEgresoPaciente
**Ubicación:** `components/modals/ModalEgresoPaciente.tsx`
**Funcionalidad:** Modal para egreso de paciente

#### ModalDiagnosticosCie10
**Ubicación:** `components/modals/ModalDiagnosticosCie10.tsx`
**Funcionalidad:** Búsqueda y selección de diagnósticos CIE-10

#### ModalBusquedaDiagnosticos
**Ubicación:** `components/modals/ModalBusquedaDiagnosticos.tsx`
**Funcionalidad:** Búsqueda avanzada de diagnósticos

#### ModalAddPatient
**Ubicación:** `components/modals/ModalAddPatient/`
**Propósito:** Modal para agregar nuevo paciente

---

### 3.9 Componentes de Rendiciones

#### RendicionList
**Ubicación:** `components/Rendiciones/RendicionList.tsx`
**Funcionalidad:** Lista de rendiciones con filtros

#### RendicionFilters
**Ubicación:** `components/Rendiciones/RendicionFilters.tsx`
**Filtros:**
- Por fecha
- Por estado
- Por cobertura

---

### 3.10 Componentes de UI Base

#### Modal
**Ubicación:** `components/UI/Modal.tsx`
**Propósito:** Modal genérico reutilizable
**Props:**
- `isOpen: boolean`
- `onClose: () => void`
- `title?: string`
- `children: React.ReactNode`

#### Pagination
**Ubicación:** `components/UI/Pagination.tsx`
**Propósito:** Componente de paginación
**Props:**
- `currentPage: number`
- `totalPages: number`
- `onPageChange: (page: number) => void`

---

### 3.11 Componentes de Gráficos

**Ubicación:** `components/Charts/`

#### BarChart
**Propósito:** Gráfico de barras (Recharts)

#### LineChart
**Propósito:** Gráfico de líneas (Recharts)

#### PieChart
**Propósito:** Gráfico circular (Recharts)

#### DonutChart
**Propósito:** Gráfico de dona (Recharts)

---

### 3.12 Componentes de Dashboard

#### MetricCard
**Ubicación:** `components/MetricCard/index.tsx`
**Propósito:** Card de métrica con valor y cambio porcentual

#### InsightCard
**Ubicación:** `components/InsightCard/index.tsx`
**Propósito:** Card de insights/información destacada

#### MetricTooltip
**Ubicación:** `components/MetricTooltip/MetricTooltip.tsx`
**Propósito:** Tooltip para métricas con información adicional

#### AnalyticsLoader
**Ubicación:** `components/AnalyticsLoader/index.tsx`
**Propósito:** Loader para carga de analytics

---

## 4. Páginas y Rutas

### Estructura de Rutas (App Router)

```
/                                    # Login page
/dashboard                           # Dashboard principal
/dashboard/patients                  # Lista de pacientes
/dashboard/admission/new             # Nueva admisión
/dashboard/admission/current         # Admisiones vigentes
/dashboard/admission/tables          # Tablas de admisión
/dashboard/beds                      # Gestión de camas
/dashboard/beds/[id]                 # Detalle de cama
/dashboard/beds/occupation           # Ocupación de camas
/dashboard/beds/tables               # Tablas de internación
/dashboard/billing/convenios         # Convenios
/dashboard/billing/rendiciones       # Rendiciones
/dashboard/billing/liquidaciones     # Liquidaciones
/dashboard/billing/tables            # Tablas de facturación
/dashboard/bed-detail/[id]           # Detalle alternativo de cama
```

### Página Principal (Login)
**Archivo:** `app/page.tsx`
**Layout:** Grid con carrusel de imágenes y formulario de login
**Componentes:**
- `LoginCarousel`
- `LoginForm`

### Dashboard Principal
**Archivo:** `app/dashboard/page.tsx`
**Contenido:**
- Métricas principales
- Gráficos de ocupación
- Insights
- Actividad reciente

---

## 5. Servicios y API

### Configuración Base

#### axios.ts
**Ubicación:** `services/axios.ts`
**Configuración:**
- Base URL: `process.env.NEXT_PUBLIC_API_URL` (fallback: `http://localhost:5005/api`)
- Timeout: 15000ms
- Headers: `Content-Type: application/json`
- Interceptor de request: Agrega token JWT
- Interceptor de response: Manejo de errores 401, 403, 500+

### Servicios Principales

#### authService
**Archivo:** `services/authService.ts`
**Métodos:**
- `login(username, password, sectorId)`
- `logout()`
- `getCurrentUser()`
- `isAuthenticated()`

#### patientService
**Archivo:** `services/patientService.ts`
**Métodos:**
- `getPatients(filters, pagination)`
- `getPatientById(id)`
- `createPatient(data)`
- `updatePatient(id, data)`
- `deletePatient(id)`
- `uploadPhoto(id, file)`

#### bedsService
**Archivo:** `services/bedsService.ts`
**Métodos:**
- `getBeds(filters)`
- `getBedById(id)`
- `updateBedStatus(id, status)`
- `assignPatient(bedId, patientId)`
- `dischargePatient(bedId)`

#### admissionService
**Archivo:** `services/admissionService.ts`
**Métodos:**
- `getAdmissions(filters)`
- `createAdmission(data)`
- `updateAdmission(id, data)`
- `getAdmissionById(id)`

#### indicacionesService
**Archivo:** `services/indicacionesService.ts`
**Métodos:**
- `getIndicaciones(bedId)`
- `createIndicacion(data)`
- `updateIndicacion(id, data)`
- `aplicarIndicacion(id)`
- `cancelarIndicacion(id)`

#### rendicionService
**Archivo:** `services/rendicionService.ts`
**Métodos:**
- `getRendiciones(filters)`
- `createRendicion(data)`
- `updateRendicion(id, data)`

#### dashboardService
**Archivo:** `services/dashboardService.ts`
**Métodos:**
- `getMetrics()`
- `getOccupancyData()`
- `getActivityData()`

### Servicios de Catálogos

Todos siguen el mismo patrón CRUD:

- `clasePacienteService.ts`
- `coberturaService.ts`
- `dadorOrganosService.ts`
- `diagnosticoService.ts`
- `disposicionEgresoService.ts`
- `estadoAmbulatorioService.ts`
- `estadoCivilService.ts`
- `estadoMilitarService.ts`
- `grupoEtnico.service.ts`
- `idiomaISO.service.ts`
- `localidad.service.ts`
- `nacionalidad.service.ts`
- `parentesco.service.ts`
- `provincia.service.ts`
- `raza.service.ts`
- `religion.service.ts`
- `requisito.service.ts`
- `rolContacto.service.ts`
- `sexo.service.ts`
- `tipoAdmision.service.ts`
- `tipoPaciente.service.ts`

**Métodos comunes:**
- `getAll()`
- `getById(id)`
- `create(data)`
- `update(id, data)`
- `delete(id)`

---

## 6. Hooks Personalizados

### useLoginForm
**Archivo:** `hooks/useLoginForm.ts`
**Propósito:** Manejo de estado y lógica del formulario de login
**Returns:**
- `formData`
- `errors`
- `loading`
- `handleChange`
- `handleSubmit`

### usePatients
**Archivo:** `hooks/usePatients.ts`
**Propósito:** Gestión de lista de pacientes
**Returns:**
- `patients`
- `loading`
- `error`
- `pagination`
- `filters`
- `handleFilterChange`
- `handlePageChange`
- `refreshPatients`

### useBedsManagement
**Archivo:** `hooks/useBedsManagement.ts`
**Propósito:** Gestión de camas
**Returns:**
- `beds`
- `loading`
- `filters`
- `handleFilterChange`
- `assignPatient`
- `dischargePatient`

### useIndicadores
**Archivo:** `hooks/useIndicadores.ts`
**Propósito:** Gestión de indicadores de camas
**Returns:**
- `indicadores`
- `loading`
- `updateIndicador`

### useCamasIndicadores
**Archivo:** `hooks/useCamasIndicadores.ts`
**Propósito:** Indicadores específicos de camas
**Returns:**
- `indicadores`
- `loading`
- `refresh`

### useRendiciones
**Archivo:** `hooks/useRendiciones.ts`
**Propósito:** Gestión de rendiciones
**Returns:**
- `rendiciones`
- `loading`
- `filters`
- `handleFilterChange`
- `createRendicion`

### useOpcGrdManager
**Archivo:** `hooks/useOpcGrdManager.ts`
**Propósito:** Gestión de opciones de GRD
**Returns:**
- `opciones`
- `loading`
- `createOpcion`
- `updateOpcion`
- `deleteOpcion`

### useModalDiagnosticosCie10
**Archivo:** `hooks/useModalDiagnosticosCie10.ts`
**Propósito:** Lógica del modal de diagnósticos CIE-10
**Returns:**
- `isOpen`
- `diagnosticos`
- `search`
- `handleSearch`
- `handleSelect`
- `close`

### useDebounce
**Archivo:** `hooks/useDebounce.ts`
**Propósito:** Debounce de valores (búsquedas)
**Params:**
- `value: T`
- `delay: number`
**Returns:** `debouncedValue: T`

### useSearchManager
**Archivo:** `hooks/useSearchManager.ts`
**Propósito:** Gestión de búsquedas con debounce
**Returns:**
- `searchTerm`
- `debouncedSearchTerm`
- `handleSearchChange`
- `clearSearch`

### useBedRelatedData
**Archivo:** `hooks/useBedRelatedData.ts`
**Propósito:** Datos relacionados a una cama específica
**Returns:**
- `patient`
- `indicaciones`
- `controles`
- `loading`

### useEstadoAmbulatorio
**Archivo:** `hooks/useEstadoAmbulatorio.ts`
**Propósito:** Gestión de estados ambulatorios
**Returns:**
- `estados`
- `loading`
- `getEstadoById`

---

## 7. Tipos y Interfaces

### Tipos de Autenticación

#### AuthInterface.ts
```typescript
interface User {
  id: number;
  nombre: string;
  usuario: string;
  rol: string;
  sectores: Sector[];
}

interface Sector {
  id: number;
  descripcion: string;
  codigo: string;
}

interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
}
```

### Tipos de Pacientes

#### PatientInterface.ts
```typescript
interface Patient {
  id: number;
  numeroDocumento: string;
  apellido: string;
  nombre: string;
  fechaNacimiento: Date;
  sexo: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  // ... más campos
}
```

#### PatientFormInterface.ts
```typescript
interface PatientFormData {
  // Datos personales
  numeroDocumento: string;
  apellido: string;
  nombre: string;
  fechaNacimiento: string;
  sexoId: number;
  // ... más campos
}
```

### Tipos de Camas

#### beds.ts
```typescript
interface Bed {
  id: number;
  numero: string;
  sectorId: number;
  estado: BedStatus;
  paciente?: Patient;
  fechaIngreso?: Date;
}

enum BedStatus {
  DISPONIBLE = 'disponible',
  OCUPADA = 'ocupada',
  MANTENIMIENTO = 'mantenimiento',
  BLOQUEADA = 'bloqueada'
}
```

### Tipos de Indicaciones

#### indicaciones.ts
```typescript
interface Indicacion {
  id: number;
  camaId: number;
  tipo: TipoIndicacion;
  descripcion: string;
  fechaHora: Date;
  estado: EstadoIndicacion;
  profesional: string;
}

enum TipoIndicacion {
  MEDICACION = 'medicacion',
  DIETA = 'dieta',
  ESTUDIOS = 'estudios',
  CUIDADOS = 'cuidados'
}

enum EstadoIndicacion {
  PENDIENTE = 'pendiente',
  APLICADA = 'aplicada',
  CANCELADA = 'cancelada'
}
```

### Tipos de Dashboard

#### dashboard.ts
```typescript
interface DashboardMetrics {
  totalPacientes: number;
  camasOcupadas: number;
  camasDisponibles: number;
  admisionesHoy: number;
  egresosHoy: number;
  ocupacionPorcentaje: number;
}

interface OccupancyData {
  sector: string;
  ocupadas: number;
  disponibles: number;
  total: number;
}
```

### Tipos de Admisión

#### admission.types.ts
```typescript
interface Admission {
  id: number;
  pacienteId: number;
  fechaAdmision: Date;
  tipoAdmisionId: number;
  motivoAdmision: string;
  diagnosticoPresuntivo: string;
  estado: EstadoAdmision;
}

enum EstadoAdmision {
  VIGENTE = 'vigente',
  EGRESADA = 'egresada',
  CANCELADA = 'cancelada'
}
```

### Tipos de Catálogos

Todos los catálogos siguen una estructura similar:

```typescript
interface CatalogoBase {
  id: number;
  descripcion: string;
  codigo?: string;
  activo: boolean;
}

// Ejemplos específicos:
interface Raza extends CatalogoBase {}
interface Religion extends CatalogoBase {}
interface EstadoCivil extends CatalogoBase {}
interface GrupoEtnico extends CatalogoBase {}
interface EstadoMilitar extends CatalogoBase {}
// ... etc
```

### Tipos de Enfermería

#### evolucionEnfermeria.ts
```typescript
interface EvolucionEnfermeria {
  id: number;
  camaId: number;
  fecha: Date;
  turno: Turno;
  evolucion: string;
  enfermero: string;
}

enum Turno {
  MAÑANA = 'mañana',
  TARDE = 'tarde',
  NOCHE = 'noche'
}
```

#### controlesFrecuentes.ts
```typescript
interface ControlFrecuente {
  id: number;
  camaId: number;
  fechaHora: Date;
  presionArterial: string;
  frecuenciaCardiaca: number;
  temperatura: number;
  saturacionO2: number;
  glucemia?: number;
}
```

#### medicacionControl.ts
```typescript
interface MedicacionControl {
  id: number;
  indicacionId: number;
  fechaHoraAplicacion: Date;
  dosis: string;
  via: string;
  enfermeroId: number;
  observaciones?: string;
}
```

---

## 8. Nomenclatura y Convenciones

### Convenciones de Nombres

#### Componentes
- **PascalCase** para nombres de componentes: `PatientList`, `BedCard`, `ModalBase`
- **Sufijos descriptivos**: 
  - `List` para listas: `PatientList`, `RendicionList`
  - `Form` para formularios: `LoginForm`, `PatientForm`
  - `Modal` para modales: `ModalBase`, `ModalCambiarCama`
  - `Card` para cards: `BedCard`, `MetricCard`
  - `Detail` para vistas detalladas: `PatientDetails`, `BedDetail`

#### Archivos
- Componentes: `ComponentName.tsx`
- Estilos: `ComponentName.module.css`
- Servicios: `entityService.ts` (camelCase)
- Hooks: `useHookName.ts` (camelCase con prefijo `use`)
- Types: `entity.types.ts` o `EntityInterface.ts`

#### Variables y Funciones
- **camelCase** para variables y funciones: `patientData`, `handleSubmit`, `fetchPatients`
- **Prefijos comunes**:
  - `handle` para event handlers: `handleClick`, `handleChange`
  - `is` para booleanos: `isLoading`, `isOpen`, `isActive`
  - `has` para booleanos: `hasError`, `hasData`
  - `get` para funciones que obtienen datos: `getPatients`, `getBedById`
  - `set` para setters: `setLoading`, `setError`
  - `fetch` para llamadas API: `fetchPatients`, `fetchBeds`

#### Constantes
- **UPPER_SNAKE_CASE** para constantes: `API_BASE_URL`, `DEFAULT_PAGE_SIZE`

#### CSS Classes
- **kebab-case** para clases CSS: `patient-list`, `bed-card`, `modal-header`
- **BEM-like** para modificadores: `button--primary`, `card--active`

### Estructura de Archivos de Componentes

#### Componente Simple
```
ComponentName/
├── ComponentName.tsx
└── ComponentName.module.css
```

#### Componente Complejo
```
ComponentName/
├── ComponentName.tsx
├── ComponentName.module.css
├── SubComponent1.tsx
├── SubComponent2.tsx
├── hooks/
│   └── useComponentName.ts
├── types.ts
└── index.ts
```

### Patrones de Importación

```typescript
// 1. React y Next.js
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// 2. Librerías externas
import axios from 'axios';
import { format } from 'date-fns';

// 3. Componentes
import Button from '@/components/UI/Button';
import Modal from '@/components/UI/Modal';

// 4. Hooks
import { usePatients } from '@/hooks/usePatients';

// 5. Services
import { patientService } from '@/services/patientService';

// 6. Types
import type { Patient } from '@/types/PatientInterface';

// 7. Estilos
import styles from './ComponentName.module.css';
```

### Patrones de Estado

#### Estado Local
```typescript
const [data, setData] = useState<DataType[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

#### Context API
```typescript
const { user, sectorSeleccionado, empresaInfo } = useAppContext();
```

### Patrones de Manejo de Errores

```typescript
try {
  setLoading(true);
  const response = await service.getData();
  setData(response.data);
} catch (error) {
  console.error('Error fetching data:', error);
  setError('Error al cargar los datos');
} finally {
  setLoading(false);
}
```

### Patrones de Formularios

```typescript
const [formData, setFormData] = useState<FormType>({
  field1: '',
  field2: '',
});

const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({
    ...prev,
    [name]: value
  }));
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  // Validación
  // Envío
};
```

### Patrones de Modales

```typescript
const [isModalOpen, setIsModalOpen] = useState(false);

const openModal = () => setIsModalOpen(true);
const closeModal = () => setIsModalOpen(false);

// En el JSX
<Modal isOpen={isModalOpen} onClose={closeModal}>
  {/* Contenido */}
</Modal>
```

---

## Mapeo de Nombres para Migración

### Componentes Principales

| Nombre Actual | Categoría | Descripción |
|--------------|-----------|-------------|
| `LayoutShell` | Layout | Layout principal con sidebar y header |
| `Sidebar` | Navigation | Sidebar de navegación con menús expandibles |
| `Header` | Navigation | Header con info de empresa y usuario |
| `LoginForm` | Auth | Formulario de autenticación |
| `LoginCarousel` | Auth | Carrusel de imágenes de login |
| `PatientList` | Patients | Lista de pacientes con filtros |
| `PatientForm` | Patients | Formulario de paciente |
| `PatientDetails` | Patients | Vista detallada de paciente |
| `BedsList` | Beds | Grid de camas |
| `BedCard` | Beds | Card individual de cama |
| `BedDetail` | Beds | Vista detallada de cama |
| `BedFilters` | Beds | Filtros de camas |
| `IndicacionesList` | Medical | Lista de indicaciones médicas |
| `NuevaIndicacionModal` | Medical | Modal para nueva indicación |
| `ModalBase` | UI | Modal base reutilizable |
| `ModalBasePaciente` | Patients | Modal de gestión de paciente |
| `ModalCambiarCama` | Beds | Modal para cambio de cama |
| `ModalEgresoPaciente` | Beds | Modal de egreso |
| `ModalDiagnosticosCie10` | Medical | Búsqueda de diagnósticos |
| `RendicionList` | Billing | Lista de rendiciones |
| `RendicionFilters` | Billing | Filtros de rendiciones |
| `MetricCard` | Dashboard | Card de métrica |
| `InsightCard` | Dashboard | Card de insight |
| `BarChart` | Charts | Gráfico de barras |
| `LineChart` | Charts | Gráfico de líneas |
| `PieChart` | Charts | Gráfico circular |
| `DonutChart` | Charts | Gráfico de dona |
| `Pagination` | UI | Componente de paginación |
| `Modal` | UI | Modal genérico |

### Servicios

| Nombre Actual | Propósito |
|--------------|-----------|
| `authService` | Autenticación y autorización |
| `patientService` | Gestión de pacientes |
| `bedsService` | Gestión de camas |
| `admissionService` | Gestión de admisiones |
| `indicacionesService` | Gestión de indicaciones médicas |
| `rendicionService` | Gestión de rendiciones |
| `dashboardService` | Datos del dashboard |
| `camasIndicadoresService` | Indicadores de camas |
| `controlesFrecuentesService` | Controles frecuentes |
| `evolucionEnfermeriaService` | Evolución de enfermería |
| `medicacionControlService` | Control de medicación |

### Hooks

| Nombre Actual | Propósito |
|--------------|-----------|
| `useLoginForm` | Lógica de formulario de login |
| `usePatients` | Gestión de pacientes |
| `useBedsManagement` | Gestión de camas |
| `useIndicadores` | Gestión de indicadores |
| `useCamasIndicadores` | Indicadores de camas |
| `useRendiciones` | Gestión de rendiciones |
| `useOpcGrdManager` | Gestión de opciones GRD |
| `useModalDiagnosticosCie10` | Lógica de modal de diagnósticos |
| `useDebounce` | Debounce de valores |
| `useSearchManager` | Gestión de búsquedas |
| `useBedRelatedData` | Datos relacionados a cama |
| `useEstadoAmbulatorio` | Estados ambulatorios |

### Tipos/Interfaces

| Nombre Actual | Entidad |
|--------------|---------|
| `User` | Usuario del sistema |
| `Sector` | Sector hospitalario |
| `Patient` | Paciente |
| `Bed` | Cama |
| `Admission` | Admisión |
| `Indicacion` | Indicación médica |
| `EvolucionEnfermeria` | Evolución de enfermería |
| `ControlFrecuente` | Control frecuente |
| `MedicacionControl` | Control de medicación |
| `Rendicion` | Rendición |
| `DashboardMetrics` | Métricas del dashboard |
| `OccupancyData` | Datos de ocupación |

---

## Notas Adicionales para Migración

### Dependencias Clave a Mantener
- **Tailwind CSS**: Sistema de estilos principal
- **Lucide React**: Iconografía
- **Recharts**: Gráficos
- **Axios**: Cliente HTTP
- **date-fns**: Manejo de fechas

### Patrones de Diseño Utilizados
1. **Component Composition**: Componentes pequeños y reutilizables
2. **Custom Hooks**: Lógica reutilizable extraída en hooks
3. **Service Layer**: Capa de servicios para llamadas API
4. **CSS Modules**: Estilos encapsulados por componente
5. **Context API**: Estado global (usuario, sector, empresa)

### Consideraciones de Responsive
- Mobile-first approach
- Sidebar: Drawer en mobile, collapsed/expanded en desktop
- Tablas: Scroll horizontal en mobile
- Modales: Full screen en mobile, centered en desktop

### Accesibilidad
- Uso de `aria-label` en botones sin texto
- Clase `.visually-hidden` para screen readers
- Navegación por teclado en modales y formularios

### Performance
- Lazy loading de componentes pesados
- Debounce en búsquedas (300ms)
- Paginación en listas grandes (30 items por defecto)
- Memoización de componentes costosos

---

## Conclusión

Esta documentación proporciona una visión completa de la UI actual del proyecto iMedicWS Frontend. Incluye:

✅ Arquitectura y stack tecnológico  
✅ Sistema de diseño completo (colores, tipografía, tokens)  
✅ Inventario completo de componentes  
✅ Estructura de páginas y rutas  
✅ Servicios y patrones de API  
✅ Hooks personalizados  
✅ Tipos e interfaces TypeScript  
✅ Convenciones de nomenclatura  
✅ Mapeo de nombres para migración  

Esta información te permitirá:
1. Entender la estructura actual completa
2. Planificar la migración de UI
3. Mantener consistencia en nombres y patrones
4. Identificar componentes a reemplazar o actualizar
5. Preservar la lógica de negocio durante el upgrade

**Fecha de generación:** Febrero 2026  
**Versión del proyecto:** 1.0  
**Generado para:** Proceso de upgrade y migración de UI
