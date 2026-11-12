'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Package } from 'lucide-react';
import {
	Area,
	AreaChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { almacenStockService } from '@/app/services/almacenStockService';
import type { ActividadDia, EstadoStock } from '@/app/types/almacenStock';
import styles from './almacenVisual.module.css';

export const PALETA = ['#0083a9', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#64748b'];

export const COLOR_ESTADO: Record<EstadoStock, string> = {
	sin: '#ef4444',
	bajo: '#f97316',
	reponer: '#f59e0b',
	exceso: '#8b5cf6',
	ok: '#22c55e',
};

export const LABEL_ESTADO: Record<EstadoStock, string> = {
	sin: 'Sin stock',
	bajo: 'Bajo mínimo',
	reponer: 'A reponer',
	exceso: 'Exceso',
	ok: 'Normal',
};

export function fmtNum(n?: number | null, dec = 2) {
	if (n == null || Number.isNaN(Number(n))) return '—';
	return Number(n).toLocaleString('es-AR', { maximumFractionDigits: dec });
}

export function fmtMoney(n?: number | null) {
	if (n == null || Number.isNaN(Number(n))) return '—';
	return Number(n).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 });
}

export function fmtCompact(n?: number | null) {
	if (n == null || Number.isNaN(Number(n))) return '—';
	return Number(n).toLocaleString('es-AR', { notation: 'compact', maximumFractionDigits: 1 });
}

export function fmtFecha(f?: string | null) {
	if (!f) return '—';
	const s = String(f).slice(0, 10);
	const [y, m, d] = s.split('-');
	return y && m && d ? `${d}/${m}/${y}` : s;
}

function hashColor(texto: string) {
	let h = 0;
	for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
	return PALETA[h % PALETA.length];
}

export function iniciales(nombre?: string | null) {
	const partes = String(nombre || '')
		.replace(/[^A-Za-z0-9\u00C0-\u024F\s]/g, ' ')
		.split(/\s+/)
		.filter(Boolean);
	if (!partes.length) return '?';
	return (partes[0][0] + (partes[1]?.[0] || '')).toUpperCase();
}

/** Anillo de progreso SVG. */
export function Ring({
	pct,
	size = 56,
	stroke = 7,
	color = '#0083a9',
	children,
}: {
	pct: number;
	size?: number;
	stroke?: number;
	color?: string;
	children?: ReactNode;
}) {
	const r = (size - stroke) / 2;
	const c = 2 * Math.PI * r;
	const v = Math.max(0, Math.min(100, pct || 0));
	return (
		<div className={styles.ring} style={{ width: size, height: size }}>
			<svg width={size} height={size} aria-hidden>
				<circle cx={size / 2} cy={size / 2} r={r} stroke="#e8eef3" strokeWidth={stroke} fill="none" />
				<circle
					cx={size / 2}
					cy={size / 2}
					r={r}
					stroke={color}
					strokeWidth={stroke}
					fill="none"
					strokeLinecap="round"
					strokeDasharray={c}
					strokeDashoffset={c - (v / 100) * c}
					transform={`rotate(-90 ${size / 2} ${size / 2})`}
					style={{ transition: 'stroke-dashoffset 0.6s ease' }}
				/>
			</svg>
			<span className={styles.ringLabel}>{children ?? `${Math.round(v)}%`}</span>
		</div>
	);
}

type Tono = 'brand' | 'ok' | 'warn' | 'danger' | 'violet' | 'neutral';
const COLOR_TONO: Record<Tono, string> = {
	brand: '#0083a9',
	ok: '#16a34a',
	warn: '#d97706',
	danger: '#dc2626',
	violet: '#7c3aed',
	neutral: '#475569',
};

/** Tarjeta KPI: icono o anillo de porcentaje + valor + detalle. */
export function Kpi({
	label,
	value,
	hint,
	icon,
	pct,
	tono = 'brand',
	activo,
	onClick,
}: {
	label: string;
	value: ReactNode;
	hint?: ReactNode;
	icon?: ReactNode;
	pct?: number | null;
	tono?: Tono;
	activo?: boolean;
	onClick?: () => void;
}) {
	const color = COLOR_TONO[tono];
	const contenido = (
		<>
			{pct != null ? (
				<Ring pct={pct} color={color} />
			) : (
				<span className={styles.kpiIcon} style={{ color, background: `${color}14` }}>
					{icon}
				</span>
			)}
			<span className={styles.kpiBody}>
				<span className={styles.kpiLabel}>{label}</span>
				<span className={styles.kpiValue} style={{ color: tono === 'brand' ? undefined : color }}>
					{value}
				</span>
				{hint ? <span className={styles.kpiHint}>{hint}</span> : null}
			</span>
		</>
	);
	if (onClick) {
		return (
			<button
				type="button"
				className={`${styles.kpi} ${styles.kpiClick} ${activo ? styles.kpiActivo : ''}`}
				style={activo ? { borderColor: color, boxShadow: `0 0 0 2px ${color}22` } : undefined}
				onClick={onClick}
				aria-pressed={activo}
			>
				{contenido}
			</button>
		);
	}
	return <div className={styles.kpi}>{contenido}</div>;
}

