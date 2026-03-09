import { NextResponse } from 'next/server';
import { verifyCodeSchema } from '@/shared/schema';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input = verifyCodeSchema.parse(body);
    const expectedCode = process.env.SECRET_CODE || "task123";
    
    if (input.secretCode === expectedCode) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { message: "Invalid secret code" },
        { status: 401 }
      );
    }
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
