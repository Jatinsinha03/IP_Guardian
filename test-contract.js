import { ethers } from 'ethers';
import fs from 'fs';
const abi = JSON.parse(fs.readFileSync('./utils/abi.json', 'utf8'));

// Configuration
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x11BA8F022E7e6DF59Ae3a6Da0AAef6e5f3Ac9f8a";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.sepolia.mantle.xyz';

async function testContract() {
  console.log('🧪 Testing contract connection...');
  console.log('Contract Address:', CONTRACT_ADDRESS);
  console.log('RPC URL:', RPC_URL);

  if (!CONTRACT_ADDRESS) {
    console.error('❌ NEXT_PUBLIC_CONTRACT_ADDRESS not set!');
    return;
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

    // Check if contract code exists
    console.log('📋 Checking contract code...');
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === '0x') {
      console.error('❌ No contract deployed at this address!');
      return;
    }
    console.log('✅ Contract code found, length:', code.length);

    // Test getTotalItems
    console.log('📊 Testing getTotalItems()...');
    const totalItems = await contract.getTotalItems();
    console.log('✅ getTotalItems() returned:', totalItems.toString());

    // Test getActiveItems
    console.log('📋 Testing getActiveItems()...');
    const activeItems = await contract.getActiveItems(0, 10);
    console.log('✅ getActiveItems() returned:', activeItems.length, 'items');

    console.log('🎉 Contract is working correctly!');

  } catch (error) {
    console.error('❌ Contract test failed:', error.message);
    console.error('💡 Possible issues:');
    console.error('   - Wrong contract address');
    console.error('   - Wrong network/RPC URL');
    console.error('   - ABI mismatch with deployed contract');
    console.error('   - Network connectivity issues');
  }
}

testContract();