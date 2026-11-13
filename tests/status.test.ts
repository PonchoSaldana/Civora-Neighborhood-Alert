import { describe, it, expect } from 'vitest';
import { validateStatusTransition } from '../src/shared/status.js';

describe('Transiciones de estado de incidentes (Civora)', () => {
  it('permite flujo feliz: RECIBIDO -> EN_REVISION -> ASIGNADO -> EN_PROCESO -> RESUELTO', () => {
    expect(validateStatusTransition('RECIBIDO', 'EN_REVISION').allowed).toBe(true);
    expect(validateStatusTransition('EN_REVISION', 'ASIGNADO').allowed).toBe(true);
    expect(validateStatusTransition('ASIGNADO', 'EN_PROCESO').allowed).toBe(true);
    expect(validateStatusTransition('EN_PROCESO', 'RESUELTO').allowed).toBe(true);
  });

  it('rechaza saltos inválidos', () => {
    const result = validateStatusTransition('RECIBIDO', 'RESUELTO');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Transición no válida');
  });

  it('rechaza transición al mismo estado', () => {
    const result = validateStatusTransition('EN_PROCESO', 'EN_PROCESO');
    expect(result.allowed).toBe(false);
  });

  it('exige motivo justificado para NO_PROCEDENTE', () => {
    const withoutNote = validateStatusTransition('RECIBIDO', 'NO_PROCEDENTE');
    expect(withoutNote.allowed).toBe(false);
    expect(withoutNote.reason).toContain('exige un motivo');

    const withShortNote = validateStatusTransition('RECIBIDO', 'NO_PROCEDENTE', 'No');
    expect(withShortNote.allowed).toBe(false);

    const withValidNote = validateStatusTransition(
      'RECIBIDO',
      'NO_PROCEDENTE',
      'El reporte corresponde a propiedad privada fuera del área comunitaria.'
    );
    expect(withValidNote.allowed).toBe(true);
  });
});

