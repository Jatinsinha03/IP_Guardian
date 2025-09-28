#!/usr/bin/env node

import "dotenv/config";
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { WalrusClient, RetryableWalrusClientError } from '@mysten/walrus';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create keypair from environment variable
const secretKey = process.env.SUI_SECRET_KEY;

if (!secretKey) {
  console.error('❌ SUI_SECRET_KEY environment variable is required');
  process.exit(1);
}

// Parse the secret key and create keypair
let keypair;
try {
  console.log('🔑 Secret key length:', secretKey.length);
  console.log('🔑 Secret key preview:', secretKey.substring(0, 20) + '...');
  
  // Try to decode and create keypair using the same logic as working scripts
  // First try Sui private key format (most common)
  try {
    const { secretKey: decodedSecretKey } = decodeSuiPrivateKey(secretKey);
    if (!decodedSecretKey || decodedSecretKey.length !== 32) {
      throw new Error(`Invalid decoded secret key length: ${decodedSecretKey?.length}, expected 32`);
    }
    keypair = Ed25519Keypair.fromSecretKey(decodedSecretKey);
  } catch {
    // Fallback: try other formats
    if (secretKey.startsWith('0x')) {
      // Hex format private key
      const privateKeyBytes = new Uint8Array(Buffer.from(secretKey.slice(2), 'hex'));
      if (privateKeyBytes.length !== 32) {
        throw new Error(`Invalid private key length: ${privateKeyBytes.length}, expected 32`);
      }
      keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
    } else {
      // Try direct base64 or hex decoding
      let privateKeyBytes;
      
      try {
        // Try as base64
        privateKeyBytes = new Uint8Array(Buffer.from(secretKey, 'base64'));
      } catch {
        try {
          // Try as hex
          const cleanSecret = secretKey.replace(/^0x/, '');
          privateKeyBytes = new Uint8Array(Buffer.from(cleanSecret, 'hex'));
        } catch {
          throw new Error('Could not decode private key. Ensure it is Sui, base64 or hex formatted.');
        }
      }
      
      if (privateKeyBytes.length !== 32) {
        throw new Error(`Invalid private key length: ${privateKeyBytes.length}, expected 32`);
      }
      keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
    }
  }
  
  console.log('✅ Keypair created successfully');
} catch (error) {
  console.error('❌ Error creating keypair from secret key:', error);
  console.error('❌ Secret key length:', secretKey.length);
  console.error('❌ Secret key preview:', secretKey.substring(0, 20) + '...');
  process.exit(1);
}

async function uploadToWalrus(filePath) {
  try {
    console.log("🚀 Starting Walrus upload...");
    
    // Read file
    const fileContents = readFileSync(filePath);
    console.log(`📄 File loaded: ${fileContents.length} bytes`);

    // Create WalrusClient
    const walrusClient = new SuiClient({
      url: getFullnodeUrl('testnet'),
      network: 'testnet',
    }).$extend(
      WalrusClient.experimental_asClientExtension({
        uploadRelay: {
          host: 'https://upload-relay.testnet.walrus.space',
          sendTip: {
            max: 10_000,
          },
        },
        storageNodeClientOptions: {
          timeout: 90_000,
          onError: (error) => console.log('📡 Storage node error:', error.message),
        },
      }),
    );

    console.log("✅ WalrusClient created with upload relay");

    // Upload to Walrus
    let result;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        console.log(`📤 Upload attempt ${attempts + 1}/${maxAttempts}...`);
        
        result = await walrusClient.walrus.writeBlob({
          blob: new Uint8Array(fileContents),
          epochs: 5,
          deletable: true,
          signer: keypair,
        });

        console.log(`✅ Upload succeeded on attempt ${attempts + 1}`);
        break;

      } catch (error) {
        attempts++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.warn(`⚠️ Upload attempt ${attempts}/${maxAttempts} failed:`, errorMessage);

        if (error instanceof RetryableWalrusClientError) {
          console.log("🔄 Retryable error detected, resetting client...");
          walrusClient.walrus.reset();
        }
        
        if (attempts < maxAttempts) {
          const delayMs = attempts * 3000;
          console.log(`🔄 Retrying in ${delayMs / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    if (!result || !result.blobId) {
      throw new Error("Upload failed after all retries");
    }

    console.log("🎉 Walrus upload successful! Blob ID:", result.blobId);
    return result.blobId;
    
  } catch (error) {
    console.error('❌ Walrus upload error:', error);
    throw error;
  }
}

async function downloadFromWalrus(blobId) {
  try {
    console.log("📥 Starting Walrus download for blob:", blobId);
    
    // Create WalrusClient
    const walrusClient = new SuiClient({
      url: getFullnodeUrl('testnet'),
      network: 'testnet',
    }).$extend(
      WalrusClient.experimental_asClientExtension({
        uploadRelay: {
          host: 'https://upload-relay.testnet.walrus.space',
          sendTip: {
            max: 10_000,
          },
        },
        storageNodeClientOptions: {
          timeout: 90_000,
          onError: (error) => console.log('📡 Storage node error:', error.message),
        },
      }),
    );

    // Download from Walrus
    const fileContents = await walrusClient.walrus.readBlob({ blobId });
    
    console.log("✅ Walrus download successful! Size:", fileContents.length, "bytes");
    return fileContents;
    
  } catch (error) {
    console.error('❌ Walrus download error:', error);
    throw error;
  }
}

// Command line interface
const command = process.argv[2];
const arg = process.argv[3];

if (command === 'upload' && arg) {
  uploadToWalrus(arg)
    .then(blobId => {
      console.log('🎉 Upload completed successfully!');
      console.log('Blob ID:', blobId);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Upload failed:', error);
      process.exit(1);
    });
} else if (command === 'download' && arg) {
  downloadFromWalrus(arg)
    .then(fileContents => {
      const outputPath = join(__dirname, `downloaded-${arg}.bin`);
      writeFileSync(outputPath, Buffer.from(fileContents));
      console.log('🎉 Download completed successfully!');
      console.log('File saved to:', outputPath);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Download failed:', error);
      process.exit(1);
    });
} else {
  console.log('Usage:');
  console.log('  node walrus-upload.js upload <file-path>');
  console.log('  node walrus-upload.js download <blob-id>');
  process.exit(1);
}
