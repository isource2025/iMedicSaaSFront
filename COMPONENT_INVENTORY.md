# Inventario Detallado de Componentes - iMedicWS Frontend

**Fecha:** Febrero 2026   
**Propósito:** Inventario completo de archivos para proceso de migración de UI   
 
---      
  
## Estructura Completa de Componentes 
   
### 📁 components/AnalyticsLoader/  
`
├── index.tsx                    # Loader para analytics
```    

### 📁 components/Carousel/
```
├── LoginCarousel.tsx            # Carrusel de imágenes en login
├── LoginCarousel.module.css     # Estilos del carrusel
```

### 📁 components/Charts/
```
├── BarChart.tsx                 # Gráfico de barras (Recharts)
├── DonutChart.tsx               # Gráfico de dona (Recharts)
├── LineChart.tsx                # Gráfico de líneas (Recharts)
├── PieChart.tsx                 # Gráfico circular (Recharts)
```

### 📁 components/Header/
```
├── Header.tsx                   # Header principal del dashboard
├── Header.module.css            # Estilos del header
```

### 📁 components/InsightCard/
```
├── index.tsx                    # Card de insights/información destacada
├── InsightCard.module.css       # Estilos del insight card
```

### 📁 components/Login/
```
├── LoginForm.tsx                # Formulario de login
├── LoginForm.module.css         # Estilos del formulario
```

### 📁 components/MetricCard/
```
├── index.tsx                    # Card de métrica con valor y cambio %
├── MetricCard.module.css        # Estilos del metric card
```

### 📁 components/MetricTooltip/
```
├── MetricTooltip.tsx            # Tooltip para métricas
├── MetricTooltip.module.css     # Estilos del tooltip
```

### 📁 components/Patients/
```
├── DeleteConfirmation.tsx       # Modal de confirmación de eliminación
├── DeleteConfirmation.module.css
├── PatientDetails.tsx           # Vista detallada de paciente
├── PatientDetails.module.css
├── PatientForm.tsx              # Formulario completo de paciente
├── PatientForm.module.css
├── PatientFormBase.tsx          # Base reutilizable para forms de paciente
├── PatientFormBase.module.css
├── PatientList.tsx              # Lista de pacientes con filtros
├── PatientList.module.css
│
├── AddPatient/                  # Formulario de nuevo paciente (tabs)
│   ├── AddPatient.tsx
│   ├── AddPatient.module.css
│   ├── LaboralDataTab.tsx       # Tab de datos laborales
│   ├── OtherDataTab.tsx         # Tab de otros datos
│   ├── PersonalDataTab.tsx      # Tab de datos personales
│   └── PersonalDataTab.module.css
│
└── PatientForm/                 # Formulario alternativo
    ├── PatientForm.tsx
    └── PatientForm.module.css
```

### 📁 components/Rendiciones/
```
├── RendicionFilters.tsx         # Filtros de rendiciones
├── RendicionFilters.module.css
├── RendicionList.tsx            # Lista de rendiciones
└── RendicionList.module.css
```

### 📁 components/Sidebar/
```
├── Sidebar.tsx                  # Sidebar de navegación
└── Sidebar.module.css           # Estilos del sidebar
```

### 📁 components/UI/
```
├── Modal.tsx                    # Modal genérico reutilizable
├── Modal.module.css
├── Pagination.tsx               # Componente de paginación
└── Pagination.module.css
```

### 📁 components/admission/
```
├── ActionModal.tsx              # Modal genérico para acciones
├── ActionModal.module.css
├── AddPredefinedOption.tsx      # Agregar opciones predefinidas
├── DataTableModal.tsx           # Modal para gestión de tablas
├── DataTableModal.module.css
│
└── AdmissionTables/             # Tablas de configuración de admisión
    ├── AdmissionTables.tsx
    ├── AdmissionTables.module.css
    ├── ClasePacienteTable.tsx
    ├── DadorOrganosTable.tsx
    ├── DiagnosticoTable.tsx
    ├── DisposicionEgresoTable.tsx
    ├── EstadoAmbulatorioTable.tsx
    ├── EstadoCivilTable.tsx
    ├── GrupoEtnicoTable.tsx
    ├── IdiomaISOTable.tsx
    ├── LocalidadTable.tsx
    ├── NacionalidadTable.tsx
    ├── ParentescoTable.tsx
    ├── ProvinciaTable.tsx
    ├── RazaTable.tsx
    ├── ReligionTable.tsx
    ├── RequisitoTable.tsx
    ├── RolContactoTable.tsx
    ├── SexoTable.tsx
    ├── TipoAdmisionTable.tsx
    └── TipoPacienteTable.tsx
```

