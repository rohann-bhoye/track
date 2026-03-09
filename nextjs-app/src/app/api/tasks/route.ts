import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { createTasksBulkRequestSchema } from '@/shared/schema';
import { z } from 'zod';

export async function GET() {
  try {
    const allTasks = await storage.getTasks();
    return NextResponse.json(allTasks);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = createTasksBulkRequestSchema.parse(body);
    
    // Authorization check
    const expectedCode = process.env.SECRET_CODE || "task123";
    if (data.secretCode !== expectedCode) {
      return NextResponse.json({ message: "Invalid secret code" }, { status: 401 });
    }

    // Translate request back to InsertTask array
    const insertTasks = data.tasks.map(t => ({
      companyName: data.companyName,
      dateOfJoin: data.dateOfJoin,
      taskDate: data.taskDate,
      description: t.description,
      status: t.status,
      startDate: t.startDate ?? null,
      endDate: t.endDate ?? null
    }));

    const createdTasks = await storage.createTasks(insertTasks);
    return NextResponse.json(createdTasks, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({
        message: (err as any).errors[0]?.message || "Validation error",
        field: (err as any).errors[0]?.path.join('.'),
      }, { status: 400 });
    }
    console.error("[POST /api/tasks] Unhandled error:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
