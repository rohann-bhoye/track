import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export async function GET(req: Request) {
  try {
    // includeDeleted = true
    const tasks = await storage.getTasks(undefined, true);
    return NextResponse.json(tasks);
  } catch (err) {
    console.error("Error fetching deleted tasks:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