### 📁 components/beds/
```
├── BedCard.tsx                  # Card individual de cama
├── BedCard.module.css
├── BedDetail.tsx                # Vista detallada de cama
├── BedDetail.module.css
├── BedDetailSkeleton.tsx        # Skeleton loader para bed detail
├── BedDetailSkeleton.module.css
├── BedDetailView.tsx            # Vista alternativa de detalle
├── BedDetailView.module.css
├── BedFilters.tsx               # Filtros de camas
├── BedFilters.module.css
├── BedsList.tsx                 # Grid de camas
├── BedsList.module.css
├── SearchInput.tsx              # Input de búsqueda
├── SearchInput.module.css
│
├── contexts/                    # Context providers
│   ├── BedDetailContext.tsx
│   ├── useBedSectionQuery.tsx
│   └── useSectorContext.tsx
│
├── controles/                   # Controles frecuentes
│   ├── ControlesFrecuentes.tsx
│   ├── ControlesFrecuentes.module.css
│   ├── ControlesTable.tsx
│   └── NuevoControlModal.tsx
│
├── evolucion/                   # Evolución de enfermería
│   ├── EvolucionEnfermeria.tsx
│   ├── EvolucionEnfermeria.module.css
│   ├── EvolucionList.tsx
│   └── NuevaEvolucionModal.tsx
│
├── hooks/                       # Hooks específicos de beds
│   ├── useBedDetail.ts
│   ├── useBedIndicadores.ts
│   ├── useIndicaciones.ts
│   └── usePatientInfo.ts
│
├── indicaciones/                # Indicaciones médicas
│   ├── IndicacionCard.tsx
│   ├── IndicacionCard.module.css
│   ├── IndicacionesList.tsx
│   ├── IndicacionesList.module.css
│   └── NuevaIndicacionForm.tsx
│
├── insumos/                     # Gestión de insumos
│   ├── InsumosTable.tsx
│   ├── InsumosTable.module.css
│   └── NuevoInsumoModal.tsx
│
├── medicacion/                  # Control de medicación
│   ├── MedicacionControl.tsx
│   ├── MedicacionControl.module.css
│   ├── MedicacionTable.tsx
│   └── AplicarMedicacionModal.tsx
│
├── patient/                     # Info del paciente en cama
│   ├── PatientInfo.tsx
│   ├── PatientInfo.module.css
│   ├── PatientHeader.tsx
│   └── PatientActions.tsx
│
├── shared/                      # Componentes compartidos
│   ├── TabNavigation.tsx
│   ├── TabNavigation.module.css
│   ├── SectionHeader.tsx
│   └── EmptyState.tsx
│
└── sidebar/                     # Sidebar específico de bed detail
    ├── BedSidebar.tsx
    ├── BedSidebar.module.css
    └── QuickActions.tsx
```

### 📁 components/indicaciones/
```
├── AplicarIndicacion.tsx        # Marcar indicación como aplicada
├── AplicarIndicacion.module.css
├── IndicacionesList.tsx         # Lista de indicaciones
├── IndicacionesList.module.css
├── NuevaIndicacionModal.tsx     # Modal para nueva indicación
└── NuevaIndicacionModal.module.css
```

### 📁 components/layout/
```
├── LayoutShell.tsx              # Layout principal del dashboard
└── LayoutShell.module.css
```

### 📁 components/modals/
```
├── ModalBase.tsx                # Modal base reutilizable
├── ModalBase.module.css
├── ModalBasePaciente.tsx        # Modal específico para pacientes
├── ModalBasePaciente.module.css
├── ModalBusquedaDiagnosticos.tsx # Búsqueda avanzada de diagnósticos
├── ModalBusquedaDiagnosticos.module.css
├── ModalCambiarCama.tsx         # Modal para cambio de cama
├── ModalCambiarCama.module.css
├── ModalDiagnosticosCie10.tsx   # Búsqueda de diagnósticos CIE-10
├── ModalDiagnosticosCie10.module.css
├── ModalEgresoPaciente.tsx      # Modal de egreso de paciente
├── ModalEgresoPaciente.module.css
│
├── MetricTooltipModal/          # Modal de tooltip de métricas
│   ├── MetricTooltipModal.tsx
│   └── MetricTooltipModal.module.css
│
└── ModalAddPatient/             # Modal para agregar paciente
    ├── ModalAddPatient.tsx
    ├── ModalAddPatient.module.css
    └── PatientFormTabs.tsx
```

