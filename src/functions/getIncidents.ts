import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { extractAuth, jsonResponse } from '../shared/auth.js';
import { docClient, TABLE_NAME } from './dynamoHelpers.js';
import { logger } from '../shared/logger.js';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.EVIDENCE_BUCKET_NAME || '';

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
    } else if (statusFilter) {
      command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :st',
        ExpressionAttributeValues: {
          ':st': `STATUS#${statusFilter}`
        },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey
      });
    } else {
      // Sin filtro de estado: retornar todos los incidentes recientes
      command = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'SK = :meta',
        ExpressionAttributeValues: {
          ':meta': 'META'
        },
        Limit: limit,
        ExclusiveStartKey: exclusiveStartKey
      }) as any;
    }

    const response = await docClient.send(command);
    const rawItems = response.Items || [];

    // Generar URLs firmadas para fotos de cada incidente (1 hora de vigencia)
    const items = await Promise.all(
      rawItems.map(async (item) => {
        if (!item.photoKeys || !Array.isArray(item.photoKeys) || item.photoKeys.length === 0 || !BUCKET_NAME) {
          return { ...item, photoUrls: item.photoUrls || [] };
        }
        const photoUrls: string[] = [];
        for (const key of item.photoKeys) {
          try {
            const url = await getSignedUrl(
              s3,
              new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key
              }),
              { expiresIn: 3600 }
            );
            photoUrls.push(url);
          } catch (err) {
            logger.warn('Could not generate presigned GET for key', { key, err });
          }
        }
        return { ...item, photoUrls };
      })
    );

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

