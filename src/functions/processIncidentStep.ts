import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { QueryCommand, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { docClient, TABLE_NAME } from './dynamoHelpers.js';
import { findDuplicateCandidates } from '../shared/duplicates.js';
import { Incident } from '../shared/types.js';
import { logger } from '../shared/logger.js';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.EVIDENCE_BUCKET_NAME || '';

export interface StepInput {
  incidentId: string;
  createdBy: string;
  category: string;
  areaId: string;
  coordinates?: { latitude: number; longitude: number };
  photoKeys?: string[];
  createdAt: string;
  title: string;
  description: string;
}

export async function handler(input: StepInput) {
  const { incidentId, createdBy, category, areaId, coordinates, photoKeys = [], createdAt, title, description } = input;
  logger.info('Processing incident in Step Functions', { incidentId, category, areaId });

  // 1. Validate photos via HeadObject if present
  const validPhotoKeys: string[] = [];
  for (const key of photoKeys) {
    try {
      if (BUCKET_NAME) {
        await s3.send(new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key
        }));
        validPhotoKeys.push(key);
      } else {
        validPhotoKeys.push(key);
      }
    } catch (err) {
      logger.warn('Evidence object could not be verified in S3', { key, incidentId, err });
    }
  }

  // 2. Query DynamoDB for existing incidents with the same category
  // Using GSI1 (STATUS) or scan restricted by category
  let candidateList: Incident[] = [];
  try {
    const statusQuery = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :st',
      ExpressionAttributeValues: {
        ':st': 'STATUS#RECIBIDO'
      },
      Limit: 50
    }));

    if (statusQuery.Items) {
      candidateList = statusQuery.Items as Incident[];
    }
  } catch (err) {
    logger.warn('Could not query existing incidents for duplicate check', { err });
  }

  // 3. Find explainable duplicate candidates
  const currentSummary = {
    id: incidentId,
    title,
    description,
    category: category as Incident['category'],
    createdAt,
    areaId,
    coordinates
  };

  const duplicateCandidates = findDuplicateCandidates(currentSummary, candidateList);

  // 4. Update incident in DynamoDB: set isProcessing=false, valid photoKeys, and duplicate candidates
  const now = new Date().toISOString();
  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `INCIDENT#${incidentId}`,
      SK: 'META'
    },
    UpdateExpression: 'SET isProcessing = :proc, photoKeys = :pk, duplicateCandidates = :dc, updatedAt = :u',
    ExpressionAttributeValues: {
      ':proc': false,
      ':pk': validPhotoKeys,
      ':dc': duplicateCandidates,
      ':u': now
    }
  }));

  // 5. Append initial creation event to timeline
  const eventId = randomUUID().slice(0, 8);
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `INCIDENT#${incidentId}`,
      SK: `EVENT#${createdAt}#${eventId}`,
      eventId,
      incidentId,
      timestamp: createdAt,
      actorId: createdBy,
      actorRole: 'REPORTER',
      eventType: 'CREATED',
      toStatus: 'RECIBIDO',
      publicNote: 'Reporte recibido por el sistema y verificado.'
    }
  }));

  logger.info('Incident processing completed successfully', {
    incidentId,
    duplicateCandidatesFound: duplicateCandidates.length
  });

  return {
    incidentId,
    processed: true,
    duplicateCandidatesCount: duplicateCandidates.length
  };
}

