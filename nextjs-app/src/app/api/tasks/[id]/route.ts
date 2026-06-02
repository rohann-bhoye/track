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
    const { secretCode } = z.object({ secretCode: z.string().optional().nullable() }).parse(body);

    // 1. Fetch the task from Firestore to check if it has an assignee
    const { getDoc, doc } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    const taskDoc = await getDoc(doc(db, "tasks", id));

    if (!taskDoc.exists()) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const taskData = taskDoc.data();
    const hasAssignee = taskData && taskData.assignee && taskData.assignee.trim() !== "";

    if (hasAssignee) {
      const { getAssignedDeletePassword } = await import("@/lib/storage");
      const expectedCode = await getAssignedDeletePassword();

      if (secretCode !== expectedCode) {
        return NextResponse.json({ message: "Invalid delete password for assigned task." }, { status: 401 });
      }
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
