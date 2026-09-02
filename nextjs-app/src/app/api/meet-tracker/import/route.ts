import { NextResponse } from 'next/server';
import { z } from 'zod';
import { meetStorage } from '@/lib/meet-storage';
import { insertMeetLeadSchema } from '@/shared/meet-schema';

export const dynamic = 'force-dynamic';

const importSchema = z.object({
  leads: z.array(insertMeetLeadSchema).min(1, 'Nothing to import').max(2000, 'Too many rows in one go (max 2000)'),
});

/**
 * Bulk create from a spreadsheet import. Rows are independent: one bad row
 * is reported back rather than losing the whole batch.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { leads } = importSchema.parse(body);

    let created = 0;
    const failed: { firmName: string; reason: string }[] = [];

    for (const lead of leads) {
      try {
        await meetStorage.create(lead);
        created++;
      } catch (err) {
        failed.push({
          firmName: lead.firmName,
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({ created, failed }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { message: err.errors[0]?.message || 'Validation error', field: err.errors[0]?.path.join('.') },
        { status: 400 },
      );
    }
    console.error('[API] Meet tracker import failed:', err);
    return NextResponse.json({ message: err.message || 'Import failed' }, { status: 500 });
  }
}
