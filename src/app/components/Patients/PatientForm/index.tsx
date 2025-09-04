'use client';

import { useState, useEffect } from 'react';
import { Patient } from '../../../types/PatientInterface';
import styles from './styles.module.css';

// Tipo local para el formulario (modelo UI)
interface PatientUI {
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string;
  sexo: string;
  telefono: string;
  direccion: string;
  email: string;
  obraSocial: string;
  numeroAfiliado: string;
}

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
  const [formData, setFormData] = useState<PatientUI>({
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
      const nombreCompleto = patient.ApellidoyNombre || '';
      const [apellido, nombre] = nombreCompleto.includes(',')
        ? nombreCompleto.split(',').map(s => s.trim())
        : ['', nombreCompleto.trim()];

      setFormData({
        nombre,
        apellido,
        dni: patient.NumeroDocumento || '',
        fechaNacimiento: patient.FechaNacimiento ? new Date(patient.FechaNacimiento).toISOString().split('T')[0] : '',
        sexo: patient.Sexo || '',
        telefono: patient.TelefonoCelular || patient.TelefonoParticular || '',
        direccion: patient.Domicilio || '',
        email: patient.Mail || '',
        obraSocial: patient.Cobertura || '',
        numeroAfiliado: patient.nAfiliado || ''
      });
    }
  }, [patient]);

  // Actualizar campo del formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: PatientUI) => ({
      ...prev,
      [name]: value
    }));
  };

  // Enviar formulario
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mapear datos del formulario (UI) al modelo Patient esperado por el resto de la app
    const payload: Partial<Patient> = {
      ApellidoyNombre: formData.apellido
        ? `${formData.apellido}, ${formData.nombre}`.trim()
        : formData.nombre,
      NumeroDocumento: formData.dni,
      FechaNacimiento: formData.fechaNacimiento,
      Sexo: formData.sexo,
      TelefonoCelular: formData.telefono,
      Domicilio: formData.direccion,
      Mail: formData.email,
      Cobertura: formData.obraSocial,
      nAfiliado: formData.numeroAfiliado
    };

    onSubmit(payload);
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
