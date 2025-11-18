
import React, { useState, useEffect } from 'react';
import type { GoogleDoc } from '../types';
import { getDocuments } from '../services/googleApiService';
import LoadingSpinner from './LoadingSpinner';

interface FileBrowserProps {
  onSelectDoc: (doc: GoogleDoc) => void;
  accessToken: string;
}

const DocIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-blue mr-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V8.414a1 1 0 00-.293-.707l-4.414-4.414A1 1 0 0011.586 3H4zm6 6a1 1 0 01-1 1H7a1 1 0 110-2h2a1 1 0 011 1zm-3 4a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
    </svg>
);

const FileBrowser: React.FC<FileBrowserProps> = ({ onSelectDoc, accessToken }) => {
  const [docs, setDocs] = useState<GoogleDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        setLoading(true);
        const realDocs = await getDocuments(accessToken);
        setDocs(realDocs);
        setError(null);
      } catch (err) {
        setError('Failed to load documents from Google Drive. Ensure API is enabled.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (accessToken) {
        fetchDocs();
    }
  }, [accessToken]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-10">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600">Fetching your documents from Google Drive...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-10 text-red-600 bg-red-50 rounded-lg">{error}</div>;
  }

  return (
    <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-1">Select a Document</h2>
      <p className="text-gray-500 mb-6">Choose a Google Doc to begin the AI-powered review process.</p>
      <div className="border rounded-lg overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {docs.length === 0 && (
              <li className="p-4 text-center text-gray-500">No Google Docs found in your drive.</li>
          )}
          {docs.map((doc) => (
            <li key={doc.id} className="relative hover:bg-gray-50">
              <button
                onClick={() => onSelectDoc(doc)}
                className="w-full text-left p-4 transition duration-150 ease-in-out flex items-center justify-between"
              >
                <div className="flex items-center">
                    <DocIcon />
                    <div>
                        <p className="font-medium text-gray-900">{doc.name}</p>
                        <p className="text-sm text-gray-500">Last modified: {doc.lastModified}</p>
                    </div>
                </div>
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FileBrowser;
