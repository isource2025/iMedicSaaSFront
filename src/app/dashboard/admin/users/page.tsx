'use client';

import { useState, useEffect } from 'react';
import { usersService, Usuario } from '@/app/services/usersService';
import { authService } from '@/app/services/authService';
import Loader from '@/app/components/Loader/Loader';
import styles from './users.module.css';
import { IoSearch, IoAdd, IoKey, IoFolderOpen, IoPencil } from 'react-icons/io5';

export default function UsersAdminPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSectorsModal, setShowSectorsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sectoresDisponibles, setSectoresDisponibles] = useState<any[]>([]);

  useEffect(() => {
    cargarUsuarios();
    cargarSectores();
  }, []);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const data = await usersService.getAll();
      setUsuarios(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarSectores = async () => {
    try {
      const sectores = await authService.getSectores();
      setSectoresDisponibles(sectores);
    } catch (error) {
      console.error('Error al cargar sectores:', error);
    }
  };

  const usuariosFiltrados = usuarios.filter(u => 
    u.Nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.Apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.NombreRed.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(u.NumeroDocumento || '').includes(searchTerm)
  );

  const handleOpenPasswordModal = (user: Usuario) => {
    setSelectedUser(user);
    setShowPasswordModal(true);
  };

  const handleOpenSectorsModal = (user: Usuario) => {
    setSelectedUser(user);
    setShowSectorsModal(true);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Administración de Usuarios</h1>
        <button 
          className={styles.createButton}
          onClick={() => setShowCreateModal(true)}
        >
          <IoAdd size={20} />
          Nuevo Usuario
        </button>
      </div>

      <div className={styles.searchBar}>
        <IoSearch className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Buscar por nombre, usuario o DNI..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {loading ? (
        <div style={{ position: 'relative', minHeight: '400px' }}>
          <Loader />
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Apellido y Nombre</th>
                <th>Usuario</th>
                <th>DNI</th>
                <th>Matrícula</th>
                <th>Sectores</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((usuario) => (
                <tr key={usuario.ValorPersonal}>
                  <td>{usuario.ValorPersonal}</td>
                  <td>{usuario.Apellido}, {usuario.Nombres}</td>
                  <td>{usuario.NombreRed}</td>
                  <td>{usuario.NumeroDocumento}</td>
                  <td>{usuario.CodOperador}</td>
                  <td>
                    <div className={styles.sectoresList}>
                      {usuario.sectores && usuario.sectores.length > 0 ? (
                        usuario.sectores.map((s, idx) => (
                          <span key={idx} className={styles.sectorBadge}>
                            {s.descripcionSector}
                          </span>
                        ))
                      ) : (
                        <span className={styles.noSectors}>Sin sectores</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleOpenPasswordModal(usuario)}
                        title="Cambiar contraseña"
                      >
                        <IoKey size={18} />
                      </button>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleOpenSectorsModal(usuario)}
                        title="Gestionar sectores"
                      >
                        <IoFolderOpen size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPasswordModal && selectedUser && (
        <PasswordModal
          user={selectedUser}
          onClose={() => {
            setShowPasswordModal(false);
            setSelectedUser(null);
          }}
          onSuccess={cargarUsuarios}
        />
      )}

      {showSectorsModal && selectedUser && (
        <SectorsModal
          user={selectedUser}
          sectoresDisponibles={sectoresDisponibles}
          onClose={() => {
            setShowSectorsModal(false);
            setSelectedUser(null);
          }}
          onSuccess={cargarUsuarios}
        />
      )}

      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={cargarUsuarios}
        />
      )}
    </div>
  );
}

// Modal para cambiar contraseña
function PasswordModal({ user, onClose, onSuccess }: any) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await usersService.changePassword(user.ValorPersonal, password);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Cambiar Contraseña</h2>
        <p className={styles.modalSubtitle}>
          Usuario: <strong>{user.NombreRed}</strong> ({user.Apellido}, {user.Nombres})
        </p>

        <form onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}
          
          <div className={styles.formGroup}>
            <label>Nueva Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              required
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Confirmar Contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              required
              disabled={loading}
            />
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal para gestionar sectores
function SectorsModal({ user, sectoresDisponibles, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSector, setSelectedSector] = useState('');

  const handleAsignar = async () => {
    if (!selectedSector) return;

    try {
      setLoading(true);
      setError('');
      await usersService.assignSector(user.ValorPersonal, selectedSector);
      setSelectedSector('');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.mensaje || 'Error al asignar sector');
    } finally {
      setLoading(false);
    }
  };

  const handleQuitar = async (idSector: string) => {
    if (!confirm('¿Está seguro de quitar este sector?')) return;

    try {
      setLoading(true);
      setError('');
      await usersService.removeSector(user.ValorPersonal, idSector);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al quitar sector');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Gestionar Sectores</h2>
        <p className={styles.modalSubtitle}>
          Usuario: <strong>{user.NombreRed}</strong> ({user.Apellido}, {user.Nombres})
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.sectorsSection}>
          <h3>Sectores Asignados</h3>
          {user.sectores && user.sectores.length > 0 ? (
            <div className={styles.assignedSectors}>
              {user.sectores.map((sector: any) => (
                <div key={sector.idSector} className={styles.sectorItem}>
                  <span>{sector.descripcionSector}</span>
                  <button
                    onClick={() => handleQuitar(sector.idSector)}
                    className={styles.removeButton}
                    disabled={loading}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.noSectorsText}>No tiene sectores asignados</p>
          )}
        </div>

        <div className={styles.sectorsSection}>
          <h3>Asignar Nuevo Sector</h3>
          <div className={styles.assignSectorForm}>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className={styles.select}
              disabled={loading}
            >
              <option value="">Seleccione un sector...</option>
              {sectoresDisponibles.map((sector: any) => (
                <option key={sector.idSector} value={sector.idSector}>
                  {sector.descripcionSector}
                </option>
              ))}
            </select>
            <button
              onClick={handleAsignar}
              className={styles.assignButton}
              disabled={loading || !selectedSector}
            >
              Asignar
            </button>
          </div>
        </div>

        <div className={styles.modalActions}>
          <button
            onClick={onClose}
            className={styles.cancelButton}
            disabled={loading}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal para crear usuario
function CreateUserModal({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    apellido: '',
    nombres: '',
    nombreRed: '',
    password: '',
    confirmPassword: '',
    numeroDocumento: '',
    codOperador: '',
    legajo: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (formData.password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await usersService.create({
        apellido: formData.apellido,
        nombres: formData.nombres,
        nombreRed: formData.nombreRed,
        password: formData.password,
        numeroDocumento: formData.numeroDocumento,
        codOperador: formData.codOperador,
        legajo: formData.legajo
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al crear usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalLarge} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Crear Nuevo Usuario</h2>

        <form onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Apellido *</label>
              <input
                type="text"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                className={styles.input}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Nombres *</label>
              <input
                type="text"
                name="nombres"
                value={formData.nombres}
                onChange={handleChange}
                className={styles.input}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Usuario (NombreRed) *</label>
              <input
                type="text"
                name="nombreRed"
                value={formData.nombreRed}
                onChange={handleChange}
                className={styles.input}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label>DNI</label>
              <input
                type="text"
                name="numeroDocumento"
                value={formData.numeroDocumento}
                onChange={handleChange}
                className={styles.input}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Matrícula</label>
              <input
                type="text"
                name="codOperador"
                value={formData.codOperador}
                onChange={handleChange}
                className={styles.input}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Legajo</label>
              <input
                type="text"
                name="legajo"
                value={formData.legajo}
                onChange={handleChange}
                className={styles.input}
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Contraseña *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={styles.input}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Confirmar Contraseña *</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={styles.input}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
