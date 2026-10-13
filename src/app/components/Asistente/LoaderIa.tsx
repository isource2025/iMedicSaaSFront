"use client";

import { useEffect, useState } from "react";
import styles from "./LoaderIa.module.css";

export type ProgresoIa = {
  fase: "pensando" | "herramienta" | "analizando" | "cerrando";
  herramienta?: string;
  iter: number;
  hechos: { nombre: string; ok: boolean }[];
  inicio: number;
};

const ROTAR_MS = 2400;

const FRASES_FASE: Record<string, string[]> = {
  pensando: [
    "Leyendo tu pedido",
    "Mirando lo que tenés en pantalla",
    "Revisando lo que tu perfil puede hacer",
    "Eligiendo cómo resolverlo",
  ],
  analizando: [
    "Analizando lo que encontré",
    "Cruzando la información",
    "Armando la respuesta",
  ],
  cerrando: ["Cerrando con lo que tengo", "Redactando la respuesta final"],
  accion: [
    "Ejecutando con tus permisos",
    "Guardando los cambios",
    "Verificando el resultado",
  ],
  aplicar: ["Escribiendo en el campo", "Agregando la marca IA"],
};

const FRASES_HERRAMIENTA: Record<string, string[]> = {
  resolver_contexto: ["Ubicando el registro en iMedic", "Armando la ficha completa"],
  buscar_codigo: ["Buscando el proceso en el código", "Acotando a los archivos del pedido"],
  leer_codigo: ["Leyendo el handler", "Traduciendo qué datos pide"],
  consulta_sql: [
    "Armando la consulta SQL",
    "Consultando la base en modo solo lectura",
    "Ordenando los resultados",
  ],
  describir_tabla: ["Revisando la estructura de los datos"],
  listar_tablas: ["Revisando las tablas disponibles"],
  buscar_endpoints: ["Buscando la función correcta del sistema"],
  describir_endpoint: ["Revisando qué datos necesita"],
  llamar_api: [
    "Consultando el sistema con tus permisos",
    "Verificando autoría y permisos",
  ],
  escribir_en_campo: [
    "Redactando el texto para el campo",
    "Cuidando el tono clínico",
  ],
  buscar_persona_renaper: [
    "Consultando RENAPER",
    "Completando los datos personales",
  ],
  navegar: ["Armando el acceso a la pantalla"],
  buscar_en_manual: ["Buscando en el manual"],
  diagnosticar: ["Revisando tus permisos", "Mirando los últimos errores de la pantalla"],
  buscar_internado: ["Buscando al internado", "Armando la ficha de la cama"],
  ver_estudios: ["Leyendo los estudios de la visita", "Separando hechos y pendientes"],
  ver_evoluciones: ["Leyendo las evoluciones"],
  ver_indicaciones: ["Leyendo las indicaciones"],
  preparar_egreso: ["Preparando el egreso", "Revisando el motivo del catálogo"],
  preparar_evolucion: ["Redactando la evolución"],
  preparar_hc_ingreso: ["Armando la HC de ingreso"],
  preparar_indicacion: ["Buscando en el catálogo de indicaciones"],
  solicitar_estudios: ["Buscando las prácticas"],
  solicitar_interconsulta: ["Armando la interconsulta"],
  preparar_protocolo: ["Armando el protocolo"],
  preparar_epicrisis: ["Redactando la epicrisis"],
  editar_evolucion: ["Revisando la evolución", "Preparando el cambio"],
  eliminar_evolucion: ["Revisando la evolución"],
  listar_camas_libres: ["Buscando camas libres"],
  ver_movimientos: ["Leyendo los movimientos"],
  ver_historia_clinica: ["Leyendo la historia clínica", "Revisando controles y registros"],
  trasladar_cama: ["Preparando el traslado", "Buscando la cama destino"],
  asignar_cama: ["Preparando la asignación de cama", "Buscando la cama destino"],
  revertir_egreso: ["Revisando el egreso"],
};

