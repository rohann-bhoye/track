import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { insertMemberSchema } from '@/shared/schema';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const company = searchParams.get('company') || undefined;
    const members = await storage.getMembers(company);
    return NextResponse.json(members);
  } catch (error) {
    console.error(`[Members API] Failed to fetch members:`, error);
    return NextResponse.json({ message: "Failed to fetch members" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = insertMemberSchema.parse(body);
    const createdMember = await storage.createMember(data);
    return NextResponse.json(createdMember, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({
        message: (err as any).errors[0]?.message || "Validation error",
        field: (err as any).errors[0]?.path.join('.'),
      }, { status: 400 });
    }
    console.error("[POST /api/team-members] Unhandled error:", err);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { id, secretCode } = await req.json();
    const expectedCode = process.env.SECRET_CODE || "task123";

    if (!id) {
      return NextResponse.json({ message: "Member ID is required" }, { status: 400 });
    }

    if (secretCode !== expectedCode) {
      return NextResponse.json({ message: "Invalid secret code" }, { status: 401 });
    }

    await storage.deleteMember(id);
    return NextResponse.json({ message: "Member deleted successfully" });
  } catch (error) {
    console.error(`[Members API] Failed to delete member:`, error);
    return NextResponse.json({ message: "Failed to delete member" }, { status: 500 });
  }
}
