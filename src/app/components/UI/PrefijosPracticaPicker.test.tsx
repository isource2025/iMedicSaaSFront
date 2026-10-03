/**
 * Selector de prefijos de práctica: checks con todos los prefijos; lo elegido sale como lista
 * separada por comas, sin repetidos y en orden ("42,66,87"), que es como se guarda en SQL.
 */
import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import PrefijosPracticaPicker, { parsearPrefijos, unirPrefijos } from './PrefijosPracticaPicker';

const OPCIONES = [
  { value: '18', label: '18 · ECOGRAFIA', detail: '48 cargadas para pedir' },
  { value: '34', label: '34 · RADIOSCOPIA', detail: '69 cargadas para pedir' },
  { value: '42', label: '42 · CONSULTA', detail: 'ninguna cargada para pedir' },
  { value: '66', label: '66 · ACTO BIOQUIMICO (AB)', detail: '1374 en nomenclador' },
  { value: '87', label: '87 · BIOQUIMICO.', detail: '504 en nomenclador' },
];

/** Con estado, como lo usa el formulario real. */
function Controlado({
  inicial = '',
  onChange,
  maxLength,
}: {
  inicial?: string;
  onChange?: (v: string) => void;
  maxLength?: number;
}) {
  const [valor, setValor] = useState(inicial);
  return (
    <PrefijosPracticaPicker
      options={OPCIONES}
      value={valor}
      maxLength={maxLength}
      onChange={(v) => {
        setValor(v);
        onChange?.(v);
      }}
    />
  );
}

const check = (v: string) => screen.getByLabelText(`prefijos-${v}`) as HTMLInputElement;

describe('parsearPrefijos / unirPrefijos', () => {
  it('normaliza: únicos, numéricos y ordenados', () => {
    expect(parsearPrefijos(' 66, 42,87 ,x,66,0,1000')).toEqual(['42', '66', '87']);
    expect(parsearPrefijos('')).toEqual([]);
    expect(unirPrefijos(['87', '42', '66'])).toBe('42,66,87');
  });
});

describe('PrefijosPracticaPicker', () => {
  it('muestra todos los prefijos como checks y marca los guardados (aunque vengan con espacios)', () => {
    render(<Controlado inicial="42, 34" />);
    expect(OPCIONES.every((o) => check(o.value))).toBe(true);
    expect(check('34').checked).toBe(true);
    expect(check('42').checked).toBe(true);
    expect(check('66').checked).toBe(false);
    expect(screen.getByText('2 elegidos')).toBeTruthy();
  });

  it('al tildar devuelve la lista separada por comas y ordenada', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlado inicial="42" onChange={onChange} />);

    await user.click(check('87'));
    expect(onChange).toHaveBeenLastCalledWith('42,87');
    await user.click(check('66'));
    expect(onChange).toHaveBeenLastCalledWith('42,66,87');
    await user.click(check('42'));
    expect(onChange).toHaveBeenLastCalledWith('66,87');
  });

  it('"Todos los prefijos" marca y desmarca todos', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlado onChange={onChange} />);

    await user.click(screen.getByLabelText('prefijos-todos'));
    expect(onChange).toHaveBeenLastCalledWith('18,34,42,66,87');
    expect(OPCIONES.every((o) => check(o.value).checked)).toBe(true);

    await user.click(screen.getByLabelText('prefijos-todos'));
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(OPCIONES.some((o) => check(o.value).checked)).toBe(false);
  });

  it('el filtro limita la lista y "todos" solo afecta a lo filtrado', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlado inicial="18" onChange={onChange} />);

    await user.type(screen.getByLabelText('Filtrar prefijos'), 'bioquim');
    expect(screen.queryByLabelText('prefijos-34')).toBeNull();
    expect(check('66')).toBeTruthy();
    expect(check('87')).toBeTruthy();

    await user.click(screen.getByLabelText('prefijos-todos'));
    expect(onChange).toHaveBeenLastCalledWith('18,66,87');
  });

  it('conserva un prefijo guardado que ya no está en el catálogo', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlado inicial="42,99" onChange={onChange} />);
    expect(check('99').checked).toBe(true);
    expect(screen.getByText(/99 \(actual, sin catálogo\)/)).toBeTruthy();

    await user.click(check('66'));
    expect(onChange).toHaveBeenLastCalledWith('42,66,99');
  });

  it('no deja elegir más de lo que entra en la columna', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlado inicial="18,34" maxLength={5} onChange={onChange} />);

    await user.click(check('42')); // "18,34,42" = 8 caracteres > 5
    expect(onChange).not.toHaveBeenCalled();
    expect(check('42').checked).toBe(false);
    expect(screen.getByText(/hasta 5 caracteres/)).toBeTruthy();
  });

  it('"Quitar todos" vacía la selección', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlado inicial="42,66" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Quitar todos' }));
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('deshabilitado no permite cambios', () => {
    render(<PrefijosPracticaPicker options={OPCIONES} value="42" onChange={vi.fn()} disabled />);
    expect(check('66').disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Quitar todos' })).toBeNull();
  });
});
