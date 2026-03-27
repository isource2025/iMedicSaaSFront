'use client';

import React, { useState, useEffect } from 'react';
import { OpcGrd } from '../../../types/opcGrd.types';
// Importamos los tipos específicos de los servicios si están disponibles
import { DisposicionEgreso } from '../../../types/disposicionEgreso.types';
import { useOpcGrdManager } from '../../../hooks/useOpcGrdManager';
import { getDadoresOrganos, createDadorOrganos, updateDadorOrganos, deleteDadorOrganos } from '../../../services/dadorOrganosService';
import { getDiagnosticos, createDiagnostico, updateDiagnostico, deleteDiagnostico } from '../../../services/diagnosticoService';
import { getClasesPaciente, createClasePaciente, updateClasePaciente, deleteClasePaciente } from '../../../services/clasePacienteService';
import { getDisposicionesEgreso, createDisposicionEgreso, updateDisposicionEgreso, deleteDisposicionEgreso } from '../../../services/disposicionEgresoService';
import { getEstadosAmbulatorios, createEstadoAmbulatorio, updateEstadoAmbulatorio, deleteEstadoAmbulatorio } from '../../../services/estadoAmbulatorioService';
import { getEstadosCiviles, createEstadoCivil, updateEstadoCivil, deleteEstadoCivil } from '../../../services/estadoCivilService';
import DataTableModal from '../../admission/DataTableModal';
import TableHeader from './TableHeader';
import CreateOptionForm from './CreateOptionForm';
import styles from './styles.module.css';
import Loader from '../../Loader/Loader';
import { getAdmissionTablesOptions, TableOption } from '../../../services/admissionService';
import { getEstadosMilitares, createEstadoMilitar, updateEstadoMilitar, deleteEstadoMilitar } from '../../../services/estadoMilitar.service';
import { getGruposEtnicos, createGrupoEtnico, updateGrupoEtnico, deleteGrupoEtnico } from '../../../services/grupoEtnico.service';
import { getIdiomasISO, createIdiomaISO, updateIdiomaISO, deleteIdiomaISO } from '../../../services/idiomaISO.service';
import { getLocalidades, getLocalidad, createLocalidad, updateLocalidad, deleteLocalidad } from '../../../services/localidad.service';
import { getNacionalidades, getNacionalidad, createNacionalidad, updateNacionalidad, deleteNacionalidad } from '../../../services/nacionalidad.service';
import { getParentescos, getParentesco, createParentesco, updateParentesco, deleteParentesco } from '../../../services/parentesco.service';
import { Localidad } from '../../../types/localidad.types';
import { Nacionalidad } from '../../../types/nacionalidad.types';
import { Parentesco } from '../../../types/parentesco.types';
import { Provincia } from '../../../types/provincia.types';
import { Raza } from '../../../types/raza.types';
import { Religion } from '../../../types/religion.types';
import { Requisito } from '../../../types/requisito.types';
import { RolContacto } from '../../../types/rolContacto.types';
import { Sexo } from '../../../types/sexo.types';
import { TipoAdmision } from '../../../types/tipoAdmision.types';
import { TipoPaciente } from '../../../types/tipoPaciente.types';
import { getProvincias, getProvincia, createProvincia, updateProvincia, deleteProvincia, getProvinciasByNacionalidad } from '../../../services/provincia.service';
import { getRazas, getRaza, createRaza, updateRaza, deleteRaza } from '../../../services/raza.service';
import { getReligiones, getReligion, createReligion, updateReligion, deleteReligion } from '../../../services/religion.service';
import { getRequisitos, getRequisito, createRequisito, updateRequisito, deleteRequisito } from '../../../services/requisito.service';
import { getRolesContacto, getRolContacto, createRolContacto, updateRolContacto, deleteRolContacto } from '../../../services/rolContacto.service';
import { getTiposAdmision, getTipoAdmision, createTipoAdmision, updateTipoAdmision, deleteTipoAdmision } from '../../../services/tipoAdmision.service';
import { getTiposPaciente, getTipoPaciente, createTipoPaciente, updateTipoPaciente, deleteTipoPaciente } from '../../../services/tipoPaciente.service';
import { getSexos, getSexo, createSexo, updateSexo, deleteSexo } from '../../../services/sexo.service';

