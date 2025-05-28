'use client';

import { useState, useEffect } from 'react';
import { PatientFormData } from '../../../types/PatientFormInterface';
import styles from './styles.module.css';
import Modal from '../../UI/Modal';
import { clarionDateToDate } from '../../../utils/dateUtils';
import { sexoService, Sexo } from '../../../services/sexoService';
import { localidadService, Localidad } from '../../../services/localidadService';

interface ModalAddPatientProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PatientFormData) => Promise<boolean>;
  initialData?: Partial<PatientFormData>;
  isEditing?: boolean;
}

const tiposDocumento = [
  { value: 'DNI', label: 'DNI' },
  { value: 'LC', label: 'LC' },
  { value: 'LE', label: 'LE' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
  { value: 'OTRO', label: 'Otro' }
];

// Estado civil options
const estadosCiviles = [
  { value: 'SOLTERO', label: 'Soltero/a' },
  { value: 'CASADO', label: 'Casado/a' },
  { value: 'DIVORCIADO', label: 'Divorciado/a' },
  { value: 'VIUDO', label: 'Viudo/a' },
  { value: 'OTRO', label: 'Otro' }
];



const ModalAddPatient: React.FC<ModalAddPatientProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = {},
  isEditing = false
}) => {
  const [activeTab, setActiveTab] = useState<'datos'>('datos');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const [sexoOptions, setSexoOptions] = useState<Sexo[]>([]);
  const [localidadOptions, setLocalidadOptions] = useState<Localidad[]>([]);
  const [loading, setLoading] = useState({
    sexo: false,
    localidad: false
  });

  const [formData, setFormData] = useState<PatientFormData>({
    IDPaciente: initialData.IDPaciente || undefined,
    NumeroHC: initialData.NumeroHC || '',
    TipoDocumento: initialData.TipoDocumento || 'DNI',
    NumeroDocumento: initialData.NumeroDocumento || '',
    ApellidoyNombre: initialData.ApellidoyNombre || '',
    Domicilio: initialData.Domicilio || '',
    ValorLocalidad: initialData.ValorLocalidad || '',
    Provincia: initialData.Provincia || '',
    Nacionalidad: initialData.Nacionalidad || 'Argentina',
    FechaNacimiento: initialData.FechaNacimiento || '',
    CUIT: initialData.CUIT || '',
    Sexo: initialData.Sexo || '',
    EstadoCivil: initialData.EstadoCivil || 'SOLTERO',
    TelefonoParticular: initialData.TelefonoParticular || '',
    TelefonoNegocio: initialData.TelefonoNegocio || '',
    Mail: initialData.Mail || '',
    NumeroCuenta: initialData.NumeroCuenta || '',
    NumeroSSN: initialData.NumeroSSN || ''
  });

  // Cargar opciones de sexo y localidades desde la API
  useEffect(() => {
    const fetchSexos = async () => {
      try {
        setLoading(prev => ({ ...prev, sexo: true }));
        const data = await sexoService.getSexos();
        setSexoOptions(data);
      } catch (error) {
        console.error('Error al cargar opciones de sexo:', error);
      } finally {
        setLoading(prev => ({ ...prev, sexo: false }));
      }
    };

    const fetchLocalidades = async () => {
      try {
        setLoading(prev => ({ ...prev, localidad: true }));
        const data = await localidadService.getLocalidades();
        setLocalidadOptions(data);
      } catch (error) {
        console.error('Error al cargar opciones de localidad:', error);
      } finally {
        setLoading(prev => ({ ...prev, localidad: false }));
      }
    };

    fetchSexos();
    fetchLocalidades();
  }, []);

  // Convertir fecha de nacimiento si viene en formato Clarion
  useEffect(() => {
    if (initialData.FechaNacimiento && /^\d+$/.test(initialData.FechaNacimiento)) {
      const date = clarionDateToDate(initialData.FechaNacimiento);
      if (date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        setFormData(prev => ({
          ...prev,
          FechaNacimiento: `${year}-${month}-${day}`
        }));
      }
    }
  }, [initialData.FechaNacimiento]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error al cambiar el valor
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // Validar campos obligatorios del header
    if (!formData.TipoDocumento) errors.TipoDocumento = 'El tipo de documento es obligatorio';
    if (!formData.NumeroDocumento) errors.NumeroDocumento = 'El número de documento es obligatorio';
    if (!formData.ApellidoyNombre) errors.ApellidoyNombre = 'El nombre y apellido es obligatorio';
    
    // Validación de campos de datos personales
    // El campo Sexo ya no es obligatorio
    
    // Validar formato de fecha de nacimiento
    if (formData.FechaNacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(formData.FechaNacimiento)) {
      errors.FechaNacimiento = 'Formato de fecha inválido (YYYY-MM-DD)';
    }
    
    // Validar formato de email
    if (formData.Mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Mail)) {
      errors.Mail = 'Formato de email inválido';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Ya no es necesario cambiar pestañas, pero mantenemos la validación
      // para mostrar los errores
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const resp = await onSubmit(formData);
      if (resp) {
        onClose();
      }
    } catch (error) {
      console.error('Error al guardar paciente:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isEditing ? 'Editar Paciente' : 'Agregar Paciente'}
      size="large"
    >
      <div className={styles.modalContainer}>
        <form onSubmit={handleSubmit}>
          {/* Header con datos de identificación */}
          <div className={styles.formHeader}>
            <div className={styles.headerTitle}></div>
            <div className="grid grid-cols-3 gap-4">
            <div className={styles.headerRow}>
               <div className={styles.formGroup}>
                <img className={styles.foto} src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="" />
              </div>
            </div>
            
            <div className={styles.headerRow}>
              {isEditing && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>ID Paciente</label>
                  <input
                    type="text"
                    value={formData.IDPaciente || ''}
                    className={styles.input}
                    disabled
                  />
                </div>
              )}
            
              <div className={styles.formGroup}>
                <label className={styles.label}>Número HC</label>
                <input
                  type="text"
                  name="NumeroHC"
                  value={formData.NumeroHC}
                  onChange={handleChange}
                  className={`${styles.input}`}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={`${styles.label} ${styles.requiredField}`}>Tipo Documento</label>
                <select
                  name="TipoDocumento"
                  value={formData.TipoDocumento}
                  onChange={handleChange}
                  className={`${styles.select}`}
                  required
                >
                  {tiposDocumento.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                  ))}
                </select>
              </div>
              
              <div className={styles.formGroup}>
                <label className={`${styles.label} ${styles.requiredField}`}>Nº Documento</label>
                <input
                  type="text"
                  name="NumeroDocumento"
                  value={formData.NumeroDocumento}
                  onChange={handleChange}
                  className={styles.input}
                  required
                />
              </div>
            </div>
            {formErrors.NumeroHC && (
              <div className={styles.errorMessage}>{formErrors.NumeroHC}</div>
            )}
            {formErrors.TipoDocumento && (
              <div className={styles.errorMessage}>{formErrors.TipoDocumento}</div>
            )}
            {formErrors.Numerodocumento && (
              <div className={styles.errorMessage}>{formErrors.Numerodocumento}</div>
            )}
            
            <div className={styles.formGroup}>
              <label className={`${styles.label} ${styles.requiredField}`}>Apellido y Nombre</label>
              <input
                type="text"
                name="ApellidoyNombre"
                value={formData.ApellidoyNombre}
                onChange={handleChange}
                className={styles.input}
                required
              />
            </div>
            {formErrors.ApellidoyNombre && (
              <div className={styles.errorMessage}>{formErrors.ApellidoyNombre}</div>
            )}
            </div>
          </div>
          
          {/* Título de la sección */}
          <div className={styles.tabs}>
            <div className={`${styles.tab} ${styles.tabActive}`}>
              Datos Personales y Contacto
            </div>
          </div>
          
          {/* Contenido del formulario */}
          <div className={styles.formContent}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Domicilio</label>
                <input
                  type="text"
                  name="Domicilio"
                  value={formData.Domicilio}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
            </div>
            {formErrors.Domicilio && (
              <div className={styles.errorMessage}>{formErrors.Domicilio}</div>
            )}
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Localidad</label>
                <select
                  name="ValorLocalidad"
                  value={formData.ValorLocalidad}
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="">Seleccione...</option>
                  {localidadOptions.map(localidad => (
                    <option key={localidad.valor} value={localidad.valor}>{localidad.descripcion}</option>
                  ))}
                </select>
                {loading.localidad && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#0083A9' }}>Cargando...</span>}
              </div>
            </div>
            {formErrors.ValorLocalidad && (
              <div className={styles.errorMessage}>{formErrors.ValorLocalidad}</div>
            )}
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Provincia</label>
                <input
                  type="text"
                  name="Provincia"
                  value={formData.Provincia}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
            </div>
            {formErrors.Provincia && (
              <div className={styles.errorMessage}>{formErrors.Provincia}</div>
            )}
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nacionalidad</label>
                <input
                  type="text"
                  name="Nacionalidad"
                  value={formData.Nacionalidad}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
            </div>
            {formErrors.Nacionalidad && (
              <div className={styles.errorMessage}>{formErrors.Nacionalidad}</div>
            )}
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Fecha de Nacimiento</label>
                <input
                  type="date"
                  name="FechaNacimiento"
                  value={formData.FechaNacimiento}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
            </div>
            {formErrors.FechaNacimiento && (
              <div className={styles.errorMessage}>{formErrors.FechaNacimiento}</div>
            )}
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>CUIT/CUIL</label>
                <input
                  type="text"
                  name="CUIT"
                  value={formData.CUIT}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="XX-XXXXXXXX-X"
                />
              </div>
            </div>
            {formErrors.CUIT && (
              <div className={styles.errorMessage}>{formErrors.CUIT}</div>
            )}
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Sexo</label>
                <select
                  name="Sexo"
                  value={formData.Sexo}
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="">Seleccione...</option>
                  {sexoOptions.map(sexo => (
                    <option key={sexo.valor} value={sexo.valor}>{sexo.descripcion}</option>
                  ))}
                </select>
                {loading.sexo && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#0083A9' }}>Cargando...</span>}
              </div>
            </div>
            {formErrors.Sexo && (
              <div className={styles.errorMessage}>{formErrors.Sexo}</div>
            )}
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Estado Civil</label>
                <select
                  name="EstadoCivil"
                  value={formData.EstadoCivil}
                  onChange={handleChange}
                  className={styles.select}
                >
                  {estadosCiviles.map(estado => (
                    <option key={estado.value} value={estado.value}>{estado.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {formErrors.EstadoCivil && (
              <div className={styles.errorMessage}>{formErrors.EstadoCivil}</div>
            )}
            
            {/* Campos que estaban en la solapa de Contacto y Cobertura */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Teléfono Particular</label>
                <input
                  type="tel"
                  name="TelefonoParticular"
                  value={formData.TelefonoParticular}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Teléfono Negocio</label>
                <input
                  type="tel"
                  name="TelefonoNegocio"
                  value={formData.TelefonoNegocio}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
            </div>
            {formErrors.TelefonoParticular && (
              <div className={styles.errorMessage}>{formErrors.TelefonoParticular}</div>
            )}
            {formErrors.TelefonoNegocio && (
              <div className={styles.errorMessage}>{formErrors.TelefonoNegocio}</div>
            )}
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Email</label>
                <input
                  type="email"
                  name="Mail"
                  value={formData.Mail}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
            </div>
            {formErrors.Mail && (
              <div className={styles.errorMessage}>{formErrors.Mail}</div>
            )}
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Cobertura</label>
                <input
                  type="text"
                  name="NumeroCuenta"
                  value={formData.NumeroCuenta}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Número SSN</label>
                <input
                  type="text"
                  name="NumeroSSN"
                  value={formData.NumeroSSN}
                  onChange={handleChange}
                  className={styles.input}
                />
              </div>
            </div>
            {formErrors.NumeroCuenta && (
              <div className={styles.errorMessage}>{formErrors.NumeroCuenta}</div>
            )}
            {formErrors.NumeroSSN && (
              <div className={styles.errorMessage}>{formErrors.NumeroSSN}</div>
            )}
          </div>
          
          <div className={styles.buttonContainer}>
            <button 
              type="button" 
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ModalAddPatient;
