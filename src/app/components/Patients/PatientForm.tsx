import { useState, useEffect } from 'react';
import { Patient, PatientFormData } from '../../types/PatientInterface';
import styles from './PatientForm.module.css';

interface PatientFormProps {
  patient?: Patient;
  onSubmit: (data: PatientFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function PatientForm({ patient, onSubmit, onCancel, isSubmitting }: PatientFormProps) {
  const [formData, setFormData] = useState<PatientFormData>({
    ApellidoyNombre: '',
    Domicilio: '',
    Sexo: 'M',
    NumeroHC: '',
    FechaNacimiento: '',
    EstadoCivil: 'Soltero/a'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Si hay un paciente, cargamos sus datos en el formulario
  useEffect(() => {
    if (patient) {
      setFormData({
        ApellidoyNombre: patient.ApellidoyNombre || '',
        Domicilio: patient.Domicilio || '',
        Sexo: patient.Sexo || 'M',
        NumeroHC: patient.NumeroHC || '',
        FechaNacimiento: patient.FechaNacimiento ? new Date(patient.FechaNacimiento).toISOString().split('T')[0] : '',
        EstadoCivil: patient.EstadoCivil || 'Soltero/a'
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
      <div className={styles.formGroup}>
        <label htmlFor="ApellidoyNombre" className={styles.label}>
          👤 Nombre y Apellido *
        </label>
        <input
          id="ApellidoyNombre"
          name="ApellidoyNombre"
          type="text"
          value={formData.ApellidoyNombre}
          onChange={handleChange}
          className={errors.ApellidoyNombre ? styles.inputError : styles.input}
          disabled={isSubmitting}
          aria-required="true"
        />
        {errors.ApellidoyNombre && <span className={styles.errorText}>{errors.ApellidoyNombre}</span>}
      </div>
      
      <div className={styles.formGroup}>
        <label htmlFor="Domicilio" className={styles.label}>
          🏠 Domicilio
        </label>
        <input
          id="Domicilio"
          name="Domicilio"
          type="text"
          value={formData.Domicilio}
          onChange={handleChange}
          className={styles.input}
          disabled={isSubmitting}
        />
      </div>
      
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="Sexo" className={styles.label}>
            🚻 Sexo *
          </label>
          <select
            id="Sexo"
            name="Sexo"
            value={formData.Sexo}
            onChange={handleChange}
            className={styles.select}
            disabled={isSubmitting}
            aria-required="true"
          >
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="O">Otro</option>
          </select>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="EstadoCivil" className={styles.label}>
            💍 Estado Civil
          </label>
          <select
            id="EstadoCivil"
            name="EstadoCivil"
            value={formData.EstadoCivil}
            onChange={handleChange}
            className={styles.select}
            disabled={isSubmitting}
          >
            <option value="Soltero/a">Soltero/a</option>
            <option value="Casado/a">Casado/a</option>
            <option value="Divorciado/a">Divorciado/a</option>
            <option value="Viudo/a">Viudo/a</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
      </div>
      
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="NumeroHC" className={styles.label}>
            📄 Número HC *
          </label>
          <input
            id="NumeroHC"
            name="NumeroHC"
            type="text"
            value={formData.NumeroHC}
            onChange={handleChange}
            className={errors.NumeroHC ? styles.inputError : styles.input}
            disabled={isSubmitting}
            aria-required="true"
          />
          {errors.NumeroHC && <span className={styles.errorText}>{errors.NumeroHC}</span>}
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="FechaNacimiento" className={styles.label}>
            🎂 Fecha de Nacimiento
          </label>
          <input
            id="FechaNacimiento"
            name="FechaNacimiento"
            type="date"
            value={formData.FechaNacimiento}
            onChange={handleChange}
            className={errors.FechaNacimiento ? styles.inputError : styles.input}
            disabled={isSubmitting}
          />
          {errors.FechaNacimiento && <span className={styles.errorText}>{errors.FechaNacimiento}</span>}
        </div>
      </div>
      
      <div className={styles.formActions}>
        <button
          type="button"
          onClick={onCancel}
          className={styles.cancelButton}
          disabled={isSubmitting}
        >
          Cancelar
        </button>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Guardando...' : patient ? 'Actualizar' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
