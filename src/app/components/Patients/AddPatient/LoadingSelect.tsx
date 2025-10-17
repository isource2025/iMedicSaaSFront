import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./Personal.module.css";

interface Option {
    value: string | number;
    label: string;
}
interface CustomSelectProps {
    label: string;
    name: string;
    value: string | number;
    onChange: (value: string | number) => void;
    isLoading: boolean;
    options: Option[];
    tabIndex?: number; // NEW: permitir orden de tabulación
    autoFocus?: boolean; // NEW: permitir autoFocus
}

type Placement = "top" | "bottom";

export default function CustomSelect({
    label,
    name,
    value,
    onChange,
    isLoading,
    options,
    tabIndex, // NEW
    autoFocus, // NEW
}: CustomSelectProps) {
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [placement, setPlacement] = useState<Placement>("bottom");
    const [coords, setCoords] = useState({ left: 0, top: 0, width: 0 });
    const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null); // NEW

    const [activeIndex, setActiveIndex] = useState<number>(-1);
    const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

    useEffect(() => {
        setMounted(true);
    }, []);

    const selected = options.find((o) => o.value === value);
    const filtered = options.filter((o) =>
        o.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

        setPlacement(openDown ? "bottom" : "top");
        setCoords({
            left: Math.round(r.left),
            top: Math.round(openDown ? r.bottom + 4 : r.top - 4),
            width: Math.round(r.width),
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

    useEffect(() => {
        if (!wrapperRef.current) return;
        const modalRoot = wrapperRef.current.closest<HTMLElement>(
            '[data-modal-root], [role="dialog"], .modal, .Modal, .MuiModal-root'
        );
        setPortalEl(modalRoot ?? document.body);
    }, []);

    const selectClasses = [
        styles.select,
        isLoading ? styles.selectDisabled : "",
        isLoading ? styles.selectLoading : "",
    ]
        .filter(Boolean)
        .join(" ");

    // NEW: teclado en el trigger (Enter/Space abre, Escape cierra)
    const handleTriggerKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (
        e
    ) => {
        if (isLoading) return;
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
        <div className={`${label ? styles.formGroup : ""}`} ref={wrapperRef}>
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
                    onClick={() => !isLoading && setIsOpen((v) => !v)}
                    role="combobox" // NEW: ARIA adecuado
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-disabled={isLoading}
                    aria-controls={`${name}-listbox`}
                    aria-activedescendant={
                        isOpen ? `${name}-active` : undefined
                    }
                    tabIndex={isLoading ? -1 : tabIndex ?? 0} // NEW: enfocable y ordenable
                    onKeyDown={handleTriggerKeyDown} // NEW
                >
                    {isLoading
                        ? "Cargando…"
                        : selected
                        ? selected.label
                        : "Seleccione…"}
                    {isLoading && (
                        <div
                            className={styles.spinnerIcon}
                            aria-hidden="true"
                        />
                    )}
                </div>
            </div>

            {mounted &&
                isOpen &&
                !isLoading &&
                portalEl &&
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
                            {filtered.length ? (
                                filtered.map((opt, i) => (
                                    <li
                                        key={opt.value}
                                        ref={(el) => {
                                            optionRefs.current[i] = el;
                                        }}
                                        className={`${styles.dropdownItem} ${
                                            opt.value === value
                                                ? styles.selected
                                                : ""
                                        } ${
                                            i === activeIndex
                                                ? styles.active
                                                : ""
                                        }`}
                                        role="option"
                                        id={
                                            opt.value === value
                                                ? `${name}-active`
                                                : undefined
                                        }
                                        aria-selected={opt.value === value}
                                        tabIndex={-1} // no entra el foco aquí; se selecciona con click/Enter desde el buscador
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onClick={() => {
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
                                        {opt.label}
                                    </li>
                                ))
                            ) : (
                                <li className={styles.dropdownItemDisabled}>
                                    No hay resultados
                                </li>
                            )}
                        </ul>
                    </div>,
                    portalEl
                )}
        </div>
    );
}
