import { NextRequest, NextResponse } from 'next/server';
import { downloadFromWalrus } from '@/lib/walrus';

export async function GET(
  request: NextRequest,
  { params }: { params: { blobId: string } }
) {
  try {
    const { blobId } = params;

    if (!blobId) {
      return NextResponse.json(
        { error: 'Blob ID is required' },
        { status: 400 }
      );
    }

    // Check if it's a mock blob ID
    if (blobId.startsWith('mock-blob-')) {
      return NextResponse.json(
        { error: 'Mock blob ID - file not available for download' },
        { status: 404 }
      );
    }

    console.log(`📥 Downloading file with blob ID: ${blobId}`);

    // Download from Walrus
    const fileContents = await downloadFromWalrus(blobId);

    // Return the file as a response
    return new NextResponse(fileContents, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="file-${blobId}"`,
        'Content-Length': fileContents.length.toString(),
      },
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
