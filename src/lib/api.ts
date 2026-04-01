/**
 * API base URL configuration.
 * In development, set NEXT_PUBLIC_API_URL to your API Gateway URL or SAM local URL.
 * When empty, falls back to relative paths (for local Next.js API routes — legacy).
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export function apiUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}
