/**
 * Tablas maestras: cada campo con ayuda muestra un ícono de información que explica qué es.
 */
import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CatalogoCrudModal, { type CatalogoColumn } from './CatalogoCrudModal';

const columns: CatalogoColumn[] = [
  { key: 'Valor', label: 'Código', editable: false, requiredOnCreate: true, help: 'Código corto del servicio.' },
  { key: 'Descripcion', label: 'Descripción', help: 'Nombre del servicio.' },
  { key: 'Otro', label: 'Sin ayuda' },
];

function abrirAlta() {
  render(
    <CatalogoCrudModal
      isOpen
      onClose={vi.fn()}
      title="Servicios"
      data={[]}
      columns={columns}
      onAddItem={vi.fn()}
    />,
  );
  return userEvent.setup();
}

describe('CatalogoCrudModal · ayuda por campo', () => {
  it('muestra un ícono solo en los campos que tienen ayuda', async () => {
    const user = abrirAlta();
    await user.click(screen.getByRole('button', { name: /Nuevo/ }));

    expect(screen.getByRole('button', { name: 'Qué es Código' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Qué es Descripción' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Qué es Sin ayuda' })).toBeNull();
  });

  it('al pasar el mouse muestra la explicación y al salir la oculta', async () => {
    const user = abrirAlta();
    await user.click(screen.getByRole('button', { name: /Nuevo/ }));

    const icono = screen.getByRole('button', { name: 'Qué es Descripción' });
    expect(screen.queryByRole('tooltip')).toBeNull();
    await user.hover(icono);
    expect(screen.getByRole('tooltip').textContent).toBe('Nombre del servicio.');
    await user.unhover(icono);
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('con teclado: se abre al enfocar y se cierra con Escape', async () => {
    const user = abrirAlta();
    await user.click(screen.getByRole('button', { name: /Nuevo/ }));

    const icono = screen.getByRole('button', { name: 'Qué es Código' });
    act(() => icono.focus());
    expect(screen.getByRole('tooltip').textContent).toBe('Código corto del servicio.');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('tocar el ícono no cambia el foco ni el valor del campo', async () => {
    const user = abrirAlta();
    await user.click(screen.getByRole('button', { name: /Nuevo/ }));

    const campo = screen.getByRole('textbox', { name: 'Descripción' }) as HTMLInputElement;
    await user.type(campo, 'Hola');
    await user.click(screen.getByRole('button', { name: 'Qué es Descripción' }));
    expect(campo.value).toBe('Hola');
    expect(screen.getByRole('tooltip')).toBeTruthy();
  });
});
