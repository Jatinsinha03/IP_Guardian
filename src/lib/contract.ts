import { ethers } from 'ethers';
import abi from '../../utils/abi.json';

// Contract configuration
const CONTRACT_ADDRESS = "0x11BA8F022E7e6DF59Ae3a6Da0AAef6e5f3Ac9f8a";
const RPC_URL = 'https://rpc.sepolia.mantle.xyz';

// Types for contract interactions
export interface IPItem {
  itemId: number;
  title: string;
  description: string;
  blobId: string;
  owner: string;
  price: string;
  rentalPrice: string;
  isActive: boolean;
  createdAt: number;
  totalRentals: number;
  totalRevenue: string;
}

export interface Rental {
  rentalId: number;
  itemId: number;
  renter: string;
  startTime: number;
  endTime: number;
  amountPaid: string;
  isActive: boolean;
}

export interface OwnershipRecord {
  owner: string;
  timestamp: number;
  price: string;
}

// Raw contract return types
interface RawIPItem {
  itemId: bigint;
  title: string;
  description: string;
  blobId: string;
  owner: string;
  price: bigint;
  rentalPrice: bigint;
  isActive: boolean;
  createdAt: bigint;
  totalRentals: bigint;
  totalRevenue: bigint;
}


interface RawOwnershipRecord {
  owner: string;
  timestamp: bigint;
  price: bigint;
}

// Contract instance
let contract: ethers.Contract | null = null;

export function getContract(): ethers.Contract {
  if (!contract) {
    if (!CONTRACT_ADDRESS) {
      console.warn('Contract address not found in environment variables. Using mock contract.');
      // Return a mock contract for development
      const provider = new ethers.JsonRpcProvider('https://rpc.sepolia.mantle.xyz');
      contract = new ethers.Contract('0x0000000000000000000000000000000000000000', abi, provider);
    } else {
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
    }
  }
  
  return contract;
}

export function getContractWithSigner(signer: ethers.Signer): ethers.Contract {
  if (!CONTRACT_ADDRESS) {
    console.warn('Contract address not found in environment variables. Using mock contract.');
    // Return a mock contract for development
    return new ethers.Contract('0x0000000000000000000000000000000000000000', abi, signer);
  }

  return new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
}

