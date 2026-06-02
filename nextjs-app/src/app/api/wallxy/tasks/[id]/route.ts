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
    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (err: any) {
    console.error(`[API] Failed to delete Wallxy task:`, err);
    return NextResponse.json({ message: err.message || "Failed to delete" }, { status: 500 });
  }
}
