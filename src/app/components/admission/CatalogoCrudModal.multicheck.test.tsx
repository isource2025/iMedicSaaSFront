/**
 * Tablas maestras · Servicios: la columna "Prefijos de práctica" se edita con checks y se envía
 * al guardar como lista separada por comas.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CatalogoCrudModal, { type CatalogoColumn } from './CatalogoCrudModal';

const columns: CatalogoColumn[] = [
  { key: 'Valor', label: 'Código', editable: false, requiredOnCreate: true },
  { key: 'Descripcion', label: 'Descripción' },
  {
    key: 'PrefijosPractica',
    label: 'Prefijos de práctica',
    input: 'multicheck',
    maxLength: 40,
    options: [
      { value: '42', label: '42 · CONSULTA' },
      { value: '66', label: '66 · ACTO BIOQUIMICO (AB)' },
      { value: '87', label: '87 · BIOQUIMICO.' },
    ],
  },
];

const data = [{ Valor: 'LAB', Descripcion: 'LABORATORIO', PrefijosPractica: '42' }];

describe('CatalogoCrudModal · columna multicheck', () => {
  it('editar un servicio: tilda prefijos y guarda "42,66,87"', async () => {
    const user = userEvent.setup();
    const onUpdateItem = vi.fn().mockResolvedValue(undefined);
    render(
      <CatalogoCrudModal
        isOpen
        onClose={vi.fn()}
        title="Servicios"
        data={data}
        columns={columns}
        onUpdateItem={onUpdateItem}
      />,
    );

    await user.click(screen.getByTitle('Editar'));
    expect((screen.getByLabelText('PrefijosPractica-42') as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getByLabelText('PrefijosPractica-87'));
    await user.click(screen.getByLabelText('PrefijosPractica-66'));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onUpdateItem).toHaveBeenCalledTimes(1));
    const [clave, valores] = onUpdateItem.mock.calls[0];
    expect(clave).toBe('LAB');
    expect(valores.PrefijosPractica).toBe('42,66,87');
    expect(valores.Descripcion).toBe('LABORATORIO');
  });

  it('se puede dejar sin prefijos', async () => {
    const user = userEvent.setup();
    const onUpdateItem = vi.fn().mockResolvedValue(undefined);
    render(
      <CatalogoCrudModal
        isOpen
        onClose={vi.fn()}
        title="Servicios"
        data={data}
        columns={columns}
        onUpdateItem={onUpdateItem}
      />,
    );
    await user.click(screen.getByTitle('Editar'));
    await user.click(screen.getByLabelText('PrefijosPractica-42'));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(onUpdateItem).toHaveBeenCalled());
    expect(onUpdateItem.mock.calls[0][1].PrefijosPractica).toBe('');
  });
});
