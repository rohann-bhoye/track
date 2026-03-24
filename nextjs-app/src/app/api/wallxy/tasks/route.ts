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
    
    // We expect { description, proofLink } roughly.
    // For Wallxy, we force companyName = "Wallxy", status = "in_progress" (unassigned = no assignee but is fresh)
    const newTask = {
      companyName: "Wallxy",
      taskDate: new Date().toISOString().split('T')[0],
      description: body.description || "",
      proofLink: body.proofLink || "",
      proofLinks: body.proofLinks || [],
      screenshotGroups: body.screenshotGroups || [],
      boardFolder: body.boardFolder || null,
      status: "in_list", 
      assignee: null,
      dateOfJoin: "",
    };

    const createdTask = await storage.createTask(newTask);
    return NextResponse.json(createdTask, { status: 201 });
  } catch (error) {
    console.error(`[API] Failed to create Wallxy task:`, error);
    return NextResponse.json({ message: "Failed to create task" }, { status: 500 });
  }
}
