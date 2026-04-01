import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, TABLE_NAME } from '../lib/dynamodb';
import { created, badRequest, serverError } from '../lib/response';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const body = JSON.parse(event.body || '{}');

    const { amount, date, category, tag, receiptKey } = body;

    if (!amount || !date || !category) {
      return badRequest('Missing required fields: amount, date, category');
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return badRequest('Amount must be a positive number');
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const item = {
      PK: `EXPENSE#${id}`,
      SK: `EXPENSE#${id}`,
      GSI1PK: 'ALL_EXPENSES',
      GSI1SK: `${date}#${id}`,
      id,
      amount: parsedAmount,
      date,
      category: category.trim(),
      tag: (tag || '').trim(),
      receiptKey: receiptKey || null,
      createdAt: now,
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }));

    return created({ success: true, id });
  } catch (error) {
    console.error('Failed to create expense:', error);
    return serverError('Failed to save expense');
  }
}
