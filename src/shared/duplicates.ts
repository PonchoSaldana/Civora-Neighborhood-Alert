import { Incident, IncidentCategory, DuplicateCandidate } from './types.js';

export const DUPLICATE_SCORE_THRESHOLD = 65;

/**
 * Calculates Haversine distance in meters between two lat/lon pairs
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (angle: number) => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculates text similarity using token-based Jaccard similarity
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const normalize = (t: string) =>
    t
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  for (const word of words1) {
    if (words2.has(word)) intersection++;
  }

  const union = new Set([...words1, ...words2]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Evaluates whether an existing incident is a duplicate candidate of a new incident
 * Rules from Section 7:
 * - Category: 40 pts
 * - Distance: 30 pts (<=150m)
 * - Time: 15 pts (<=7 days)
 * - Text similarity: 15 pts
 * - Initial threshold: 65 pts
 */
export function evaluateDuplicateCandidate(
  newIncident: Pick<Incident, 'id' | 'title' | 'description' | 'category' | 'createdAt' | 'areaId' | 'coordinates'>,
  existing: Incident
): DuplicateCandidate | null {
  if (newIncident.id === existing.id) return null;
  // If existing is already marked as duplicate of something else, skip or compare against its parent
  if (existing.duplicateOf) return null;

  let score = 0;
  const reasons: string[] = [];

  // 1. Categoría (40 pts)
  if (newIncident.category === existing.category) {
    score += 40;
    reasons.push('Misma categoría');
  } else {
    // Different category gives 0 for category and rarely exceeds 65
    return null;
  }

  // 2. Tiempo (máximo 15 pts) - ventana de 7 días
  const newTime = new Date(newIncident.createdAt).getTime();
  const existingTime = new Date(existing.createdAt).getTime();
  const diffDays = Math.abs(newTime - existingTime) / (1000 * 60 * 60 * 24);

  if (diffDays <= 1) {
    score += 15;
    reasons.push('Reportado en las últimas 24 horas');
  } else if (diffDays <= 3) {
    score += 12;
    reasons.push(`Reportado hace ${Math.round(diffDays)} días`);
  } else if (diffDays <= 7) {
    score += 8;
    reasons.push(`Reportado hace ${Math.round(diffDays)} días`);
  } else {
    // Más de 7 días no es candidato
    return null;
  }

  // 3. Ubicación y distancia (máximo 30 pts)
  let distanceMeters: number | undefined;
  if (newIncident.coordinates && existing.coordinates) {
    distanceMeters = calculateDistanceMeters(
      newIncident.coordinates.latitude,
      newIncident.coordinates.longitude,
      existing.coordinates.latitude,
      existing.coordinates.longitude
    );

    if (distanceMeters <= 50) {
      score += 30;
      reasons.push(`A solo ${distanceMeters} m de distancia`);
    } else if (distanceMeters <= 100) {
      score += 25;
      reasons.push(`A ${distanceMeters} m de distancia`);
    } else if (distanceMeters <= 150) {
      score += 18;
      reasons.push(`A ${distanceMeters} m de distancia`);
    } else if (distanceMeters <= 300) {
      score += 8;
      reasons.push(`En la misma zona (${distanceMeters} m)`);
    } else {
      // Fuera del radio de cercanía
      return null;
    }
  } else {
    // Sin coordenadas GPS: comparar por área comunitaria (areaId)
    if (newIncident.areaId && existing.areaId && newIncident.areaId === existing.areaId) {
      score += 20;
      reasons.push(`En la misma zona comunitaria (${newIncident.areaId})`);
    } else {
      return null;
    }
  }

  // 4. Similitud de texto (máximo 15 pts)
  const combinedNew = `${newIncident.title} ${newIncident.description}`;
  const combinedExisting = `${existing.title} ${existing.description}`;
  const textSim = calculateTextSimilarity(combinedNew, combinedExisting);

  if (textSim >= 0.4) {
    score += 15;
    reasons.push('Título y descripción con alta coincidencia');
  } else if (textSim >= 0.2) {
    score += 10;
    reasons.push('Descripción con palabras clave coincidentes');
  } else if (textSim >= 0.1) {
    score += 5;
  }

  if (score >= DUPLICATE_SCORE_THRESHOLD) {
    return {
      candidateId: existing.id,
      candidateTitle: existing.title,
      candidateCategory: existing.category,
      score,
      reasons,
      distanceMeters,
      daysDifference: Math.round(diffDays * 10) / 10
    };
  }

  return null;
}

/**
 * Finds all duplicate candidates from a list of existing incidents
 */
export function findDuplicateCandidates(
  newIncident: Pick<Incident, 'id' | 'title' | 'description' | 'category' | 'createdAt' | 'areaId' | 'coordinates'>,
  existingList: Incident[]
): DuplicateCandidate[] {
  const candidates: DuplicateCandidate[] = [];

  for (const existing of existingList) {
    const candidate = evaluateDuplicateCandidate(newIncident, existing);
    if (candidate) {
      candidates.push(candidate);
    }
  }

  // Sort descending by score
  return candidates.sort((a, b) => b.score - a.score);
}

