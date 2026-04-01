import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../lib/dynamodb';
import { success, serverError } from '../lib/response';

export async function handler(_event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    // Query the DateIndex GSI and project only the category attribute
    const categories = new Set<string>();
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
      const result = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'DateIndex',
        KeyConditionExpression: '#gsi1pk = :pk',
        ExpressionAttributeNames: { '#gsi1pk': 'GSI1PK' },
        ExpressionAttributeValues: { ':pk': 'ALL_EXPENSES' },
        ProjectionExpression: 'category',
        ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
      }));

      if (result.Items) {
        for (const item of result.Items) {
          if (item.category) {
            categories.add(item.category as string);
          }
        }
      }
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    const categoryList = Array.from(categories).sort();

    return success({ categories: categoryList });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return serverError('Failed to fetch categories');
  }
}
