import { NextRequest, NextResponse } from 'next/server';
import db, { getDbReady } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await getDbReady();
    const searchParams = request.nextUrl.searchParams;
    const categoryFilter = searchParams.get('category');

    let query = db('expenses').distinct('tag').whereNotNull('tag');

    // If category is provided, filter tags that were previously used with this category
    if (categoryFilter) {
      query = query.where('category', categoryFilter);
    }

    const tags = await query.orderBy('tag', 'asc');

    // Extract just the string array
    const tagList = tags.map(t => t.tag);

    return NextResponse.json({ tags: tagList });
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}