export function KpiGrid({ children }: { children: ReactNode }) {
	return <div className={styles.kpiGrid}>{children}</div>;
}

/** Barra de nivel: llenado contra el máximo, con marcas de mínimo y punto de pedido. */
export function NivelBar({
	pct,
	estado,
	marcaMin,
	marcaPunto,
	compacto,
}: {
	pct: number | null | undefined;
	estado?: EstadoStock;
	marcaMin?: number | null;
	marcaPunto?: number | null;
	compacto?: boolean;
}) {
	const color = COLOR_ESTADO[estado || 'ok'];
	const sinParam = pct == null;
	const ancho = sinParam ? (estado === 'sin' ? 0 : 100) : Math.min(100, pct);
	return (
		<div className={`${styles.nivel} ${compacto ? styles.nivelCompacto : ''}`}>
			<div className={styles.nivelTrack}>
				<div
					className={`${styles.nivelFill} ${sinParam ? styles.nivelSinParam : ''}`}
					style={{ width: `${ancho}%`, background: sinParam ? undefined : color }}
				/>
				{marcaMin != null && marcaMin > 0 && marcaMin < 100 ? (
					<span className={styles.nivelMarca} style={{ left: `${marcaMin}%` }} title="Mínimo" />
				) : null}
				{marcaPunto != null && marcaPunto > 0 && marcaPunto < 100 ? (
					<span className={`${styles.nivelMarca} ${styles.nivelMarcaPunto}`} style={{ left: `${marcaPunto}%` }} title="Punto de pedido" />
				) : null}
			</div>
			{!compacto ? (
				<span className={styles.nivelPct} style={{ color: sinParam ? '#94a3b8' : color }}>
					{sinParam ? 's/p' : `${pct}%`}
				</span>
			) : null}
		</div>
	);
}

export function EstadoBadge({ estado }: { estado?: EstadoStock }) {
	const e = estado || 'ok';
	const color = COLOR_ESTADO[e];
	return (
		<span className={styles.badge} style={{ color, background: `${color}17`, borderColor: `${color}40` }}>
			<span className={styles.badgeDot} style={{ background: color }} />
			{LABEL_ESTADO[e]}
		</span>
	);
}

export function Pill({ color, children }: { color: string; children: ReactNode }) {
	return (
		<span className={styles.badge} style={{ color, background: `${color}17`, borderColor: `${color}40` }}>
			<span className={styles.badgeDot} style={{ background: color }} />
			{children}
		</span>
	);
}

export function Card({
	title,
	icon,
	actions,
	children,
	className,
}: {
	title: string;
	icon?: ReactNode;
	actions?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section className={`${styles.card} ${className || ''}`}>
			<header className={styles.cardHead}>
				<h3 className={styles.cardTitle}>
					{icon}
					{title}
				</h3>
				{actions}
			</header>
			<div className={styles.cardBody}>{children}</div>
		</section>
	);
}

export function ChartsRow({ children }: { children: ReactNode }) {
	return <div className={styles.chartsRow}>{children}</div>;
}

export type DonutDato = { name: string; value: number; color?: string };

