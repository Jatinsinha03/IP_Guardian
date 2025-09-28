import "dotenv/config";
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { WalrusClient, RetryableWalrusClientError } from '@mysten/walrus';
import { writeFileSync } from "fs";

async function downloadBlobById() {
  console.log("🔍 Testing different Walrus client configurations...");
  
  // Try different approaches
  const approaches = [
    {
      name: "Upload Relay Method",
      client: new SuiClient({
        url: getFullnodeUrl('testnet'),
        network: 'testnet',
      }).$extend(
        WalrusClient.experimental_asClientExtension({
          uploadRelay: {
            host: 'https://upload-relay.testnet.walrus.space',
            sendTip: { max: 10_000 },
          },
          storageNodeClientOptions: {
            timeout: 30_000, // Reduced timeout
            onError: (error) => console.log('📡 Storage node error:', error.message),
          },
        }),
      )
    },
    {
      name: "Direct Client Method",
      client: new SuiClient({
        url: getFullnodeUrl('testnet'),
        network: 'testnet',
      }).$extend(
        WalrusClient.experimental_asClientExtension({
          storageNodeClientOptions: {
            timeout: 30_000,
            onError: (error) => console.log('📡 Direct storage error:', error.message),
          },
        }),
      )
    }
  ];

  for (const approach of approaches) {
    console.log(`\n🔄 Trying ${approach.name}...`);
    
    try {
      await attemptDownload(approach.client, approach.name);
      return; // Success, exit
    } catch (error) {
      console.warn(`❌ ${approach.name} failed:`, error instanceof Error ? error.message : error);
      continue; // Try next approach
    }
  }
  
  console.error("❌ All download approaches failed");
}

async function attemptDownload(walrusClient: any, methodName: string) {
  console.log(`✅ ${methodName} client created`);

  // The blob ID to download
  const blobId = "SxBnbtaYl9w90hBVRg9JTDIG_L4EtYvX0kO7WRS85Y4";
  console.log(`📥 Downloading blob ID: ${blobId}`);

  // First, let's check if the blob exists
  try {
    console.log("🔍 Checking blob existence...");
    const blobInfo = await walrusClient.walrus.getBlob({ blobId });
    console.log("✅ Blob found:", blobInfo);
  } catch (error) {
    console.warn("⚠️ Could not get blob info:", error instanceof Error ? error.message : error);
  }

  let retrievalAttempts = 0;
  const maxRetrievalAttempts = 2; // Reduced attempts

  while (retrievalAttempts < maxRetrievalAttempts) {
    try {
      console.log(`📥 Retrieval attempt ${retrievalAttempts + 1}/${maxRetrievalAttempts}...`);
      
      // Use readBlob method via extended client's walrus property
      const retrievedContents = await walrusClient.walrus.readBlob({ blobId });
      
      console.log("📄 PDF file retrieved successfully! Size:", retrievedContents.length, "bytes");
      console.log("📋 First 10 bytes:", Array.from(retrievedContents.slice(0, 10)));

      // Save locally
      const outPath = "downloaded_test.pdf";
      writeFileSync(outPath, Buffer.from(retrievedContents));
      console.log(`💾 File saved locally as ${outPath}`);
      
      // Check PDF header
      const header = new TextDecoder().decode(retrievedContents.slice(0, 8));
      console.log(`📄 PDF header: "${header}"`);
      
      if (header.startsWith('%PDF')) {
        console.log("✅ PDF header is valid! File should be uncorrupted.");
      } else {
        console.warn("⚠️ PDF header may be invalid - file might be corrupted.");
      }
      
      // Simple checksum (ensure correct types)
      const checksum = Array.from(new Uint8Array(retrievedContents)).reduce(
        (a: number, b: number) => a + b,
        0
      );
      console.log(`🔢 File checksum: ${checksum}`);
      
      console.log("✅ Download completed successfully!");
      return; // Success

    } catch (error) {
      retrievalAttempts++;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.warn(`⚠️ Retrieval attempt ${retrievalAttempts}/${maxRetrievalAttempts} failed:`, errorMessage);
      
      // Handle retryable errors
      if (error instanceof RetryableWalrusClientError) {
        console.log("🔄 Retryable error during retrieval, resetting client...");
        walrusClient.walrus.reset();
      }
      
      if (retrievalAttempts < maxRetrievalAttempts) {
        const delayMs = retrievalAttempts * 3000; // Shorter delay
        console.log(`🔄 Retrying retrieval in ${delayMs / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw new Error(`All retrieval attempts failed for blob ID: ${blobId}`);
      }
    }
  }
}

// Run the download
downloadBlobById().catch((err) => {
  console.error("❌ Download error:", err);
  process.exit(1);
});
