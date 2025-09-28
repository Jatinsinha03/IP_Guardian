import { ethers } from 'ethers';
import abi from '../../utils/abi.json';

// Contract configuration
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY';

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

// Contract instance
let contract: ethers.Contract | null = null;

export function getContract(): ethers.Contract {
  if (!contract) {
    if (!CONTRACT_ADDRESS) {
      console.warn('Contract address not found in environment variables. Using mock contract.');
      // Return a mock contract for development
      const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/demo');
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
    
    // Check network and account details
    const network = await this.signer.provider.getNetwork();
    console.log('- Network:', network.name, '(Chain ID:', network.chainId.toString() + ')');
    
    // Try to get balance, but handle network errors gracefully
    let balance;
    try {
      balance = await this.signer.provider.getBalance(await this.signer.getAddress());
      console.log('- Account balance:', ethers.formatEther(balance), 'ETH');
    } catch (error) {
      console.warn('⚠️ Could not get account balance (network issue):', error.message);
      console.warn('⚠️ This might be a 0G testnet state issue. Proceeding anyway...');
    }
    
    // Verify we're on the right network (0G testnet)
    if (network.chainId !== 0n) {
      console.warn('⚠️ Warning: Not on 0G testnet. Expected chain ID 0, got:', network.chainId.toString());
    }
    
    // Check if contract is deployed
    let contractCode;
    try {
      contractCode = await this.signer.provider.getCode(this.contract.target);
      if (contractCode === '0x') {
        throw new Error('Contract not deployed at address: ' + this.contract.target);
      }
      console.log('- Contract deployed: Yes (bytecode length:', contractCode.length, 'characters)');
    } catch (error) {
      console.warn('⚠️ Could not check contract deployment (network issue):', error.message);
      console.warn('⚠️ Proceeding anyway - this might be a 0G testnet state issue...');
    }
    
    // Estimate gas first
    console.log('🔍 Estimating gas for createItem...');
    let gasEstimate;
    try {
      gasEstimate = await this.contract.createItem.estimateGas(
        title,
        description,
        blobId,
        price,
        rentalPrice
      );
      console.log('✅ Gas estimation successful:', gasEstimate.toString());
    } catch (error) {
      console.error('❌ Gas estimation failed:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        reason: error.reason,
        data: error.data
      });
      
      // Check if this is a network issue
      if (error.message.includes('missing trie node') || error.message.includes('Internal JSON-RPC error')) {
        console.warn('⚠️ 0G testnet appears to be having issues. This is a network problem, not a code issue.');
        console.warn('⚠️ The blockchain state is corrupted or incomplete.');
        throw new Error('0G testnet is experiencing issues. Please try again later or contact 0G support.');
      }
      
      throw error;
    }
    
    // Add 20% buffer to gas estimate
    const gasLimit = gasEstimate * BigInt(120) / BigInt(100);
    
    console.log('Gas estimate:', gasEstimate.toString());
    console.log('Gas limit:', gasLimit.toString());
    
    // Try static call first to verify it will work
    try {
      const staticResult = await this.contract.createItem.staticCall(
        title,
        description,
        blobId,
        price,
        rentalPrice
      );
      console.log('Static call successful, expected item ID:', staticResult.toString());
    } catch (error) {
      console.error('Static call failed:', error.message);
      throw new Error(`Contract validation failed: ${error.message}`);
    }
    
    const tx = await this.contract.createItem(
      title,
      description,
      blobId,
      price,
      rentalPrice,
      { gasLimit }
    );
    
    const receipt = await tx.wait();
    const event = receipt.logs.find(log => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed?.name === 'ItemCreated';
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = this.contract.interface.parseLog(event);
      return Number(parsed?.args.itemId);
    }

    throw new Error('Failed to get item ID from transaction');
  }

  // Purchase an item
  async purchaseItem(itemId: number, value: string): Promise<void> {
    if (!this.signer) {
      throw new Error('Signer required for purchasing items');
    }

    const tx = await this.contract.purchaseItem(itemId, { value });
    await tx.wait();
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
      return items.map((item: any) => ({
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
      return itemIds.map((id: any) => Number(id));
    } catch (error) {
      console.warn('Failed to load user items from contract:', error);
      return [];
    }
  }

  // Get user's rentals
  async getUserRentals(userAddress: string): Promise<number[]> {
    try {
      const rentalIds = await this.contract.getUserRentals(userAddress);
      return rentalIds.map((id: any) => Number(id));
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
    return history.map((record: any) => ({
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
