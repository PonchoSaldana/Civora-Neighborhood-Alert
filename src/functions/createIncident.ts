import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { extractAuth, jsonResponse } from '../shared/auth.js';
import { CreateIncidentSchema } from '../shared/validation.js';
import { logger } from '../shared/logger.js';
import { docClient, TABLE_NAME } from './dynamoHelpers.js';
import { Incident } from '../shared/types.js';

const sfn = new SFNClient({ region: process.env.AWS_REGION || 'us-east-1' });
const STATE_MACHINE_ARN = process.env.STATE_MACHINE_ARN || '';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext.requestId;
  const auth = extractAuth(event);

  const idempotencyKey = event.headers['idempotency-key'] || event.headers['Idempotency-Key'];

  try {
    const rawBody = event.body ? JSON.parse(event.body) : {};
    const parsed = CreateIncidentSchema.safeParse({
      ...rawBody,
      idempotencyKey: idempotencyKey || rawBody.idempotencyKey
    });

    if (!parsed.success) {
      return jsonResponse(400, {
        message: 'Datos de reporte incompletos o inválidos',
        issues: parsed.error.issues
      }, requestId);
    }

    const data = parsed.data;
    const userSub = (auth.sub && auth.sub !== 'anonymous') ? auth.sub : (data.authorId || `anon-${Date.now().toString().slice(-6)}`);
    const userDisplayName = auth.email ? auth.email.split('@')[0] : (data.authorName || 'Vecino anónimo');

    // Idempotency check: if user supplied idempotencyKey, verify if already exists
    if (data.idempotencyKey) {
      const existing = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI2', // USER#{createdBy}
        KeyConditionExpression: 'GSI2PK = :userPk',
        FilterExpression: 'idempotencyKey = :ikey',
        ExpressionAttributeValues: {
          ':userPk': `USER#${userSub}`,
          ':ikey': data.idempotencyKey
        }
      }));

      if (existing.Items && existing.Items.length > 0) {
        const prev = existing.Items[0];
        logger.info('Idempotency matched existing incident', { requestId, incidentId: prev.id });
        return jsonResponse(200, {
          incidentId: prev.id,
          status: prev.status,
          isProcessing: prev.isProcessing,
          message: 'Incidente ya registrado previamente (idempotencia verificada)'
        }, requestId);
      }
    }

    const incidentId = `CIV-${Date.now().toString().slice(-6)}-${randomUUID().slice(0, 4).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const incidentItem: Record<string, unknown> = {
      PK: `INCIDENT#${incidentId}`,
      SK: 'META',
      GSI1PK: 'STATUS#RECIBIDO',
      GSI1SK: `${timestamp}#${incidentId}`,
      GSI2PK: `USER#${userSub}`,
      GSI2SK: `${timestamp}#${incidentId}`,
      GSI3PK: `AREA#${data.areaId}#CAT#${data.category}`,
      GSI3SK: `${timestamp}#${incidentId}`,
      id: incidentId,
      title: data.title,
      description: data.description,
      category: data.category,
      status: 'RECIBIDO',
      createdBy: userSub,
      creatorDisplayName: userDisplayName,
      createdAt: timestamp,
      updatedAt: timestamp,
      areaId: data.areaId,
      coordinates: data.coordinates,
      photoKeys: data.photoKeys,
      confirmationCount: 1,
      idempotencyKey: data.idempotencyKey,
      isProcessing: true
    };

    // Save initial record to DynamoDB
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: incidentItem
    }));

    // Start Step Functions Standard execution
    let executionArn = '';
    if (STATE_MACHINE_ARN) {
      const sfnResponse = await sfn.send(new StartExecutionCommand({
        stateMachineArn: STATE_MACHINE_ARN,
        name: `incident-${incidentId}-${Date.now()}`,
        input: JSON.stringify({
          incidentId,
          createdBy: auth.sub,
          category: data.category,
          areaId: data.areaId,
          coordinates: data.coordinates,
          photoKeys: data.photoKeys,
          createdAt: timestamp,
          title: data.title,
          description: data.description
        })
      }));
      executionArn = sfnResponse.executionArn || '';
    }

    logger.info('Incident created and workflow triggered', {
      requestId,
      incidentId,
      executionArn
    });

    // Return 202 Accepted per Section 4 & 8
    return jsonResponse(202, {
      incidentId,
      executionArn,
      status: 'RECIBIDO',
      isProcessing: true,
      message: 'Incidente recibido y en procesamiento de validación y duplicados'
    }, requestId);
  } catch (error) {
    logger.error('Error al crear incidente', error, { requestId });
    return jsonResponse(500, 'Error al registrar el reporte', requestId);
  }
}

