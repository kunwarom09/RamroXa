import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No valid file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure public/uploads exists
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Build safe filename with timestamp prefix
    const originalName = file.name || 'uploaded_media.mp4';
    const ext = path.extname(originalName) || (file.type?.startsWith('video/') ? '.mp4' : '.jpg');
    const safeBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
    const fileName = `${Date.now()}_${safeBase}${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
      originalName,
      size: buffer.length,
      type: file.type || (ext.toLowerCase() === '.mp4' ? 'video/mp4' : 'application/octet-stream')
    });
  } catch (err) {
    console.error('API Upload error:', err);
    return NextResponse.json(
      { error: err.message || 'Server failed to save media file' },
      { status: 500 }
    );
  }
}
