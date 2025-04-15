import React from 'react';
import styles from './PatientList.module.css';

interface PatientSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

const PatientSearchBar: React.FC<PatientSearchBarProps> = ({ value, onChange }) => (
  <div className={styles.searchContainer} style={{ justifyContent: 'flex-start', marginBottom: '1rem' }}>
    <div className={styles.searchBox} style={{
      display: 'flex',
      alignItems: 'center',
      background: 'linear-gradient(90deg, #00B5E2 0%, #61D6EB 100%)',
      borderRadius: '2rem',
      padding: '0.25rem 1rem',
      boxShadow: '0 2px 8px rgba(0, 131, 169, 0.10)',
      minWidth: 320,
      maxWidth: 480,
      width: '100%',
      border: '1.5px solid #0083A9',
      transition: 'box-shadow 0.2s',
    }}>
      <div className={styles.searchIcon} style={{ marginRight: 8 }}>
        <svg width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="8" cy="8" r="7" stroke="#0083A9" strokeWidth="2" fill="#fff" />
          <path d="M15.5 15.5L12.5 12.5" stroke="#0083A9" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <input
        type="search"
        className={styles.searchInput}
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: '#0083A9',
          fontSize: '1rem',
          width: '100%',
          padding: '0.5rem 0',
        }}
        placeholder="Buscar paciente por nombre o historia clínica..."
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label="Buscar paciente por nombre o historia clínica"
      />
    </div>
  </div>
);

export default PatientSearchBar;
