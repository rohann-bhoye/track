import { NextResponse } from 'next/server';
import { z } from 'zod';
import { meetStorage } from '@/lib/meet-storage';
import { updateMeetLeadSchema, logFollowUpSchema } from '@/shared/meet-schema';

export const dynamic = 'force-dynamic';

/**
 * PATCH handles two shapes:
 *   { followUp: {...} } -> append a call/meet outcome to the trail
 *   { ...fields }       -> plain edit of the lead
 * `restore: true` lifts a soft delete.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (body.restore === true) {
      await meetStorage.restore(id);
      return NextResponse.json({ success: true });
    }

    if (body.followUp) {
      const entry = logFollowUpSchema.parse(body.followUp);
      const updated = await meetStorage.logFollowUp(id, entry);
      return NextResponse.json(updated);
    }

    const updates = updateMeetLeadSchema.parse(body);
    const updated = await meetStorage.update(id, updates as any);
    return NextResponse.json(updated);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { message: err.errors[0]?.message || 'Validation error', field: err.errors[0]?.path.join('.') },
        { status: 400 },
      );
    }
    console.error('[API] Failed to update meet lead:', err);
    return NextResponse.json({ message: err.message || 'Failed to update lead' }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get('permanent') === '1';

    if (permanent) {
      await meetStorage.hardDelete(id);
    } else {
      await meetStorage.softDelete(id);
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API] Failed to delete meet lead:', err);
    return NextResponse.json({ message: err.message || 'Failed to delete lead' }, { status: 500 });
  }
}
