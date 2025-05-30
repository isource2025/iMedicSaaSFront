import { useState, useEffect } from 'react';
import { Patient, PatientFormData } from '../../types/PatientInterface';
import styles from '../../components/modals/ModalAddPatient/styles.module.css';

interface PatientFormProps {
  patient?: Patient;
  onSubmit: (data: PatientFormData) => void;
  onCancel: () => void;
  isEditing?: boolean;
  isSubmitting: boolean;
}

export default function PatientForm({ patient, onSubmit, onCancel, isSubmitting, isEditing }: PatientFormProps) {
  const [formData, setFormData] = useState<PatientFormData>({
      ApellidoyNombre: '',
      TipoDocumento: 'DNI', 
      NumeroDocumento: '',
      Domicilio: '',
      ValorLocalidad: '',
      Provincia: '',
      Nacionalidad: '',
      Sexo: 'M',
      NumeroHC: '',
      FechaNacimiento: '',
      NumeroCuenta: '',
      CUIT: '',
      EstadoCivil: 'Soltero/a',
      TelefonoParticular: '',
      TelefonoNegocio: '',
      Mail: '',
      NumeroSSN: '',
  });

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

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Si hay un paciente, cargamos sus datos en el formulario
  useEffect(() => {
    if (patient) {
      setFormData({
        IDPaciente: patient.IDPaciente || undefined,
        NumeroHC: patient.NumeroHC || '',
        TipoDocumento: patient.TipoDocumento || 'DNI',
        NumeroDocumento: patient.NumeroDocumento || '',
        ApellidoyNombre: patient.ApellidoyNombre || '',
        Domicilio: patient.Domicilio || '',
        ValorLocalidad: patient.ValorLocalidad || '',
        Provincia: patient.Provincia || '',
        Nacionalidad: patient.Nacionalidad || 'Argentina',
        FechaNacimiento: patient.FechaNacimiento || '',
        CUIT: patient.CUIT || '',
        Sexo: patient.Sexo || '',
        EstadoCivil: patient.EstadoCivil || 'SOLTERO',
        TelefonoParticular: patient.TelefonoParticular || '',
        TelefonoNegocio: patient.TelefonoNegocio || '',
        Mail: patient.Mail || '',
        NumeroCuenta: patient.NumeroCuenta || '',
        NumeroSSN: patient.NumeroSSN || ''
      });
    }
  }, [patient]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
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
            {/* {formErrors.NumeroHC && (
              <div className={styles.errorMessage}>{formErrors.NumeroHC}</div>
            )}
            {formErrors.TipoDocumento && (
              <div className={styles.errorMessage}>{formErrors.TipoDocumento}</div>
            )}
            {formErrors.Numerodocumento && (
              <div className={styles.errorMessage}>{formErrors.Numerodocumento}</div>
            )} */}
            
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
            {/* {formErrors.ApellidoyNombre && (
              <div className={styles.errorMessage}>{formErrors.ApellidoyNombre}</div>
            )} */}
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
            {/* {formErrors.Domicilio && (
              <div className={styles.errorMessage}>{formErrors.Domicilio}</div>
            )} */}
            
            <div className={`${styles.formRow} ${styles.double}`}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Localidad</label>
                <select
                  name="ValorLocalidad"
                  value={formData.ValorLocalidad}
                  onChange={handleChange}
                  className={styles.select}
                >
                  <option value="">Seleccione...</option>
                  {/* {localidadOptions.map(localidad => (
                    <option key={localidad.valor} value={localidad.valor}>{localidad.descripcion}</option>
                  ))} */}
                </select>
                {/* {loading.localidad && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#0083A9' }}>Cargando...</span>} */}
              </div>
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
            {/* {formErrors.Nacionalidad && (
              <div className={styles.errorMessage}>{formErrors.Nacionalidad}</div>
            )} */}
            
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
            {/* {formErrors.FechaNacimiento && (
              <div className={styles.errorMessage}>{formErrors.FechaNacimiento}</div>
            )} */}
            
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
            {/* {formErrors.CUIT && (
              <div className={styles.errorMessage}>{formErrors.CUIT}</div>
            )} */}
            
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
                  {/* {sexoOptions.map(sexo => (
                    <option key={sexo.valor} value={sexo.valor}>{sexo.descripcion}</option>
                  ))} */}
                </select>
                {/* {loading.sexo && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#0083A9' }}>Cargando...</span>} */}
              </div>
            </div>
            {/* {formErrors.Sexo && (
              <div className={styles.errorMessage}>{formErrors.Sexo}</div>
            )} */}
            
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Estado Civil</label>
                <select
                  name="EstadoCivil"
                  value={formData.EstadoCivil}
                  onChange={handleChange}
                  className={styles.select}
                >
                  {/* {estadosCiviles.map(estado => (
                    <option key={estado.value} value={estado.value}>{estado.label}</option>
                  ))} */}
                </select>
              </div>
            </div>
            {/* {formErrors.EstadoCivil && (
              <div className={styles.errorMessage}>{formErrors.EstadoCivil}</div>
            )} */}
            
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
            {/* {formErrors.TelefonoParticular && (
              <div className={styles.errorMessage}>{formErrors.TelefonoParticular}</div>
            )}
            {formErrors.TelefonoNegocio && (
              <div className={styles.errorMessage}>{formErrors.TelefonoNegocio}</div>
            )} */}
            
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
            {/* {formErrors.Mail && (
              <div className={styles.errorMessage}>{formErrors.Mail}</div>
            )} */}
            
            <div className={`${styles.formRow} ${styles.double}`}>
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
            {/* {formErrors.NumeroCuenta && (
              <div className={styles.errorMessage}>{formErrors.NumeroCuenta}</div>
            )}
            {formErrors.NumeroSSN && (
              <div className={styles.errorMessage}>{formErrors.NumeroSSN}</div>
            )} */}
          </div>
          
          <div className={styles.buttonContainer}>
            <button 
              type="button" 
              className={styles.cancelButton}
              onClick={onCancel}
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
    </form>
  );
}