/** Dona con leyenda; agrupa en "Otros" lo que excede `max`. */
export function Donut({
	data,
	centro,
	centroLabel,
	max = 6,
	alto = 170,
	onSelect,
}: {
	data: DonutDato[];
	centro?: ReactNode;
	centroLabel?: string;
	max?: number;
	alto?: number;
	onSelect?: (d: DonutDato, index: number) => void;
}) {
	const ordenados = data.filter((d) => d.value > 0);
	const visibles = ordenados.slice(0, max);
	const resto = ordenados.slice(max).reduce((a, d) => a + d.value, 0);
	const datos = resto > 0 ? [...visibles, { name: 'Otros', value: resto, color: '#cbd5e1' }] : visibles;
	const total = datos.reduce((a, d) => a + d.value, 0);
	if (!total) return <div className={styles.vacio}>Sin datos</div>;
	return (
		<div className={styles.donut}>
			<div className={styles.donutChart} style={{ height: alto, width: alto }}>
				<ResponsiveContainer width="100%" height="100%">
					<PieChart>
						<Pie
							data={datos}
							dataKey="value"
							nameKey="name"
							innerRadius="62%"
							outerRadius="100%"
							paddingAngle={datos.length > 1 ? 2 : 0}
							stroke="none"
							isAnimationActive
							onClick={(_, i) => {
								if (onSelect && datos[i]?.name !== 'Otros') onSelect(datos[i], i);
							}}
							style={onSelect ? { cursor: 'pointer' } : undefined}
						>
							{datos.map((d, i) => (
								<Cell key={d.name} fill={d.color || PALETA[i % PALETA.length]} />
							))}
						</Pie>
						<Tooltip formatter={(v: number) => fmtNum(v)} />
					</PieChart>
				</ResponsiveContainer>
				{centro != null ? (
					<div className={styles.donutCentro}>
						<strong>{centro}</strong>
						{centroLabel ? <span>{centroLabel}</span> : null}
					</div>
				) : null}
			</div>
			<ul className={styles.leyenda}>
				{datos.map((d, i) => (
					<li key={d.name}>
						<span className={styles.leyendaDot} style={{ background: d.color || PALETA[i % PALETA.length] }} />
						<span className={styles.leyendaNombre} title={d.name}>
							{d.name}
						</span>
						<span className={styles.leyendaPct}>{Math.round((d.value / total) * 100)}%</span>
					</li>
				))}
			</ul>
		</div>
	);
}

/** Barras horizontales ordenadas (ranking por depósito, rubro, proveedor). */
export function BarList({
	items,
	formato = (v: number) => fmtNum(v),
	vacio = 'Sin datos',
	total,
}: {
	items: { key: string | number; label: string; value: number; sub?: ReactNode; color?: string; onClick?: () => void }[];
	formato?: (v: number) => string;
	vacio?: string;
	/** Escala fija (p. ej. el total); por defecto, el mayor valor. */
	total?: number;
}) {
	const max = total || Math.max(0, ...items.map((i) => i.value));
	if (!items.length || !max) return <div className={styles.vacio}>{vacio}</div>;
	return (
		<ul className={styles.barList}>
			{items.map((it, i) => {
				const contenido = (
					<>
						<div className={styles.barTop}>
							<span className={styles.barLabel} title={it.label}>
								{it.label}
							</span>
							<span className={styles.barValue}>{formato(it.value)}</span>
						</div>
						<div className={styles.barTrack}>
							<div
								className={styles.barFill}
								style={{ width: `${Math.max(2, (it.value / max) * 100)}%`, background: it.color || PALETA[i % PALETA.length] }}
							/>
						</div>
						{it.sub ? <div className={styles.barSub}>{it.sub}</div> : null}
					</>
				);
				return (
					<li key={it.key}>
						{it.onClick ? (
							<button type="button" className={styles.barBtn} onClick={it.onClick}>
								{contenido}
							</button>
						) : (
							contenido
						)}
					</li>
				);
			})}
		</ul>
	);
}

/** Entradas vs. salidas por día. */
export function ActividadChart({ data, alto = 190 }: { data: ActividadDia[]; alto?: number }) {
	const hayDatos = data.some((d) => d.entradas || d.salidas);
	if (!hayDatos) return <div className={styles.vacio} style={{ height: alto }}>Sin movimientos en el período</div>;
	const puntos = data.map((d) => ({ ...d, label: fmtFecha(d.dia).slice(0, 5) }));
	return (
		<div style={{ width: '100%', height: alto }}>
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={puntos} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
					<defs>
						<linearGradient id="gEnt" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor="#22c55e" stopOpacity={0.35} />
							<stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
						</linearGradient>
						<linearGradient id="gSal" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
							<stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
						</linearGradient>
					</defs>
					<CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
					<XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} minTickGap={18} />
					<YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtCompact(v)} />
					<Tooltip
						formatter={(v: number, n: string) => [fmtNum(v), n === 'entradas' ? 'Entradas' : 'Salidas']}
						labelFormatter={(l) => `Día ${l}`}
					/>
					<Area type="monotone" dataKey="entradas" stroke="#16a34a" strokeWidth={2} fill="url(#gEnt)" />
					<Area type="monotone" dataKey="salidas" stroke="#dc2626" strokeWidth={2} fill="url(#gSal)" />
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}

