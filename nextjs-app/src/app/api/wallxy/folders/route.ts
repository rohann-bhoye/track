import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const company = searchParams.get('company') || "Wallxy";
    const folders = await storage.getBoardFolders(company);
    return NextResponse.json(folders);
  } catch (error) {
    console.error(`[API] Failed to fetch board folders:`, error);
    return NextResponse.json({ message: "Failed to fetch folders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ message: "Folder name is required" }, { status: 400 });
    }
    
    const newFolder = await storage.createBoardFolder({
      name: body.name,
      companyName: body.companyName || "Wallxy",
    });
    
    return NextResponse.json(newFolder, { status: 201 });
  } catch (error) {
    console.error(`[API] Failed to create board folder:`, error);
    return NextResponse.json({ message: "Failed to create folder" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ message: "Folder ID is required" }, { status: 400 });
    }
    await storage.deleteBoardFolder(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`[API] Failed to delete board folder:`, error);
    return NextResponse.json({ message: "Failed to delete folder" }, { status: 500 });
  }
}
