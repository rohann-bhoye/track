import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { updateNextWeekPlanSchema } from '@/shared/schema';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = updateNextWeekPlanSchema.parse(body);
    
    // Authorization check
    const expectedCode = process.env.SECRET_CODE || "task123";
    if (data.secretCode !== expectedCode) {
      return NextResponse.json({ message: "Invalid secret code" }, { status: 401 });
    }

    // To set a plan standalone, we create a specialized task entry with no description 
    // This allows the existing Company Page logic to find the 'latest' plan easily.
    const planTask = {
      companyName: data.companyName,
      dateOfJoin: "", // Will be auto-filled by storage if not provided? Storage might need a fix or we just pass empty
      taskDate: data.taskDate,
      description: "Strategy Update",
      status: "in_progress",
      startDate: null,
      endDate: null,
      proofLink: null,
      nextWeekPlan: data.nextWeekPlan
    };

    const createdTask = await storage.createTask(planTask as any);
    return NextResponse.json(createdTask, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({
        message: (err as any).errors[0]?.message || "Validation error",
        field: (err as any).errors[0]?.path.join('.'),
      }, { status: 400 });
    }
    console.error("[POST /api/tasks/plan] Unhandled error:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
