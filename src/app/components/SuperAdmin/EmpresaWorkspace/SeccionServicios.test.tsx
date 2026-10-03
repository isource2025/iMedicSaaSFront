/**
 * Super admin · Servicios de la empresa: se ven los prefijos de práctica de cada servicio y se
 * editan con checks (se envían como lista).
 */
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({
  api: {
    getServiciosPrefijos: vi.fn(),
    guardarPrefijosServicio: vi.fn(),
    crearServicio: vi.fn(),
    actualizarServicio: vi.fn(),
    eliminarServicio: vi.fn(),
    updateOnboarding: vi.fn(),
    getEmpresa: vi.fn(),
  },
}));

vi.mock('@/app/services/superAdminService', () => ({ superAdminService: api }));

import SeccionServicios from './SeccionServicios';

const empresa: any = { id: '1', descripcion: 'Vidal', onboarding: { serviciosDefecto: [] } };
const servicios = [
  { id: 'LAB', descripcion: 'LABORATORIO' },
  { id: 'ECO', descripcion: 'ECOGRAFIA' },
];

const renderSeccion = () =>
  render(
    <SeccionServicios
      empresa={empresa}
      servicios={servicios}
      onRefresh={vi.fn(async () => undefined)}
      onUpdated={vi.fn()}
      onError={vi.fn()}
    />,
  );

beforeEach(() => {
  api.getServiciosPrefijos.mockReset().mockResolvedValue({
    servicios: [
      { id: 'LAB', descripcion: 'LABORATORIO', prefijos: ['42'] },
      { id: 'ECO', descripcion: 'ECOGRAFIA', prefijos: ['18'] },
    ],
    opciones: [
      { value: '18', label: '18 · ECOGRAFIA', detail: '48 cargadas para pedir' },
      { value: '42', label: '42 · CONSULTA' },
      { value: '66', label: '66 · ACTO BIOQUIMICO (AB)' },
      { value: '87', label: '87 · BIOQUIMICO.' },
    ],
  });
  api.guardarPrefijosServicio.mockReset().mockResolvedValue({ id: 'LAB', prefijos: [], texto: '' });
});

describe('SeccionServicios (super admin) · prefijos de práctica', () => {
  it('muestra los prefijos guardados de cada servicio', async () => {
    renderSeccion();
    const fila = (await screen.findByText('LABORATORIO')).closest('tr') as HTMLElement;
    await waitFor(() => expect(within(fila).getByText('42')).toBeTruthy());
    const filaEco = screen.getByText('ECOGRAFIA').closest('tr') as HTMLElement;
    expect(within(filaEco).getByText('18')).toBeTruthy();
    expect(api.getServiciosPrefijos).toHaveBeenCalledWith('1');
  });

  it('LAB: tilda 66 y 87 y guarda la lista 42,66,87', async () => {
    const user = userEvent.setup();
    renderSeccion();
    const fila = (await screen.findByText('LABORATORIO')).closest('tr') as HTMLElement;
    await waitFor(() => expect((within(fila).getByRole('button', { name: 'Prefijos' }) as HTMLButtonElement).disabled).toBe(false));

    await user.click(within(fila).getByRole('button', { name: 'Prefijos' }));
    expect((screen.getByLabelText('prefijos-42') as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getByLabelText('prefijos-66'));
    await user.click(screen.getByLabelText('prefijos-87'));
    await user.click(screen.getByRole('button', { name: 'Guardar prefijos' }));

    await waitFor(() => expect(api.guardarPrefijosServicio).toHaveBeenCalledTimes(1));
    expect(api.guardarPrefijosServicio).toHaveBeenCalledWith('1', 'LAB', ['42', '66', '87']);
    // recarga la lista tras guardar
    await waitFor(() => expect(api.getServiciosPrefijos).toHaveBeenCalledTimes(2));
  });

  it('si el servidor rechaza, muestra el motivo y no cierra', async () => {
    const user = userEvent.setup();
    api.guardarPrefijosServicio.mockRejectedValueOnce(new Error('Prefijo no válido: 999'));
    renderSeccion();
    const fila = (await screen.findByText('LABORATORIO')).closest('tr') as HTMLElement;
    await waitFor(() => expect((within(fila).getByRole('button', { name: 'Prefijos' }) as HTMLButtonElement).disabled).toBe(false));
    await user.click(within(fila).getByRole('button', { name: 'Prefijos' }));
    await user.click(screen.getByRole('button', { name: 'Guardar prefijos' }));
    expect(await screen.findByText('Prefijo no válido: 999')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Guardar prefijos' })).toBeTruthy();
  });

  it('si no se pueden cargar los prefijos lo avisa y el resto de la pantalla sigue andando', async () => {
    api.getServiciosPrefijos.mockRejectedValueOnce(new Error('sin conexión'));
    renderSeccion();
    expect(await screen.findByText(/No se pudieron cargar los prefijos de práctica: sin conexión/)).toBeTruthy();
    expect(screen.getByText('LABORATORIO')).toBeTruthy();
  });
});
