'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, Search, Filter, FileText, DollarSign, Clock, Eye, Download, Star, Heart } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function BrowsePage() {
  usePageTitle('Browse IP Assets - IPGuardian');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const [files] = useState([
    {
      id: 1,
      name: 'Advanced Machine Learning Algorithms',
      author: 'Dr. Sarah Johnson',
      organization: 'MIT',
      size: '3.2 MB',
      uploadDate: '2024-01-20',
      price: 75,
      rentalPrice: 8,
      downloads: 156,
      views: 423,
      rating: 4.8,
      category: 'AI/ML',
      description: 'Comprehensive guide to advanced machine learning algorithms with practical implementations.',
      tags: ['machine learning', 'algorithms', 'AI', 'data science'],
    },
    {
      id: 2,
      name: 'Quantum Computing Fundamentals',
      author: 'Prof. Michael Chen',
      organization: 'Stanford University',
      size: '2.8 MB',
      uploadDate: '2024-01-18',
      price: 90,
      rentalPrice: 10,
      downloads: 89,
      views: 234,
      rating: 4.9,
      category: 'Physics',
      description: 'In-depth exploration of quantum computing principles and applications.',
      tags: ['quantum computing', 'physics', 'computing', 'quantum mechanics'],
    },
    {
      id: 3,
      name: 'Blockchain Technology in Healthcare',
      author: 'Dr. Emily Rodriguez',
      organization: 'Johns Hopkins',
      size: '1.9 MB',
      uploadDate: '2024-01-15',
      price: 60,
      rentalPrice: 6,
      downloads: 67,
      views: 189,
      rating: 4.6,
      category: 'Healthcare',
      description: 'Analysis of blockchain applications in healthcare data management and security.',
      tags: ['blockchain', 'healthcare', 'data security', 'medical records'],
    },
    {
      id: 4,
      name: 'Sustainable Energy Solutions',
      author: 'Dr. James Wilson',
      organization: 'UC Berkeley',
      size: '4.1 MB',
      uploadDate: '2024-01-12',
      price: 85,
      rentalPrice: 9,
      downloads: 134,
      views: 312,
      rating: 4.7,
      category: 'Energy',
      description: 'Research on renewable energy technologies and sustainable power generation.',
      tags: ['renewable energy', 'sustainability', 'solar', 'wind power'],
    },
    {
      id: 5,
      name: 'Neuroscience and AI Integration',
      author: 'Dr. Lisa Park',
      organization: 'Harvard Medical School',
      size: '2.5 MB',
      uploadDate: '2024-01-10',
      price: 70,
      rentalPrice: 7,
      downloads: 98,
      views: 267,
      rating: 4.8,
      category: 'Neuroscience',
      description: 'Exploring the intersection of neuroscience and artificial intelligence.',
      tags: ['neuroscience', 'AI', 'brain research', 'cognitive science'],
    },
  ]);

  const categories = ['all', 'AI/ML', 'Physics', 'Healthcare', 'Energy', 'Neuroscience'];

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || file.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      case 'oldest':
        return new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'rating':
        return b.rating - a.rating;
      default:
        return 0;
    }
  });

  const handleRent = (fileId: number) => {
    // TODO: Implement rental functionality
    console.log('Renting file:', fileId);
  };

  const handleBuy = (fileId: number) => {
    // TODO: Implement purchase functionality
    console.log('Buying file:', fileId);
  };

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
              <Link href="/dashboard" className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium">
                Dashboard
              </Link>
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">
                Sign In
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Browse Intellectual Property</h1>
          <p className="mt-2 text-gray-600">
            Discover research papers, journals, and intellectual property from leading researchers
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search papers, authors, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="lg:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="lg:w-48">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="grid gap-6">
          {sortedFiles.map((file) => (
            <div key={file.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                {/* File Icon and Basic Info */}
                <div className="flex-shrink-0">
                  <FileText className="h-16 w-16 text-red-500" />
                </div>

                {/* File Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{file.name}</h3>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="ml-1 text-sm text-gray-600">{file.rating}</span>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-2">by {file.author} • {file.organization}</p>
                  <p className="text-gray-700 mb-4">{file.description}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {file.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center space-x-6 text-sm text-gray-500 mb-4">
                    <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-1" />
                      {file.views} views
                    </div>
                    <div className="flex items-center">
                      <Download className="h-4 w-4 mr-1" />
                      {file.downloads} downloads
                    </div>
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      {file.size}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {file.uploadDate}
                    </div>
                  </div>
                </div>

                {/* Pricing and Actions */}
                <div className="flex-shrink-0 lg:w-64">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-center mb-4">
                      <div className="text-2xl font-bold text-gray-900">${file.price}</div>
                      <div className="text-sm text-gray-600">Purchase</div>
                    </div>

                    <div className="text-center mb-4">
                      <div className="text-lg font-semibold text-gray-900">${file.rentalPrice}</div>
                      <div className="text-sm text-gray-600">per day rental</div>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => handleBuy(file.id)}
                        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                      >
                        <DollarSign className="h-4 w-4 inline mr-2" />
                        Buy Now
                      </button>
                      <button
                        onClick={() => handleRent(file.id)}
                        className="w-full border border-indigo-600 text-indigo-600 py-2 px-4 rounded-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                      >
                        <Clock className="h-4 w-4 inline mr-2" />
                        Rent
                      </button>
                    </div>

                    <div className="mt-3 text-center">
                      <button className="text-gray-500 hover:text-red-500 transition-colors">
                        <Heart className="h-4 w-4 inline mr-1" />
                        Add to Favorites
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {sortedFiles.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No files found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

