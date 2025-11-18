
import React, { useState, useEffect } from 'react';
import type { User } from '../types';

interface LoginScreenProps {
  onLogin: (user: User, token: string) => void;
}

declare global {
  interface Window {
    google: any;
  }
}

const GoogleIcon: React.FC = () => (
  <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
    <path fill="none" d="M0 0h48v48H0z"></path>
  </svg>
);

const VantageLogo: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="vantageGradient" x1="10" y1="10" x2="90" y2="90">
                <stop offset="0%" stopColor="#4285F4" />
                <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>
        <path d="M25 30 L50 75 L75 30" stroke="url(#vantageGradient)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="50" cy="25" r="6" fill="#FBBC05">
             <animate attributeName="r" values="6;7;6" dur="2s" repeatCount="indefinite" />
             <animate attributeName="opacity" values="1;0.8;1" dur="2s" repeatCount="indefinite" />
        </circle>
        <path d="M85 20 L90 25 L85 30" stroke="#EA4335" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
        <path d="M15 20 L10 25 L15 30" stroke="#34A853" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
);

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [clientId, setClientId] = useState(localStorage.getItem('google_client_id') || '');
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = () => {
    if (!clientId) {
      setError("Please enter a valid Google Cloud Client ID.");
      return;
    }
    
    if (typeof window.google === 'undefined') {
      setError("Google Identity Services script not loaded.");
      return;
    }

    localStorage.setItem('google_client_id', clientId);

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents.readonly',
      callback: async (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
          try {
             // Fetch user profile info
             const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                 headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
             });
             const userInfo = await userInfoRes.json();
             
             const user: User = {
                 name: userInfo.name,
                 email: userInfo.email,
                 avatarUrl: userInfo.picture,
                 accessToken: tokenResponse.access_token
             };
             
             onLogin(user, tokenResponse.access_token);
          } catch (e) {
              console.error(e);
              setError("Failed to fetch user profile.");
          }
        }
      },
    });
    
    tokenClient.requestAccessToken();
  };

  const handleDemoLogin = () => {
      // Create a mock user for the demo
      const mockUser: User = {
          name: "Demo User",
          email: "demo@vantage.ai",
          avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix", // Generic avatar
          accessToken: "demo-token"
      };
      onLogin(mockUser, "demo-token");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-blue opacity-5 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-brand-purple opacity-5 rounded-full blur-3xl"></div>
        </div>

      <div className="w-full max-w-md p-10 space-y-8 bg-white/80 backdrop-blur-sm shadow-2xl rounded-3xl border border-white/50 relative z-10">
        <div className="text-center">
            <div className="flex justify-center items-center mb-6">
                <div className="w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center p-4 border border-gray-100">
                    <VantageLogo className="w-full h-full" />
                </div>
            </div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Vantage</h1>
          <p className="text-sm font-medium text-brand-purple uppercase tracking-widest mt-2">AI Document Intelligence</p>
          <p className="mt-4 text-gray-600 leading-relaxed">
            Gain clarity and precision. Supercharge your document review process with the power of Gemini 2.5 and 3.0.
          </p>
        </div>
        
        <div className="space-y-4 pt-4">
          <div>
             <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Production Mode</label>
             <input 
                type="text" 
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="Enter Google Client ID"
                className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue focus:border-brand-blue outline-none bg-white/50"
             />
          </div>

          {error && (
              <div className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">
                  {error}
              </div>
          )}

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center px-6 py-3 text-base font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-brand-blue/30 transition-all duration-200 ease-in-out group"
          >
            <GoogleIcon />
            <span className="group-hover:text-brand-blue transition-colors">Sign in with Google</span>
          </button>

          <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-medium">Or</span>
              <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <button
            onClick={handleDemoLogin}
            className="w-full flex items-center justify-center px-6 py-3 text-base font-semibold text-white bg-gradient-to-r from-brand-blue to-brand-purple rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Try Demo Version
          </button>
        </div>
        
        <div className="border-t border-gray-100 pt-6">
            <p className="text-xs text-center text-gray-400">
                Powered by Gemini 2.5 Flash, Pro & Live API
            </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
