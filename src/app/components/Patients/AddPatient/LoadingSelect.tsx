import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./Personal.module.css";

interface Option {
    value: string | number;
    label: string;
    /** Chip opcional (p. ej. Entrada / Salida). */
    badge?: string;
    badgeTone?: "entrada" | "salida" | "neutral";
    /** Agrupa opciones bajo un encabezado en el listado. */
    group?: string;
}
interface CustomSelectProps {
    label: string;
    name: string;
    value: string | number;
    onChange: (value: string | number) => void;
    isLoading?: boolean;
    options: Option[];
    tabIndex?: number; // NEW: permitir orden de tabulación
    autoFocus?: boolean; // NEW: permitir autoFocus
    disabled?: boolean; // NEW: bloquear apertura mostrando el valor seleccionado
    /** Si se define, el filtrado local se desactiva y se notifica el término (búsqueda remota). */
    onSearchChange?: (term: string) => void;
    /** Etiqueta a mostrar cuando el valor seleccionado no está en `options`. */
    selectedLabel?: string;
    /** Altura y tipografía más chicas (modales densos). */
    compact?: boolean;
}

type Placement = "top" | "bottom";

export default function CustomSelect({
    label,
    name,
    value,
    onChange,
    isLoading = false,
    options,
    tabIndex, // NEW
    autoFocus, // NEW
    disabled, // NEW
    onSearchChange,
    selectedLabel,
    compact,
}: CustomSelectProps) {
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [placement, setPlacement] = useState<Placement>("bottom");
    const [coords, setCoords] = useState({ left: 0, top: 0, width: 0, maxHeight: 320 });

    const wrapperRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null); // NEW
    const onSearchRef = useRef(onSearchChange);
    onSearchRef.current = onSearchChange;

    const [activeIndex, setActiveIndex] = useState<number>(-1);
    const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const mismoValor = (a: string | number, b: string | number) =>
        String(a) === String(b);
    const selected = options.find((o) => mismoValor(o.value, value));
    const displayLabel = selected?.label || selectedLabel || null;
    const term = searchTerm.toLowerCase();
    const filtered = onSearchChange
        ? options
        : options.filter((o) => {
              const hay = `${o.label} ${o.badge || ""} ${o.group || ""}`.toLowerCase();
              return hay.includes(term);
          });

    const badgeClass = (tone?: Option["badgeTone"]) => {
        if (tone === "entrada") return styles.optionBadgeEntrada;
        if (tone === "salida") return styles.optionBadgeSalida;
        return styles.optionBadgeNeutral;
    };

    const renderOptionLabel = (opt: Option) => (
        <span className={styles.optionRow}>
            {opt.badge ? (
                <span className={`${styles.optionBadge} ${badgeClass(opt.badgeTone)}`}>
                    {opt.badge}
                </span>
            ) : null}
            <span className={styles.optionText}>{opt.label}</span>
        </span>
    );

    useEffect(() => {
        if (!isOpen || !onSearchRef.current) return;
        const t = window.setTimeout(() => {
            onSearchRef.current?.(searchTerm);
        }, 220);
        return () => window.clearTimeout(t);
    }, [searchTerm, isOpen]);

    const close = () => {
        setIsOpen(false);
        setSearchTerm("");
        // NEW: devolver foco al trigger al cerrar
        requestAnimationFrame(() => triggerRef.current?.focus());
    };

    const updatePosition = () => {
        const el = triggerRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const spaceBelow = vh - r.bottom;
        const spaceAbove = r.top;
        const estimated = 280;

        const openDown =
            spaceBelow >= Math.min(estimated, vh * 0.4) ||
            spaceBelow >= spaceAbove;

        const available = openDown ? spaceBelow - 8 : spaceAbove - 8;
        const maxHeight = Math.min(320, Math.max(120, available));

        // El menú no puede quedar más angosto que el trigger; si el trigger es chico
        // (p. ej. tipo de remito en una fila apretada) se ensancha para leer labels largos.
        const triggerW = Math.round(r.width);
        const vw = window.innerWidth;
        const maxW = Math.max(180, vw - 24);
        const preferred = Math.min(maxW, Math.max(triggerW, Math.min(480, Math.round(vw * 0.42))));
        let left = Math.round(r.left);
        if (left + preferred > vw - 12) left = Math.max(12, vw - 12 - preferred);

        setPlacement(openDown ? "bottom" : "top");
        setCoords({
            left,
            top: Math.round(openDown ? r.bottom + 4 : r.top - 4),
            width: preferred,
            maxHeight,
        });
    };

    useLayoutEffect(() => {
        if (isOpen) {
            updatePosition();
            setActiveIndex(-1);
            requestAnimationFrame(() => searchInputRef.current?.focus());
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onResize = () => updatePosition();
        const onScroll = () => updatePosition();
        window.addEventListener("resize", onResize);
        window.addEventListener("scroll", onScroll, true);
        return () => {
            window.removeEventListener("resize", onResize);
            window.removeEventListener("scroll", onScroll, true);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            const t = e.target as Node;
            if (
                !wrapperRef.current?.contains(t) &&
                !dropdownRef.current?.contains(t)
            ) {
                close();
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen]);

    // isLoading durante una búsqueda remota NO debe cerrar el menú ni tocar el input:
    // si se desmonta el portal, se pierde el foco y el cursor salta.
    const triggerBusy = Boolean(isLoading && !isOpen);
    const selectClasses = [
        styles.select,
        compact ? styles.selectCompact : "",
        triggerBusy || disabled ? styles.selectDisabled : "",
        triggerBusy ? styles.selectLoading : "",
    ]
        .filter(Boolean)
        .join(" ");

    // NEW: teclado en el trigger (Enter/Space abre, Escape cierra)
    const handleTriggerKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (
        e
    ) => {
        if (triggerBusy || disabled) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((v) => !v);
        } else if (e.key === "Escape") {
            e.preventDefault();
            if (isOpen) close();
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!isOpen) setIsOpen(true);
            else {
                // enfocar buscador para empezar a filtrar
                searchInputRef.current?.focus();
            }
        }
    };

    useEffect(() => {
        if (autoFocus && options.length && !isLoading) {
            setIsOpen(true);
        }
    }, [autoFocus, options.length, isLoading]);

    useEffect(() => {
        if (
            activeIndex >= 0 &&
            optionRefs.current[activeIndex] instanceof HTMLElement
        ) {
            optionRefs.current[activeIndex]?.scrollIntoView({
                block: "nearest",
                behavior: "smooth",
            });
        }
    }, [activeIndex]);

    return (
        <div
            className={`${label ? (compact ? styles.formGroupCompact : styles.formGroup) : ""}`}
            ref={wrapperRef}
        >
            {label && (
                <label className={styles.label} htmlFor={name}>
                    {label}
                </label>
            )}

            <div className={styles.selectWrapper}>
                <div
                    id={name}
                    ref={triggerRef}
                    className={selectClasses}
                    onClick={() => !triggerBusy && !disabled && setIsOpen((v) => !v)}
                    role="combobox" // NEW: ARIA adecuado
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-disabled={triggerBusy || disabled}
                    aria-busy={isLoading || undefined}
                    aria-controls={`${name}-listbox`}
                    aria-activedescendant={
                        isOpen ? `${name}-active` : undefined
                    }
                    title={
                        !triggerBusy && (selected?.label || displayLabel)
                            ? String(selected?.label || displayLabel)
                            : undefined
                    }
                    tabIndex={triggerBusy || disabled ? -1 : tabIndex ?? 0} // NEW: enfocable y ordenable
                    onKeyDown={handleTriggerKeyDown} // NEW
                >
                    {triggerBusy
                        ? "Cargando…"
                        : selected
                        ? renderOptionLabel(selected)
                        : displayLabel
                        ? displayLabel
                        : "Seleccione…"}
                    {triggerBusy && (
                        <div
                            className={styles.spinnerIcon}
                            aria-hidden="true"
                        />
                    )}
                </div>
            </div>

            {mounted &&
                isOpen &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        className={`${styles.dropdownPortal} ${
                            placement === "top"
                                ? styles.dropTop
                                : styles.dropBottom
                        }`}
                        style={{
                            left: coords.left,
                            top: coords.top,
                            width: coords.width,
                            maxHeight: coords.maxHeight,
                        }}
                        role="listbox"
                        id={`${name}-listbox`}
                        aria-labelledby={name}
                        onMouseDownCapture={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={styles.searchBar}>
                            <input
                                ref={searchInputRef} // NEW
                                className={styles.searchInput}
                                type="text"
                                placeholder="Buscar…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                aria-label="Buscar opción"
                                onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                        e.preventDefault();
                                        close(); // NEW: cerrar con Esc
                                    }
                                    if (e.key === "Tab" && !e.shiftKey) {
                                        // dejar que Tab salga del dropdown y siga al próximo control
                                        setIsOpen(false);
                                    } else if (e.key === "ArrowDown") {
                                        e.preventDefault();
                                        setActiveIndex((prev) =>
                                            prev < filtered.length - 1
                                                ? prev + 1
                                                : 0
                                        );
                                    } else if (e.key === "ArrowUp") {
                                        e.preventDefault();
                                        setActiveIndex((prev) =>
                                            prev > 0
                                                ? prev - 1
                                                : filtered.length - 1
                                        );
                                    } else if (
                                        e.key === "Enter" &&
                                        activeIndex >= 0
                                    ) {
                                        e.preventDefault();
                                        const opt = filtered[activeIndex];
                                        if (opt) {
                                            onChange(opt.value);
                                            close();
                                        }
                                    }
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                            />
                        </div>

                        <ul className={styles.optionList}>
                            {isLoading ? (
                                <li className={styles.dropdownItemDisabled} aria-live="polite">
                                    Buscando…
                                </li>
                            ) : null}
                            {filtered.length ? (
                                filtered.map((opt, i) => {
                                    const prevGroup = i > 0 ? filtered[i - 1]?.group : undefined;
                                    const showGroup =
                                        !!opt.group && opt.group !== prevGroup;
                                    return (
                                        <li
                                            key={opt.value}
                                            ref={(el) => {
                                                optionRefs.current[i] = el;
                                            }}
                                            className={`${styles.dropdownItem} ${
                                                mismoValor(opt.value, value)
                                                    ? styles.selected
                                                    : ""
                                            } ${
                                                i === activeIndex
                                                    ? styles.active
                                                    : ""
                                            }`}
                                            role="option"
                                            id={
                                                mismoValor(opt.value, value)
                                                    ? `${name}-active`
                                                    : undefined
                                            }
                                            aria-selected={mismoValor(opt.value, value)}
                                            tabIndex={-1}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onChange(opt.value);
                                                close();
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    onChange(opt.value);
                                                    close();
                                                }
                                            }}
                                        >
                                            {showGroup ? (
                                                <div className={styles.optionGroupHead} aria-hidden>
                                                    {opt.group}
                                                </div>
                                            ) : null}
                                            {renderOptionLabel(opt)}
                                        </li>
                                    );
                                })
                            ) : !isLoading ? (
                                <li className={styles.dropdownItemDisabled}>
                                    {onSearchChange && searchTerm.trim().length < 2
                                        ? "Escribí al menos 2 caracteres…"
                                        : "No hay resultados"}
                                </li>
                            ) : null}
                        </ul>
                    </div>,
                    document.body
                )}
        </div>
    );
}
