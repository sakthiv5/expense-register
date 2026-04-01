import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../lib/dynamodb';
import { success, serverError, getQueryParam } from '../lib/response';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const categoryFilter = getQueryParam(event, 'category');

    const tags = new Set<string>();
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    // Build filter for category if provided
    const expressionAttributeNames: Record<string, string> = {
      '#gsi1pk': 'GSI1PK',
    };
    const expressionAttributeValues: Record<string, unknown> = {
      ':pk': 'ALL_EXPENSES',
    };

    let filterExpression: string | undefined;
    if (categoryFilter) {
      filterExpression = '#category = :category';
      expressionAttributeNames['#category'] = 'category';
      expressionAttributeValues[':category'] = categoryFilter;
    }

    do {
      const result = await docClient.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'DateIndex',
        KeyConditionExpression: '#gsi1pk = :pk',
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ProjectionExpression: 'tag',
        ...(filterExpression && { FilterExpression: filterExpression }),
        ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
      }));

      if (result.Items) {
        for (const item of result.Items) {
          if (item.tag) {
            tags.add(item.tag as string);
          }
        }
      }
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    const tagList = Array.from(tags).sort();

    return success({ tags: tagList });
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return serverError('Failed to fetch tags');
  }
}
