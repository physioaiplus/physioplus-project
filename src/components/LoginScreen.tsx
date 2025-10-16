import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import type { LoginFormData } from '../types';
import { APP_NAME, APP_DESCRIPTION } from '../constants';

interface LoginScreenProps {
  onLogin: (formData: LoginFormData) => Promise<void>;
  isLoading: boolean;
  authError?: string | null;
  onClearError?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, isLoading, authError, onClearError }) => {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onLogin(formData);
  };

  const handleInputChange = (field: keyof LoginFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    // Pulisci errori quando l'utente inizia a digitare
    if (authError && onClearError) {
      onClearError();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{APP_NAME}</h1>
          <p className="text-gray-600 mt-2">{APP_DESCRIPTION}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Messaggio di errore */}
          {authError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{authError}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="esempio@medilab.com"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={handleInputChange('password')}
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-3 rounded-md font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Accesso in corso...' : 'Accedi'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Badge NFC disponibile per accesso rapido</p>
        </div>
      </div>
    </div>
  );
};

