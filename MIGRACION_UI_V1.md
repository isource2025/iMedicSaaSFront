# Migración UI v1 - iMedicWS Frontend

**Fecha de inicio:** 4 de Febrero 2026  
**Versión:** 1.0   
**Objetivo:** Implementar nuevo sistema de UI siguiendo guías de diseño establecidas 

---

## Índice de Cambios

1. [Resumen de Migración](#resumen-de-migración) 
2. [Cambio #1: Nuevo Sidebar](#cambio-1-nuevo-sidebar)
3. [Archivos Modificados](#archivos-modificados)
4. [Archivos Creados](#archivos-creados)
5. [Archivos Respaldados](#archivos-respaldados)
6. [Variables CSS Agregadas](#variables-css-agregadas)
7. [Dependencias](#dependencias)
8. [Testing](#testing)
9. [Rollback](#rollback)

---

## Resumen de Migración

### Estado Actual (Antes)
- **Sidebar**: Tradicional expandido con hover en desktop
- **Comportamiento**: Se expande al hacer hover, colapsa al salir
- **Submenús**: Se expanden inline (desplazan elementos)
- **Layout**: Margen fijo de 70px para sidebar colapsado

### Estado Objetivo (Después)
- **Sidebar**: Colapsado por defecto (72px), expandido al hacer clic (280px)
- **Comportamiento**: Click para expandir, overlay para cerrar
- **Submenús**: Se superponen (position: absolute) sin desplazar elementos
- **Layout**: Efecto blur y desplazamiento del contenido al expandir
- **Card blanca**: Siempre visible con bordes redondeados (24px)

---

## Cambio #1: Nuevo Sidebar

### Fecha: 4 de Febrero 2026

### Descripción
Implementación del nuevo sidebar siguiendo la guía `SIDEBAR_IMPLEMENTATION_GUIDE.md`.

### Comportamiento Implementado

#### Estado Colapsado (por defecto)
- Ancho: 72px
- Solo iconos visibles, centrados
- Card blanca visible (56px de ancho, bordes 24px)
- Menú centrado verticalmente

#### Estado Expandido (al hacer clic)
- Ancho: 280px
- Iconos + Labels + Chevrons visibles
- Card blanca expandida al 100%
- Backdrop-filter blur(20px)
- Submenú superpuesto (position: absolute)
- Contenido principal: translateX(40px) + blur(3px)
- Overlay clickeable para cerrar

### Archivos Respaldados

```
src/app/components/Sidebar/
├── Sidebar.tsx.backup          # Sidebar original
└── Sidebar.module.css.backup   # Estilos originales

src/app/components/layout/
├── LayoutShell.tsx.backup      # LayoutShell original
└── LayoutShell.module.css.backup # Estilos originales
```

### Archivos Modificados

#### 1. `src/app/globals.css`
**Cambio:** Agregadas variables CSS requeridas por el nuevo sidebar

```css
/* Variables agregadas para nuevo Sidebar */
--color-primary: #00BCD4;
--color-gray-50: #F8FAFC;
--color-gray-100: #F1F5F9;
--color-gray-200: #E2E8F0;
--color-gray-300: #CBD5E1;
--color-gray-400: #94A3B8;
--color-gray-500: #64748B;
--color-gray-600: #475569;
--color-gray-700: #334155;
--color-gray-800: #1E293B;
--space-4: 1rem;
--space-6: 1.5rem;
--space-8: 2rem;
--background: #F8FAFC;
```

#### 2. `src/app/components/Sidebar/Sidebar.tsx`
**Cambio:** Reemplazo completo con nuevo componente

**Props anteriores:**
```typescript
type SidebarProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isDesktop: boolean;
};
```

**Props nuevas:**
```typescript
interface SidebarProps {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}
```

**Cambios clave:**
- Eliminado estado `isHovered` (ya no usa hover)
- Nuevo estado `openMenuId` para controlar submenú abierto
- Submenús con `position: absolute` (superpuestos)
- Navegación por click en lugar de hover
- Integración con contexto de usuario mantenida

#### 3. `src/app/components/Sidebar/Sidebar.module.css`
**Cambio:** Reemplazo completo con nuevos estilos

**Características principales:**
- Card blanca con `::before` pseudo-elemento
- Transiciones de 300ms ease-out
- Submenú con animación `slideDown`
- Chevron con rotación de 90°
- Estados `.selected` con pill cyan

#### 4. `src/app/components/layout/LayoutShell.tsx`
**Cambio:** Actualización de lógica para nuevo sidebar

**Cambios clave:**
- Nuevo estado `sidebarExpanded` (reemplaza `sidebarOpen` + `isHovered`)
- Agregado overlay clickeable
- Clases condicionales para blur y desplazamiento
- Props actualizadas para Sidebar

#### 5. `src/app/components/layout/LayoutShell.module.css`
**Cambio:** Agregados estilos para efectos de blur y overlay

**Estilos agregados:**
```css
.mainShifted {
  transform: translateX(40px);
  filter: blur(3px);
  pointer-events: none;
}

.overlay { ... }
.overlayVisible { ... }
```

### Variables CSS Agregadas

| Variable | Valor | Uso |
|----------|-------|-----|
| `--color-primary` | `#00BCD4` | Color principal del sidebar |
| `--color-gray-50` | `#F8FAFC` | Fondo claro |
| `--color-gray-100` | `#F1F5F9` | Hover estados |
| `--color-gray-200` | `#E2E8F0` | Bordes |
| `--color-gray-300` | `#CBD5E1` | Separadores |
| `--color-gray-400` | `#94A3B8` | Iconos inactivos |
| `--color-gray-500` | `#64748B` | Texto secundario |
| `--color-gray-600` | `#475569` | Texto hover |
| `--color-gray-700` | `#334155` | Texto activo |
| `--color-gray-800` | `#1E293B` | Texto principal |
| `--space-4` | `1rem` | Espaciado pequeño |
| `--space-6` | `1.5rem` | Espaciado medio |
| `--space-8` | `2rem` | Espaciado grande |
| `--background` | `#F8FAFC` | Fondo principal |

### Dependencias

**Ya instaladas (no requieren cambios):**
- `lucide-react` - Iconos utilizados

**Iconos utilizados:**
- `Home` - Dashboard
- `Calendar` - Turnos
- `ClipboardList` - Admisión
- `Bed` - Internación
- `Receipt` - Facturación
- `BarChart3` - Reportes
- `Settings` - Configuración
- `ChevronRight` - Indicador submenú
- `ChevronLeft` - Botón colapso

### Menú de Navegación

| ID | Label | Icono | Ruta/Subítems |
|----|-------|-------|---------------|
| dashboard | Dashboard | Home | `/dashboard` |
| turnos | Turnos | Calendar | 5 subítems |
| admision | Admisión | ClipboardList | 4 subítems |
| internacion | Internación | Bed | 3 subítems |
| facturacion | Facturación | Receipt | 4 subítems |
| reportes | Reportes | BarChart3 | 3 subítems |
| configuracion | Configuración | Settings | 4 subítems |

### Testing

#### Checklist de Verificación

- [ ] Sidebar se muestra colapsado por defecto (72px)
- [ ] Click en ítem con submenú expande sidebar a 280px
- [ ] Submenú aparece superpuesto (no desplaza elementos)
- [ ] Click en overlay cierra sidebar
- [ ] Contenido principal tiene blur cuando sidebar está expandido
- [ ] Navegación funciona correctamente
- [ ] Ítem activo muestra pill cyan
- [ ] Transiciones son suaves (300ms)
- [ ] Responsive funciona en mobile
- [ ] Menú de usuario sigue funcionando

### Rollback

Si es necesario revertir los cambios:

1. Restaurar archivos de backup:
```bash
# Sidebar
cp src/app/components/Sidebar/Sidebar.tsx.backup src/app/components/Sidebar/Sidebar.tsx
cp src/app/components/Sidebar/Sidebar.module.css.backup src/app/components/Sidebar/Sidebar.module.css

# LayoutShell
cp src/app/components/layout/LayoutShell.tsx.backup src/app/components/layout/LayoutShell.tsx
cp src/app/components/layout/LayoutShell.module.css.backup src/app/components/layout/LayoutShell.module.css
```

2. Las variables CSS agregadas en `globals.css` no afectan el funcionamiento anterior y pueden dejarse.

---

## Historial de Cambios

| Fecha | Cambio | Estado |
|-------|--------|--------|
| 2026-02-04 | Implementación nuevo Sidebar | ✅ Completado |
| 2026-02-04 | Migración CSS Beds Page (intento 1) | ❌ Revertido |
| 2026-02-04 | UI Vista Gestión de Camas | ✅ Completado |
| 2026-02-04 | UI Vista Detalle de Camas | ✅ Completado |

---

## Cambio #2: Migración CSS Beds Page (REVERTIDO)

### Fecha: 4 de Febrero 2026

### Estado: ❌ REVERTIDO

### Descripción
Se intentó adaptar los estilos CSS de los componentes de Beds al nuevo design system, pero se revirtió debido a problemas identificados.

### Problemas Encontrados

1. **`BedDetail.module.css` NO SE USA** - El componente `BedDetail.tsx` no está siendo utilizado. La página de detalle usa `BedDetailView.tsx`.

2. **Impacto visual mínimo** - Los cambios eran muy sutiles y no generaban diferencia visual significativa.

3. **Guía de migración desactualizada** - Asumía componentes que no se usan actualmente.

### Análisis de Componentes Reales

| Archivo CSS | Componente | ¿Se usa? | Página |
|-------------|-----------|----------|--------|
| `BedCard.module.css` | `BedCard.tsx` | ✅ | `/dashboard/beds` |
| `Bedslist.module.css` | `BedsList.tsx` | ✅ | `/dashboard/beds` |
| `BedFilters.module.css` | `BedFilters.tsx` | ✅ | `/dashboard/beds` |
| `BedDetailView.module.css` | `BedDetailView.tsx` | ✅ | `/dashboard/beds/[id]` |
| `BedDetail.module.css` | `BedDetail.tsx` | ❌ | **No se usa** |

### Acción Tomada
Todos los archivos CSS fueron restaurados a su estado original.

### Lección Aprendida
Antes de aplicar cambios de CSS, verificar qué componentes realmente se usan en la aplicación.

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `globals.css` | +18 variables CSS nuevas |
| `Bedslist.module.css` | Variables CSS, grid 280px |
| `BedCard.module.css` | Colores, radios, hover effects |
| `BedFilters.module.css` | Variables CSS, focus states |
| `BedDetail.module.css` | Gradientes, variables CSS |
| `BedDetailView.module.css` | Variables CSS, hover states |

### Variables CSS Agregadas

```css
--color-primary-light: #B2EBF2;
--color-primary-dark: #0097A7;
--color-primary-hover: #00ACC1;
--color-secondary: #00ACC1;
--space-1 a --space-5;
--radius-sm/md/lg/xl;
--font-size-xs/sm/base/lg/xl;
--bg-card: white;
```

### Archivos de Backup

```
src/app/components/beds/
├── Bedslist.module.css.backup
├── BedCard.module.css.backup
├── BedFilters.module.css.backup
├── BedDetail.module.css.backup
└── BedDetailView.module.css.backup
```

### Lo que NO se tocó

- ✅ Todos los archivos `.tsx` permanecen intactos
- ✅ Hooks, servicios, tipos sin cambios
- ✅ Conexión con backend sin afectar

### Documentación Detallada

Ver carpeta: `Implementacion UI de Beds page/Salida/CAMBIOS_APLICADOS.md`

### Resumen de Archivos Modificados

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `globals.css` | Modificado | Agregadas 14 variables CSS para nuevo sidebar |
| `Sidebar.tsx` | Reemplazado | Nueva lógica de click, submenús superpuestos |
| `Sidebar.module.css` | Reemplazado | Nuevos estilos con card blanca, transiciones |
| `LayoutShell.tsx` | Modificado | Nuevas props, overlay, efectos blur |
| `LayoutShell.module.css` | Reemplazado | Layout con overlay y mainShifted |

### Archivos de Backup Creados

```
src/app/components/Sidebar/
├── Sidebar.tsx.backup
└── Sidebar.module.css.backup

src/app/components/layout/
├── LayoutShell.tsx.backup
└── LayoutShell.module.css.backup
```

---

## Notas Técnicas

### Decisiones de Diseño

1. **Submenú superpuesto vs inline**: Se eligió superpuesto para mantener la posición de los elementos del menú fijos.

2. **Click vs Hover**: Se cambió a click para mejor control y experiencia en dispositivos táctiles.

3. **Blur del contenido**: Efecto visual que indica que el sidebar está activo y el contenido no es interactivo.

4. **Card blanca con pseudo-elemento**: Permite mantener el contenido del sidebar sobre la card sin afectar el z-index.

### Compatibilidad

- **Navegadores**: Chrome, Firefox, Safari, Edge (últimas 2 versiones)
- **Dispositivos**: Desktop, Tablet, Mobile
- **Breakpoints**: 768px (mobile), 1024px (desktop)

---

## Cambio #3: UI Vista Gestión de Camas

### Fecha: 4 de Febrero 2026

### Estado: ✅ COMPLETADO

### Archivos Modificados

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `BedCard.module.css` | CSS | Colores de estados, border-radius 12px, header coloreado |
| `Bedslist.module.css` | CSS | Grid 260px, gap 20px |

### Colores de Estados

| Estado | Header | Label |
|--------|--------|-------|
| Ocupada | `#ff9961` | `rgba(136,0,0,0.36)` |
| Libre | `#37b5c0` | `rgba(255,255,255,0.2)` |
| Aislada | `#7DD3C0` | `rgba(0,77,64,0.3)` |
| Reparación | `#9E9E9E` | `rgba(66,66,66,0.4)` |
| Cerrada | `#FFCDD2` | `rgba(198,40,40,0.3)` |

---

## Cambio #4: UI Vista Detalle de Camas

### Fecha: 4 de Febrero 2026

### Estado: ✅ COMPLETADO

### Archivos Modificados

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `IndicacionesSection.tsx` | **TSX** | Fecha seleccionada arriba de búsqueda |
| `IndicacionesSection.module.css` | CSS | Estilos para fecha |
| `SidebarFilters.module.css` | CSS | Gradientes en menús expandibles |

### Gradientes Aplicados

| Elemento | Color Inicio | Color Fin |
|----------|-------------|-----------|
| Gestión Médica | `#00B5E2` | `#0083A9` |
| Gestión Enfermería | `#00B5E2` | `#0083A9` |
| Otras Funciones | `#5DADE2` | `#8E7CC3` |

### Nota sobre TSX

El único cambio de TSX fue agregar visualización de fecha. No modifica lógica de negocio.

---

**Última actualización:** 4 de Febrero 2026
