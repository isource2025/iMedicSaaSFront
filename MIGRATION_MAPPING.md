# Mapeo de Nombres para Migración de UI - iMedicWS

**Fecha:** Febrero 2026  
**Propósito:** Guía de mapeo de nombres actuales para proceso de migración/upgrade de UI

---

## Tabla de Contenidos 

1. [Componentes de Layout](#componentes-de-layout)
2. [Componentes de Autenticación](#componentes-de-autenticación)
3. [Componentes de Pacientes](#componentes-de-pacientes)
4. [Componentes de Camas](#componentes-de-camas)
5. [Componentes de Admisión](#componentes-de-admisión)
6. [Componentes de Enfermería](#componentes-de-enfermería)
7. [Componentes de Facturación](#componentes-de-facturación)
8. [Componentes UI Base](#componentes-ui-base)
9. [Componentes de Dashboard](#componentes-de-dashboard)
10. [Servicios API](#servicios-api)
11. [Hooks Personalizados](#hooks-personalizados)
12. [Tipos e Interfaces](#tipos-e-interfaces)
13. [Rutas y Páginas](#rutas-y-páginas)

---

## Componentes de Layout

| Nombre Actual | Ruta Actual | Función | Sugerencia Nuevo Nombre |
|--------------|-------------|---------|------------------------|
| `LayoutShell` | `components/layout/LayoutShell.tsx` | Layout principal con sidebar y header | `DashboardLayout` / `MainLayout` |
| `Header` | `components/Header/Header.tsx` | Header del dashboard | `DashboardHeader` / `AppHeader` |
| `Sidebar` | `components/Sidebar/Sidebar.tsx` | Sidebar de navegación | `NavigationSidebar` / `MainSidebar` |

**CSS Modules:**
- `LayoutShell.module.css` → `DashboardLayout.module.css`
- `Header.module.css` → `DashboardHeader.module.css`
- `Sidebar.module.css` → `NavigationSidebar.module.css`

---

## Componentes de Autenticación

| Nombre Actual | Ruta Actual | Función | Sugerencia Nuevo Nombre |
|--------------|-------------|---------|------------------------|
| `LoginForm` | `components/Login/LoginForm.tsx` | Formulario de login | `AuthLoginForm` / `SignInForm` |
| `LoginCarousel` | `components/Carousel/LoginCarousel.tsx` | Carrusel de imágenes | `AuthCarousel` / `LoginImageCarousel` |

**CSS Modules:**
- `LoginForm.module.css` → `AuthLoginForm.module.css`
- `LoginCarousel.module.css` → `AuthCarousel.module.css`

---

## Componentes de Pacientes

| Nombre Actual | Ruta Actual | Función | Sugerencia Nuevo Nombre |
|--------------|-------------|---------|------------------------|
| `PatientList` | `components/Patients/PatientList.tsx` | Lista de pacientes | `PatientsTable` / `PatientsList` |
| `PatientForm` | `components/Patients/PatientForm.tsx` | Formulario de paciente | `PatientFormComplete` / `PatientEditor` |
| `PatientFormBase` | `components/Patients/PatientFormBase.tsx` | Base de formulario | `PatientFormBase` (mantener) |
| `PatientDetails` | `components/Patients/PatientDetails.tsx` | Vista detallada | `PatientDetailView` / `PatientProfile` |
| `DeleteConfirmation` | `components/Patients/DeleteConfirmation.tsx` | Confirmación de eliminación | `PatientDeleteDialog` / `DeletePatientModal` |
| `AddPatient` | `components/Patients/AddPatient/AddPatient.tsx` | Formulario con tabs | `CreatePatientForm` / `NewPatientWizard` |
| `PersonalDataTab` | `components/Patients/AddPatient/PersonalDataTab.tsx` | Tab datos personales | `PatientPersonalInfoTab` |
| `LaboralDataTab` | `components/Patients/AddPatient/LaboralDataTab.tsx` | Tab datos laborales | `PatientWorkInfoTab` |
| `OtherDataTab` | `components/Patients/AddPatient/OtherDataTab.tsx` | Tab otros datos | `PatientAdditionalInfoTab` |

**Prefijos sugeridos:** `Patient*` para todos los componentes de pacientes

---

## Componentes de Camas

| Nombre Actual | Ruta Actual | Función | Sugerencia Nuevo Nombre |
|--------------|-------------|---------|------------------------|
| `BedsList` | `components/beds/BedsList.tsx` | Grid de camas | `BedsGrid` / `BedManagementGrid` |
| `BedCard` | `components/beds/BedCard.tsx` | Card de cama | `BedStatusCard` / `BedItem` |
| `BedDetail` | `components/beds/BedDetail.tsx` | Vista detallada | `BedDetailView` / `BedProfile` |
| `BedDetailView` | `components/beds/BedDetailView.tsx` | Vista alternativa | `BedDetailPanel` |
| `BedDetailSkeleton` | `components/beds/BedDetailSkeleton.tsx` | Skeleton loader | `BedDetailLoader` / `BedDetailSkeleton` |
| `BedFilters` | `components/beds/BedFilters.tsx` | Filtros | `BedFilterPanel` / `BedsFilters` |
| `SearchInput` | `components/beds/SearchInput.tsx` | Input búsqueda | `BedSearchInput` / `BedsSearchBar` |

### Subcarpeta: contexts/

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `BedDetailContext` | Context de detalle | `BedDetailContext` (mantener) |
| `useBedSectionQuery` | Query de sección | `useBedSectionData` |
| `useSectorContext` | Context de sector | `useSectorContext` (mantener) |

### Subcarpeta: controles/

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `ControlesFrecuentes` | Controles frecuentes | `FrequentControlsPanel` / `VitalSignsPanel` |
| `ControlesTable` | Tabla de controles | `ControlsHistoryTable` |
| `NuevoControlModal` | Modal nuevo control | `AddControlModal` / `NewControlDialog` |

### Subcarpeta: evolucion/

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `EvolucionEnfermeria` | Evolución enfermería | `NursingEvolutionPanel` |
| `EvolucionList` | Lista evoluciones | `EvolutionHistoryList` |
| `NuevaEvolucionModal` | Modal nueva evolución | `AddEvolutionModal` / `NewEvolutionDialog` |

### Subcarpeta: indicaciones/

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `IndicacionCard` | Card de indicación | `MedicalOrderCard` / `PrescriptionCard` |
| `IndicacionesList` | Lista indicaciones | `MedicalOrdersList` / `PrescriptionsList` |
| `NuevaIndicacionForm` | Form nueva indicación | `AddMedicalOrderForm` / `NewPrescriptionForm` |

### Subcarpeta: medicacion/

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `MedicacionControl` | Control medicación | `MedicationControlPanel` |
| `MedicacionTable` | Tabla medicación | `MedicationHistoryTable` |
| `AplicarMedicacionModal` | Modal aplicar | `ApplyMedicationModal` / `AdministreMedicationDialog` |

### Subcarpeta: patient/

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `PatientInfo` | Info del paciente | `BedPatientInfo` / `InpatientInfo` |
| `PatientHeader` | Header paciente | `BedPatientHeader` |
| `PatientActions` | Acciones paciente | `BedPatientActions` |

### Subcarpeta: sidebar/

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `BedSidebar` | Sidebar de cama | `BedDetailSidebar` |
| `QuickActions` | Acciones rápidas | `BedQuickActions` |

**Prefijos sugeridos:** `Bed*` para componentes principales, `BedPatient*` para info de paciente en cama

---

## Componentes de Admisión

| Nombre Actual | Ruta Actual | Función | Sugerencia Nuevo Nombre |
|--------------|-------------|---------|------------------------|
| `ActionModal` | `components/admission/ActionModal.tsx` | Modal genérico | `AdmissionActionModal` |
| `DataTableModal` | `components/admission/DataTableModal.tsx` | Modal tabla datos | `CatalogDataModal` / `TableEditorModal` |
| `AddPredefinedOption` | `components/admission/AddPredefinedOption.tsx` | Agregar opción | `AddCatalogOption` |
| `AdmissionTables` | `components/admission/AdmissionTables/AdmissionTables.tsx` | Tablas configuración | `AdmissionCatalogsPanel` |

### Tablas de Catálogos (AdmissionTables/)

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `ClasePacienteTable` | Tabla clase paciente | `PatientClassTable` |
| `DadorOrganosTable` | Tabla dador órganos | `OrganDonorTable` |
| `DiagnosticoTable` | Tabla diagnóstico | `DiagnosisTable` |
| `DisposicionEgresoTable` | Tabla disposición egreso | `DischargeDispositionTable` |
| `EstadoAmbulatorioTable` | Tabla estado ambulatorio | `AmbulatoryStatusTable` |
| `EstadoCivilTable` | Tabla estado civil | `MaritalStatusTable` |
| `GrupoEtnicoTable` | Tabla grupo étnico | `EthnicGroupTable` |
| `IdiomaISOTable` | Tabla idioma ISO | `LanguageISOTable` |
| `LocalidadTable` | Tabla localidad | `LocalityTable` / `CityTable` |
| `NacionalidadTable` | Tabla nacionalidad | `NationalityTable` |
| `ParentescoTable` | Tabla parentesco | `RelationshipTable` / `KinshipTable` |
| `ProvinciaTable` | Tabla provincia | `ProvinceTable` / `StateTable` |
| `RazaTable` | Tabla raza | `RaceTable` / `EthnicityTable` |
| `ReligionTable` | Tabla religión | `ReligionTable` |
| `RequisitoTable` | Tabla requisito | `RequirementTable` |
| `RolContactoTable` | Tabla rol contacto | `ContactRoleTable` |
| `SexoTable` | Tabla sexo | `GenderTable` / `SexTable` |
| `TipoAdmisionTable` | Tabla tipo admisión | `AdmissionTypeTable` |
| `TipoPacienteTable` | Tabla tipo paciente | `PatientTypeTable` |

**Prefijos sugeridos:** `Admission*` para componentes principales, `*Table` para tablas de catálogos

---

## Componentes de Enfermería

| Nombre Actual | Ruta Actual | Función | Sugerencia Nuevo Nombre |
|--------------|-------------|---------|------------------------|
| `NursingReportModal` | `components/nursing/NursingReportModal.tsx` | Modal reporte | `NursingReportDialog` |
| `NursingEvolution` | `components/nursing/NursingEvolution.tsx` | Evolución | `NursingEvolutionPanel` |
| `NursingControls` | `components/nursing/NursingControls.tsx` | Controles | `NursingControlsPanel` |
| `NursingMedication` | `components/nursing/NursingMedication.tsx` | Medicación | `NursingMedicationPanel` |

**Prefijos sugeridos:** `Nursing*` para todos los componentes de enfermería

---

## Componentes de Facturación

| Nombre Actual | Ruta Actual | Función | Sugerencia Nuevo Nombre |
|--------------|-------------|---------|------------------------|
| `RendicionList` | `components/Rendiciones/RendicionList.tsx` | Lista rendiciones | `BillingSubmissionsList` / `ClaimsList` |
| `RendicionFilters` | `components/Rendiciones/RendicionFilters.tsx` | Filtros | `BillingFiltersPanel` / `ClaimsFilters` |

**Prefijos sugeridos:** `Billing*` o `Claims*` para componentes de facturación

---

## Componentes UI Base

| Nombre Actual | Ruta Actual | Función | Sugerencia Nuevo Nombre |
|--------------|-------------|---------|------------------------|
| `Modal` | `components/UI/Modal.tsx` | Modal genérico | `BaseModal` / `Dialog` |
| `Pagination` | `components/UI/Pagination.tsx` | Paginación | `TablePagination` / `Pagination` |

**Nota:** Estos son componentes base, considerar usar librería UI (shadcn/ui, Radix, etc.)

---

## Componentes de Dashboard

| Nombre Actual | Ruta Actual | Función | Sugerencia Nuevo Nombre |
|--------------|-------------|---------|------------------------|
| `MetricCard` | `components/MetricCard/index.tsx` | Card métrica | `DashboardMetricCard` / `StatCard` |
| `InsightCard` | `components/InsightCard/index.tsx` | Card insight | `DashboardInsightCard` / `InfoCard` |
| `MetricTooltip` | `components/MetricTooltip/MetricTooltip.tsx` | Tooltip métrica | `MetricTooltipPopover` |
| `AnalyticsLoader` | `components/AnalyticsLoader/index.tsx` | Loader analytics | `DashboardLoader` / `AnalyticsLoadingState` |

### Gráficos

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `BarChart` | Gráfico barras | `DashboardBarChart` / `BarChartWidget` |
| `LineChart` | Gráfico líneas | `DashboardLineChart` / `LineChartWidget` |
| `PieChart` | Gráfico circular | `DashboardPieChart` / `PieChartWidget` |
| `DonutChart` | Gráfico dona | `DashboardDonutChart` / `DonutChartWidget` |

**Prefijos sugeridos:** `Dashboard*` para componentes de dashboard

---

## Componentes de Modales

| Nombre Actual | Ruta Actual | Función | Sugerencia Nuevo Nombre |
|--------------|-------------|---------|------------------------|
| `ModalBase` | `components/modals/ModalBase.tsx` | Modal base | `BaseDialog` / `DialogBase` |
| `ModalBasePaciente` | `components/modals/ModalBasePaciente.tsx` | Modal paciente | `PatientDialog` / `PatientModalBase` |
| `ModalCambiarCama` | `components/modals/ModalCambiarCama.tsx` | Cambiar cama | `TransferBedDialog` / `ChangeBedModal` |
| `ModalEgresoPaciente` | `components/modals/ModalEgresoPaciente.tsx` | Egreso paciente | `DischargePatientDialog` |
| `ModalDiagnosticosCie10` | `components/modals/ModalDiagnosticosCie10.tsx` | Diagnósticos CIE-10 | `DiagnosisSearchDialog` / `ICD10SearchModal` |
| `ModalBusquedaDiagnosticos` | `components/modals/ModalBusquedaDiagnosticos.tsx` | Búsqueda diagnósticos | `DiagnosisLookupDialog` |
| `ModalAddPatient` | `components/modals/ModalAddPatient/` | Agregar paciente | `CreatePatientDialog` |

**Sufijos sugeridos:** `*Dialog` o `*Modal` para todos los modales

---

## Servicios API

### Servicios Principales

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `authService` | Autenticación | `authService` (mantener) / `authApi` |
| `patientService` | Pacientes | `patientsService` / `patientsApi` |
| `bedsService` | Camas | `bedsService` / `bedsApi` |
| `admissionService` | Admisiones | `admissionsService` / `admissionsApi` |
| `indicacionesService` | Indicaciones | `medicalOrdersService` / `prescriptionsService` |
| `rendicionService` | Rendiciones | `billingService` / `claimsService` |
| `dashboardService` | Dashboard | `dashboardService` (mantener) / `dashboardApi` |
| `empresaService` | Empresa | `companyService` / `organizationService` |

### Servicios de Enfermería

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `controlesFrecuentesService` | Controles frecuentes | `vitalSignsService` / `controlsService` |
| `evolucionEnfermeriaService` | Evolución enfermería | `nursingEvolutionService` |
| `medicacionControlService` | Control medicación | `medicationAdministrationService` |

### Servicios de Catálogos

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `clasePacienteService` | Clase paciente | `patientClassService` |
| `dadorOrganosService` | Dador órganos | `organDonorService` |
| `diagnosticoService` | Diagnóstico | `diagnosisService` |
| `disposicionEgresoService` | Disposición egreso | `dischargeDispositionService` |
| `estadoAmbulatorioService` | Estado ambulatorio | `ambulatoryStatusService` |
| `estadoCivilService` | Estado civil | `maritalStatusService` |
| `estadoMilitarService` | Estado militar | `militaryStatusService` |
| `grupoEtnico.service` | Grupo étnico | `ethnicGroupService` |
| `idiomaISO.service` | Idioma ISO | `languageService` / `languageISOService` |
| `localidad.service` | Localidad | `localityService` / `cityService` |
| `nacionalidad.service` | Nacionalidad | `nationalityService` |
| `parentesco.service` | Parentesco | `relationshipService` / `kinshipService` |
| `provincia.service` | Provincia | `provinceService` / `stateService` |
| `raza.service` | Raza | `raceService` / `ethnicityService` |
| `religion.service` | Religión | `religionService` |
| `requisito.service` | Requisito | `requirementService` |
| `rolContacto.service` | Rol contacto | `contactRoleService` |
| `sexo.service` | Sexo | `genderService` / `sexService` |
| `tipoAdmision.service` | Tipo admisión | `admissionTypeService` |
| `tipoPaciente.service` | Tipo paciente | `patientTypeService` |

**Sufijos sugeridos:** `*Service` o `*Api` para todos los servicios

---

## Hooks Personalizados

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `useLoginForm` | Form login | `useAuthLogin` / `useLoginForm` |
| `usePatients` | Gestión pacientes | `usePatientsManagement` / `usePatientsList` |
| `useBedsManagement` | Gestión camas | `useBedsManagement` (mantener) |
| `useIndicadores` | Indicadores | `useBedIndicators` / `useIndicators` |
| `useCamasIndicadores` | Indicadores camas | `useBedMetrics` |
| `useRendiciones` | Rendiciones | `useBillingSubmissions` / `useClaims` |
| `useOpcGrdManager` | Opciones GRD | `useGRDOptionsManager` |
| `useModalDiagnosticosCie10` | Modal diagnósticos | `useDiagnosisSearch` / `useICD10Search` |
| `useDebounce` | Debounce | `useDebounce` (mantener - estándar) |
| `useSearchManager` | Gestión búsqueda | `useSearch` / `useSearchManager` |
| `useBedRelatedData` | Datos de cama | `useBedData` / `useBedDetails` |
| `useEstadoAmbulatorio` | Estado ambulatorio | `useAmbulatoryStatus` |

**Prefijo obligatorio:** `use*` (convención de React)

---

## Tipos e Interfaces

### Tipos de Autenticación

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `User` | Usuario | `User` (mantener) / `AuthUser` |
| `Sector` | Sector | `Sector` / `Department` |
| `LoginResponse` | Respuesta login | `AuthResponse` / `LoginResponse` |

### Tipos de Pacientes

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `Patient` | Paciente | `Patient` (mantener) |
| `PatientFormData` | Datos form | `PatientFormData` (mantener) |

### Tipos de Camas

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `Bed` | Cama | `Bed` (mantener) |
| `BedStatus` | Estado cama | `BedStatus` (mantener) |

### Tipos de Indicaciones

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `Indicacion` | Indicación | `MedicalOrder` / `Prescription` |
| `TipoIndicacion` | Tipo indicación | `OrderType` / `PrescriptionType` |
| `EstadoIndicacion` | Estado indicación | `OrderStatus` / `PrescriptionStatus` |

### Tipos de Dashboard

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `DashboardMetrics` | Métricas | `DashboardMetrics` (mantener) |
| `OccupancyData` | Datos ocupación | `BedOccupancyData` / `OccupancyData` |

### Tipos de Admisión

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `Admission` | Admisión | `Admission` (mantener) |
| `EstadoAdmision` | Estado admisión | `AdmissionStatus` |

### Tipos de Enfermería

| Nombre Actual | Función | Sugerencia Nuevo Nombre |
|--------------|---------|------------------------|
| `EvolucionEnfermeria` | Evolución | `NursingEvolution` / `NursingNote` |
| `ControlFrecuente` | Control frecuente | `VitalSigns` / `FrequentControl` |
| `MedicacionControl` | Control medicación | `MedicationAdministration` |
| `Turno` | Turno | `Shift` / `NursingShift` |

### Tipos de Catálogos (Español → Inglés)

| Nombre Actual (ES) | Sugerencia Inglés |
|-------------------|------------------|
| `Raza` | `Race` / `Ethnicity` |
| `Religion` | `Religion` |
| `EstadoCivil` | `MaritalStatus` |
| `GrupoEtnico` | `EthnicGroup` |
| `EstadoMilitar` | `MilitaryStatus` |
| `DadorOrganos` | `OrganDonor` |
| `ClasePaciente` | `PatientClass` |
| `TipoPaciente` | `PatientType` |
| `TipoAdmision` | `AdmissionType` |
| `Nacionalidad` | `Nationality` |
| `Parentesco` | `Relationship` / `Kinship` |
| `Provincia` | `Province` / `State` |
| `Localidad` | `Locality` / `City` |
| `IdiomaISO` | `LanguageISO` / `Language` |
| `RolContacto` | `ContactRole` |
| `Sexo` | `Gender` / `Sex` |
| `Requisito` | `Requirement` |
| `Diagnostico` | `Diagnosis` |
| `DisposicionEgreso` | `DischargeDisposition` |
| `EstadoAmbulatorio` | `AmbulatoryStatus` |

**Convención:** PascalCase para tipos e interfaces

---

## Rutas y Páginas

### Rutas Actuales → Sugerencias

| Ruta Actual | Función | Sugerencia Nueva Ruta |
|------------|---------|----------------------|
| `/` | Login | `/` o `/login` |
| `/dashboard` | Dashboard principal | `/dashboard` (mantener) |
| `/dashboard/patients` | Lista pacientes | `/dashboard/patients` (mantener) |
| `/dashboard/admission/new` | Nueva admisión | `/dashboard/admissions/new` |
| `/dashboard/admission/current` | Admisiones vigentes | `/dashboard/admissions/active` |
| `/dashboard/admission/tables` | Tablas admisión | `/dashboard/admissions/catalogs` |
| `/dashboard/beds` | Gestión camas | `/dashboard/beds` (mantener) |
| `/dashboard/beds/[id]` | Detalle cama | `/dashboard/beds/[id]` (mantener) |
| `/dashboard/beds/occupation` | Ocupación | `/dashboard/beds/occupancy` |
| `/dashboard/beds/tables` | Tablas internación | `/dashboard/beds/catalogs` |
| `/dashboard/billing/rendiciones` | Rendiciones | `/dashboard/billing/submissions` o `/claims` |
| `/dashboard/bed-detail/[id]` | Detalle alternativo | Consolidar con `/dashboard/beds/[id]` |

**Convención:** kebab-case para URLs

---

## Convenciones de Nomenclatura

### Componentes

**Actual:**
- PascalCase
- Nombres en español/inglés mezclados
- Sufijos: `List`, `Form`, `Modal`, `Card`, `Detail`

**Sugerido:**
- PascalCase (mantener)
- **Todo en inglés**
- Prefijos por módulo: `Patient*`, `Bed*`, `Admission*`, `Nursing*`, `Dashboard*`
- Sufijos consistentes: `*List`, `*Form`, `*Dialog`, `*Card`, `*Panel`, `*View`

### Servicios

**Actual:**
- camelCase
- Sufijo `Service`
- Nombres en español

**Sugerido:**
- camelCase (mantener)
- Sufijo `Service` o `Api`
- **Todo en inglés**
- Plural para colecciones: `patientsService`, `bedsService`

### Hooks

**Actual:**
- camelCase
- Prefijo `use`
- Nombres descriptivos

**Sugerido:**
- camelCase (mantener)
- Prefijo `use` (obligatorio)
- **Todo en inglés**
- Nombres claros: `usePatientsList`, `useBedsManagement`

### Tipos

**Actual:**
- PascalCase
- Nombres en español/inglés
- Interfaces y Types mezclados

**Sugerido:**
- PascalCase (mantener)
- **Todo en inglés**
- Preferir `interface` sobre `type` para objetos
- Sufijos: `*Data`, `*Response`, `*Request`, `*Props`

### CSS Modules

**Actual:**
- kebab-case para clases
- Nombres descriptivos

**Sugerido:**
- kebab-case (mantener)
- **Todo en inglés**
- BEM-like: `component__element--modifier`

---

## Mapeo de Términos Español → Inglés

| Español | Inglés | Contexto |
|---------|--------|----------|
| Cama | Bed | Camas de hospital |
| Paciente | Patient | Pacientes |
| Admisión | Admission | Proceso de admisión |
| Internación | Inpatient / Hospitalization | Internación |
| Indicación | Medical Order / Prescription | Indicaciones médicas |
| Evolución | Evolution / Progress Note | Evolución de enfermería |
| Control | Control / Vital Signs | Controles frecuentes |
| Medicación | Medication | Medicación |
| Rendición | Billing Submission / Claim | Rendiciones |
| Facturación | Billing | Facturación |
| Egreso | Discharge | Egreso de paciente |
| Turno | Shift / Appointment | Turno (enfermería o cita) |
| Sector | Sector / Department | Sector hospitalario |
| Empresa | Company / Organization | Empresa/Organización |
| Usuario | User | Usuario del sistema |
| Convenio | Agreement / Contract | Convenios médicos |
| Cobertura | Coverage / Insurance | Cobertura médica |
| Diagnóstico | Diagnosis | Diagnóstico |
| Estudio | Study / Test | Estudios médicos |
| Insumo | Supply / Material | Insumos médicos |

---

## Prioridades de Migración

### Fase 1: Core (Crítico)
1. **Layout**: LayoutShell → DashboardLayout
2. **Auth**: LoginForm → AuthLoginForm
3. **Services**: axios.ts, authService
4. **UI Base**: Modal → BaseDialog, Pagination

### Fase 2: Módulos Principales
1. **Patients**: Todos los componentes de pacientes
2. **Beds**: Componentes principales de camas
3. **Dashboard**: MetricCard, Charts

### Fase 3: Funcionalidad Específica
1. **Admission**: Tablas y catálogos
2. **Nursing**: Componentes de enfermería
3. **Billing**: Rendiciones

### Fase 4: Optimización
1. Consolidar componentes duplicados
2. Refactorizar hooks complejos
3. Optimizar servicios

---

## Checklist de Migración por Componente

Para cada componente a migrar:

- [ ] Renombrar archivo según convención
- [ ] Actualizar imports en componentes que lo usan
- [ ] Renombrar CSS Module correspondiente
- [ ] Actualizar referencias en servicios
- [ ] Actualizar referencias en hooks
- [ ] Actualizar tipos/interfaces relacionados
- [ ] Actualizar tests (si existen)
- [ ] Actualizar documentación
- [ ] Verificar funcionalidad

---

## Notas Finales

### Consideraciones Importantes

1. **Consistencia**: Mantener prefijos y sufijos consistentes
2. **Idioma**: Migrar todo a inglés para mejor mantenibilidad
3. **Modularidad**: Agrupar componentes por módulo funcional
4. **Reutilización**: Identificar componentes duplicados para consolidar
5. **Testing**: Agregar tests durante la migración

### Herramientas Recomendadas

- **Renombrado masivo**: VS Code refactoring, regex find/replace
- **Validación**: TypeScript strict mode
- **Linting**: ESLint con reglas de nomenclatura
- **Documentación**: Mantener este mapeo actualizado

---

**Generado:** Febrero 2026  
**Para:** Proceso de migración y upgrade de UI  
**Última actualización:** Febrero 2026
