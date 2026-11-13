import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { extractAuth, jsonResponse } from '../shared/auth.js';
import { docClient, TABLE_NAME } from './dynamoHelpers.js';
import { UpdateStatusSchema } from '../shared/validation.js';
import { validateStatusTransition } from '../shared/status.js';
import { Incident } from '../shared/types.js';
import { logger } from '../shared/logger.js';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext.requestId;
  const auth = extractAuth(event);
  const incidentId = event.pathParameters?.id;

  if (!incidentId) {
    return jsonResponse(400, 'Falta el identificador del incidente.', requestId);
  }

  // Only MANAGER or ADMIN can change status per Section 1 & 8
  if (!auth.isManager && !auth.isAdmin) {
    return jsonResponse(403, 'Solo el personal gestor o administrador puede actualizar el estado.', requestId);
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const parsed = UpdateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return jsonResponse(400, {
        message: 'Datos de actualización de estado no válidos',
        issues: parsed.error.issues
      }, requestId);
    }

    const { status: targetStatus, publicNote } = parsed.data;

    // Fetch current status
    const currentRes = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `INCIDENT#${incidentId}`,
        SK: 'META'
      }
    }));

    if (!currentRes.Item) {
      return jsonResponse(404, 'Incidente no encontrado.', requestId);
    }

    const currentIncident = currentRes.Item as Incident;
    const validation = validateStatusTransition(currentIncident.status, targetStatus, publicNote);

    if (!validation.allowed) {
      // Return 409 Conflict for invalid transition per Section 2 & 8
      return jsonResponse(409, validation.reason || 'Transición de estado rechazada.', requestId);
    }

    const now = new Date().toISOString();
    const eventId = randomUUID().slice(0, 8);

    // Atomically update incident status and add event record
    await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE_NAME,
            Key: {
              PK: `INCIDENT#${incidentId}`,
              SK: 'META'
            },
            UpdateExpression: 'SET #st = :ts, GSI1PK = :gsi1pk, GSI1SK = :gsi1sk, updatedAt = :u',
            ExpressionAttributeNames: {
              '#st': 'status'
            },
            ExpressionAttributeValues: {
              ':ts': targetStatus,
              ':gsi1pk': `STATUS#${targetStatus}`,
              ':gsi1sk': `${now}#${incidentId}`,
              ':u': now
            }
          }
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `INCIDENT#${incidentId}`,
              SK: `EVENT#${now}#${eventId}`,
              eventId,
              incidentId,
              timestamp: now,
              actorId: auth.sub,
              actorRole: auth.isAdmin ? 'ADMIN' : 'MANAGER',
              eventType: 'STATUS_CHANGED',
              fromStatus: currentIncident.status,
              toStatus: targetStatus,
              publicNote: publicNote || undefined
            }
          }
        }
      ]
    }));

    logger.info('Status updated successfully', {
      requestId,
      incidentId,
      from: currentIncident.status,
      to: targetStatus,
      by: auth.sub
    });

    return jsonResponse(200, {
      incidentId,
      previousStatus: currentIncident.status,
      newStatus: targetStatus,
      updatedAt: now,
      message: `Estado actualizado a ${targetStatus}`
    }, requestId);
  } catch (error) {
    logger.error('Error al actualizar estado del incidente', error, { requestId, incidentId });
    return jsonResponse(500, 'Error al actualizar el estado del incidente.', requestId);
  }
}