// Contract validation function
export async function validateContract(): Promise<{ isValid: boolean; error?: string }> {
  try {
    if (!CONTRACT_ADDRESS) {
      return { isValid: false, error: 'No contract address configured' };
    }

    console.log('🔍 Validating contract at:', CONTRACT_ADDRESS);
    console.log('🔍 RPC URL:', RPC_URL);

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

    // Check if contract code exists at address
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === '0x') {
      return { isValid: false, error: 'No contract deployed at this address' };
    }

    // Try to call a simple view function
    try {
      const totalItems = await contract.getTotalItems();
      console.log('✅ Contract validation successful. Total items:', totalItems.toString());
      return { isValid: true };
    } catch (callError) {
      console.error('❌ Contract call failed:', callError);
      return { isValid: false, error: `Contract call failed: ${callError instanceof Error ? callError.message : 'Unknown error'}` };
    }
  } catch (error) {
    console.error('❌ Contract validation error:', error);
    return { isValid: false, error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Contract interaction functions
export class ContractService {
  private contract: ethers.Contract;
  private signer?: ethers.Signer;

  constructor(signer?: ethers.Signer) {
    this.signer = signer;
    this.contract = signer ? getContractWithSigner(signer) : getContract();
  }

  // Create a new IP item
  async createItem(
    title: string,
    description: string,
    blobId: string,
    price: string, // in wei
    rentalPrice: string // in wei per day
  ): Promise<number> {
    if (!this.signer) {
      throw new Error('Signer required for creating items');
    }

    console.log('Creating item with parameters:');
    console.log('- Title:', title);
    console.log('- Description:', description);
    console.log('- Blob ID:', blobId);
    console.log('- Price (wei):', price);
    console.log('- Rental Price (wei):', rentalPrice);
    console.log('- Contract address:', this.contract.target);
    console.log('- Signer address:', await this.signer.getAddress());

    // Validate contract before proceeding
    console.log('🔍 Validating contract deployment...');
    const validation = await validateContract();
    if (!validation.isValid) {
      throw new Error(`Contract validation failed: ${validation.error}`);
    }

    // Check network and account details
    let network;
    if (this.signer.provider) {
      network = await this.signer.provider.getNetwork();
      console.log('- Network:', network.name, '(Chain ID:', network.chainId.toString() + ')');
    }

    // Try to get balance, but handle network errors gracefully
    let balance;
    try {
      if (this.signer.provider) {
        balance = await this.signer.provider.getBalance(await this.signer.getAddress());
        console.log('- Account balance:', ethers.formatEther(balance), 'ETH');
      }
    } catch (error) {
      console.warn('⚠️ Could not get account balance (network issue):', error instanceof Error ? error.message : error);
      console.warn('⚠️ This might be a Mantle Sepolia network issue. Proceeding anyway...');
    }

    // Verify we're on the right network (Mantle Sepolia)
    if (network && network.chainId !== BigInt(5003)) {
      console.warn('⚠️ Warning: Not on Mantle Sepolia. Expected chain ID 5003, got:', network.chainId.toString());
    }

    // Check if contract is deployed
    let contractCode = '0x';
    try {
      if (this.signer.provider) {
        contractCode = await this.signer.provider.getCode(this.contract.target);
      }
      if (contractCode === '0x') {
        throw new Error('Contract not deployed at address: ' + this.contract.target);
      }
      console.log('- Contract deployed: Yes (bytecode length:', contractCode.length, 'characters)');
    } catch (error) {
      console.warn('⚠️ Could not check contract deployment (network issue):', error instanceof Error ? error.message : error);
      console.warn('⚠️ Proceeding anyway - this might be a Mantle Sepolia testnet state issue...');
    }

    // Convert price and rentalPrice to BigInt for ethers v6
    const priceBigInt = BigInt(price);
    const rentalPriceBigInt = BigInt(rentalPrice);

    console.log('- Price (BigInt):', priceBigInt.toString());
    console.log('- Rental Price (BigInt):', rentalPriceBigInt.toString());

    // Estimate gas first
    console.log('🔍 Estimating gas for createItem...');
    let gasEstimate;
    try {
      gasEstimate = await this.contract.createItem.estimateGas(
        title,
        description,
        blobId,
        priceBigInt,
        rentalPriceBigInt
      );
      console.log('✅ Gas estimation successful:', gasEstimate.toString());
    } catch (error) {
      console.error('❌ Gas estimation failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: error instanceof Error && 'code' in error ? error.code : undefined,
        reason: error instanceof Error && 'reason' in error ? error.reason : undefined,
        data: error instanceof Error && 'data' in error ? error.data : undefined
      });

      // Check if this is a network issue
      if (error instanceof Error && (error.message.includes('missing trie node') || error.message.includes('Internal JSON-RPC error'))) {
        console.warn('⚠️ Mantle Sepolia testnet appears to be having issues. This is a network problem, not a code issue.');
        console.warn('⚠️ The blockchain state is corrupted or incomplete.');
        throw new Error('Mantle Sepolia testnet is experiencing issues. Please try again later or contact 0G support.');
      }

      throw error;
    }

    // Add 20% buffer to gas estimate
    const gasLimit = gasEstimate * BigInt(120) / BigInt(100);

    console.log('Gas estimate:', gasEstimate.toString());
    console.log('Gas limit:', gasLimit.toString());

    // Try static call first to verify it will work
    // try {
    //   const staticResult = await this.contract.createItem.staticCall(
    //     title,
    //     description,
    //     blobId,
    //     priceBigInt,
    //     rentalPriceBigInt
    //   );
    //   console.log('Static call successful, expected item ID:', staticResult.toString());
    // } catch (error) {
    //   const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    //   console.error('Static call failed:', errorMessage);
    //   throw new Error(`Contract validation failed: ${errorMessage}`);
    // }

    const tx = await this.contract.createItem(
      title,
      description,
      blobId,
      priceBigInt,
      rentalPriceBigInt,
      { gasLimit }
    );

    console.log('Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmed in block:', receipt.blockNumber);

    let itemId: number | undefined;

    // Try to parse ItemCreated event from logs first (if available)
    if (receipt.logs && receipt.logs.length > 0) {
      try {
        const itemCreatedEvent = receipt.logs.find((log: ethers.Log) => {
          try {
            const parsedLog = this.contract.interface.parseLog(log);
            return parsedLog?.name === 'ItemCreated';
          } catch {
            return false;
          }
        });

        if (itemCreatedEvent) {
          const parsedLog = this.contract.interface.parseLog(itemCreatedEvent);
          if (parsedLog) {
            itemId = Number(parsedLog.args[0]);
            console.log('Item ID from event logs:', itemId);
          }
        }
      } catch (error) {
        console.warn('Failed to parse event logs, falling back to contract state:', error);
      }
    }

    // Fallback: Get the new total items count to determine the created item ID
    if (itemId === undefined) {
      try {
        console.log('Attempting to get total items from contract...');
        console.log('Contract address:', this.contract.target);
        console.log('RPC URL:', RPC_URL);

        const totalItems = await this.contract.getTotalItems();
        itemId = Number(totalItems);
        console.log('Item ID from contract state (fallback):', itemId);
      } catch (error) {
        console.error('Failed to get total items from contract:', error);
        console.error('This usually means:');
        console.error('1. Contract address is wrong or not deployed');
        console.error('2. ABI mismatch with deployed contract');
        console.error('3. Network/RPC issues');

        // As a last resort, assume item ID is 1 (first item)
        // This is not ideal but prevents complete failure
        console.warn('⚠️ Using fallback item ID = 1. Please verify contract deployment.');
        itemId = 1;
      }
    }

    console.log('Item created successfully with ID:', itemId);

    if (!tx.hash) throw new Error("Transaction failed to send");
    return itemId;
  }

  // Purchase an item
  async purchaseItem(itemId: number, value: string): Promise<void> {
    if (!this.signer) {
      throw new Error('Signer required for purchasing items');
    }

    const tx = await this.contract.purchaseItem(itemId, { value });
    await tx.wait();
    return;

  }

  // Rent an item
  async rentItem(
    itemId: number,
    startTime: number,
    endTime: number,
    value: string
  ): Promise<void> {
    if (!this.signer) {
      throw new Error('Signer required for renting items');
    }

    console.log('ContractService.rentItem called with:');
    console.log('- Item ID:', itemId);
    console.log('- Start Time:', startTime);
    console.log('- End Time:', endTime);
    console.log('- Value (wei):', value);
    console.log('- Contract address:', this.contract.target);
    console.log('- Signer address:', await this.signer.getAddress());

    const tx = await this.contract.rentItem(itemId, startTime, endTime, { value });
    console.log('Rental transaction sent:', tx.hash);
    await tx.wait();
    console.log('Rental transaction confirmed');
  }

  // Update item prices
  async updateItemPrices(
    itemId: number,
    newPrice: string,
    newRentalPrice: string
  ): Promise<void> {
    if (!this.signer) {
      throw new Error('Signer required for updating prices');
    }

    const tx = await this.contract.updateItemPrices(itemId, newPrice, newRentalPrice);
    await tx.wait();
  }

  // Deactivate an item
  async deactivateItem(itemId: number): Promise<void> {
    if (!this.signer) {
      throw new Error('Signer required for deactivating items');
    }

    const tx = await this.contract.deactivateItem(itemId);
    await tx.wait();
  }

  // Get item details
  async getItem(itemId: number): Promise<IPItem> {
    const item = await this.contract.getItem(itemId);
    return {
      itemId: Number(item.itemId),
      title: item.title,
      description: item.description,
      blobId: item.blobId,
      owner: item.owner,
      price: item.price.toString(),
      rentalPrice: item.rentalPrice.toString(),
      isActive: item.isActive,
      createdAt: Number(item.createdAt),
      totalRentals: Number(item.totalRentals),
      totalRevenue: item.totalRevenue.toString()
    };
  }

  // Get rental details
  async getRental(rentalId: number): Promise<Rental> {
    const rental = await this.contract.getRental(rentalId);
    return {
      rentalId: Number(rental.rentalId),
      itemId: Number(rental.itemId),
      renter: rental.renter,
      startTime: Number(rental.startTime),
      endTime: Number(rental.endTime),
      amountPaid: rental.amountPaid.toString(),
      isActive: rental.isActive
    };
  }

  // Get active items (paginated)
  async getActiveItems(offset: number = 0, limit: number = 20): Promise<IPItem[]> {
    try {
      const items = await this.contract.getActiveItems(offset, limit);
      return items.map((item: RawIPItem) => ({
        itemId: Number(item.itemId),
        title: item.title,
        description: item.description,
        blobId: item.blobId,
        owner: item.owner,
        price: item.price.toString(),
        rentalPrice: item.rentalPrice.toString(),
        isActive: item.isActive,
        createdAt: Number(item.createdAt),
        totalRentals: Number(item.totalRentals),
        totalRevenue: item.totalRevenue.toString()
      }));
    } catch (error) {
      console.warn('Failed to load active items from contract:', error);
      // Return empty array if contract is not available
      return [];
    }
  }

  // Get user's items
  async getUserItems(userAddress: string): Promise<number[]> {
    try {
      const itemIds = await this.contract.getUserItems(userAddress);
      return itemIds.map((id: bigint) => Number(id));
    } catch (error) {
      console.warn('Failed to load user items from contract:', error);
      return [];
    }
  }

  // Get user's rentals
  async getUserRentals(userAddress: string): Promise<number[]> {
    try {
      const rentalIds = await this.contract.getUserRentals(userAddress);
      return rentalIds.map((id: bigint) => Number(id));
    } catch (error) {
      console.warn('Failed to load user rentals from contract:', error);
      return [];
    }
  }

  // Get item renters
  async getItemRenters(itemId: number): Promise<string[]> {
    return await this.contract.getItemRenters(itemId);
  }

  // Get ownership history
  async getOwnershipHistory(itemId: number): Promise<OwnershipRecord[]> {
    const history = await this.contract.getOwnershipHistory(itemId);
    return history.map((record: RawOwnershipRecord) => ({
      owner: record.owner,
      timestamp: Number(record.timestamp),
      price: record.price.toString()
    }));
  }

  // Check if user has active rental
  async hasActiveRental(itemId: number, userAddress: string): Promise<boolean> {
    try {
      console.log(`Checking active rental for item ${itemId} and user ${userAddress}`);
      const result = await this.contract.hasActiveRental(itemId, userAddress);
      console.log(`Active rental result:`, result);
      return result;
    } catch (error) {
      console.warn('Failed to check active rental from contract:', error);
      return false;
    }
  }

  // Get total items count
  async getTotalItems(): Promise<number> {
    try {
      const total = await this.contract.getTotalItems();
      return Number(total);
    } catch (error) {
      console.warn('Failed to get total items from contract:', error);
      return 0;
    }
  }

  // Get total rentals count
  async getTotalRentals(): Promise<number> {
    try {
      const total = await this.contract.getTotalRentals();
      return Number(total);
    } catch (error) {
      console.warn('Failed to get total rentals from contract:', error);
      return 0;
    }
  }

  // Utility functions
  static formatEther(wei: string): string {
    return ethers.formatEther(wei);
  }

  static parseEther(ether: string): string {
    return ethers.parseEther(ether).toString();
  }

  static formatUnits(value: string, decimals: number = 18): string {
    return ethers.formatUnits(value, decimals);
  }

  static parseUnits(value: string, decimals: number = 18): string {
    return ethers.parseUnits(value, decimals).toString();
  }
}
