import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getConfigFilepath() {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'homepage-config.json');
}

export async function GET() {
  try {
    const filePath = getConfigFilepath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      return NextResponse.json({ success: true, data });
    }
    return NextResponse.json({ success: true, data: null });
  } catch (err) {
    console.error('Failed to read homepage config from server:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body || !Array.isArray(body.sections)) {
      return NextResponse.json({ success: false, error: 'Invalid config format: sections array is required' }, { status: 400 });
    }

    const filePath = getConfigFilepath();
    fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf-8');

    return NextResponse.json({ success: true, message: 'Homepage configuration saved successfully', data: body });
  } catch (err) {
    console.error('Failed to save homepage config to server:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const filePath = getConfigFilepath();
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return NextResponse.json({ success: true, message: 'Homepage config reset to default' });
  } catch (err) {
    console.error('Failed to delete homepage config:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
