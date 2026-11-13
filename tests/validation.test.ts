import { describe, it, expect } from 'vitest';
import { CreateIncidentSchema, PresignUploadSchema, MAX_PHOTO_BYTES } from '../src/shared/validation.js';

describe('Validaciones de esquemas API (Civora)', () => {
  it('valida creación de incidente correcto', () => {
    const valid = {
      title: 'Fuga de agua potable',
      description: 'Lleva saliendo agua limpia desde la mañana en la banqueta.',
      category: 'fugas_agua',
      areaId: 'Sector 3',
      coordinates: { latitude: 19.4326, longitude: -99.1332 },
      photoKeys: ['uploads/user1/test.jpg']
    };

    const parsed = CreateIncidentSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
  });

  it('rechaza títulos o descripciones demasiado cortos', () => {
    const invalid = {
      title: 'Ag',
      description: 'Fuga',
      category: 'fugas_agua',
      areaId: 'Sector 3'
    };

    const parsed = CreateIncidentSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('valida solicitud de subida de imagen segura', () => {
    const validUpload = {
      filename: 'evidencia.webp',
      contentType: 'image/webp',
      sizeBytes: 1024 * 1024 // 1 MB
    };
    expect(PresignUploadSchema.safeParse(validUpload).success).toBe(true);

    const oversizedUpload = {
      filename: 'pesado.png',
      contentType: 'image/png',
      sizeBytes: MAX_PHOTO_BYTES + 100
    };
    expect(PresignUploadSchema.safeParse(oversizedUpload).success).toBe(false);

    const maliciousUpload = {
      filename: 'script.sh',
      contentType: 'application/x-sh',
      sizeBytes: 500
    };
    expect(PresignUploadSchema.safeParse(maliciousUpload).success).toBe(false);
  });
});

