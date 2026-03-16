import { NextResponse } from 'next/server';
import db, { getDbReady } from '@/lib/db';

export async function GET() {
  try {
    await getDbReady();
    const categories = await db('expenses')
      .distinct('category')
      .whereNotNull('category')
      .orderBy('category', 'asc');

    // Extract just the string array
    const categoryList = categories.map(c => c.category);

    return NextResponse.json({ categories: categoryList });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}
