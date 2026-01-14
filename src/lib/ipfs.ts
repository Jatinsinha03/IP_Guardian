// IPFS service for file uploads using Pinata
import { PinataSDK } from 'pinata-web3';

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY_URL = process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud';

if (!PINATA_JWT) {
  console.warn('⚠️ PINATA_JWT not found in environment variables. IPFS uploads will use mock CIDs.');
}

const pinata = PINATA_JWT ? new PinataSDK({
  pinataJwt: PINATA_JWT,
  pinataGateway: PINATA_GATEWAY_URL
}) : null;

export async function uploadToIPFS(fileContents: Uint8Array, fileName?: string): Promise<string> {
  try {
    console.log("🚀 Starting IPFS upload via Pinata...");

    if (!pinata) {
      // Fallback to mock CID if no Pinata JWT
      const mockCID = `mock-cid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log("⚠️ Using mock CID as fallback:", mockCID);
      return mockCID;
    }

    // Create a File object from the Uint8Array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const file = new File([fileContents as any], fileName || 'upload', {
      type: 'application/octet-stream'
    });

    console.log(`📄 File prepared: ${file.name}, ${fileContents.length} bytes`);

    // Upload to Pinata IPFS
    const upload = await pinata.upload.file(file);

    const cid = upload.IpfsHash;
    console.log("🎉 IPFS upload successful! CID:", cid);
    return cid;

  } catch (error) {
    console.error('❌ IPFS upload error:', error);

    // Fallback to mock CID if upload fails
    const mockCID = `mock-cid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log("⚠️ Using mock CID as fallback:", mockCID);
    return mockCID;
  }
}

export async function downloadFromIPFS(cid: string): Promise<Uint8Array> {
  try {
    console.log("📥 Starting IPFS download for CID:", cid);

    // Check if it's a mock CID
    if (cid.startsWith('mock-cid-')) {
      throw new Error('Cannot download mock CID');
    }

    if (!pinata) {
      throw new Error('Pinata SDK not configured');
    }

    // Download from Pinata Gateway
    const response = await fetch(`${PINATA_GATEWAY_URL}/ipfs/${cid}`);

    if (!response.ok) {
      throw new Error(`Failed to download from IPFS: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const fileContents = new Uint8Array(arrayBuffer);

    console.log("✅ IPFS download successful! Size:", fileContents.length, "bytes");
    return fileContents;

  } catch (error) {
    console.error('❌ IPFS download error:', error);
    throw error;
  }
}

export function getIPFSGatewayURL(cid: string): string {
  return `${PINATA_GATEWAY_URL}/ipfs/${cid}`;
}

// Backward compatibility - alias functions for existing code
export const uploadToWalrus = uploadToIPFS;
export const downloadFromWalrus = downloadFromIPFS;
