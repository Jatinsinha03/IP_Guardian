'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { ContractService, IPItem, Rental } from '@/lib/contract';
import { Shield, Upload, Download, DollarSign, Eye, FileText, TrendingUp, Users, Star, Clock, ShoppingCart } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organization?: string;
}

export default function DashboardPage() {
  usePageTitle('Dashboard - IPGuardian');
  const [userItems, setUserItems] = useState<IPItem[]>([]);
  const [userRentals, setUserRentals] = useState<Rental[]>([]);
  const [userAddress, setUserAddress] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [contractService, setContractService] = useState<ContractService | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

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
        
        // Load user data
        loadUserData(address);
      } else {
        setError('MetaMask is not installed');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError('Failed to connect wallet');
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
        setError('Loading timeout. Please check your contract configuration.');
      }
    }, 10000); // 10 second timeout
    
    setLoading(false);
    
    return () => clearTimeout(timeout);
  }, []);

  // Load user's items and rentals
  const loadUserData = async (address: string) => {
    try {
      setLoading(true);
      const service = new ContractService();
      
      // Get user's items
      const itemIds = await service.getUserItems(address);
      const items = await Promise.all(
        itemIds.map(async id => {
          try {
            return await service.getItem(id);
          } catch (error) {
            console.warn(`Failed to load item ${id}:`, error);
            return null;
          }
        })
      );
      setUserItems(items.filter(item => item !== null));

      // Get user's rentals
      const rentalIds = await service.getUserRentals(address);
      const rentals = await Promise.all(
        rentalIds.map(async id => {
          try {
            return await service.getRental(id);
          } catch (error) {
            console.warn(`Failed to load rental ${id}:`, error);
            return null;
          }
        })
      );
      setUserRentals(rentals.filter(rental => rental !== null));
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user data. Make sure your contract is deployed and environment variables are set.');
    } finally {
      setLoading(false);
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

  // Calculate stats
  const totalRevenue = userItems.reduce((sum, item) => {
    return sum + parseFloat(ContractService.formatEther(item.totalRevenue));
  }, 0);

  const totalRentals = userItems.reduce((sum, item) => sum + item.totalRentals, 0);
  const activeRentals = userRentals.filter(rental => rental.isActive).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center">
                <Shield className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">IP Rights Store</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/upload" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
                Upload
              </Link>
              <Link href="/marketplace" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
                Marketplace
              </Link>
              {walletConnected ? (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                  </span>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage your intellectual property and track your earnings
          </p>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{userItems.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{totalRevenue.toFixed(4)} ETH</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Rentals</p>
                <p className="text-2xl font-bold text-gray-900">{totalRentals}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Rentals</p>
                <p className="text-2xl font-bold text-gray-900">{activeRentals}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/upload"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <Upload className="h-4 w-4 inline mr-2" />
              Upload New File
            </Link>
            <Link
              href="/marketplace"
              className="border border-indigo-600 text-indigo-600 px-4 py-2 rounded-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <ShoppingCart className="h-4 w-4 inline mr-2" />
              Browse Marketplace
            </Link>
          </div>
        </div>

        {/* Your Items Section */}
        <div className="bg-white rounded-lg shadow-md mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your IP Items</h2>
          </div>
          <div className="p-6">
            {userItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userItems.map((item) => (
                  <div key={item.itemId} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Rentals:</span>
                        <span className="font-medium">{item.totalRentals}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Revenue:</span>
                        <span className="font-medium text-green-600">
                          {ContractService.formatEther(item.totalRevenue)} ETH
                        </span>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => downloadFile(item.blobId, item.title)}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </button>
                      <button
                        onClick={() => {
                          alert(`Item ID: ${item.itemId}\nOwner: ${item.owner}\nCreated: ${new Date(item.createdAt * 1000).toLocaleDateString()}`);
                        }}
                        className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No items yet</h3>
                <p className="text-gray-600 mb-4">Upload your first IP item to get started!</p>
                <Link
                  href="/upload"
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Item
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Your Rentals Section */}
        {userRentals.length > 0 && (
          <div className="bg-white rounded-lg shadow-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Your Rentals</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {userRentals.map((rental) => (
                  <div key={rental.rentalId} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900">Rental #{rental.rentalId}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        rental.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rental.isActive ? 'Active' : 'Expired'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Item ID:</span>
                        <span className="ml-2 font-medium text-gray-900">{rental.itemId}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Amount Paid:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {ContractService.formatEther(rental.amountPaid)} ETH
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Start:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {new Date(rental.startTime * 1000).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">End:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {new Date(rental.endTime * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}