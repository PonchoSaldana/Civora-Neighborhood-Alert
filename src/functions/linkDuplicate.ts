import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { extractAuth, jsonResponse } from '../shared/auth.js';
import { docClient, TABLE_NAME } from './dynamoHelpers.js';
import { LinkDuplicateSchema } from '../shared/validation.js';
import { Incident } from '../shared/types.js';
import { logger } from '../shared/logger.js';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext.requestId;
  const auth = extractAuth(event);
  const childId = event.pathParameters?.id;

  if (!childId) {
    return jsonResponse(400, 'Falta el identificador del incidente secundario.', requestId);
  }

  if (!auth.isManager && !auth.isAdmin) {
    return jsonResponse(403, 'Solo gestores o administradores pueden vincular duplicados.', requestId);
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const parsed = LinkDuplicateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonResponse(400, {
        message: 'Falta o es inválido el ID del incidente principal.',
        issues: parsed.error.issues
      }, requestId);
    }

    const { parentIncidentId } = parsed.data;

    if (childId === parentIncidentId) {
      return jsonResponse(400, 'Un incidente no puede vincularse a sí mismo como duplicado.', requestId);
    }

    // Verify both exist
    const [childRes, parentRes] = await Promise.all([
      docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `INCIDENT#${childId}`, SK: 'META' } })),
      docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { PK: `INCIDENT#${parentIncidentId}`, SK: 'META' } }))
    ]);

    if (!childRes.Item) return jsonResponse(404, 'El reporte secundario no existe.', requestId);
    if (!parentRes.Item) return jsonResponse(404, 'El reporte principal no existe.', requestId);

    const child = childRes.Item as Incident;
    const parent = parentRes.Item as Incident;

    const now = new Date().toISOString();
    const eventIdChild = randomUUID().slice(0, 8);
    const eventIdParent = randomUUID().slice(0, 8);

    // Atomically link duplicate:
    // 1. Mark child.duplicateOf = parentIncidentId
    // 2. Add event to child
    // 3. Add event to parent
    // 4. Traceably increment parent confirmations by child's count
    await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { PK: `INCIDENT#${childId}`, SK: 'META' },
            UpdateExpression: 'SET duplicateOf = :pid, updatedAt = :now',
            ExpressionAttributeValues: {
              ':pid': parentIncidentId,
              ':now': now
            }
          }
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `INCIDENT#${childId}`,
              SK: `EVENT#${now}#${eventIdChild}`,
              eventId: eventIdChild,
              incidentId: childId,
              timestamp: now,
              actorId: auth.sub,
              actorRole: auth.isAdmin ? 'ADMIN' : 'MANAGER',
              eventType: 'DUPLICATE_LINKED',
              publicNote: `Vinculado como duplicado al reporte principal #${parentIncidentId}`
            }
          }
        },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: { PK: `INCIDENT#${parentIncidentId}`, SK: 'META' },
            UpdateExpression: 'SET confirmationCount = confirmationCount + :childCount, updatedAt = :now',
            ExpressionAttributeValues: {
              ':childCount': child.confirmationCount || 1,
              ':now': now
            }
          }
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `INCIDENT#${parentIncidentId}`,
              SK: `EVENT#${now}#${eventIdParent}`,
              eventId: eventIdParent,
              incidentId: parentIncidentId,
              timestamp: now,
              actorId: auth.sub,
              actorRole: auth.isAdmin ? 'ADMIN' : 'MANAGER',
              eventType: 'DUPLICATE_LINKED',
              publicNote: `Se vinculó el reporte secundario #${childId} sumando ${child.confirmationCount || 1} confirmación(es)`
            }
          }
        }
      ]
    }));

    logger.info('Duplicate linked successfully', {
      requestId,
      childId,
      parentIncidentId,
      managerSub: auth.sub
    });

    return jsonResponse(200, {
      childId,
      parentIncidentId,
      linked: true,
      message: `Reporte #${childId} vinculado con éxito a #${parentIncidentId}`
    }, requestId);
  } catch (error) {
    logger.error('Error al vincular duplicado', error, { requestId, childId });
    return jsonResponse(500, 'Error al vincular el incidente duplicado.', requestId);
  }
}

