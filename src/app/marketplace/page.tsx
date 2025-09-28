'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ContractService, IPItem } from '@/lib/contract';
import { Download, ShoppingCart, Clock, Users, DollarSign, Calendar, User, Eye } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

interface MarketplaceItem extends IPItem {
  isOwner?: boolean;
  hasActiveRental?: boolean;
}

export default function MarketplacePage() {
  usePageTitle('Marketplace - IPGuardian');
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [contractService, setContractService] = useState<ContractService | null>(null);

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const address = accounts[0];
        setUserAddress(address);
        setWalletConnected(true);
        
        // Create contract service with signer
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        setContractService(new ContractService(signer));
      } else {
        setError('MetaMask is not installed');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError('Failed to connect wallet');
    }
  };

  // Load marketplace items
  const loadItems = async () => {
    try {
      setLoading(true);
      const service = new ContractService();
      const activeItems = await service.getActiveItems(0, 50);
      
      // Check ownership and rental status for each item
      const itemsWithStatus = await Promise.all(
        activeItems.map(async (item) => {
          const isOwner = item.owner.toLowerCase() === userAddress.toLowerCase();
          let hasActiveRental = false;
          
          if (userAddress && !isOwner) {
            try {
              hasActiveRental = await service.hasActiveRental(item.itemId, userAddress);
              console.log(`Item ${item.itemId} rental status for ${userAddress}:`, hasActiveRental);
            } catch (error) {
              console.warn(`Failed to check rental status for item ${item.itemId}:`, error);
            }
          }
          
          return { ...item, isOwner, hasActiveRental };
        })
      );
      
      setItems(itemsWithStatus);
    } catch (error) {
      console.error('Error loading items:', error);
      setError('Failed to load marketplace items. Make sure your contract is deployed and environment variables are set.');
    } finally {
      setLoading(false);
    }
  };

  // Purchase item
  const purchaseItem = async (itemId: number, price: string) => {
    if (!contractService) {
      setError('Wallet not connected');
      return;
    }

    try {
      await contractService.purchaseItem(itemId, price);
      alert('Item purchased successfully!');
      loadItems(); // Refresh the list
    } catch (error) {
      console.error('Error purchasing item:', error);
      setError('Failed to purchase item');
    }
  };

  // Rent item
  const rentItem = async (itemId: number, rentalPrice: string, days: number) => {
    if (!contractService) {
      setError('Wallet not connected');
      return;
    }

    try {
      const startTime = Math.floor(Date.now() / 1000) + 60; // Start 1 minute in the future
      const endTime = startTime + (days * 24 * 60 * 60);
      const totalCost = (BigInt(rentalPrice) * BigInt(days)).toString();
      
      console.log('Renting item:', {
        itemId,
        rentalPrice,
        days,
        startTime,
        endTime,
        totalCost
      });
      
      await contractService.rentItem(itemId, startTime, endTime, totalCost);
      alert(`Item rented for ${days} days! You can now download the file.`);
      
      // Wait a moment for blockchain state to update, then refresh
      setTimeout(() => {
        loadItems();
      }, 2000);
    } catch (error) {
      console.error('Error renting item:', error);
      setError(`Failed to rent item: ${error.message}`);
    }
  };

  // Download file
  const downloadFile = async (blobId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/download/${blobId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Failed to download file');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('Failed to download file');
    }
  };

  useEffect(() => {
    loadItems();
    
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('Loading timeout. Please check your contract configuration.');
      }
    }, 10000); // 10 second timeout
    
    return () => clearTimeout(timeout);
  }, [userAddress]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">IPGuardian Marketplace</h1>
          
          {/* Wallet Connection */}
          <div className="flex items-center justify-between bg-white rounded-lg shadow p-4">
            <div>
              {walletConnected ? (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    Connected: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                  </span>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Connect Wallet
                </button>
              )}
            </div>
            
            <div className="text-sm text-gray-500">
              {items.length} items available
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError('')}
              className="mt-2 text-red-600 hover:text-red-800 text-sm"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div key={item.itemId} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {item.title}
                  </h3>
                  {item.isOwner && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Owner
                    </span>
                  )}
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {item.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="w-4 h-4 mr-1" />
                    {item.totalRentals} rentals
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <DollarSign className="w-4 h-4 mr-1" />
                    {ContractService.formatEther(item.totalRevenue)} ETH
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-2 mb-4">
                  {item.price !== '0' && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Purchase Price:</span>
                      <span className="font-semibold text-green-600">
                        {ContractService.formatEther(item.price)} ETH
                      </span>
                    </div>
                  )}
                  {item.rentalPrice !== '0' && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Rental Price:</span>
                      <span className="font-semibold text-blue-600">
                        {ContractService.formatEther(item.rentalPrice)} ETH/day
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {/* Download Button - Only show if user owns, has active rental, or purchased */}
                  {(item.isOwner || item.hasActiveRental) ? (
                    <button
                      onClick={() => downloadFile(item.blobId, item.title)}
                      className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-500 rounded-lg">
                      <Download className="w-4 h-4 mr-2" />
                      Download (Rent or Purchase Required)
                    </div>
                  )}

                  {/* Purchase Button */}
                  {!item.isOwner && item.price !== '0' && walletConnected && (
                    <button
                      onClick={() => purchaseItem(item.itemId, item.price)}
                      className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Purchase
                    </button>
                  )}

                  {/* Rental Buttons */}
                  {!item.isOwner && item.rentalPrice !== '0' && walletConnected && !item.hasActiveRental && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => rentItem(item.itemId, item.rentalPrice, 1)}
                        className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        1 Day
                      </button>
                      <button
                        onClick={() => rentItem(item.itemId, item.rentalPrice, 7)}
                        className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Calendar className="w-4 h-4 mr-1" />
                        7 Days
                      </button>
                    </div>
                  )}

                  {/* Active Rental Status */}
                  {item.hasActiveRental && (
                    <div className="w-full px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-center text-sm">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Currently Rented
                    </div>
                  )}

                  {/* View Details */}
                  <button
                    onClick={() => {
                      // TODO: Implement item details modal
                      alert(`Item ID: ${item.itemId}\nOwner: ${item.owner}\nCreated: ${new Date(item.createdAt * 1000).toLocaleDateString()}`);
                    }}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {items.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <ShoppingCart className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items available</h3>
            <p className="text-gray-600">Be the first to upload an IP item to the marketplace!</p>
          </div>
        )}
      </div>
    </div>
  );
}
