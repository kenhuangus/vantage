
import React, { useState } from 'react';
import LoginScreen from './components/LoginScreen';
import FileBrowser from './components/FileBrowser';
import ReviewDashboard from './components/ReviewDashboard';
import Header from './components/Header';
import type { User, GoogleDoc } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<GoogleDoc | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const handleLogin = (loggedInUser: User, token: string) => {
    setUser(loggedInUser);
    setAccessToken(token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUser(null);
    setAccessToken(null);
    setIsAuthenticated(false);
    setSelectedDoc(null);
  };

  const handleSelectDoc = (doc: GoogleDoc) => {
    setSelectedDoc(doc);
  };
  
  const handleBackToFileBrowser = () => {
    setSelectedDoc(null);
  };

  return (
    <div className="min-h-screen font-sans text-gray-800">
      {isAuthenticated && user && accessToken ? (
        <>
          <Header user={user} onLogout={handleLogout} />
          <main className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {!selectedDoc ? (
              <FileBrowser onSelectDoc={handleSelectDoc} accessToken={accessToken} />
            ) : (
              <ReviewDashboard doc={selectedDoc} onBack={handleBackToFileBrowser} accessToken={accessToken} />
            )}
          </main>
        </>
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;
