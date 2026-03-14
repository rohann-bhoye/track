import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { deleteTaskRequestSchema } from '@/shared/schema';
import { z } from 'zod';

export async function DELETE(req: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);
    
    const body = await req.json();
    const { secretCode } = deleteTaskRequestSchema.parse(body);

    const expectedCode = process.env.SECRET_CODE || "task123";
    if (secretCode !== expectedCode) {
      return NextResponse.json({ message: "Invalid secret code." }, { status: 401 });
    }

    await storage.permanentlyDeleteCompanyTasks(decodedName);
    return NextResponse.json({ success: true, message: `All tasks for ${decodedName} permanently deleted.` });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({
        message: (err as any).errors[0]?.message || "Validation Error",
        field: (err as any).errors[0]?.path.join('.'),
      }, { status: 400 });
    }
    console.error("Error permanently deleting company tasks:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
