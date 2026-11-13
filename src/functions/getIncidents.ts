import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { extractAuth, jsonResponse } from '../shared/auth.js';
import { docClient, TABLE_NAME } from './dynamoHelpers.js';
import { logger } from '../shared/logger.js';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext.requestId;
  const auth = extractAuth(event);

  const queryParams = event.queryStringParameters || {};
  const isMine = event.rawPath.includes('/me/incidents') || queryParams.mine === 'true';
  const statusFilter = queryParams.status;
  const areaFilter = queryParams.areaId;
  const categoryFilter = queryParams.category;
  const limit = Math.min(parseInt(queryParams.limit || '20', 10), 50);

  let exclusiveStartKey: Record<string, unknown> | undefined;
  if (queryParams.nextToken) {
    try {
      exclusiveStartKey = JSON.parse(Buffer.from(queryParams.nextToken, 'base64').toString('utf8'));
    } catch {
      // ignore invalid token
    }
  }

  try {
    let command: QueryCommand;

    if (isMine) {
      if (!auth.sub || auth.sub === 'anonymous') {
        return jsonResponse(401, 'No autenticado para ver reportes propios.', requestId);
      }
      command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :userPk',
        ExpressionAttributeValues: {
          ':userPk': `USER#${auth.sub}`
        },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey
      });
    } else if (areaFilter && categoryFilter) {
      command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :areaCat',
        ExpressionAttributeValues: {
          ':areaCat': `AREA#${areaFilter}#CAT#${categoryFilter}`
        },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey
      });
    } else {
      // Default: Status index (e.g. RECIBIDO, EN_REVISION, etc.)
      const targetStatus = statusFilter || 'RECIBIDO';
      command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :st',
        ExpressionAttributeValues: {
          ':st': `STATUS#${targetStatus}`
        },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey
      });
    }

    const response = await docClient.send(command);
    const items = response.Items || [];

    let nextToken: string | undefined;
    if (response.LastEvaluatedKey) {
      nextToken = Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString('base64');
    }

    return jsonResponse(200, {
      items,
      nextToken,
      count: items.length
    }, requestId);
  } catch (error) {
    logger.error('Error al listar incidentes', error, { requestId });
    return jsonResponse(500, 'Error al consultar la lista de incidentes', requestId);
  }
}

