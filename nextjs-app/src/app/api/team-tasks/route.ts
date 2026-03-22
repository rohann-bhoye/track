import { NextResponse } from 'next/server';
import { teamStorage } from '@/lib/storage';
import { createTasksBulkRequestSchema } from '@/shared/schema';
import { z } from 'zod';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const company = searchParams.get('company') || undefined;
    console.log(`[Team API] Fetching tasks for company: ${company || "ALL"}`);
    const allTasks = await teamStorage.getTasks(company);
    console.log(`[Team API] Found ${allTasks.length} tasks`);
    return NextResponse.json(allTasks);
  } catch (error) {
    console.error(`[Team API] Failed to fetch tasks:`, error);
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
      dateOfJoin: data.dateOfJoin || "",
      taskDate: data.taskDate,
      description: t.description,
      status: t.status,
      startDate: t.startDate ?? null,
      endDate: t.endDate ?? null,
      checkInTime: t.checkInTime ?? null,
      checkOutTime: t.checkOutTime ?? null,
      proofLink: t.proofLink ?? null,
      nextWeekPlan: t.nextWeekPlan || null,
      assignee: t.assignee || null
    }));

    const createdTasks = await teamStorage.createTasks(insertTasks);
    return NextResponse.json(createdTasks, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({
        message: (err as any).errors[0]?.message || "Validation error",
        field: (err as any).errors[0]?.path.join('.'),
      }, { status: 400 });
    }
    console.error("[POST /api/team-tasks] Unhandled error:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