const HECHO: Record<string, string> = {
  resolver_contexto: "Ficha lista",
  buscar_codigo: "Proceso encontrado",
  leer_codigo: "Handler leído",
  consulta_sql: "Base consultada",
  describir_tabla: "Estructura revisada",
  listar_tablas: "Tablas revisadas",
  buscar_endpoints: "Función encontrada",
  describir_endpoint: "Datos revisados",
  llamar_api: "Sistema consultado",
  escribir_en_campo: "Texto redactado",
  buscar_persona_renaper: "RENAPER consultado",
  navegar: "Pantalla lista",
  buscar_en_manual: "Manual revisado",
  diagnosticar: "Diagnóstico listo",
  buscar_internado: "Internado ubicado",
  ver_estudios: "Estudios revisados",
  ver_evoluciones: "Evoluciones leídas",
  ver_indicaciones: "Indicaciones leídas",
  preparar_egreso: "Egreso preparado",
  preparar_evolucion: "Evolución redactada",
  preparar_hc_ingreso: "HC de ingreso armada",
  preparar_indicacion: "Indicación armada",
  solicitar_estudios: "Pedido de estudios armado",
  solicitar_interconsulta: "Interconsulta armada",
  preparar_protocolo: "Protocolo armado",
  preparar_epicrisis: "Epicrisis redactada",
  editar_evolucion: "Cambio preparado",
  eliminar_evolucion: "Borrado preparado",
  listar_camas_libres: "Camas libres revisadas",
  ver_movimientos: "Movimientos leídos",
  ver_historia_clinica: "Historia clínica leída",
  trasladar_cama: "Traslado preparado",
  asignar_cama: "Asignación preparada",
  revertir_egreso: "Egreso revisado",
};

function frasesDe(
  progreso: ProgresoIa | undefined,
  texto: string,
  etiqueta: (n: string) => string,
) {
  if (!progreso)
    return FRASES_FASE[texto.startsWith("Aplic") ? "aplicar" : "accion"];
  if (progreso.fase === "herramienta" && progreso.herramienta) {
    return (
      FRASES_HERRAMIENTA[progreso.herramienta] || [
        etiqueta(progreso.herramienta),
      ]
    );
  }
  return FRASES_FASE[progreso.fase] || FRASES_FASE.pensando;
}

function Ola({ texto }: { texto: string }) {
  return (
    <span className={styles.ola} aria-hidden>
      {Array.from(texto).map((c, i) => (
        <span key={i} style={{ animationDelay: `${i * 0.045}s` }}>
          {c === " " ? "\u00a0" : c}
        </span>
      ))}
    </span>
  );
}

export default function LoaderIa({
  progreso,
  texto = "",
  etiqueta,
}: {
  progreso?: ProgresoIa;
  texto?: string;
  etiqueta: (nombre: string) => string;
}) {
  const frases = frasesDe(progreso, texto, etiqueta);
  const clave = `${progreso?.fase || texto}:${progreso?.herramienta || ""}:${progreso?.iter || 0}`;
  const [indice, setIndice] = useState(0);
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    setIndice(0);
    const t = window.setInterval(() => setIndice((i) => i + 1), ROTAR_MS);
    return () => window.clearInterval(t);
  }, [clave]);

  useEffect(() => {
    const t = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const frase = frases[Math.min(indice, frases.length - 1)];
  const segundos = progreso
    ? Math.max(0, Math.round((ahora - progreso.inicio) / 1000))
    : 0;
  const hechos = progreso?.hechos.slice(-4) ?? [];

  return (
    <div className={styles.loader} role="status" aria-live="polite">
      <div className={styles.fila}>
        <span className={styles.barras} aria-hidden>
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        <span key={`${clave}:${frase}`} className={styles.frase}>
          <Ola texto={frase} />
          <span className={styles.lectorPantalla}>{frase}</span>
        </span>
      </div>
      {hechos.length || segundos >= 3 || (progreso?.iter ?? 0) > 1 ? (
        <div className={styles.meta}>
          {hechos.map((h, i) => (
            <span
              key={`${h.nombre}-${i}`}
              className={`${styles.chip} ${h.ok ? "" : styles.chipError}`}
            >
              {h.ok ? "✓" : "!"} {HECHO[h.nombre] || etiqueta(h.nombre)}
            </span>
          ))}
          {(progreso?.iter ?? 0) > 1 ? (
            <span className={styles.dato}>paso {progreso?.iter}</span>
          ) : null}
          {segundos >= 3 ? (
            <span className={styles.dato}>{segundos} s</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
