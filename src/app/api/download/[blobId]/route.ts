import { NextRequest, NextResponse } from 'next/server';
import { downloadFromIPFS } from '@/lib/ipfs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ blobId: string }> }
) {
  try {
    const { blobId } = await params;

    if (!blobId) {
      return NextResponse.json(
        { error: 'Blob ID is required' },
        { status: 400 }
      );
    }

    // Check if it's a mock CID
    if (blobId.startsWith('mock-cid-')) {
      return NextResponse.json(
        { error: 'Mock CID - file not available for download' },
        { status: 404 }
      );
    }

    console.log(`📥 Downloading file with CID: ${blobId}`);

    // Download from IPFS
    const fileContents = await downloadFromIPFS(blobId);

    // Return the file as a response
    return new NextResponse(Buffer.from(fileContents), {
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