### 📁 components/nursing/
```
├── NursingReportModal.tsx       # Modal de reporte de enfermería
├── NursingReportModal.module.css
├── NursingEvolution.tsx         # Evolución de enfermería
├── NursingControls.tsx          # Controles de enfermería
└── NursingMedication.tsx        # Medicación de enfermería
```

---

## Estructura de Páginas (App Router)

### 📁 app/
```
├── page.tsx                     # Página de login (/)
├── page.module.css
├── layout.tsx                   # Root layout
├── globals.css                  # Estilos globales
│
└── dashboard/                   # Área del dashboard
    ├── page.tsx                 # Dashboard principal
    ├── layout.tsx               # Dashboard layout
    │
    ├── admission/               # Módulo de admisión
    │   ├── new/
    │   │   └── page.tsx         # Nueva admisión
    │   ├── current/
    │   │   └── page.tsx         # Admisiones vigentes
    │   └── tables/
    │       └── page.tsx         # Tablas de admisión
    │
    ├── beds/                    # Módulo de camas
    │   ├── page.tsx             # Gestión de camas
    │   ├── [id]/
    │   │   ├── page.tsx         # Detalle de cama (dynamic)
    │   │   └── client-view.tsx  # Client component
    │   ├── occupation/
    │   │   └── page.tsx         # Ocupación de camas
    │   └── tables/
    │       └── page.tsx         # Tablas de internación
    │
    ├── bed-detail/              # Detalle alternativo de cama
    │   └── [id]/
    │       └── page.tsx
    │
    ├── billing/                 # Módulo de facturación
    │   ├── convenios/
    │   │   └── page.tsx
    │   ├── rendiciones/
    │   │   └── page.tsx
    │   ├── liquidaciones/
    │   │   └── page.tsx
    │   └── tables/
    │       └── page.tsx
    │
    └── patients/                # Módulo de pacientes
        └── page.tsx             # Lista de pacientes
```

---

## Estructura de Servicios

### 📁 services/
```
├── axios.ts                     # Configuración de Axios
├── authService.ts               # Autenticación
├── patientService.ts            # Gestión de pacientes
├── bedsService.ts               # Gestión de camas
├── admissionService.ts          # Gestión de admisiones
├── indicacionesService.ts       # Indicaciones médicas
├── indicadoresService.ts        # Indicadores
├── rendicionService.ts          # Rendiciones
├── dashboardService.ts          # Dashboard
├── empresaService.ts            # Empresa
├── activityService.ts           # Actividad
├── camasIndicadoresService.ts   # Indicadores de camas
├── controlesFrecuentesService.ts # Controles frecuentes
├── evolucionEnfermeriaService.ts # Evolución de enfermería
├── medicacionControlService.ts  # Control de medicación
├── medicacionService.ts         # Medicación
├── estudiosService.ts           # Estudios
├── visitaService.ts             # Visitas
├── visitaMovimientoService.ts   # Movimientos de visita
├── coberturaService.ts          # Cobertura
├── menuService.ts               # Menú
│
└── Catálogos (CRUD estándar):
    ├── clasePacienteService.ts
    ├── dadorOrganosService.ts
    ├── diagnosticoService.ts
    ├── diagnosticosService.ts
    ├── disposicionEgresoService.ts
    ├── estadoAmbulatorioService.ts
    ├── estadoCivilService.ts
    ├── estadoMilitar.service.ts
    ├── estadoMilitarService.ts
    ├── grupoEtnico.service.ts
    ├── idiomaISO.service.ts
    ├── localidad.service.ts
    ├── localidadService.ts
    ├── nacionalidad.service.ts
    ├── opcGrdService.ts
    ├── parentesco.service.ts
    ├── provincia.service.ts
    ├── provinciaService.ts
    ├── raza.service.ts
    ├── religion.service.ts
    ├── requisito.service.ts
    ├── rolContacto.service.ts
    ├── sexo.service.ts
    ├── sexoService.ts
    ├── tipoAdmision.service.ts
    └── tipoPaciente.service.ts
```