/** Barra apilada de proporciones (p. ej. estados de stock). */
export function StackBar({ partes }: { partes: { label: string; value: number; color: string; onClick?: () => void }[] }) {
	const total = partes.reduce((a, p) => a + p.value, 0);
	if (!total) return <div className={styles.vacio}>Sin datos</div>;
	return (
		<div className={styles.stack}>
			<div className={styles.stackTrack}>
				{partes
					.filter((p) => p.value > 0)
					.map((p) => (
						<span
							key={p.label}
							className={styles.stackSeg}
							style={{ width: `${(p.value / total) * 100}%`, background: p.color }}
							title={`${p.label}: ${fmtNum(p.value, 0)}`}
						/>
					))}
			</div>
			<ul className={styles.stackLeyenda}>
				{partes.map((p) => (
					<li key={p.label}>
						<button type="button" onClick={p.onClick} disabled={!p.onClick} className={styles.stackItem}>
							<span className={styles.leyendaDot} style={{ background: p.color }} />
							<span>{p.label}</span>
							<strong>{fmtNum(p.value, 0)}</strong>
							<span className={styles.leyendaPct}>{Math.round((p.value / total) * 100)}%</span>
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}

export function Avatar({ nombre, size = 36, color }: { nombre?: string | null; size?: number; color?: string }) {
	const c = color || hashColor(String(nombre || ''));
	return (
		<span
			className={styles.avatar}
			style={{ width: size, height: size, fontSize: size * 0.38, background: `${c}1f`, color: c, borderColor: `${c}40` }}
			aria-hidden
		>
			{iniciales(nombre)}
		</span>
	);
}

const fotoCache = new Map<string, string>();

/** Foto del producto (blob con token) o avatar con el color del rubro. */
export function FotoProducto({
	id,
	tieneFoto,
	rubro,
	size = 40,
	version = 0,
	redondeo = 10,
}: {
	id: number;
	tieneFoto?: boolean;
	rubro?: string | null;
	size?: number;
	version?: number | string;
	redondeo?: number;
}) {
	const clave = `${id}:${version}`;
	const [url, setUrl] = useState<string | null>(() => fotoCache.get(clave) || null);

	useEffect(() => {
		if (!tieneFoto) {
			setUrl(null);
			return;
		}
		const cacheada = fotoCache.get(clave);
		if (cacheada) {
			setUrl(cacheada);
			return;
		}
		const ctrl = new AbortController();
		almacenStockService
			.fotoProducto(id, ctrl.signal)
			.then((blob) => {
				const u = URL.createObjectURL(blob);
				fotoCache.set(clave, u);
				setUrl(u);
			})
			.catch(() => setUrl(null));
		return () => ctrl.abort();
	}, [id, tieneFoto, clave]);

	const color = hashColor(String(rubro || 'producto'));
	if (url) {
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img
				src={url}
				alt=""
				className={styles.foto}
				style={{ width: size, height: size, borderRadius: redondeo }}
			/>
		);
	}
	return (
		<span
			className={styles.fotoVacia}
			style={{ width: size, height: size, borderRadius: redondeo, background: `${color}14`, color }}
			aria-hidden
		>
			<Package size={Math.round(size * 0.48)} />
		</span>
	);
}

export function invalidarFoto(id: number) {
	for (const k of Array.from(fotoCache.keys())) {
		if (k.startsWith(`${id}:`)) {
			URL.revokeObjectURL(fotoCache.get(k)!);
			fotoCache.delete(k);
		}
	}
}

export function Segmented<T extends string>({
	value,
	onChange,
	opciones,
}: {
	value: T;
	onChange: (v: T) => void;
	opciones: { value: T; label: ReactNode; count?: number | null }[];
}) {
	return (
		<div className={styles.segmented} role="tablist">
			{opciones.map((o) => (
				<button
					key={o.value}
					type="button"
					role="tab"
					aria-selected={value === o.value}
					className={`${styles.segBtn} ${value === o.value ? styles.segActivo : ''}`}
					onClick={() => onChange(o.value)}
				>
					{o.label}
					{o.count != null ? <span className={styles.segCount}>{fmtCompact(o.count)}</span> : null}
				</button>
			))}
		</div>
	);
}

export function Skeleton({ alto = 90 }: { alto?: number }) {
	return <div className={styles.skeleton} style={{ height: alto }} />;
}
