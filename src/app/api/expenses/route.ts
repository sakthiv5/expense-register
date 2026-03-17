import { NextRequest, NextResponse } from 'next/server';
import db, { getDbReady } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

// Ensure the uploads directory exists
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

async function ensureUploadsDir() {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    await getDbReady();
    const formData = await request.formData();
    
    const amount = formData.get('amount') as string;
    const date = formData.get('date') as string;
    const category = formData.get('category') as string;
    const tag = formData.get('tag') as string;
    const receipt = formData.get('receipt') as File | null;

    if (!amount || !date || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let receiptPath = null;

    if (receipt && receipt.size > 0) {
      await ensureUploadsDir();
      
      // Keep original file extension
      const originalName = receipt.name;
      const extension = path.extname(originalName) || '';
      
      // Create a unique filename to prevent collisions, but keep the extension intact
      // No compression or modification is done to the file buffer
      const filename = `${uuidv4()}${extension}`;
      const filepath = path.join(UPLOADS_DIR, filename);
      
      const arrayBuffer = await receipt.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Save exactly as uploaded
      await fs.writeFile(filepath, buffer);
      
      // Store the relative path in the DB
      receiptPath = `/uploads/${filename}`;
    }

    const result = await db('expenses').insert({
      amount: parseFloat(amount),
      date: date,
      category: category.trim(),
      tag: (tag || '').trim(),
      receipt_path: receiptPath
    }).returning('id');

    const id = typeof result[0] === 'object' ? result[0].id : result[0];

    return NextResponse.json({ success: true, id }, { status: 201 });

  } catch (error) {
    console.error('Failed to save expense:', error);
    return NextResponse.json({ error: 'Failed to save expense' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await getDbReady();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');

    const offset = (page - 1) * limit;

    let query = db('expenses').select('*');
    let countQuery = db('expenses').count('* as total');
    let sumQuery = db('expenses').sum('amount as totalAmount');

    if (startDate) {
      query = query.where('date', '>=', startDate);
      countQuery = countQuery.where('date', '>=', startDate);
      sumQuery = sumQuery.where('date', '>=', startDate);
    }

    if (endDate) {
      query = query.where('date', '<=', endDate);
      countQuery = countQuery.where('date', '<=', endDate);
      sumQuery = sumQuery.where('date', '<=', endDate);
    }

    if (category) {
      query = query.where('category', category);
      countQuery = countQuery.where('category', category);
      sumQuery = sumQuery.where('category', category);
    }

    if (tag) {
      query = query.where('tag', tag);
      countQuery = countQuery.where('tag', tag);
      sumQuery = sumQuery.where('tag', tag);
    }

    const rawExpenses = await query.orderBy('date', 'desc').orderBy('id', 'desc').limit(limit).offset(offset);
    const expenses = rawExpenses.map((e: Record<string, unknown>) => ({ ...e, amount: Number(e.amount) }));
    const [{ total }] = await countQuery;
    const [{ totalAmount }] = await sumQuery;

    return NextResponse.json({ 
      expenses, 
      totalAmount: Number(totalAmount) || 0,
      pagination: {
        total: Number(total),
        page,
        limit,
        totalPages: Math.ceil(Number(total) / limit)
      }
    });

  } catch (error) {
    console.error('Failed to fetch expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}
