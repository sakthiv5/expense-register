import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { QueryCommand, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../lib/dynamodb';
import { success, serverError, getQueryParam } from '../lib/response';

interface ExpenseItem {
  id: string;
  amount: number;
  date: string;
  category: string;
  tag: string;
  receiptKey: string | null;
  createdAt: string;
  GSI1SK: string;
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const page = parseInt(getQueryParam(event, 'page') || '1');
    const limit = parseInt(getQueryParam(event, 'limit') || '20');
    const startDate = getQueryParam(event, 'startDate');
    const endDate = getQueryParam(event, 'endDate');
    const category = getQueryParam(event, 'category');
    const tag = getQueryParam(event, 'tag');
    const search = getQueryParam(event, 'search');

    // Build the Query on the DateIndex GSI
    const expressionAttributeNames: Record<string, string> = {
      '#gsi1pk': 'GSI1PK',
    };
    const expressionAttributeValues: Record<string, unknown> = {
      ':pk': 'ALL_EXPENSES',
    };

    let keyConditionExpression = '#gsi1pk = :pk';

    // Date range filtering via sort key
    if (startDate && endDate) {
      keyConditionExpression += ' AND #gsi1sk BETWEEN :startKey AND :endKey';
      expressionAttributeNames['#gsi1sk'] = 'GSI1SK';
      expressionAttributeValues[':startKey'] = startDate;
      // Use ~ (tilde) which sorts after all alphanumeric chars to capture the entire end date
      expressionAttributeValues[':endKey'] = `${endDate}~`;
    } else if (startDate) {
      keyConditionExpression += ' AND #gsi1sk >= :startKey';
      expressionAttributeNames['#gsi1sk'] = 'GSI1SK';
      expressionAttributeValues[':startKey'] = startDate;
    } else if (endDate) {
      keyConditionExpression += ' AND #gsi1sk <= :endKey';
      expressionAttributeNames['#gsi1sk'] = 'GSI1SK';
      expressionAttributeValues[':endKey'] = `${endDate}~`;
    }

    // Build FilterExpression for category, tag, search
    const filterParts: string[] = [];

    if (category) {
      filterParts.push('#category = :category');
      expressionAttributeNames['#category'] = 'category';
      expressionAttributeValues[':category'] = category;
    }

    if (tag) {
      filterParts.push('#tag = :tag');
      expressionAttributeNames['#tag'] = 'tag';
      expressionAttributeValues[':tag'] = tag;
    }

    if (search) {
      filterParts.push('(contains(#category, :search) OR contains(#tag, :search))');
      if (!expressionAttributeNames['#category']) expressionAttributeNames['#category'] = 'category';
      if (!expressionAttributeNames['#tag']) expressionAttributeNames['#tag'] = 'tag';
      expressionAttributeValues[':search'] = search;
    }

    const filterExpression = filterParts.length > 0 ? filterParts.join(' AND ') : undefined;

    // We need to fetch ALL matching items to compute total count and sum,
    // then paginate in-memory. For a personal expense tracker this is fine.
    let allItems: ExpenseItem[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
      const params: QueryCommandInput = {
        TableName: TABLE_NAME,
        IndexName: 'DateIndex',
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ScanIndexForward: false, // newest first
        ...(filterExpression && { FilterExpression: filterExpression }),
        ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
      };

      const result = await docClient.send(new QueryCommand(params));
      if (result.Items) {
        allItems = allItems.concat(result.Items as ExpenseItem[]);
      }
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    // Compute totals
    const total = allItems.length;
    const totalAmount = allItems.reduce((sum, item) => sum + (item.amount || 0), 0);

    // In-memory pagination
    const offset = (page - 1) * limit;
    const paginatedItems = allItems.slice(offset, offset + limit);

    // Map to response format (match existing API shape)
    const expenses = paginatedItems.map((item) => ({
      id: item.id,
      amount: item.amount,
      date: item.date,
      category: item.category,
      tag: item.tag,
      receipt_path: item.receiptKey ? `/receipt/${item.receiptKey}` : null,
      created_at: item.createdAt,
    }));

    return success({
      expenses,
      totalAmount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to list expenses:', error);
    return serverError('Failed to fetch expenses');
  }
}
