
import React from 'react';
import type { User } from '../types';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

const VantageLogoSmall: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="vantageGradientSmall" x1="10" y1="10" x2="90" y2="90">
                <stop offset="0%" stopColor="#4285F4" />
                <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
        </defs>
        <path d="M25 30 L50 75 L75 30" stroke="url(#vantageGradientSmall)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="50" cy="25" r="8" fill="#FBBC05" />
    </svg>
);

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
             <div className="w-8 h-8 mr-3">
                 <VantageLogoSmall className="w-full h-full" />
             </div>
            <span className="text-xl font-bold text-gray-900 tracking-tight">Vantage</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="font-medium text-gray-800 text-sm">{user.name}</div>
              <div className="text-xs text-gray-500">{user.email}</div>
            </div>
            <img className="h-9 w-9 rounded-full border border-gray-200" src={user.avatarUrl} alt="User avatar" />
            <button
              onClick={onLogout}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
