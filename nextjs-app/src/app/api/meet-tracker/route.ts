import { NextResponse } from 'next/server';
import { z } from 'zod';
import { meetStorage } from '@/lib/meet-storage';
import { insertMeetLeadSchema } from '@/shared/meet-schema';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trash = searchParams.get('trash') === '1';
    const leads = await meetStorage.list(trash);
    return NextResponse.json(leads);
  } catch (error) {
    console.error('[API] Failed to fetch meet leads:', error);
    return NextResponse.json({ message: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = insertMeetLeadSchema.parse(body);
    const created = await meetStorage.create(input);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { message: err.errors[0]?.message || 'Validation error', field: err.errors[0]?.path.join('.') },
        { status: 400 },
      );
    }
    console.error('[API] Failed to create meet lead:', err);
    return NextResponse.json({ message: err.message || 'Failed to create lead' }, { status: 500 });
  }
}
