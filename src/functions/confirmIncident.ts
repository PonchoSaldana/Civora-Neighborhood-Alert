import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { extractAuth, jsonResponse } from '../shared/auth.js';
import { docClient, TABLE_NAME } from './dynamoHelpers.js';
import { logger } from '../shared/logger.js';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext.requestId;
  const auth = extractAuth(event);
  const incidentId = event.pathParameters?.id;

  if (!incidentId) {
    return jsonResponse(400, 'Falta el identificador del incidente.', requestId);
  }

  if (!auth.sub || auth.sub === 'anonymous') {
    return jsonResponse(401, 'Debes iniciar sesión para confirmar un incidente.', requestId);
  }

  try {
    const now = new Date().toISOString();

    // Use TransactWriteItems to:
    // 1. Put confirmation record with condition attribute_not_exists(PK)
    // 2. Increment confirmationCount on the META item
    await docClient.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              PK: `INCIDENT#${incidentId}`,
              SK: `CONFIRM#${auth.sub}`,
              incidentId,
              userSub: auth.sub,
              createdAt: now
            },
            ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)'
          }
        },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: {
              PK: `INCIDENT#${incidentId}`,
              SK: 'META'
            },
            UpdateExpression: 'SET confirmationCount = if_not_exists(confirmationCount, :zero) + :inc, updatedAt = :now',
            ExpressionAttributeValues: {
              ':inc': 1,
              ':zero': 0,
              ':now': now
            }
          }
        }
      ]
    }));

    logger.info('Incident confirmed by user', { requestId, incidentId, userSub: auth.sub });

    return jsonResponse(200, {
      incidentId,
      confirmed: true,
      message: 'Incidente confirmado con éxito. Gracias por apoyar a tu comunidad.'
    }, requestId);
  } catch (error: any) {
    if (error?.name === 'TransactionCanceledException' || error?.CancellationReasons?.some((r: any) => r.Code === 'ConditionalCheckFailed')) {
      logger.info('User already confirmed this incident', { requestId, incidentId, userSub: auth.sub });
      return jsonResponse(409, 'Ya has confirmado este incidente previamente.', requestId);
    }

    logger.error('Error al confirmar incidente', error, { requestId, incidentId });
    return jsonResponse(500, 'Error al confirmar el incidente.', requestId);
  }
}

