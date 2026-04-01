import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { getPresignedPutUrl } from '../lib/s3';
import { success, badRequest, serverError, getQueryParam } from '../lib/response';
import path from 'path';

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  try {
    const filename = getQueryParam(event, 'filename');
    const contentType = getQueryParam(event, 'contentType') || 'application/octet-stream';

    if (!filename) {
      return badRequest('filename query parameter is required');
    }

    // Generate a unique S3 key preserving the file extension
    const ext = path.extname(filename) || '';
    const key = `receipts/${uuidv4()}${ext}`;

    const uploadUrl = await getPresignedPutUrl(key, contentType);

    return success({
      uploadUrl,
      key,
    });
  } catch (error) {
    console.error('Failed to generate presigned URL:', error);
    return serverError('Failed to generate upload URL');
  }
}
