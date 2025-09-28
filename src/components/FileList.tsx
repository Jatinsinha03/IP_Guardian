'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Eye, EyeOff, DollarSign, Calendar, HardDrive } from 'lucide-react';

interface File {
  id: string;
  name: string;
  originalName: string;
  blobId: string;
  size: number;
  mimeType: string;
  description?: string;
  price?: number;
  isPublic: boolean;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function FileList() {
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();

      if (response.ok) {
        setFiles(data.files);
      } else {
        setError(data.error || 'Failed to fetch files');
      }
    } catch (error) {
      setError('An error occurred while fetching files');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return '📦';
    return '📁';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-gray-600">Loading files...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
        {error}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No files uploaded yet</h3>
        <p className="text-gray-500">Upload your first file to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Your Files</h2>
        <span className="text-sm text-gray-500">{files.length} file{files.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid gap-4">
        {files.map((file) => (
          <div key={file.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className="text-2xl">{getFileIcon(file.mimeType)}</div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {file.name}
                    </h3>
                    {file.isPublic ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Eye className="h-3 w-3 mr-1" />
                        Public
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Private
                      </span>
                    )}
                  </div>
                  
                  {file.description && (
                    <p className="text-gray-600 text-sm mb-3">{file.description}</p>
                  )}
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center">
                      <HardDrive className="h-4 w-4 mr-1" />
                      {formatFileSize(file.size)}
                    </div>
                    
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {formatDate(file.createdAt)}
                    </div>
                    
                    {file.price && (
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        ${file.price.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => navigator.clipboard.writeText(file.blobId)}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  title="Copy Blob ID"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Copy ID
                </button>
                {!file.blobId.startsWith('mock-blob-') && (
                  <a
                    href={`/api/download/${file.blobId}`}
                    download
                    className="inline-flex items-center px-3 py-1 border border-indigo-300 rounded-md text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    title="Download File"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </a>
                )}
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Original: {file.originalName}</span>
                <span>Blob ID: {file.blobId}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
