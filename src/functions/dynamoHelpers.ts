import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const rawClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

export const docClient = DynamoDBDocumentClient.from(rawClient, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});

export const TABLE_NAME = process.env.TABLE_NAME || 'CivoraIncidents';

