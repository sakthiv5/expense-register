import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../lib/dynamodb';
import { getPresignedGetUrl } from '../lib/s3';
import { success, notFound, serverError } from '../lib/response';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const id = event.pathParameters?.id;

    if (!id) {
      return notFound('Expense not found');
    }

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

    const item = result.Item;

    // Generate presigned URL for receipt if it exists
    let receiptUrl: string | null = null;
    if (item.receiptKey) {
      receiptUrl = await getPresignedGetUrl(item.receiptKey);
    }

    const expense = {
      id: item.id,
      amount: Number(item.amount),
      date: item.date,
      category: item.category,
      tag: item.tag,
      receipt_path: receiptUrl,
      created_at: item.createdAt,
    };

    return success({ expense });
  } catch (error) {
    console.error('Failed to fetch expense:', error);
    return serverError('Failed to fetch expense');
  }
}
