import { useState, useEffect } from 'react';
import { Patient, PatientFormData } from '../../types/PatientInterface';
import { Sexo, sexoService } from '../../services/sexoService';
import { Localidad, localidadService } from '../../services/localidadService';
import { provinciaService } from '../../services/provinciaService';
import { clarionDateToDate } from '../../utils/dateUtils';
import styles from '../../components/modals/ModalAddPatient/styles.module.css';

interface PatientFormBaseProps {
  onSubmit: (data: PatientFormData) => Promise<boolean>;
  initialData?: Partial<PatientFormData>;
  isEditing?: boolean;
  onClose: () => void;
}

export const PatientFormBase: React.FC<PatientFormBaseProps> = ({
  onSubmit,
  initialData = {},
  isEditing = false,
  onClose
}) => {
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
    Sexo: initialData.Sexo || 'M',
    EstadoCivil: initialData.EstadoCivil || 'SOLTERO',
    TelefonoParticular: initialData.TelefonoParticular || '',
    TelefonoNegocio: initialData.TelefonoNegocio || '',
    Mail: initialData.Mail || '',
    NumeroCuenta: initialData.NumeroCuenta || '',
    NumeroSSN: initialData.NumeroSSN || ''
  });

  const [sexoOptions, setSexoOptions] = useState<Sexo[]>([]);
  const [localidadOptions, setLocalidadOptions] = useState<Localidad[]>([]);
  const [selectedLocalidad, setSelectedLocalidad] = useState<Localidad | null>(null);
  const tiposDocumento = [
    { value: 'DNI', label: 'DNI' },
    { value: 'LC', label: 'LC' },
    { value: 'LE', label: 'LE' },
    { value: 'PASAPORTE', label: 'Pasaporte' },
    { value: 'OTRO', label: 'Otro' }
  ];

  // Estado civil options
  const estadosCiviles = [
    { value: 'S', label: 'Soltero/a' },
    { value: 'C', label: 'Casado/a' },
    { value: 'D', label: 'Divorciado/a' },
    { value: 'V', label: 'Viudo/a' },
    { value: 'O', label: 'Otro' }
  ];

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState({
    sexo: false,
    localidad: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Funciones para cargar datos
  const fetchSexos = async () => {
    try {
      setLoading(prev => ({ ...prev, sexo: true }));
      const data = await sexoService.getSexos();
      // Asegurar que el valor actual coincida con alguna opción
      const validSexo = data.some(sexo => sexo.valor === formData.Sexo);
      if (!validSexo) {
        setFormData(prev => ({ ...prev, Sexo: data[0]?.valor || 'M' }));
      }
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

  // Si hay un paciente, cargamos sus datos en el formulario
  useEffect(() => {
    if (initialData) {
      setFormData({
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
        Sexo: initialData.Sexo || 'M',
        EstadoCivil: initialData.EstadoCivil || 'SOLTERO',
        TelefonoParticular: initialData.TelefonoParticular || '',
        TelefonoNegocio: initialData.TelefonoNegocio || '',
        Mail: initialData.Mail || '',
        NumeroCuenta: initialData.NumeroCuenta || '',
        NumeroSSN: initialData.NumeroSSN || ''
      });

      // Si hay valor de provincia, cargar la provincia
      if (initialData.Provincia) {
        handleGetProvincia(initialData.Provincia);
      }
      fetchLocalidades();
      fetchSexos();
    }
  }, [initialData]);

  useEffect(() => {
    if (formData.FechaNacimiento && /^\d+$/.test(formData.FechaNacimiento)) {
      const date = clarionDateToDate(formData.FechaNacimiento);
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
  }, [formData.FechaNacimiento]);

  const handleGetProvincia = async (valorProvincia: string) => {
    const provincia = await provinciaService.getProvincia(valorProvincia);
    const provinciaData = Array.isArray(provincia) ? provincia[0] : provincia;
    formData.Nacionalidad = provinciaData?.nacionalidad || '';
    setFormData(prev => ({
      ...prev,
      Provincia: provinciaData?.descripcion || ''
    }));
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'ValorLocalidad') {
      const selected = localidadOptions.find(
        l => String(l.valor).trim() === value.trim()
      );
      setSelectedLocalidad(selected || null);
      if (selected?.valorProvincia) {
        try {
          await handleGetProvincia(selected.valorProvincia);
        } catch (error) {
          console.error('Error al obtener provincia:', error);
        }
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Limpiar errores al editar el campo
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.ApellidoyNombre.trim()) {
      newErrors.ApellidoyNombre = 'El nombre y apellido es obligatorio';
    }
    
    if (!formData.NumeroHC.trim()) {
      newErrors.NumeroHC = 'El número de historia clínica es obligatorio';
    } else if (!/^\d+$/.test(formData.NumeroHC)) {
      newErrors.NumeroHC = 'El número de historia clínica debe contener solo números';
    }
    
    if (formData.FechaNacimiento) {
      const today = new Date();
      const birthDate = new Date(formData.FechaNacimiento);
      if (birthDate > today) {
        newErrors.FechaNacimiento = 'La fecha de nacimiento no puede ser futura';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
      const success = await onSubmit(formData);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Error al guardar el paciente:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchSexos();
    fetchLocalidades();
  }, []);

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.modalContainer}>
            {/* Header con datos de identificación */}
            <div className={styles.formHeader}>
                <div className={styles.headerTitle}></div>
                <div className="grid grid-cols-3 gap-4">
                    <div className={styles.headerRow}>
                        <div className={styles.formGroup}>
                          <label className={styles.label}>Número HC</label>
                          <input
                              type="text"
                              name="NumeroHC"
                              value={formData.NumeroHC}
                              onChange={handleChange}
                              className={`${styles.input} ${errors.NumeroHC ? styles.error : ''}`}
                          />
                          {errors.NumeroHC && (
                              <div className={styles.errorMessage}>{errors.NumeroHC}</div>
                          )}
                        </div>
                        
                        <div className={styles.formGroup}>
                          <label className={`${styles.label} ${styles.requiredField}`}>Tipo Documento</label>
                          <select
                              name="TipoDocumento"
                              value={formData.TipoDocumento}
                              onChange={handleChange}
                              className={`${styles.select} ${errors.TipoDocumento ? styles.error : ''}`}
                              required
                          >
                              {tiposDocumento.map(tipo => (
                              <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                              ))}
                          </select>
                          {errors.TipoDocumento && (
                              <div className={styles.errorMessage}>{errors.TipoDocumento}</div>
                          )}
                        </div>
                        
                        <div className={styles.formGroup}>
                        <label className={`${styles.label} ${styles.requiredField}`}>Nº Documento</label>
                        <input
                            type="text"
                            name="NumeroDocumento"
                            value={formData.NumeroDocumento}
                            onChange={handleChange}
                            className={`${styles.input} ${errors.NumeroDocumento ? styles.error : ''}`}
                            required
                        />
                        {errors.NumeroDocumento && (
                            <div className={styles.errorMessage}>{errors.NumeroDocumento}</div>
                        )}
                        </div>
                    </div>
                </div>
                <div className={styles.formGroup}>
                    <label className={`${styles.label} ${styles.requiredField}`}>Apellido y Nombre</label>
                    <input
                    type="text"
                    name="ApellidoyNombre"
                    value={formData.ApellidoyNombre}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.ApellidoyNombre ? styles.error : ''}`}
                    required
                    />
                    {errors.ApellidoyNombre && (
                    <div className={styles.errorMessage}>{errors.ApellidoyNombre}</div>
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
                        className={`${styles.input} ${errors.Domicilio ? styles.error : ''}`}
                    />
                    {errors.Domicilio && (
                        <div className={styles.errorMessage}>{errors.Domicilio}</div>
                    )}
                    </div>
                </div>

                <div className={`${styles.formRow} ${styles.double}`}>
                    <div className={styles.formGroup}>
                    <label className={styles.label}>Localidad</label>
                    <select
                        name="ValorLocalidad"
                        value={formData.ValorLocalidad}
                    onChange={handleChange}
                    className={`${styles.select} ${errors.ValorLocalidad ? styles.error : ''}`}
                >
                    <option value="">Seleccione...</option>
                    {localidadOptions.map(localidad => (
                    <option key={localidad.valor} value={localidad.valor}>{localidad.descripcion}</option>
                    ))}
                </select>
                {loading.localidad && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#0083A9' }}>Cargando...</span>}
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Provincia</label>
                    <input
                    disabled
                    type="text"
                    name="Provincia"
                    value={formData.Provincia}
                    onChange={handleChange}
                    className={`${styles.input} ${errors.Provincia ? styles.error : ''}`}
                />
                {errors.Provincia && (
                    <div className={styles.errorMessage}>{errors.Provincia}</div>
                )}
                </div>
            </div>

            <div className={styles.formRow}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Nacionalidad</label>
                    <input
                        disabled
                        type="text"
                        name="Nacionalidad"
                        value={formData.Nacionalidad}
                        onChange={handleChange}
                        className={`${styles.input} ${errors.Nacionalidad ? styles.error : ''}`}
                    />
                    {errors.Nacionalidad && (
                        <div className={styles.errorMessage}>{errors.Nacionalidad}</div>
                    )}
                </div>
            </div>

            <div className={styles.formRow}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Fecha de Nacimiento</label>
                    <input
                        type="date"
                        name="FechaNacimiento"
                        value={formData.FechaNacimiento}
                        onChange={handleChange}
                        className={`${styles.input} ${errors.FechaNacimiento ? styles.error : ''}`}
                    />
                    {errors.FechaNacimiento && (
                        <div className={styles.errorMessage}>{errors.FechaNacimiento}</div>
                    )}
                </div>
            </div>

            <div className={styles.formRow}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>CUIT/CUIL</label>
                    <input
                        type="text"
                        name="CUIT"
                        value={formData.CUIT}
                        onChange={handleChange}
                        className={`${styles.input} ${errors.CUIT ? styles.error : ''}`}
                        placeholder="XX-XXXXXXXX-X"
                    />
                    {errors.CUIT && (
                        <div className={styles.errorMessage}>{errors.CUIT}</div>
                    )}
                </div>
            </div>

            <div className={styles.formRow}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Sexo</label>
                    <select
                        name="Sexo"
                        value={formData.Sexo}
                        onChange={handleChange}
                        className={`${styles.select} ${errors.Sexo ? styles.error : ''}`}
                    >
                        <option value="">Seleccione...</option>
                        {sexoOptions.map(sexo => (
                        <option key={sexo.valor} value={sexo.valor}>{sexo.descripcion}</option>
                        ))}
                    </select>
                    {loading.sexo && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#0083A9' }}>Cargando...</span>}
                    {errors.Sexo && (
                        <div className={styles.errorMessage}>{errors.Sexo}</div>
                    )}
                </div>
            </div>

            <div className={styles.formRow}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Estado Civil</label>
                    <select
                        name="EstadoCivil"
                        value={formData.EstadoCivil}
                        onChange={handleChange}
                        className={`${styles.select} ${errors.EstadoCivil ? styles.error : ''}`}
                    >
                        {estadosCiviles.map(estado => (
                        <option key={estado.value} value={estado.value}>{estado.label}</option>
                        ))}
                    </select>
                    {errors.EstadoCivil && (
                        <div className={styles.errorMessage}>{errors.EstadoCivil}</div>
                    )}
                </div>
            </div>

            <div className={styles.formContent}>
              <div className={`${styles.formRow} ${styles.double}`}>
                <div className={styles.formGroup}>
                      <label className={styles.label}>Teléfono Particular</label>
                      <input
                          type="text"
                          name="TelefonoParticular"
                          value={formData.TelefonoParticular}
                          onChange={handleChange}
                          className={`${styles.input} ${errors.TelefonoParticular ? styles.error : ''}`}
                      />
                      {errors.TelefonoParticular && (
                          <div className={styles.errorMessage}>{errors.TelefonoParticular}</div>
                      )}
                  </div>
                  <div className={styles.formGroup}>
                      <label className={styles.label}>Teléfono Negocio</label>
                      <input
                          type="text"
                          name="TelefonoNegocio"
                          value={formData.TelefonoNegocio}
                          onChange={handleChange}
                          className={`${styles.input} ${errors.TelefonoNegocio ? styles.error : ''}`}
                      />
                      {errors.TelefonoNegocio && (
                          <div className={styles.errorMessage}>{errors.TelefonoNegocio}</div>
                      )}
                  </div>
              </div>
            </div>

            <div className={styles.formRow}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Mail</label>
                    <input
                        type="email"
                        name="Mail"
                        value={formData.Mail}
                        onChange={handleChange}
                        className={`${styles.input} ${errors.Mail ? styles.error : ''}`}
                    />
                    {errors.Mail && (
                        <div className={styles.errorMessage}>{errors.Mail}</div>
                    )}
                </div>
            </div>

            <div className={styles.formContent}>
              <div className={`${styles.formRow} ${styles.double}`}>
                  <div className={styles.formGroup}>
                      <label className={styles.label}>Número de Cuenta</label>
                      <input
                      type="text"
                      name="NumeroCuenta"
                      value={formData.NumeroCuenta}
                      onChange={handleChange}
                      className={`${styles.input} ${errors.NumeroCuenta ? styles.error : ''}`}
                      />
                      {errors.NumeroCuenta && (
                      <div className={styles.errorMessage}>{errors.NumeroCuenta}</div>
                      )}
                  </div>
                  <div className={styles.formGroup}>
                      <label className={styles.label}>SSN</label>
                      <input
                      type="text"
                      name="NumeroSSN"
                      value={formData.NumeroSSN}
                      onChange={handleChange}
                      className={`${styles.input} ${errors.NumeroSSN ? styles.error : ''}`}
                      />
                      {errors.NumeroSSN && (
                      <div className={styles.errorMessage}>{errors.NumeroSSN}</div>
                      )}
                  </div>
              </div>
            </div>

            <div className={styles.buttonContainer}>
                <button
                    type="button"
                    onClick={onClose}
                    className={styles.cancelButton}
                    disabled={isSubmitting}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className={`${styles.submitButton} ${isSubmitting ? styles.loading : ''}`}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Guardar'}
                </button>
            </div>
        </div>
        </div>
    </form>
  );
};

export default PatientFormBase;
