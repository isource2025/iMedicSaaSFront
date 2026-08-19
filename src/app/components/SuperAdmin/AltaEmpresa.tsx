'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { superAdminService } from '@/app/services/superAdminService';
import type { SuperAdminCatalogos, TipoServidor } from '@/app/types/superAdmin';
import Loader from '../Loader/Loader';
import SuperAdminShell from './SuperAdminShell';
import PasswordInput from './ui/PasswordInput';
import styles from './superAdmin.module.css';
import { etiquetaRol } from '@/app/utils/permisos';

const emptyForm = {
  descripcion: '',
  cuit: '',
  email: '',
  telefono: '',
  calle: '',
  calle_nro: '',
  localidad: '',
  tipoServidor: 'NUBE' as TipoServidor,
  plan: 'STARTER',
  packs: ['AGENDA'] as string[],
  sectorValor: '',
  sectorDescripcion: '',
  sectorAmbInt: 'A',
  adminUsuario: '',
  adminPassword: '',
  adminApellido: '',
  adminNombres: '',
  adminDni: '',
  adminRol: 0,
};

export default function AltaEmpresa() {
  const router = useRouter();
  const [catalogos, setCatalogos] = useState<SuperAdminCatalogos | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void superAdminService
      .getCatalogos()
      .then((cat) => {
        setCatalogos(cat);
        const adminRol = cat.roles?.find((r) => r.nombre.toUpperCase() === 'ADMIN')?.idRol ?? cat.roles?.[0]?.idRol ?? 0;
        setForm((f) => ({ ...f, adminRol }));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar catálogos'))
      .finally(() => setLoading(false));
  }, []);

  const planSugerido = useMemo(
    () => catalogos?.planes.find((p) => p.id === form.plan)?.importeSugerido ?? null,
    [catalogos, form.plan],
  );

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const togglePack = (codigo: string) => {
    setForm((f) => {
      const next = new Set(f.packs);
      if (next.has(codigo)) next.delete(codigo);
      else next.add(codigo);
      return { ...f, packs: Array.from(next) };
    });
  };

  const submit = async () => {
    if (!form.descripcion.trim()) {
      setError('Ingresá la razón social');
      return;
    }
    if (!form.sectorValor.trim() || !form.sectorDescripcion.trim()) {
      setError('El sector inicial es obligatorio');
      return;
    }
    if (!form.adminUsuario.trim() || !form.adminPassword.trim()) {
      setError('Usuario y contraseña del administrador son obligatorios');
      return;
    }
    if (!form.adminApellido.trim() || !form.adminNombres.trim()) {
      setError('Apellido y nombres del administrador son obligatorios');
      return;
    }
    if (form.packs.length === 0) {
      setError('Seleccioná al menos un módulo');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const creada = await superAdminService.createEmpresaAlta({
        descripcion: form.descripcion.trim(),
        cuit: form.cuit.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim(),
        calle: form.calle.trim(),
        calle_nro: form.calle_nro.trim(),
        localidad: form.localidad.trim(),
        tipoServidor: form.tipoServidor,
        plan: form.plan,
        importeMensual: planSugerido,
        packs: form.packs,
        sector: {
          valor: form.sectorValor.trim(),
          descripcion: form.sectorDescripcion.trim(),
          ambInt: form.sectorAmbInt,
        },
        admin: {
          nombreRed: form.adminUsuario.trim(),
          password: form.adminPassword,
          apellido: form.adminApellido.trim(),
          nombres: form.adminNombres.trim(),
          numeroDocumento: form.adminDni.trim() || undefined,
          idRol: form.adminRol || undefined,
        },
      });
      router.replace(`/dashboard/super-admin/empresas/${creada.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear la empresa');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.superAdmin}>
        <Loader />
      </div>
    );
  }

  return (
    <SuperAdminShell
      title="Alta de empresa"
      subtitle="Dejá la clínica lista para operar. Infra, túnel e import se configuran después."
      crumbs={[
        { label: 'Plataforma', href: '/dashboard/super-admin' },
        { label: 'Nueva empresa' },
      ]}
      error={error}
      onDismissError={() => setError(null)}
    >
      <div className={styles.altaGrid}>
        <section className={styles.altaBlock}>
          <h2>1. Identidad</h2>
          <p>Datos comerciales y dónde vive la infraestructura clínica.</p>
          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label>Razón social *</label>
              <input className={styles.input} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>CUIT</label>
              <input className={styles.input} value={form.cuit} onChange={(e) => set('cuit', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>Email</label>
              <input className={styles.input} value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>Teléfono</label>
              <input className={styles.input} value={form.telefono} onChange={(e) => set('telefono', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>Calle</label>
              <input className={styles.input} value={form.calle} onChange={(e) => set('calle', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>N°</label>
              <input className={styles.input} value={form.calle_nro} onChange={(e) => set('calle_nro', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>Localidad</label>
              <input className={styles.input} value={form.localidad} onChange={(e) => set('localidad', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>Infraestructura *</label>
              <select
                className={styles.select}
                value={form.tipoServidor}
                onChange={(e) => set('tipoServidor', e.target.value as TipoServidor)}
              >
                <option value="NUBE">Nube (Railway)</option>
                <option value="FISICO">Servidor físico (on-premise)</option>
              </select>
            </div>
          </div>
        </section>

        <section className={styles.altaBlock}>
          <h2>2. Plan y módulos</h2>
          <p>La empresa arranca en prueba. La activación y la cobranza detallada se hacen en la ficha.</p>
          <div className={styles.formGroup} style={{ maxWidth: 280, marginBottom: '0.85rem' }}>
            <label>Plan</label>
            <select className={styles.select} value={form.plan} onChange={(e) => set('plan', e.target.value)}>
              {(catalogos?.planes || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.packGrid}>
            {(catalogos?.packs || []).map((pack) => (
              <button
                key={pack.codigo}
                type="button"
                className={`${styles.packCard} ${form.packs.includes(pack.codigo) ? styles.packCardActive : ''}`}
                onClick={() => togglePack(pack.codigo)}
              >
                <span className={styles.packTitle}>{pack.label}</span>
                <span className={styles.packDesc}>{pack.descripcion}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.altaBlock}>
          <h2>3. Operación mínima</h2>
          <p>Un sector y un usuario administrador para que puedan entrar el primer día.</p>
          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label>Código de sector * (2-3)</label>
              <input
                className={styles.input}
                value={form.sectorValor}
                maxLength={3}
                onChange={(e) => set('sectorValor', e.target.value.toUpperCase())}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Descripción del sector *</label>
              <input
                className={styles.input}
                value={form.sectorDescripcion}
                onChange={(e) => set('sectorDescripcion', e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Tipo</label>
              <select className={styles.select} value={form.sectorAmbInt} onChange={(e) => set('sectorAmbInt', e.target.value)}>
                <option value="A">Ambulatorio</option>
                <option value="I">Internación</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Rol del admin</label>
              <select
                className={styles.select}
                value={form.adminRol}
                onChange={(e) => set('adminRol', Number(e.target.value))}
              >
                {(catalogos?.roles || []).map((r) => (
                  <option key={r.idRol} value={r.idRol}>
                    {etiquetaRol(r)}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Usuario *</label>
              <input className={styles.input} value={form.adminUsuario} onChange={(e) => set('adminUsuario', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>Contraseña *</label>
              <PasswordInput
                value={form.adminPassword}
                onChange={(e) => set('adminPassword', e.target.value)}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Apellido *</label>
              <input className={styles.input} value={form.adminApellido} onChange={(e) => set('adminApellido', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>Nombres *</label>
              <input className={styles.input} value={form.adminNombres} onChange={(e) => set('adminNombres', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>DNI</label>
              <input className={styles.input} value={form.adminDni} onChange={(e) => set('adminDni', e.target.value)} />
            </div>
          </div>
        </section>

        <div className={styles.headerActions}>
          <button type="button" className={styles.btn} onClick={() => void submit()} disabled={saving}>
            {saving ? 'Creando…' : 'Crear empresa'}
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => router.push('/dashboard/super-admin/empresas')}
            disabled={saving}
          >
            Cancelar
          </button>
        </div>
      </div>
    </SuperAdminShell>
  );
}
