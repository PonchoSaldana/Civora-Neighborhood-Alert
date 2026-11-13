import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { randomUUID } from 'crypto';
import { extractAuth, jsonResponse } from '../shared/auth.js';
import { PresignUploadSchema, MAX_PHOTO_BYTES } from '../shared/validation.js';
import { logger } from '../shared/logger.js';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.EVIDENCE_BUCKET_NAME || '';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext.requestId;
  const auth = extractAuth(event);

  if (!auth.sub || auth.sub === 'anonymous') {
    return jsonResponse(401, 'No autorizado para subir evidencias.', requestId);
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const parsed = PresignUploadSchema.safeParse(body);

    if (!parsed.success) {
      return jsonResponse(400, {
        message: 'Parámetros de subida inválidos',
        issues: parsed.error.issues
      }, requestId);
    }

    const { filename, contentType, sizeBytes } = parsed.data;
    const ext = filename.split('.').pop() || 'jpg';
    const objectKey = `uploads/${auth.sub}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;

    const presigned = await createPresignedPost(s3, {
      Bucket: BUCKET_NAME,
      Key: objectKey,
      Conditions: [
        ['content-length-range', 1, MAX_PHOTO_BYTES],
        ['eq', '$Content-Type', contentType],
        ['starts-with', '$key', `uploads/${auth.sub}/`]
      ],
      Fields: {
        'Content-Type': contentType
      },
      Expires: 300 // 5 minutos
    });

    logger.info('Presigned upload generated', { requestId, userSub: auth.sub, objectKey });

    return jsonResponse(200, {
      uploadUrl: presigned.url,
      fields: presigned.fields,
      objectKey,
      expiresInSeconds: 300
    }, requestId);
  } catch (error) {
    logger.error('Error generando presigned URL', error, { requestId });
    return jsonResponse(500, 'Error al preparar la carga de la imagen.', requestId);
  }
}

