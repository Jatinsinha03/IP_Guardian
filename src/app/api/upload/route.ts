import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadToWalrus } from '@/lib/walrus';
import { ContractService } from '@/lib/contract';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const price = formData.get('price') as string;
    const rentalPrice = formData.get('rentalPrice') as string;
    const isPublic = formData.get('isPublic') === 'true';
    const userAddress = formData.get('userAddress') as string;

    // Validation
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: 'File name is required' },
        { status: 400 }
      );
    }

    if (!userAddress) {
      return NextResponse.json(
        { error: 'User wallet address is required' },
        { status: 400 }
      );
    }

    // Get user from session (for now, we'll create a test user or use existing one)
    // In production, you'd get this from your authentication system
    let user = await prisma.user.findFirst();
    
    if (!user) {
      // Create a test user if none exists
      user = await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: 'hashed-password',
          firstName: 'Test',
          lastName: 'User',
        }
      });
    }
    
    const userId = user.id;

    // Convert file to Uint8Array
    const fileBuffer = await file.arrayBuffer();
    const fileContents = new Uint8Array(fileBuffer);

    console.log(`📄 File received: ${file.name}, ${fileContents.length} bytes`);

    // Upload to Walrus testnet
    const blobId = await uploadToWalrus(fileContents);
    console.log("✅ Blob ID from Walrus:", blobId);

    // Save file metadata to database
    const savedFile = await prisma.file.create({
      data: {
        name,
        originalName: file.name,
        blobId,
        size: fileContents.length,
        mimeType: file.type,
        description: description || null,
        price: price ? parseFloat(price) : null,
        isPublic,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      }
    });

    // Create item on blockchain (this will be handled by the frontend with wallet)
    // We return the data needed for the frontend to create the blockchain item
    const blockchainData = {
      title: name,
      description: description || '',
      blobId,
      price: price ? ContractService.parseEther(price) : '0',
      rentalPrice: rentalPrice ? ContractService.parseEther(rentalPrice) : '0'
    };

    console.log('📊 API Upload - Blockchain data prepared:');
    console.log('- Title:', blockchainData.title);
    console.log('- Description:', blockchainData.description);
    console.log('- Blob ID:', blockchainData.blobId);
    console.log('- Price (raw):', price);
    console.log('- Price (wei):', blockchainData.price);
    console.log('- Rental Price (raw):', rentalPrice);
    console.log('- Rental Price (wei):', blockchainData.rentalPrice);

    return NextResponse.json(
      { 
        message: 'File uploaded successfully',
        file: savedFile,
        blobId,
        blockchainData
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
