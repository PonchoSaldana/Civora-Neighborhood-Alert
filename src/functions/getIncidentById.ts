import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { extractAuth, jsonResponse } from '../shared/auth.js';
import { docClient, TABLE_NAME } from './dynamoHelpers.js';
import { Incident, IncidentEvent } from '../shared/types.js';
import { logger } from '../shared/logger.js';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.EVIDENCE_BUCKET_NAME || '';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext.requestId;
  const auth = extractAuth(event);
  const incidentId = event.pathParameters?.id;

  if (!incidentId) {
    return jsonResponse(400, 'Falta el identificador del incidente.', requestId);
  }

  try {
    // Query all items under PK=INCIDENT#{id} (META, EVENTs, etc.)
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `INCIDENT#${incidentId}`
      }
    }));

    if (!result.Items || result.Items.length === 0) {
      return jsonResponse(404, 'El incidente solicitado no existe.', requestId);
    }

    const metaItem = result.Items.find((i) => i.SK === 'META') as Incident | undefined;
    if (!metaItem) {
      return jsonResponse(404, 'Metadatos del incidente no encontrados.', requestId);
    }

    // Permission check: owner or MANAGER or ADMIN can see full details
    const isOwner = auth.sub && auth.sub === metaItem.createdBy;
    const isManagerOrAdmin = auth.isManager || auth.isAdmin;

    // Events timeline
    const events = result.Items
      .filter((i) => typeof i.SK === 'string' && i.SK.startsWith('EVENT#'))
      .map((i) => ({
        eventId: i.eventId,
        incidentId: i.incidentId,
        timestamp: i.timestamp,
        actorId: isManagerOrAdmin ? i.actorId : 'Gestor/Comunidad',
        actorRole: i.actorRole,
        eventType: i.eventType,
        fromStatus: i.fromStatus,
        toStatus: i.toStatus,
        publicNote: i.publicNote
      })) as IncidentEvent[];

    // Generate short-lived presigned GET URLs for photos (5 min expiry)
    const photoUrls: string[] = [];
    if (metaItem.photoKeys && metaItem.photoKeys.length > 0 && BUCKET_NAME) {
      for (const key of metaItem.photoKeys) {
        try {
          const url = await getSignedUrl(
            s3,
            new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: key
            }),
            { expiresIn: 300 }
          );
          photoUrls.push(url);
        } catch (err) {
          logger.warn('Could not generate presigned GET for key', { key, err });
        }
      }
    }

    return jsonResponse(200, {
      ...metaItem,
      photoUrls,
      events,
      // If requester is not owner nor manager, hide creator PII
      createdBy: isOwner || isManagerOrAdmin ? metaItem.createdBy : undefined
    }, requestId);
  } catch (error) {
    logger.error('Error al obtener incidente por ID', error, { requestId, incidentId });
    return jsonResponse(500, 'Error al consultar el detalle del incidente', requestId);
  }
}

