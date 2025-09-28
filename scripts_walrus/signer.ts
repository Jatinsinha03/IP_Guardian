import dotenv from "dotenv";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

dotenv.config();

const secret = process.env.SUI_SECRET_KEY;
if (!secret) {
  throw new Error("Missing SUI_SECRET_KEY in .env");
}

let keypair: Ed25519Keypair;

try {
  // Try to decode and create keypair
  if (secret.startsWith('0x')) {
    // Hex format private key
    const privateKeyBytes = new Uint8Array(Buffer.from(secret.slice(2), 'hex'));
    if (privateKeyBytes.length !== 32) {
      throw new Error(`Invalid private key length: ${privateKeyBytes.length}, expected 32`);
    }
    keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
  } else if (secret.length === 66 && secret.startsWith('0x')) {
    // Remove 0x prefix and decode
    const privateKeyHex = secret.slice(2);
    const privateKeyBytes = new Uint8Array(Buffer.from(privateKeyHex, 'hex'));
    if (privateKeyBytes.length !== 32) {
      throw new Error(`Invalid private key length: ${privateKeyBytes.length}, expected 32`);
    }
    keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
  } else {
    // Try the Sui private key format
    try {
      const { secretKey } = decodeSuiPrivateKey(secret);
      if (!secretKey || secretKey.length !== 32) {
        throw new Error(`Invalid decoded secret key length: ${secretKey?.length}, expected 32`);
      }
      keypair = Ed25519Keypair.fromSecretKey(secretKey);
    } catch (decodeError) {
      // Fallback: try direct base64 or hex decoding
      let privateKeyBytes: Uint8Array;
      
      try {
        // Try as base64
        privateKeyBytes = new Uint8Array(Buffer.from(secret, 'base64'));
      } catch {
        try {
          // Try as hex
          const cleanSecret = secret.replace(/^0x/, '');
          privateKeyBytes = new Uint8Array(Buffer.from(cleanSecret, 'hex'));
        } catch {
          throw new Error('Could not decode private key. Ensure it is base64 or hex formatted.');
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
  console.error('❌ Failed to create keypair:', error);
  process.exit(1);
}

// Export the keypair itself (it acts as the signer)
export { keypair };