---

## Estructura de Hooks

### 📁 hooks/
```
├── useLoginForm.ts              # Lógica de formulario de login
├── usePatients.ts               # Gestión de pacientes
├── useBedsManagement.ts         # Gestión de camas
├── useIndicadores.ts            # Gestión de indicadores
├── useCamasIndicadores.ts       # Indicadores de camas
├── useRendiciones.ts            # Gestión de rendiciones
├── useOpcGrdManager.ts          # Gestión de opciones GRD
├── useModalDiagnosticosCie10.ts # Lógica de modal de diagnósticos
├── useDebounce.ts               # Debounce de valores
├── useSearchManager.ts          # Gestión de búsquedas
├── useBedRelatedData.ts         # Datos relacionados a cama
└── useEstadoAmbulatorio.ts      # Estados ambulatorios
```

---

## Estructura de Tipos

### 📁 types/
```
├── AuthInterface.ts             # Tipos de autenticación
├── PatientInterface.ts          # Tipos de paciente
├── PatientFormInterface.ts      # Tipos de formulario de paciente
├── RendicionInterface.ts        # Tipos de rendición
├── admission.types.ts           # Tipos de admisión
├── beds.ts                      # Tipos de camas
├── dashboard.ts                 # Tipos de dashboard
├── indicaciones.ts              # Tipos de indicaciones
├── indicadores.ts               # Tipos de indicadores
├── controlesFrecuentes.ts       # Tipos de controles
├── evolucionEnfermeria.ts       # Tipos de evolución
├── medicacionControl.ts         # Tipos de medicación control
├── medicacion.ts                # Tipos de medicación
├── estudios.ts                  # Tipos de estudios
├── diagnosticos.ts              # Tipos de diagnósticos
│
├── beds/                        # Tipos específicos de camas
│   └── [archivos de tipos]
│
├── modals/                      # Tipos de modales
│   └── [archivos de tipos]
│
├── nursing/                     # Tipos de enfermería
│   └── [archivos de tipos]
│
├── patients/                    # Tipos de pacientes
│   └── [archivos de tipos]
│
└── Catálogos:
    ├── clasePaciente.types.ts
    ├── dadorOrganos.types.ts
    ├── diagnostico.types.ts
    ├── disposicionEgreso.types.ts
    ├── estadoAmbulatorio.types.ts
    ├── estadoCivil.types.ts
    ├── estadoMilitar.types.ts
    ├── grupoEtnico.types.ts
    ├── idiomaISO.types.ts
    ├── localidad.types.ts
    ├── nacionalidad.types.ts
    ├── opcGrd.types.ts
    ├── parentesco.types.ts
    ├── provincia.types.ts
    ├── raza.types.ts
    ├── religion.types.ts
    ├── requisito.types.ts
    ├── rolContacto.types.ts
    ├── sexo.types.ts
    ├── tipoAdmision.types.ts
    └── tipoPaciente.types.ts
```

---

## Estructura de Utilidades

### 📁 utils/
```
├── formatters.ts                # Funciones de formateo
├── validators.ts                # Funciones de validación
├── dateHelpers.ts               # Helpers de fechas
└── constants.ts                 # Constantes compartidas
```

---

## Estructura de Contextos

### 📁 contexts/
```
└── AppContext.tsx               # Context global de la aplicación
```

---

## Estructura de Configuración

### 📁 config/
```
└── constants.ts                 # Constantes de configuración
```

---

## Archivos de Configuración Raíz

```
├── package.json                 # Dependencias del proyecto
├── tsconfig.json                # Configuración de TypeScript
├── tailwind.config.js           # Configuración de Tailwind CSS
├── postcss.config.js            # Configuración de PostCSS
├── next.config.js               # Configuración de Next.js (si existe)
├── .env.local                   # Variables de entorno locales
├── .gitignore                   # Archivos ignorados por Git
└── README.md                    # Documentación del proyecto
```

---

## Resumen de Conteo

### Por Categoría