const AdmissionTables: React.FC = () => {
  // Utilizamos el custom hook para gestionar las opciones de grilla
  const {
    opcionesAgrupadas,
    error,
    createOpcGrd,
    fetchOpciones,
  } = useOpcGrdManager();
  

  
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [createDescripcion, setCreateDescripcion] = useState<string>('');
  
  // Estados para modal de datos
  const [showDataModal, setShowDataModal] = useState<boolean>(false);
  const [currentTableData, setCurrentTableData] = useState<any[]>([]);
  const [currentTableTitle, setCurrentTableTitle] = useState<string>('');
  const [currentTableColumns, setCurrentTableColumns] = useState<{key: string; label: string; editable?: boolean}[]>([]);
  const [isLoadingTableData, setIsLoadingTableData] = useState<boolean>(false);

  // Estados para opciones dinámicas de la API
  const [dynamicOptions, setDynamicOptions] = useState<TableOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string>('');

  // Ya no necesitamos filtrar por nombres estáticos porque solo mostraremos las tarjetas de la API

  // Función para manejar errores de carga de imágenes
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/images/ConfigGral.ico';
  };

  // Funciones para manejar los modales de datos para cada tabla
  const handleShowClasesPacienteData = async () => {
    try {
      setIsLoadingTableData(true);
      setCurrentTableTitle('Clases de Paciente');
      setCurrentTableColumns([
        { key: 'Valor', label: 'Valor', editable: false }, 
        { key: 'Descripcion', label: 'Descripción', editable: true }
      ]);
      
      const data = await getClasesPaciente();
      setCurrentTableData(data);
      setShowDataModal(true);
      setIsLoadingTableData(false);
    } catch (error) {
      console.error('Error al cargar datos de clases de paciente:', error);
      setIsLoadingTableData(false);
      alert('Error al cargar datos de clases de paciente');
    }
  };
  
  const handleShowDadoresOrganosData = async () => {
    try {
      setIsLoadingTableData(true);
      setCurrentTableTitle('Dadores de Órganos');
      setCurrentTableColumns([
        { key: 'Valor', label: 'Valor', editable: false }, 
        { key: 'Descripcion', label: 'Descripción', editable: true }
      ]);
      
      const data = await getDadoresOrganos();
      setCurrentTableData(data);
      setShowDataModal(true);
      setIsLoadingTableData(false);
    } catch (error) {
      console.error('Error al cargar datos de dadores de órganos:', error);
      setIsLoadingTableData(false);
      alert('Error al cargar datos de dadores de órganos');
    }
  };

  const handleShowDiagnosticosData = async () => {
    try {
      setIsLoadingTableData(true);
      setCurrentTableTitle('Diagnósticos');
      setCurrentTableColumns([
        { key: 'Valor', label: 'Valor', editable: false },
        { key: 'Descripcion', label: 'Descripción', editable: true },
        { key: 'Agrupamiento', label: 'Agrupamiento', editable: true }
      ]);
      
      const data = await getDiagnosticos();
      setCurrentTableData(data);
      setShowDataModal(true);
      setIsLoadingTableData(false);
    } catch (error) {
      console.error('Error al cargar datos de diagnósticos:', error);
      setIsLoadingTableData(false);
      alert('Error al cargar datos de diagnósticos');
    }
  };
  
  const handleShowDisposicionesEgresoData = async () => {
    try {
      setIsLoadingTableData(true);
      setCurrentTableTitle('Disposiciones de Egreso');
      setCurrentTableColumns([
        { key: 'Valor', label: 'Valor', editable: false },
        { key: 'Descripcion', label: 'Descripción', editable: true }
      ]);
      
      const data = await getDisposicionesEgreso();
      setCurrentTableData(data);
      setShowDataModal(true);
      setIsLoadingTableData(false);
    } catch (error) {
      console.error('Error al cargar datos de disposiciones de egreso:', error);
      setIsLoadingTableData(false);
      alert('Error al cargar datos de disposiciones de egreso');
    }
  };
  
  const handleShowEstadosAmbulatoriosData = async () => {
    try {
      setIsLoadingTableData(true);
      setCurrentTableTitle('Estados Ambulatorios');
      setCurrentTableColumns([
        { key: 'Valor', label: 'Valor', editable: false },
        { key: 'Descripcion', label: 'Descripción', editable: true }
      ]);
      
      const data = await getEstadosAmbulatorios();
      setCurrentTableData(data);
      setShowDataModal(true);
      setIsLoadingTableData(false);
    } catch (error) {
      console.error('Error al cargar datos de estados ambulatorios:', error);
      setIsLoadingTableData(false);
      alert('Error al cargar datos de estados ambulatorios');
    }
  };
  
  const handleShowEstadosCivilesData = async () => {
    try {
      setIsLoadingTableData(true);
      setCurrentTableTitle('Estados Civiles');
      setCurrentTableColumns([
        { key: 'Valor', label: 'Valor', editable: false },
        { key: 'Descripcion', label: 'Descripción', editable: true }
      ]);
      
      const data = await getEstadosCiviles();
      setCurrentTableData(data);
      setShowDataModal(true);
      setIsLoadingTableData(false);
    } catch (error) {
      console.error('Error al cargar datos de estados civiles:', error);
      setIsLoadingTableData(false);
      alert('Error al cargar datos de estados civiles');
    }
  };

  const handleShowEstadosMilitaresData = async () => {
    try {
      setIsLoadingTableData(true);
      setCurrentTableTitle('Estados Militares');
      setCurrentTableColumns([
        { key: 'Valor', label: 'Valor', editable: false },
        { key: 'Descripcion', label: 'Descripción', editable: true }
      ]);
      
      const data = await getEstadosMilitares();
      setCurrentTableData(data);
      setShowDataModal(true);
      setIsLoadingTableData(false);
    } catch (error) {
      console.error('Error al cargar datos de estados militares:', error);
      setIsLoadingTableData(false);
      alert('Error al cargar datos de estados militares');
    }
  };

  const handleShowGruposEtnicosData = async () => {
    setIsLoadingTableData(true);
    setCurrentTableTitle('Grupos Étnicos');
    
    // Definimos las columnas para la tabla de grupos étnicos
    setCurrentTableColumns([
      { key: 'Valor', label: 'Valor' },
      { key: 'Descripcion', label: 'Descripción', editable: true }
    ]);

    try {
      const data = await getGruposEtnicos();
      setCurrentTableData(data);
    } catch (error) {
      console.error('Error al cargar los grupos étnicos:', error);
      setCurrentTableData([]);
    } finally {
      setIsLoadingTableData(false);
      setShowDataModal(true);
    }
  };

  const handleShowIdiomasISOData = async () => {
    setIsLoadingTableData(true);
    setCurrentTableTitle('Idiomas ISO');
    
    // Definimos las columnas para la tabla de idiomas ISO
    setCurrentTableColumns([
      { key: 'Valor', label: 'Código ISO' },
      { key: 'Descripcion', label: 'Descripción', editable: true }
    ]);

    try {
      const data = await getIdiomasISO();
      setCurrentTableData(data);
    } catch (error) {
      console.error('Error al cargar los idiomas ISO:', error);
      setCurrentTableData([]);
    } finally {
      setIsLoadingTableData(false);
      setShowDataModal(true);
    }
  };

  const handleShowLocalidadesData = async () => {
    setIsLoadingTableData(true);
    setCurrentTableTitle('Localidades');
    
    // Definimos las columnas para la tabla de localidades
    setCurrentTableColumns([
      { key: 'Valor', label: 'ID' },
      { key: 'CodigoPostal', label: 'Código Postal', editable: true },
      { key: 'NombreLocalidad', label: 'Nombre Localidad', editable: true },
      { key: 'ValorProvincia', label: 'Cód. Provincia', editable: true }
    ]);

    try {
      const data = await getLocalidades();
      setCurrentTableData(data);
    } catch (error) {
      console.error('Error al cargar las localidades:', error);
      setCurrentTableData([]);
    } finally {
      setIsLoadingTableData(false);
      setShowDataModal(true);
    }
  };

  const handleShowNacionalidadesData = async () => {
    setIsLoadingTableData(true);
    setCurrentTableTitle('Nacionalidades');
    
    // Definimos las columnas para la tabla de nacionalidades
    setCurrentTableColumns([
      { key: 'Valor', label: 'Código', editable: false },
      { key: 'Descripcion', label: 'Descripción', editable: true }
    ]);

    try {
      const data = await getNacionalidades();
      setCurrentTableData(data);
    } catch (error) {
      console.error('Error al cargar nacionalidades:', error);
      setCurrentTableData([]);
    } finally {
      setIsLoadingTableData(false);
      setShowDataModal(true);
    }
  };

  const handleShowParentescosData = async () => {
    setIsLoadingTableData(true);
    setCurrentTableTitle('Parentescos');
    
    // Definimos las columnas para la tabla de parentescos
    setCurrentTableColumns([
      { key: 'Valor', label: 'Código' },
      { key: 'Descripcion', label: 'Descripción' },
    ]);

    try {
      const data = await getParentescos();
      setCurrentTableData(data);
    } catch (error) {
      console.error('Error al cargar parentescos:', error);
      setCurrentTableData([]);
    } finally {
      setIsLoadingTableData(false);
      setShowDataModal(true);
    }
  };

  const handleShowProvinciasData = async () => {
    setIsLoadingTableData(true);
    setCurrentTableTitle('Provincias');
    
    // Definimos las columnas para la tabla de provincias
    setCurrentTableColumns([
      { key: 'Valor', label: 'ID' },
      { key: 'LetraProvincia', label: 'Código' },
      { key: 'Descripcion', label: 'Nombre' },
      { key: 'ValorNacionalidad', label: 'Nacionalidad' },
    ]);

    try {
      const data = await getProvincias();
      setCurrentTableData(data);
    } catch (error) {
      console.error('Error al cargar provincias:', error);
      setCurrentTableData([]);
    } finally {
      setIsLoadingTableData(false);
      setShowDataModal(true);
    }
  };

  const handleShowRazasData = async () => {
    setIsLoadingTableData(true);
    try {
      setIsLoadingTableData(true);
      setCurrentTableTitle('Razas');
      setCurrentTableColumns([
        { key: 'Valor', label: 'ID' },
        { key: 'Descripcion', label: 'Descripción' },
      ]);

      const data = await getRazas();
      setCurrentTableData(data);
      setShowDataModal(true);
    } catch (error) {
      console.error('Error al cargar razas:', error);
      alert('Error al cargar datos de razas');
    } finally {
      setIsLoadingTableData(false);
    }
  };

  /**
   * Carga y muestra los datos de religiones
   */
  const handleShowReligionesData = async () => {
    try {
      setIsLoadingTableData(true);
      setCurrentTableTitle('Religiones');
      setCurrentTableColumns([
        { key: 'Valor', label: 'Código' },
        { key: 'Descripcion', label: 'Descripción' },
      ]);

      const data = await getReligiones();
      setCurrentTableData(data);
      setShowDataModal(true);
    } catch (error) {
      console.error('Error al cargar religiones:', error);
      alert('Error al cargar datos de religiones');
    } finally {
      setIsLoadingTableData(false);
    }
  };

  /**
   * Carga y muestra los datos de requisitos de clientes
   */
  const handleShowRequisitosData = async () => {
    try {
      setIsLoadingTableData(true);
      setCurrentTableTitle('Requisitos de Clientes');
      setCurrentTableColumns([
        { key: 'Valor', label: 'ID' },
        { key: 'Descripcion', label: 'Descripción' },
        { key: 'AplicableAlPaciente', label: 'Aplicable al Paciente' },
      ]);

      const data = await getRequisitos();
      setCurrentTableData(data);
      setShowDataModal(true);
    } catch (error) {
      console.error('Error al cargar requisitos:', error);
      alert('Error al cargar datos de requisitos');
    } finally {
      setIsLoadingTableData(false);
    }
  };
  
  /**
   * Carga y muestra los datos de roles de contacto
   */
  const handleShowRolesContactoData = async () => {
    try {
      setIsLoadingTableData(true);
      setCurrentTableTitle('Rol de Contacto');
      setCurrentTableColumns([
        { key: 'Valor', label: 'Código' },
        { key: 'Descripcion', label: 'Descripción' },
      ]);

      const data = await getRolesContacto();
      setCurrentTableData(data);
      setShowDataModal(true);
    } catch (error) {
      console.error('Error al cargar roles de contacto:', error);
      alert('Error al cargar datos de roles de contacto');
    } finally {
      setIsLoadingTableData(false);
    }
  };
  
  /**
   * Carga y muestra los datos de sexos
   */
  const handleShowSexosData = async () => {
    try {
      setIsLoadingTableData(true);
      setCurrentTableTitle('Sexo');
      setCurrentTableColumns([
        { key: 'valor', label: 'Código' },
        { key: 'descripcion', label: 'Descripción' },
      ]);

      const data = await getSexos();
      setCurrentTableData(data);
      setShowDataModal(true);
    } catch (error) {
      console.error('Error al cargar sexos:', error);
      alert('Error al cargar datos de sexos');
    } finally {
      setIsLoadingTableData(false);
    }
  };

  /**
   * Carga y muestra los datos de tipos de admisión
   */
  const handleShowTiposAdmisionData = async () => {
    try {
      setIsLoadingTableData(true);
      setCurrentTableTitle('Tipo de Admisión');
      setCurrentTableColumns([
        { key: 'valor', label: 'Código' },
        { key: 'descripcion', label: 'Descripción' },
      ]);

      const data = await getTiposAdmision();
      setCurrentTableData(data);
      setShowDataModal(true);
    } catch (error) {
      console.error('Error al cargar tipos de admisión:', error);
      alert('Error al cargar datos de tipos de admisión');
    } finally {
      setIsLoadingTableData(false);
    }
  };

  /**
   * Carga y muestra los datos de tipos de paciente
   */
  const handleShowTiposPacienteData = async () => {
    try {
      setIsLoadingTableData(true);
      setCurrentTableTitle('Tipo de Paciente');
      setCurrentTableColumns([
        { key: 'valor', label: 'Código' },
        { key: 'descripcion', label: 'Descripción' },
      ]);

      const data = await getTiposPaciente();
      setCurrentTableData(data);
      setShowDataModal(true);
    } catch (error) {
      console.error('Error al cargar tipos de paciente:', error);
      alert('Error al cargar datos de tipos de paciente');
    } finally {
      setIsLoadingTableData(false);
    }
  };

  // Funciones para gestionar las opciones de tablas
  const handleShowDataForOption = (optionType: string) => {
    // Normalización del texto para manejar tanto formatos camelCase como texto descriptivo
    const normalizedType = optionType.toLowerCase().trim();
    
    if (normalizedType.includes('clase') && normalizedType.includes('paciente')) {
      handleShowClasesPacienteData();
    } 
    else if (normalizedType.includes('dador') && normalizedType.includes('organ')) {
      handleShowDadoresOrganosData();
    } 
    else if (normalizedType.includes('diagn')) {
      handleShowDiagnosticosData();
    } 
    else if (normalizedType.includes('dispos') && normalizedType.includes('egreso')) {
      handleShowDisposicionesEgresoData();
    } 
    else if (normalizedType.includes('estado') && normalizedType.includes('ambul')) {
      handleShowEstadosAmbulatoriosData();
    } 
    else if (normalizedType.includes('estado') && normalizedType.includes('civil')) {
      handleShowEstadosCivilesData();
    } 
    else if (normalizedType.includes('estado') && normalizedType.includes('militar')) {
      handleShowEstadosMilitaresData();
    }
    else if (normalizedType.includes('grupo') && normalizedType.includes('etnic')) {
      handleShowGruposEtnicosData();
    }
    else if (normalizedType.includes('idioma') || normalizedType.includes('language')) {
      handleShowIdiomasISOData();
    }
    else if (normalizedType.includes('localidad')) {
      handleShowLocalidadesData();
    }
    else if (normalizedType.includes('nacionalidad')) {
      handleShowNacionalidadesData();
    }
    else if (normalizedType.includes('parentesco')) {
      handleShowParentescosData();
    }
    else if (normalizedType.includes('provincia')) {
      handleShowProvinciasData();
    }
    else if (normalizedType.includes('raza')) {
      handleShowRazasData();
    }
    else if (normalizedType.includes('religion') || normalizedType.includes('religión')) {
      handleShowReligionesData();
    }
    else if (normalizedType.includes('requisito') || normalizedType.includes('requisitos')) {
      handleShowRequisitosData();
    }
    else if (normalizedType.includes('rol') && normalizedType.includes('contacto')) {
      handleShowRolesContactoData();
    }
    else if (normalizedType.includes('sexo')) {
      handleShowSexosData();
    }
    else if (normalizedType.includes('tipo') && normalizedType.includes('admis')) {
      handleShowTiposAdmisionData();
    }
    else if (normalizedType.includes('tipo') && normalizedType.includes('paciente')) {
      handleShowTiposPacienteData();
    }
    else {
      console.warn(`No se encontró un manejador para la opción: ${optionType}`);
    }
  };
  
  // Funciones CRUD para la tabla actual mostrada en el modal
  const handleAddCurrentTableItem = async (values: Record<string, string>) => {
    try {
      // Crear objeto genérico y adaptarlo a lo que espera cada servicio
      switch (currentTableTitle) {
        case 'Clases de Pacientes':
          // Añadir nueva clase de paciente
          await createClasePaciente({
            Valor: values.Valor,
            Descripcion: values.Descripcion || ''
          } as any);
          await handleShowClasesPacienteData();
          break;
          
        case 'Dadores de Órganos':
          // Añadir nuevo dador de órganos
          await createDadorOrganos({
            Valor: values.Valor,
            Descripcion: values.Descripcion || ''
          } as any);
          await handleShowDadoresOrganosData();
          break;
          
        case 'Diagnósticos':
          // Añadir nuevo diagnóstico
          await createDiagnostico({
            Valor: values.Valor,
            Descripcion: values.Descripcion || '',
            Agrupamiento: values.Agrupamiento || ''
          } as any);
          await handleShowDiagnosticosData();
          break;
          
        case 'Disposiciones de Egreso':
          // Añadir nueva disposición de egreso
          await createDisposicionEgreso({
            Valor: values.Valor,
            Descripcion: values.Descripcion || ''
          } as any);
          await handleShowDisposicionesEgresoData();
          break;
          
        case 'Estados Ambulatorios':
          // Añadir nuevo estado ambulatorio
          await createEstadoAmbulatorio({
            Valor: values.Valor,
            Descripcion: values.Descripcion || ''
          } as any);
          await handleShowEstadosAmbulatoriosData();
          break;
          
        case 'Estados Civiles':
          // Añadir nuevo estado civil
          await createEstadoCivil({
            Valor: values.Valor,
            Descripcion: values.Descripcion || ''
          } as any);
          await handleShowEstadosCivilesData();
          break;

        case 'Estados Militares':
          // Añadir nuevo estado militar
          await createEstadoMilitar({
            Valor: values.Valor,
            Descripcion: values.Descripcion || ''
          } as any);
          await handleShowEstadosMilitaresData();
          break;

        case 'Grupos Étnicos':
          // Añadir nuevo grupo étnico
          await createGrupoEtnico({
            Valor: values.Valor,
            Descripcion: values.Descripcion || ''
          } as any);
          await handleShowGruposEtnicosData();
          break;
          
        case 'Idiomas ISO':
          // Añadir nuevo idioma ISO
          await createIdiomaISO({
            Valor: values.Valor,
            Descripcion: values.Descripcion || ''
          } as any);
          await handleShowIdiomasISOData();
          break;
        
        case 'Localidades':
          // Añadir nueva localidad
          await createLocalidad({
            Valor: parseInt(values.Valor),
            CodigoPostal: parseInt(values.CodigoPostal) || 0,
            NombreLocalidad: values.NombreLocalidad || '',
            ValorProvincia: values.ValorProvincia || ''
          } as Localidad);
          await handleShowLocalidadesData();
          break;
        case 'Nacionalidades':
          // Añadir nueva nacionalidad
          await createNacionalidad({
            Valor: values.Valor,
            Descripcion: values.Descripcion || ''
          } as Nacionalidad);
          await handleShowNacionalidadesData();
          break;
        case 'Parentescos':
          const nuevoParentesco = {
            Valor: values.Valor,
            Descripcion: values.Descripcion
          };
          await createParentesco(nuevoParentesco);
          await handleShowParentescosData();
          break;
        case 'Provincias':
          const nuevaProvincia = {
            Valor: parseInt(values.Valor),
            LetraProvincia: values.LetraProvincia,
            Descripcion: values.Descripcion,
            ValorNacionalidad: values.ValorNacionalidad
          };
          await createProvincia(nuevaProvincia);
          await handleShowProvinciasData();
          break;
        case 'Razas':
          const nuevaRaza = {
            Valor: parseInt(values.Valor),
            Descripcion: values.Descripcion
          };
          await createRaza(nuevaRaza);
          await handleShowRazasData();
          break;
        case 'Religiones':
          const nuevaReligion = {
            Valor: values.Valor,
            Descripcion: values.Descripcion
          };
          await createReligion(nuevaReligion);
          await handleShowReligionesData();
          break;
        case 'Requisitos de Clientes':
          const nuevoRequisito = {
            Valor: parseInt(values.Valor),
            Descripcion: values.Descripcion,
            AplicableAlPaciente: values.AplicableAlPaciente || 'No'
          };
          await createRequisito(nuevoRequisito);
          await handleShowRequisitosData();
          break;
        case 'Rol de Contacto':
          const nuevoRolContacto = {
            Valor: values.Valor,
            Descripcion: values.Descripcion
          };
          await createRolContacto(nuevoRolContacto);
          await handleShowRolesContactoData();
          break;
        case 'Sexo':
          const nuevoSexo = {
            valor: values.valor,
            descripcion: values.descripcion
          };
          await createSexo(nuevoSexo);
          await handleShowSexosData();
          break;
        case 'Tipo de Admisión':
          const nuevoTipoAdmision = {
            valor: values.valor,
            descripcion: values.descripcion
          };
          await createTipoAdmision(nuevoTipoAdmision);
          await handleShowTiposAdmisionData();
          break;
        case 'Tipo de Paciente':
          const nuevoTipoPaciente = {
            valor: values.valor,
            descripcion: values.descripcion
          };
          await createTipoPaciente(nuevoTipoPaciente);
          await handleShowTiposPacienteData();
          break;
      }
    } catch (error) {
      console.error(`Error al añadir ítem en ${currentTableTitle}:`, error);
      alert(`Error al añadir ítem: ${(error as Error).message}`);
    }
  };

  const handleUpdateCurrentTableItem = async (key: string, values: Record<string, string>) => {
    try {
      // Adaptamos el formato del key y los valores según lo que espera cada servicio
      switch (currentTableTitle) {
        case 'Clases de Pacientes':
          // Actualizar clase de paciente - espera string
          await updateClasePaciente(key, {
            Valor: values.Valor,
            Descripcion: values.Descripcion || ''
          } as any);
          await handleShowClasesPacienteData();
          break;
          
        case 'Dadores de Órganos':
          // Actualizar dador de órganos - espera string
          await updateDadorOrganos(key, {
            Valor: values.Valor,
            Descripcion: values.Descripcion || ''
          } as any);
          await handleShowDadoresOrganosData();
          break;
          
        case 'Diagnósticos':
          // Actualizar diagnóstico - espera string
          await updateDiagnostico(key, {
            Valor: values.Valor,
            Descripcion: values.Descripcion || '',
            Agrupamiento: values.Agrupamiento || ''
          } as any);
          await handleShowDiagnosticosData();
          break;
          
        case 'Disposiciones de Egreso':
          // Actualizar disposición de egreso - espera number
          const keyNumberDispEgr = parseInt(key);
          await updateDisposicionEgreso(keyNumberDispEgr, {
            Valor: parseInt(values.Valor),
            Descripcion: values.Descripcion || ''
          } as any);
          await handleShowDisposicionesEgresoData();
          break;
          
        case 'Estados Ambulatorios':
          // Actualizar estado ambulatorio - espera string
          await updateEstadoAmbulatorio(key, {
            Valor: values.Valor,
            Descripcion: values.Descripcion || ''
          } as any);
          await handleShowEstadosAmbulatoriosData();
          break;
          
        case 'Estados Civiles':
          // Actualizar estado civil - espera string
          await updateEstadoCivil(key, {
            Valor: values.Valor,
            Descripcion: values.Descripcion || ''
          } as any);
          await handleShowEstadosCivilesData();
          break;
          
        case 'Estados Militares':
          // Actualizar estado militar - espera string
          await updateEstadoMilitar(key, values.Descripcion || '');
          await handleShowEstadosMilitaresData();
          break;
        
        case 'Grupos Étnicos':
          // Actualizar grupo étnico - espera string
          await updateGrupoEtnico(key, values.Descripcion || '');
          await handleShowGruposEtnicosData();
          break;
          
        case 'Idiomas ISO':
          // Actualizar idioma ISO - espera string
          await updateIdiomaISO(key, values.Descripcion || '');
          await handleShowIdiomasISOData();
          break;
        
        case 'Localidades':
          // Actualizar localidad - espera un objeto con las propiedades necesarias
          await updateLocalidad(parseInt(key), {
            CodigoPostal: parseInt(values.CodigoPostal) || 0,
            NombreLocalidad: values.NombreLocalidad || '',
            ValorProvincia: values.ValorProvincia || ''
          });
          await handleShowLocalidadesData();
          break;
        case 'Nacionalidades':
          if (key && values.Descripcion) {
            await updateNacionalidad(key, values.Descripcion);
            // Recargar los datos actualizados
            const updatedData = await getNacionalidades();
            setCurrentTableData(updatedData);
          }
          break;
        case 'Parentescos':
          if (key && values.Descripcion) {
            await updateParentesco(key, values.Descripcion);
            // Recargar los datos actualizados
            const updatedParentescos = await getParentescos();
            setCurrentTableData(updatedParentescos);
          }
          break;
        case 'Provincias':
          const updateData = {
            LetraProvincia: values.LetraProvincia,
            Descripcion: values.Descripcion,
            ValorNacionalidad: values.ValorNacionalidad
          };
          await updateProvincia(parseInt(key), updateData);
          // Recargar los datos actualizados
          const updatedProvincias = await getProvincias();
          setCurrentTableData(updatedProvincias);
          break;
        case 'Razas':
          await updateRaza(parseInt(key), values.Descripcion);
          // Recargar los datos actualizados
          const updatedRazas = await getRazas();
          setCurrentTableData(updatedRazas);
          break;
        case 'Religiones':
          await updateReligion(key, values.Descripcion);
          // Recargar los datos actualizados
          const updatedReligiones = await getReligiones();
          setCurrentTableData(updatedReligiones);
          break;
        case 'Requisitos de Clientes':
          const datosActualizacion = {
            Descripcion: values.Descripcion,
            AplicableAlPaciente: values.AplicableAlPaciente
          };
          await updateRequisito(parseInt(key), datosActualizacion);
          // Recargar los datos actualizados
          const updatedRequisitos = await getRequisitos();
          setCurrentTableData(updatedRequisitos);
          break;
        case 'Rol de Contacto':
          await updateRolContacto(key, values.Descripcion);
          // Recargar los datos actualizados
          const updatedRolesContacto = await getRolesContacto();
          setCurrentTableData(updatedRolesContacto);
          break;
        case 'Sexo':
          await updateSexo(key, values.descripcion);
          // Recargar los datos actualizados
          const updatedSexos = await getSexos();
          setCurrentTableData(updatedSexos);
          break;
        case 'Tipo de Admisión':
          await updateTipoAdmision(key, values.descripcion);
          // Recargar los datos actualizados
          const updatedTiposAdmision = await getTiposAdmision();
          setCurrentTableData(updatedTiposAdmision);
          break;
        case 'Tipo de Paciente':
          await updateTipoPaciente(key, values.descripcion);
          // Recargar los datos actualizados
          const updatedTiposPaciente = await getTiposPaciente();
          setCurrentTableData(updatedTiposPaciente);
          break;
      }
    } catch (error) {
      console.error(`Error al actualizar ítem en ${currentTableTitle}:`, error);
      alert(`Error al actualizar ítem: ${(error as Error).message}`);
    }
  };
  
  // Función para eliminar un ítem de la tabla actual
  const handleDeleteCurrentTableItem = async (key: string) => {
    try {
      switch (currentTableTitle) {
        case 'Clases de Pacientes':
          // Espera string
          await deleteClasePaciente(key);
          await handleShowClasesPacienteData();
          break;
        case 'Dadores de Órganos':
          // Espera string
          await deleteDadorOrganos(key);
          await handleShowDadoresOrganosData();
          break;
        case 'Diagnósticos':
          // Espera string
          await deleteDiagnostico(key);
          await handleShowDiagnosticosData();
          break;
        case 'Disposiciones de Egreso':
          // Espera number
          const keyNumberDispEgr = parseInt(key);
          await deleteDisposicionEgreso(keyNumberDispEgr);
          await handleShowDisposicionesEgresoData();
          break;
        case 'Estados Ambulatorios':
          // Espera string
          await deleteEstadoAmbulatorio(key);
          await handleShowEstadosAmbulatoriosData();
          break;
        case 'Estados Civiles':
          // Espera string
          await deleteEstadoCivil(key);
          await handleShowEstadosCivilesData();
          break;
        case 'Estados Militares':
          // Espera string
          await deleteEstadoMilitar(key);
          await handleShowEstadosMilitaresData();
          break;

        case 'Grupos Étnicos':
          // Espera string
          await deleteGrupoEtnico(key);
          await handleShowGruposEtnicosData();
          break;
          
        case 'Idiomas ISO':
          // Espera string
          await deleteIdiomaISO(key);
          await handleShowIdiomasISOData();
          break;
        
        case 'Localidades':
          // Espera number
          await deleteLocalidad(parseInt(key));
          await handleShowLocalidadesData();
          break;
          
        case 'Nacionalidades':
          // Espera string
          await deleteNacionalidad(key);
          await handleShowNacionalidadesData();
          break;
        case 'Parentescos':
          // Espera string
          await deleteParentesco(key);
          await handleShowParentescosData();
          break;
        case 'Provincias':
          // Espera number
          await deleteProvincia(parseInt(key));
          await handleShowProvinciasData();
          break;
        case 'Razas':
          // Espera number
          await deleteRaza(parseInt(key));
          await handleShowRazasData();
          break;
        case 'Religiones':
          // Espera string
          await deleteReligion(key);
          await handleShowReligionesData();
          break;
        case 'Requisitos de Clientes':
          // Espera number
          await deleteRequisito(parseInt(key));
          await handleShowRequisitosData();
          break;
        case 'Rol de Contacto':
          // Espera string
          await deleteRolContacto(key);
          await handleShowRolesContactoData();
          break;
        case 'Sexo':
          // Espera string
          await deleteSexo(key);
          await handleShowSexosData();
          break;
        case 'Tipo de Admisión':
          // Espera string
          await deleteTipoAdmision(key);
          await handleShowTiposAdmisionData();
          break;
        case 'Tipo de Paciente':
          // Espera string
          await deleteTipoPaciente(key);
          await handleShowTiposPacienteData();
          break;
      }
    } catch (error) {
      console.error(`Error al eliminar ítem en ${currentTableTitle}:`, error);
      alert(`Error al eliminar ítem: ${(error as Error).message}`);
    }
  };

  const handleCloseDataModal = () => {
    setShowDataModal(false);
  };

  const handleCreateOption = async () => {
    try {
      if (createDescripcion.trim()) {
        // Crear una nueva opción de grilla
        const result = await createOpcGrd({
          rubro: 'ADMISION',
          descripcion: createDescripcion.trim()
        });
        
        if (result) {
          setCreateDescripcion('');
          setShowCreateForm(false);
          alert('Opción creada con éxito');
        }
      }
    } catch (error) {
      console.error('Error al crear opción:', error);
      alert('Error al crear la opción');
    }
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setCreateDescripcion('');
  };

  // Funciones de renderizado de cada tarjeta
  // Función para manejar la creación de opciones
  const handleCreateOpcGrd = async (opcGrd: { descripcion: string, rubro: string }) => {
    try {
      const result = await createOpcGrd(opcGrd);
      if (result) {
        // Recargar las opciones después de crear
        await fetchOpciones();
      }
    } catch (error) {
      console.error('Error al crear opcGrd:', error);
      alert('Error al crear la opción');
    }
  };
  
 

  // Función para manejar el clic en una opción desde la API
  const handleApiOptionClick = (option: TableOption) => {
    handleShowDataForOption(option.descripcion);
  };

  // Efecto para cargar las opciones de la API
  useEffect(() => {
    async function fetchApiOptions() {
      setLoadingOptions(true);
      setApiError('');
      
      try {
        // Obtenemos las opciones de la API
        const data = await getAdmissionTablesOptions();
        
        // Filtramos para solo incluir las de rubro ADMISION
        const filteredOptions = data.filter(
          (option: TableOption) => option.rubro.trim() === 'ADMISION'
        );
        
        // Ordenamos por el campo 'orden'
        filteredOptions.sort((a: TableOption, b: TableOption) => a.orden - b.orden);
        
        // Actualizamos el estado
        setDynamicOptions(filteredOptions);
      } catch (error) {
        console.error('Error fetching admission tables options:', error);
        setApiError('Error al cargar opciones de tablas desde la API');
      } finally {
        setLoadingOptions(false);
      }
    }

    fetchApiOptions();
  }, []);

  return (
    <div className={styles.container}>
      <TableHeader 
        showCreateForm={showCreateForm}
        setShowCreateForm={setShowCreateForm}
        createDescripcion={createDescripcion}
        setCreateDescripcion={setCreateDescripcion}
        handleCreateOption={handleCreateOption}
      />
      
      {showCreateForm && (
        <CreateOptionForm 
          createDescripcion={createDescripcion}
          setCreateDescripcion={setCreateDescripcion}
          handleCreateOption={handleCreateOption}
          handleCancelCreate={handleCancelCreate}
        />
      )}

      {loadingOptions ? (
        <div style={{ position: 'relative', minHeight: '200px' }}>
          <Loader />
        </div>
      ) : apiError ? (
        <div className={styles.error}>
          Error al cargar las opciones: {apiError}
        </div>
      ) : (
        <div className={styles.optionsContainer}>
          {/* Mostrar únicamente las tarjetas que vienen de la API */}
          {dynamicOptions.length > 0 ? (
            dynamicOptions.map((option) => (
              <div 
                key={`${option.descripcion}-${option.orden}`} 
                className={styles.card} 
                onClick={() => handleApiOptionClick(option)}
              >
                <img 
                  src={`/images/${option.icono}`} 
                  alt={option.descripcion} 
                  className={styles.cardIcon} 
                  onError={(e) => handleImageError(e as React.SyntheticEvent<HTMLImageElement>)}
                />
                <h3 className={styles.cardTitle}>{option.descripcion}</h3>
              </div>
            ))
          ) : (
            <div className={styles.noResults}>No se encontraron opciones de Admisión</div>
          )}
        </div>
      )}
      
      
      {/* Modal de datos para mostrar contenido de tablas */}
      <DataTableModal
        isOpen={showDataModal}
        onClose={handleCloseDataModal}
        title={currentTableTitle}
        data={currentTableData}
        columns={currentTableColumns}
        onAddItem={handleAddCurrentTableItem}
        onUpdateItem={handleUpdateCurrentTableItem}
        onDeleteItem={handleDeleteCurrentTableItem}
        keyField="Valor" // La clave primaria es 'Valor' para todas las tablas
      />
    </div>
  );
};

export default AdmissionTables;
