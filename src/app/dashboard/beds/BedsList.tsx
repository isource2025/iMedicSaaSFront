'use client';

import { useBedsManagement } from '../../hooks/useBedsManagement';
import styles from './BedsList.module.css';

export const BedsList = () => {
  const {
    beds,
    bedStates,
    loading,
    error,
    filter,
    setFilter,
    searchTerm,
    setSearchTerm,
    refreshBeds
  } = useBedsManagement();

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <input
          type="text"
          placeholder="Buscar por número"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Todos los estados</option>
          {bedStates.map(state => (
            <option key={state.id} value={state.valor}>
              {state.descripcion}
            </option>
          ))}
        </select>
        <button onClick={refreshBeds}>🔄 Refrescar</button>
      </div>

      {loading ? (
        <p>Cargando camas...</p>
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Sector</th>
              <th>Número</th>
              <th>Estado</th>
              <th>Ingreso</th>
              <th>Egreso</th>
              <th>Visita</th>
              <th>Obs.</th>
            </tr>
          </thead>
          <tbody>
            {beds.map(bed => (
              <tr key={bed.id}>
                <td>{bed.sector}</td>
                <td>{bed.numeroCama}</td>
                <td>{bed.estado}</td>
                <td>{bed.fechaIngreso || '-'}</td>
                <td>{bed.fechaEgreso || '-'}</td>
                <td>{bed.numeroVisita || '-'}</td>
                <td>{bed.observaciones || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
