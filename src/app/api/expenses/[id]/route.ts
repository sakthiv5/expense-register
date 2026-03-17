import { NextRequest, NextResponse } from 'next/server';
import db, { getDbReady } from '@/lib/db';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getDbReady();
    const { id } = await params;
    const expense = await db('expenses').where('id', id).first();

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Ensure amount is a number (PG returns decimal as string)
    expense.amount = Number(expense.amount);

    return NextResponse.json({ expense });
  } catch (error) {
    console.error('Failed to fetch expense:', error);
    return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getDbReady();
    const { id } = await params;
    const expense = await db('expenses').where('id', id).first();

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Delete the receipt file if it exists
    if (expense.receipt_path) {
      const filePath = path.join(process.cwd(), expense.receipt_path);
      try {
        await fs.unlink(filePath);
      } catch {
        // File may not exist, ignore
      }
    }

    await db('expenses').where('id', id).del();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
