import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    console.log(`[API] Fetching tasks for Wallxy`);
    const allTasks = await storage.getTasks("Wallxy", false);
    return NextResponse.json(allTasks);
  } catch (error) {
    console.error(`[API] Failed to fetch Wallxy tasks:`, error);
    return NextResponse.json({ message: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // We expect { description, proofLink, assignee, status } roughly.
    // If an assignee is provided, auto-set status to "in_progress" so task goes directly to their column.
    const assignee = body.assignee && body.assignee !== "none" ? body.assignee : null;
    const createdBy = body.createdBy && body.createdBy !== "none" ? body.createdBy : null;
    const newTask = {
      companyName: "Wallxy",
      taskDate: new Date().toISOString().split('T')[0],
      description: body.description || "",
      proofLink: body.proofLink || "",
      proofLinks: body.proofLinks || [],
      screenshotGroups: body.screenshotGroups || [],
      boardFolder: body.boardFolder || null,
      status: assignee ? "in_progress" : "in_list",
      assignee: assignee,
      createdBy: createdBy,
      dateOfJoin: "",
    };

    const createdTask = await storage.createTask(newTask);
    return NextResponse.json(createdTask, { status: 201 });
  } catch (error) {
    console.error(`[API] Failed to create Wallxy task:`, error);
    return NextResponse.json({ message: "Failed to create task" }, { status: 500 });
  }
}
