import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useDebounce } from './useDebounce';
import { useAppContext } from '../contexts/AppContext';
import { getIdEmpresaFromToken } from '../utils/jwtSession';
import {
  obtenerProduccionHospital,
  obtenerOpcionesProduccion,
  limpiarCacheProduccion,
} from '../services/produccionHospitalService';
import type {
  AnaliticaProduccion,
  FiltrosProduccion,
  OpcionesProduccion,
} from '../types/produccionHospital';

/**
 * Producción del hospital para los filtros pedidos.
 *
 * Distingue dos estados de carga a propósito:
 *  • `cargandoInicial`: todavía no hay datos → la página muestra el loader de pantalla completa.
 *  • `actualizando`: ya hay datos y se está pidiendo otra vista (cambió un filtro, por ejemplo
 *    se destildó "sólo valorizadas"). Los datos anteriores se conservan en pantalla y la
 *    página sólo superpone un loader sobre la vista, sin volver al loader inicial.
 *
 * Un request viejo se aborta cuando llega uno nuevo, y su respuesta se descarta.
 */
export function useProduccionHospital(
  filtros: FiltrosProduccion,
  { habilitado = true }: { habilitado?: boolean } = {},
) {
  const { empresaInfo } = useAppContext();
  const tenantId = empresaInfo?.id ?? getIdEmpresaFromToken() ?? 0;

  const [data, setData] = useState<AnaliticaProduccion | null>(null);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Los filtros cambian de a varios a la vez (un rango nuevo, una multiselección):
  // se agrupan en una sola clave estable y se espera un momento antes de consultar.
  const claveFiltros = useMemo(() => JSON.stringify(filtros), [filtros]);
  const claveDebounced = useDebounce(claveFiltros, 450);

  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const tieneDatos = useRef(false);

  const fetchData = useCallback(async () => {
    const filtrosPedidos = JSON.parse(claveDebounced) as FiltrosProduccion;
    if (!habilitado) {
      // Sin permiso no se consulta: la página muestra su aviso y no un loader eterno.
      setCargandoInicial(false);
      return;
    }
    if (!filtrosPedidos.fechaInicio || !filtrosPedidos.fechaFin) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const id = ++requestId.current;
    if (tieneDatos.current) setActualizando(true);
    else setCargandoInicial(true);
    setError(null);

    try {
      const resultado = await obtenerProduccionHospital(filtrosPedidos, { signal: controller.signal });
      if (id !== requestId.current) return;
      tieneDatos.current = true;
      setData(resultado);
    } catch (err) {
      if (id !== requestId.current) return;
      if (axios.isCancel(err)) return;
      const mensaje =
        err instanceof Error ? err.message : 'Error desconocido al cargar la producción del hospital';
      setError(mensaje);
    } finally {
      if (id === requestId.current) {
        setCargandoInicial(false);
        setActualizando(false);
      }
    }
    // tenantId: otra empresa invalida lo pedido aunque los filtros no cambien.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveDebounced, tenantId, habilitado]);

  // Otra empresa: lo que había en pantalla es de otra base, se vuelve al loader inicial.
  useEffect(() => {
    tieneDatos.current = false;
    setData(null);
    setError(null);
    setCargandoInicial(true);
  }, [tenantId]);

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  const refetch = useCallback(() => fetchData(), [fetchData]);

  const limpiarCache = useCallback(() => {
    limpiarCacheProduccion();
    return fetchData();
  }, [fetchData]);

  return {
    data,
    cargandoInicial,
    actualizando,
    /** Hay filtros recién cambiados que todavía no se consultaron (debounce). */
    pendiente: claveFiltros !== claveDebounced,
    error,
    refetch,
    limpiarCache,
  };
}

/** Catálogos de los selectores de filtro. Se piden una vez por rango. */
export function useOpcionesProduccion(
  fechaInicio: string,
  fechaFin: string,
  { habilitado = true }: { habilitado?: boolean } = {},
) {
  const { empresaInfo } = useAppContext();
  const tenantId = empresaInfo?.id ?? getIdEmpresaFromToken() ?? 0;

  const [opciones, setOpciones] = useState<OpcionesProduccion | null>(null);
  const [cargando, setCargando] = useState(false);

  const inicio = useDebounce(fechaInicio, 600);
  const fin = useDebounce(fechaFin, 600);

  useEffect(() => {
    setOpciones(null);
  }, [tenantId]);

  useEffect(() => {
    if (!habilitado || !inicio || !fin) return;
    let vigente = true;
    setCargando(true);
    obtenerOpcionesProduccion(inicio, fin)
      .then((r) => {
        if (vigente) setOpciones(r);
      })
      .catch((err) => {
        // Sin opciones la página igual funciona: los selectores quedan vacíos.
        console.error('No se pudieron cargar las opciones de filtro de producción:', err);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [inicio, fin, tenantId, habilitado]);

  return { opciones, cargando };
}

export default useProduccionHospital;
