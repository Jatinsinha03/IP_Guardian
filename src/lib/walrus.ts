// Walrus service for file uploads using separate Node.js process
import { writeFileSync, readFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function uploadToWalrus(fileContents: Uint8Array): Promise<string> {
  try {
    console.log("🚀 Starting Walrus upload via separate process...");
    
    // Create temporary file
    const tempDir = join(process.cwd(), 'temp');
    const tempFile = join(tempDir, `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.tmp`);
    
    // Ensure temp directory exists
    try {
      mkdirSync(tempDir, { recursive: true });
    } catch {
      // Directory might already exist
    }
    
    // Write file contents to temp file
    writeFileSync(tempFile, fileContents);
    console.log(`📄 Temporary file created: ${tempFile}`);

    // Execute Walrus upload script
    const scriptPath = join(process.cwd(), 'scripts', 'walrus-upload.js');
    const command = `node "${scriptPath}" upload "${tempFile}"`;
    
    console.log(`📤 Executing: ${command}`);
    const { stdout, stderr } = await execAsync(command);
    
    // Clean up temp file
    try {
      unlinkSync(tempFile);
    } catch (error) {
      console.warn('⚠️ Could not delete temp file:', error);
    }
    
    if (stderr) {
      console.warn('⚠️ Script stderr:', stderr);
    }
    
    // Extract blob ID from output
    const lines = stdout.split('\n');
    const blobIdLine = lines.find(line => line.startsWith('Blob ID:'));
    
    if (!blobIdLine) {
      throw new Error('Could not extract blob ID from script output');
    }
    
    const blobId = blobIdLine.replace('Blob ID:', '').trim();
    console.log("🎉 Walrus upload successful! Blob ID:", blobId);
    return blobId;
    
  } catch (error) {
    console.error('❌ Walrus upload error:', error);
    
    // Fallback to mock blob ID if Walrus fails
    const mockBlobId = `mock-blob-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log("⚠️ Using mock blob ID as fallback:", mockBlobId);
    return mockBlobId;
  }
}

export async function downloadFromWalrus(blobId: string): Promise<Uint8Array> {
  try {
    console.log("📥 Starting Walrus download for blob:", blobId);
    
    // Check if it's a mock blob ID
    if (blobId.startsWith('mock-blob-')) {
      throw new Error('Cannot download mock blob ID');
    }

    // Execute Walrus download script
    const scriptPath = join(process.cwd(), 'scripts', 'walrus-upload.js');
    const command = `node "${scriptPath}" download "${blobId}"`;
    
    console.log(`📥 Executing: ${command}`);
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.warn('⚠️ Script stderr:', stderr);
    }
    
    // Find the downloaded file
    const lines = stdout.split('\n');
    const filePathLine = lines.find(line => line.startsWith('File saved to:'));
    
    if (!filePathLine) {
      throw new Error('Could not find downloaded file path');
    }
    
    const filePath = filePathLine.replace('File saved to:', '').trim();
    const fileContents = readFileSync(filePath);
    
    // Clean up downloaded file
    try {
      unlinkSync(filePath);
    } catch (error) {
      console.warn('⚠️ Could not delete downloaded file:', error);
    }
    
    console.log("✅ Walrus download successful! Size:", fileContents.length, "bytes");
    return new Uint8Array(fileContents);
    
  } catch (error) {
    console.error('❌ Walrus download error:', error);
    throw error;
  }
}
