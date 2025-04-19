'use client';

import { useState, useEffect } from 'react';
import { Patient } from '@/app/types/patients';
import styles from './styles.module.css';

interface PatientFormProps {
  patient?: Patient;
  onSubmit: (data: Partial<Patient>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

/**
 * Formulario para crear y editar pacientes
 */
export const PatientForm: React.FC<PatientFormProps> = ({
  patient,
  onSubmit,
  onCancel,
  isSubmitting
}) => {
  const [formData, setFormData] = useState<Partial<Patient>>({
    nombre: '',
    apellido: '',
    dni: '',
    fechaNacimiento: '',
    sexo: '',
    telefono: '',
    direccion: '',
    email: '',
    obraSocial: '',
    numeroAfiliado: ''
  });

  // Cargar datos del paciente si está en modo edición
  useEffect(() => {
    if (patient) {
      setFormData({
        nombre: patient.nombre || '',
        apellido: patient.apellido || '',
        dni: patient.dni || '',
        fechaNacimiento: patient.fechaNacimiento ? new Date(patient.fechaNacimiento).toISOString().split('T')[0] : '',
        sexo: patient.sexo || '',
        telefono: patient.telefono || '',
        direccion: patient.direccion || '',
        email: patient.email || '',
        obraSocial: patient.obraSocial || '',
        numeroAfiliado: patient.numeroAfiliado || ''
      });
    }
  }, [patient]);

  // Actualizar campo del formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Enviar formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="nombre" className={styles.label}>Nombre *</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            className={styles.input}
            value={formData.nombre}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="apellido" className={styles.label}>Apellido *</label>
          <input
            id="apellido"
            name="apellido"
            type="text"
            className={styles.input}
            value={formData.apellido}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>
      </div>
      
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="dni" className={styles.label}>DNI/Documento *</label>
          <input
            id="dni"
            name="dni"
            type="text"
            className={styles.input}
            value={formData.dni}
            onChange={handleChange}
            required
            disabled={isSubmitting}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="fechaNacimiento" className={styles.label}>Fecha de Nacimiento</label>
          <input
            id="fechaNacimiento"
            name="fechaNacimiento"
            type="date"
            className={styles.input}
            value={formData.fechaNacimiento}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>
      </div>
      
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="sexo" className={styles.label}>Sexo</label>
          <select
            id="sexo"
            name="sexo"
            className={styles.select}
            value={formData.sexo}
            onChange={handleChange}
            disabled={isSubmitting}
          >
            <option value="">Seleccionar</option>
            <option value="M">Masculino</option>
            <option value="F">Femenino</option>
            <option value="O">Otro</option>
          </select>
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="telefono" className={styles.label}>Teléfono</label>
          <input
            id="telefono"
            name="telefono"
            type="tel"
            className={styles.input}
            value={formData.telefono}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>
      </div>
      
      <div className={styles.formGroup}>
        <label htmlFor="direccion" className={styles.label}>Dirección</label>
        <input
          id="direccion"
          name="direccion"
          type="text"
          className={styles.input}
          value={formData.direccion}
          onChange={handleChange}
          disabled={isSubmitting}
        />
      </div>
      
      <div className={styles.formGroup}>
        <label htmlFor="email" className={styles.label}>Email</label>
        <input
          id="email"
          name="email"
          type="email"
          className={styles.input}
          value={formData.email}
          onChange={handleChange}
          disabled={isSubmitting}
        />
      </div>
      
      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label htmlFor="obraSocial" className={styles.label}>Obra Social</label>
          <input
            id="obraSocial"
            name="obraSocial"
            type="text"
            className={styles.input}
            value={formData.obraSocial}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="numeroAfiliado" className={styles.label}>Número de Afiliado</label>
          <input
            id="numeroAfiliado"
            name="numeroAfiliado"
            type="text"
            className={styles.input}
            value={formData.numeroAfiliado}
            onChange={handleChange}
            disabled={isSubmitting}
          />
        </div>
      </div>
      
      <div className={styles.formActions}>
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
          {isSubmitting ? 'Guardando...' : patient ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
};

export default PatientForm;
