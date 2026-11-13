import { describe, it, expect } from 'vitest';
import {
  calculateDistanceMeters,
  calculateTextSimilarity,
  evaluateDuplicateCandidate,
  findDuplicateCandidates
} from '../src/shared/duplicates.js';
import { Incident } from '../src/shared/types.js';

describe('Detección explicable de duplicados (Civora)', () => {
  const baseIncident: Incident = {
    id: 'CIV-2026-0001',
    title: 'Bache profundo en calle Hidalgo frente a primaria',
    description: 'Hay un bache grande que daña las llantas de los carros pasando la esquina.',
    category: 'baches',
    status: 'RECIBIDO',
    createdBy: 'user-123',
    createdAt: '2026-11-10T12:00:00.000Z',
    updatedAt: '2026-11-10T12:00:00.000Z',
    areaId: 'Centro',
    coordinates: { latitude: 20.659698, longitude: -103.349609 },
    photoKeys: [],
    confirmationCount: 1
  };

  it('calcula distancia Haversine correctamente', () => {
    // Aprox 50 metros al norte
    const dist = calculateDistanceMeters(20.659698, -103.349609, 20.660148, -103.349609);
    expect(dist).toBeGreaterThan(40);
    expect(dist).toBeLessThan(60);
  });

  it('calcula similitud de texto Jaccard entre reportes afines', () => {
    const sim = calculateTextSimilarity(
      'Bache enorme en calle Hidalgo primaria',
      'Bache profundo en calle Hidalgo frente a primaria'
    );
    expect(sim).toBeGreaterThan(0.3);
  });

  it('identifica reporte duplicado cercano con alta puntuación y razones claras', () => {
    const newReport = {
      id: 'CIV-2026-0002',
      title: 'Bache enorme por la primaria en Hidalgo',
      description: 'Bache peligroso en la esquina de la escuela primaria Hidalgo',
      category: 'baches' as const,
      areaId: 'Centro',
      coordinates: { latitude: 20.659900, longitude: -103.349609 }, // ~22m de distancia
      createdAt: '2026-11-11T12:00:00.000Z' // 1 día después
    };

    const candidate = evaluateDuplicateCandidate(newReport, baseIncident);
    expect(candidate).not.toBeNull();
    if (candidate) {
      expect(candidate.score).toBeGreaterThanOrEqual(65);
      expect(candidate.reasons).toContain('Misma categoría');
      expect(candidate.reasons.some(r => r.includes('distancia'))).toBe(true);
      expect(candidate.reasons.some(r => r.includes('últimas 24 horas') || r.includes('días'))).toBe(true);
    }
  });

  it('descarta reporte de diferente categoría aunque esté en el mismo punto', () => {
    const newReport = {
      id: 'CIV-2026-0003',
      title: 'Luminaria fundida frente a primaria',
      description: 'Lámpara de poste apagada toda la noche',
      category: 'luminarias' as const,
      areaId: 'Centro',
      coordinates: { latitude: 20.659698, longitude: -103.349609 },
      createdAt: '2026-11-11T12:00:00.000Z'
    };

    const candidate = evaluateDuplicateCandidate(newReport, baseIncident);
    expect(candidate).toBeNull();
  });

  it('descarta reporte fuera de la ventana de 7 días', () => {
    const newReport = {
      id: 'CIV-2026-0004',
      title: 'Bache profundo en calle Hidalgo frente a primaria',
      description: 'Hay un bache grande que daña las llantas',
      category: 'baches' as const,
      areaId: 'Centro',
      coordinates: { latitude: 20.659698, longitude: -103.349609 },
      createdAt: '2026-11-20T12:00:00.000Z' // 10 días después
    };

    const candidate = evaluateDuplicateCandidate(newReport, baseIncident);
    expect(candidate).toBeNull();
  });
});