| Categoría | Cantidad Aproximada |
|-----------|---------------------|
| **Componentes de UI** | 100+ archivos |
| **Servicios** | 47 archivos |
| **Hooks** | 12 archivos |
| **Tipos/Interfaces** | 41 archivos |
| **Páginas** | 15+ páginas |
| **Contextos** | 1 archivo principal |
| **Utilidades** | 4 archivos |

### Por Módulo Funcional

| Módulo | Componentes | Descripción |
|--------|-------------|-------------|
| **Authentication** | 2 | Login y autenticación |
| **Layout** | 3 | Header, Sidebar, LayoutShell |
| **Patients** | 10+ | Gestión completa de pacientes |
| **Beds** | 30+ | Gestión de camas e internación |
| **Admission** | 20+ | Admisión y tablas de configuración |
| **Nursing** | 10+ | Enfermería y controles |
| **Billing** | 2 | Rendiciones y facturación |
| **Dashboard** | 5 | Métricas y visualizaciones |
| **Modals** | 10+ | Modales reutilizables |
| **Charts** | 4 | Gráficos (Recharts) |
| **UI Base** | 2 | Modal y Pagination |

---

## Archivos CSS Modules

Todos los componentes principales tienen su archivo `.module.css` correspondiente:

- **Patrón:** `ComponentName.module.css`
- **Ubicación:** Junto al archivo `.tsx` del componente
- **Scope:** Estilos encapsulados por componente
- **Naming:** kebab-case para clases CSS

---

## Archivos de Índice

Algunos directorios tienen archivos `index.ts` para facilitar las importaciones:

```
components/MetricCard/index.tsx
components/InsightCard/index.tsx
components/AnalyticsLoader/index.tsx
```

---

## Notas para Migración

### Prioridad Alta (Core)
1. **Layout**: LayoutShell, Header, Sidebar
2. **Authentication**: LoginForm, LoginCarousel
3. **UI Base**: Modal, Pagination
4. **Services**: axios.ts, authService.ts

### Prioridad Media (Funcionalidad Principal)
1. **Patients**: PatientList, PatientForm, PatientDetails
2. **Beds**: BedsList, BedCard, BedDetail
3. **Dashboard**: MetricCard, Charts
4. **Admission**: AdmissionTables

### Prioridad Baja (Funcionalidad Específica)
1. **Nursing**: Componentes de enfermería
2. **Billing**: Rendiciones
3. **Modals**: Modales específicos

### Componentes Reutilizables (Migrar Primero)
- ModalBase
- Pagination
- SearchInput
- TabNavigation
- EmptyState
- SectionHeader

---

## Dependencias entre Componentes

### Componentes que dependen de otros:
- `LayoutShell` → `Header` + `Sidebar`
- `BedDetail` → `PatientInfo` + `IndicacionesList` + `ControlesFrecuentes`
- `PatientForm` → `PatientFormBase`
- `ModalBasePaciente` → `ModalBase`
- Todos los modales → `ModalBase` (base)

### Componentes que usan hooks personalizados:
- `LoginForm` → `useLoginForm`
- `PatientList` → `usePatients`
- `BedsList` → `useBedsManagement`
- `RendicionList` → `useRendiciones`

### Componentes que usan servicios:
- Todos los componentes de lista → Service correspondiente
- Todos los formularios → Service correspondiente
- Dashboard → `dashboardService`

---

## Archivos de Estilos Globales

```
app/globals.css                  # Estilos globales principales
app/page.module.css              # Estilos de página de login
```

---

## Convenciones de Archivos

### Componentes
- **Archivo principal**: `ComponentName.tsx`
- **Estilos**: `ComponentName.module.css`
- **Tipos**: `ComponentName.types.ts` (si es complejo)
- **Hook**: `useComponentName.ts` (si tiene lógica compleja)

### Servicios
- **Patrón**: `entityService.ts`
- **Ubicación**: `services/`
- **Exports**: Named exports de funciones

### Hooks
- **Patrón**: `useHookName.ts`
- **Ubicación**: `hooks/`
- **Prefix**: Siempre `use`

### Tipos
- **Patrón**: `entity.types.ts` o `EntityInterface.ts`
- **Ubicación**: `types/`
- **Exports**: Named exports de interfaces/types

---

**Generado:** Febrero 2026  
**Para:** Proceso de migración y upgrade de UI  
**Total de archivos documentados:** 200+ archivos
