import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { updateTaskStatusSchema, deleteTaskRequestSchema } from '@/shared/schema';
import { z } from 'zod';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updates = updateTaskStatusSchema.parse(body);

    const expectedCode = process.env.SECRET_CODE || "task123";
    if (updates.secretCode !== expectedCode) {
      return NextResponse.json({ message: "Invalid secret code." }, { status: 401 });
    }

    // Extract only the fields we actually want to update on the task
    const { secretCode, ...taskUpdates } = updates;
    const task = await storage.updateTask(id, taskUpdates);
    
    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }
    
    return NextResponse.json(task);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({
        message: (err as any).errors[0]?.message || "Validation Error",
        field: (err as any).errors[0]?.path.join('.'),
      }, { status: 400 });
    }
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { secretCode } = deleteTaskRequestSchema.parse(body);

    const expectedCode = process.env.SECRET_CODE || "task123";
    if (secretCode !== expectedCode) {
      return NextResponse.json({ message: "Invalid secret code." }, { status: 401 });
    }

    await storage.deleteTask(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({
        message: (err as any).errors[0]?.message || "Validation Error",
        field: (err as any).errors[0]?.path.join('.'),
      }, { status: 400 });
    }
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
