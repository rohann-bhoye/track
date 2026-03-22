import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { updateTaskStatusSchema } from '@/shared/schema';

const wallxyUpdateSchema = updateTaskStatusSchema.omit({ secretCode: true });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Parse updates without requiring a secret code
    const updates = wallxyUpdateSchema.parse(body);

    const updatedTask = await storage.updateTask(id, updates);
    return NextResponse.json(updatedTask);
  } catch (err: any) {
    console.error(`[API] Failed to update Wallxy task:`, err);
    return NextResponse.json({ message: err.message || "Failed to update" }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { secretCode } = await req.json();
    const expectedCode = process.env.SECRET_CODE || "task123";

    if (secretCode !== expectedCode) {
      return NextResponse.json({ message: "Invalid secret code" }, { status: 401 });
    }

    await storage.deleteTask(id);
    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (err: any) {
    console.error(`[API] Failed to delete Wallxy task:`, err);
    return NextResponse.json({ message: err.message || "Failed to delete" }, { status: 500 });
  }
}
