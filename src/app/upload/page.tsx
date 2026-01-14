'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ethers } from 'ethers';
import { Shield, Upload, FileText, DollarSign, Eye, EyeOff, X, Check, Wallet } from 'lucide-react';
import { ContractService } from '@/lib/contract';
import { usePageTitle } from '@/hooks/usePageTitle';

interface UploadedFile {
  id: string;
  blobId: string;
  name: string;
  originalName: string;
  size: number;
  mimeType: string;
  description?: string;
  price?: number;
  isPublic: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export default function UploadPage() {
  usePageTitle('Upload IP - IPGuardian');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [userAddress, setUserAddress] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);
  const [contractService, setContractService] = useState<ContractService | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    rentalPrice: '',
    isPublic: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Connect wallet
  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFormData(prev => ({
        ...prev,
        name: file.name.split('.')[0] || file.name
      }));
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    if (!walletConnected) {
      setError('Please connect your wallet before uploading. Your items need to be registered on the blockchain to be visible in your dashboard.');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // First upload to IPFS and save to database
      const formDataToSend = new FormData();
      formDataToSend.append('file', selectedFile);
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('rentalPrice', formData.rentalPrice);
      formDataToSend.append('isPublic', formData.isPublic.toString());
      formDataToSend.append('userAddress', userAddress);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok) {
        // Now create item on blockchain
        if (contractService && data.blockchainData) {
          console.log('🚀 Starting blockchain item creation...');
          console.log('Blockchain data:', data.blockchainData);

          try {
            const itemId = await contractService.createItem(
              data.blockchainData.title,
              data.blockchainData.description,
              data.blockchainData.blobId,
              data.blockchainData.price,
              data.blockchainData.rentalPrice
            );
            console.log('✅ Blockchain item created with ID:', itemId);
            setSuccess(`File uploaded successfully! Item ID: ${itemId}`);
          } catch (error) {
            console.error('❌ Blockchain item creation failed:', error);
            setError(`Upload completed but blockchain registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
          }
        } else {
          if (!contractService) {
            console.warn('⚠️ Wallet not connected - item uploaded to storage only');
            setError('Upload completed but wallet not connected. Connect your wallet to register the item on the blockchain.');
          } else {
            setSuccess('File uploaded successfully!');
          }
        }
        
        setUploadedFile(data.file);
        setSelectedFile(null);
        setFormData({
          name: '',
          description: '',
          price: '',
          rentalPrice: '',
          isPublic: false,
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('An error occurred during upload');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="flex items-center justify-center mb-6">
            <Shield className="h-10 w-10 text-indigo-600" />
            <span className="ml-2 text-2xl font-bold text-gray-900">IPGuardian</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Your Content</h1>
          <p className="text-gray-600">Share your intellectual property and monetize your work</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl text-black font-semibold mb-6">Upload File</h2>
            
            {/* Wallet Connection */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Wallet Connection</h3>
                  <p className="text-xs text-gray-600">Required for blockchain upload</p>
                </div>
                {walletConnected ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-600">
                      {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={connectWallet}
                    className="bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700 transition-colors flex items-center"
                  >
                    <Wallet className="w-3 h-3 mr-1" />
                    Connect
                  </button>
                )}
              </div>
            </div>
            
            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md mb-6">
                <div className="flex items-center">
                  <Check className="h-5 w-5 mr-2" />
                  {success}
                </div>
                {uploadedFile && (
                  <div className="mt-2 text-sm">
                    <p><strong>Blob ID:</strong> {uploadedFile.blobId}</p>
                    <p><strong>File ID:</strong> {uploadedFile.id}</p>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.zip"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center space-y-2 text-gray-500 hover:text-indigo-600"
                  >
                    <Upload className="h-12 w-12" />
                    <span className="text-sm">
                      {selectedFile ? 'Change File' : 'Click to upload or drag and drop'}
                    </span>
                  </button>
                </div>
                
                {selectedFile && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* File Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  File Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  placeholder="Enter a name for your file"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  placeholder="Describe your content..."
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                    Purchase Price (MNT)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      min="0"
                      step="0.001"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                      placeholder="0.001"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="rentalPrice" className="block text-sm font-medium text-gray-700 mb-2">
                    Rental Price (MNT/day)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      id="rentalPrice"
                      name="rentalPrice"
                      value={formData.rentalPrice}
                      onChange={handleChange}
                      min="0"
                      step="0.001"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                      placeholder="0.001"
                    />
                  </div>
                </div>
              </div>

              {/* Public/Private */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPublic"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                  Make this file public (visible to all users)
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !selectedFile || !walletConnected}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Uploading...' : 'Upload File'}
              </button>
            </form>
          </div>

          {/* Upload Guidelines */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl text-black font-semibold mb-6">Upload Guidelines</h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-indigo-600 font-semibold text-sm">1</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">Supported Formats</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    PDF, DOC, DOCX, TXT, JPG, PNG, MP4, MP3, ZIP files up to 100MB
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-indigo-600 font-semibold text-sm">2</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">Content Ownership</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Only upload content you own or have rights to distribute
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-indigo-600 font-semibold text-sm">3</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">Pricing</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Set purchase and/or rental prices in MNT to monetize your content
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-indigo-600 font-semibold text-sm">4</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">Blockchain Storage</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Files are stored on IPFS decentralized storage and registered on blockchain
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-md">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Need Help?</h3>
              <p className="text-sm text-blue-700">
                Check out our{' '}
                <Link href="/help" className="underline hover:text-blue-900">
                  help center
                </Link>{' '}
                for detailed guidelines and best practices.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}