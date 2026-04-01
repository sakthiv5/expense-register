import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../lib/dynamodb';
import { deleteObject } from '../lib/s3';
import { success, notFound, serverError } from '../lib/response';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const id = event.pathParameters?.id;

    if (!id) {
      return notFound('Expense not found');
    }

    // Fetch the item first to check existence and get receiptKey
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `EXPENSE#${id}`,
        SK: `EXPENSE#${id}`,
      },
    }));

    if (!result.Item) {
      return notFound('Expense not found');
    }

    // Delete S3 receipt if it exists
    if (result.Item.receiptKey) {
      try {
        await deleteObject(result.Item.receiptKey);
      } catch (err) {
        console.warn('Failed to delete receipt from S3, continuing:', err);
      }
    }

    // Delete the DynamoDB item
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `EXPENSE#${id}`,
        SK: `EXPENSE#${id}`,
      },
    }));

    return success({ success: true });
  } catch (error) {
    console.error('Failed to delete expense:', error);
    return serverError('Failed to delete expense');
  }
}
