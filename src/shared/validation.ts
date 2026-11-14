import { z } from 'zod';

export const AllowedImageMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB

export const PresignUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(AllowedImageMimeTypes, {
    errorMap: () => ({ message: 'Solo se permiten imágenes JPEG, PNG o WebP.' })
  }),
  sizeBytes: z.number().int().positive().max(MAX_PHOTO_BYTES, {
    message: 'El archivo no puede exceder los 5 MB.'
  }).optional()
});

export const CreateIncidentSchema = z.object({
  title: z.string().min(4, 'El título debe tener al menos 4 caracteres').max(120),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres').max(1000),
  category: z.enum(['baches', 'fugas_agua', 'luminarias', 'basura', 'danos_infraestructura', 'otros']),
  areaId: z.string().min(2, 'La zona o colonia es obligatoria').max(100),
  coordinates: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    approximate: z.boolean().optional()
  }).optional(),
  photoKeys: z.array(z.string()).max(3).default([]),
  idempotencyKey: z.string().min(8).max(128).optional(),
  authorId: z.string().nullable().optional(),
  authorName: z.string().optional()
});

export const UpdateStatusSchema = z.object({
  status: z.enum(['RECIBIDO', 'EN_REVISION', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'NO_PROCEDENTE']),
  publicNote: z.string().max(500).optional()
});

export const LinkDuplicateSchema = z.object({
  parentIncidentId: z.string().min(4)
});

