import "dotenv/config";
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { WalrusClient, RetryableWalrusClientError } from '@mysten/walrus';
import { keypair } from "./signer.js";
import { readFileSync, writeFileSync } from "fs";

async function main() {
  // Create WalrusClient using the upload relay method (your correct approach)
  const walrusClient = new SuiClient({
    url: getFullnodeUrl('testnet'),
    network: 'testnet',
  }).$extend(
    WalrusClient.experimental_asClientExtension({
      uploadRelay: {
        host: 'https://upload-relay.testnet.walrus.space',
        sendTip: {
          max: 10_000, // Increased max tip for better reliability
        },
      },
      storageNodeClientOptions: {
        timeout: 90_000,
        onError: (error) => console.log('📡 Storage node error:', error.message),
      },
    }),
  );

  console.log("✅ WalrusClient created with upload relay");

  // Read PDF file from the project folder
  let pdfContents;
  const pdfPath = "./test.pdf";
  
  try {
    pdfContents = readFileSync(pdfPath);
    console.log(`📄 PDF file loaded: ${pdfContents.length} bytes`);
    
    // Log first few bytes to verify file integrity
    console.log("📋 First 10 bytes:", Array.from(pdfContents.slice(0, 10)));
  } catch (error) {
    console.error(`❌ Could not read PDF file at ${pdfPath}. Please ensure the file exists.`);
    return;
  }

  console.log(`📦 Prepared file for upload: ${pdfContents.length} bytes`);
  console.log("📤 Uploading using writeBlob (no Quilt encoding)...");

  let result;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      // Use writeBlob method via extended client's walrus property
      // This avoids Quilt encoding and preserves file exactly
      result = await walrusClient.walrus.writeBlob({
        blob: new Uint8Array(pdfContents), // Ensure it's Uint8Array
        epochs: 5,
        deletable: true,
        signer: keypair,
      });

      console.log(`✅ Upload succeeded on attempt ${attempts + 1} via upload relay`);
      console.log("📊 Result:", result);
      break;

    } catch (error) {
      attempts++;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.warn(`⚠️ Upload attempt ${attempts}/${maxAttempts} failed:`, errorMessage);

      // Handle retryable errors as per SDK docs
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

  // Check results
  if (!result || !result.blobId) {
    console.error("❌ Upload failed after all retries. No results available.");
    return;
  }

  const blobId = result.blobId;
  console.log("✅ Blob ID:", blobId);

  // Wait a moment for the blob to propagate across nodes
  console.log("⏳ Waiting for blob propagation...");
  await new Promise(resolve => setTimeout(resolve, 8000));

  // Try retrieving the uploaded PDF using readBlob method
  console.log("📥 Attempting retrieval using readBlob...");
  let retrievalAttempts = 0;
  const maxRetrievalAttempts = 3;

  while (retrievalAttempts < maxRetrievalAttempts) {
    try {
      console.log(`📥 Retrieval attempt ${retrievalAttempts + 1}/${maxRetrievalAttempts}...`);
      
      // Use readBlob method via extended client's walrus property
      // This reads the raw blob data without Quilt decoding
      const retrievedContents = await walrusClient.walrus.readBlob({ blobId });
      
      console.log("📄 PDF file retrieved successfully! Size:", retrievedContents.length, "bytes");
      console.log("📋 First 10 bytes:", Array.from(retrievedContents.slice(0, 10)));

      // Save locally
      const outPath = "downloaded_clean.pdf";
      writeFileSync(outPath, Buffer.from(retrievedContents));
      console.log(`💾 File saved locally as ${outPath}`);
      
      // Comprehensive integrity check
      console.log("🔍 Performing integrity checks...");
      
      // Size check
      const sizeMatch = retrievedContents.length === pdfContents.length;
      console.log(`📏 Size check: ${sizeMatch ? '✅' : '❌'} (Original: ${pdfContents.length}, Retrieved: ${retrievedContents.length})`);
      
      if (sizeMatch) {
        // Byte-by-byte comparison for first 50 bytes
        let bytesMatch = true;
        for (let i = 0; i < Math.min(50, pdfContents.length); i++) {
          if (pdfContents[i] !== retrievedContents[i]) {
            bytesMatch = false;
            console.log(`❌ Byte mismatch at position ${i}: original=${pdfContents[i]}, retrieved=${retrievedContents[i]}`);
            break;
          }
        }
        
        if (bytesMatch) {
          console.log("✅ First 50 bytes match perfectly!");
          
          // Check PDF header
          const originalHeader = new TextDecoder().decode(pdfContents.slice(0, 8));
          const retrievedHeader = new TextDecoder().decode(retrievedContents.slice(0, 8));
          console.log(`📄 PDF header - Original: "${originalHeader}", Retrieved: "${retrievedHeader}"`);
          
          if (originalHeader === retrievedHeader && originalHeader.startsWith('%PDF')) {
            console.log("✅ PDF header is intact! File should be uncorrupted.");
          } else {
            console.warn("⚠️ PDF header mismatch - file may be corrupted.");
          }
          
          // Final hash comparison (simple checksum)
          const originalSum = Array.from(pdfContents).reduce((a, b) => a + b, 0);
          const retrievedSum = Array.from(retrievedContents).reduce((a, b) => a + b, 0);
          
          if (originalSum === retrievedSum) {
            console.log("✅ Checksum match - file integrity verified!");
          } else {
            console.warn(`⚠️ Checksum mismatch: original=${originalSum}, retrieved=${retrievedSum}`);
          }
        }
      }
      
      break;

    } catch (error) {
      retrievalAttempts++;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.warn(`⚠️ Retrieval attempt ${retrievalAttempts}/${maxRetrievalAttempts} failed:`, errorMessage);
      
      // Handle retryable errors for retrieval too
      if (error instanceof RetryableWalrusClientError) {
        console.log("🔄 Retryable error during retrieval, resetting client...");
        walrusClient.walrus.reset();
      }
      
      if (retrievalAttempts < maxRetrievalAttempts) {
        const delayMs = retrievalAttempts * 5000;
        console.log(`🔄 Retrying retrieval in ${delayMs / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.warn("⚠️ All retrieval attempts failed, but upload is valid.");
        console.log(`📋 Your blob ID is: ${blobId} - you can try retrieving it later.`);
      }
    }
  }
}

main().catch((err) => {
  console.error("❌ Main execution error:", err);
  process.exit(1);
});