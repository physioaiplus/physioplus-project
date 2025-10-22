import React, { useState } from 'react';
import { Globe } from 'lucide-react';
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
    if (authError && onClearError) {
      onClearError();
    }
  };

  return (
    <div className="min-h-screen bg-sky-100 bg-[url('/assets/humotion-bg.svg')] bg-cover bg-center">
      {/* Top rounded navbar similar to screenshot */}
      <div className="mx-4 pt-4">
        <div className="backdrop-blur-sm bg-white/95 border border-gray-200 rounded-3xl shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/assets/humotion-logo-full.svg" alt="Humotion" className="h-7 sm:h-8" />
            </div>
            <div className="hidden md:flex items-center gap-8 text-gray-700">
              <a className="text-sm font-medium hover:text-gray-900" href="#features">Prodotto</a>
              <a className="text-sm font-medium hover:text-gray-900" href="#docs">Risorse</a>
              <a className="text-sm font-medium hover:text-gray-900" href="#pricing">Prezzi</a>
              <a className="text-sm font-medium hover:text-gray-900" href="#enterprise">Enterprise</a>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-gray-600" />
              <a href="#accesso" className="inline-flex items-center rounded-full px-4 py-2 bg-gradient-to-r from-brand-cyan to-brand-blue text-white font-medium hover:opacity-90 transition-opacity">Inizia</a>
            </div>
          </div>
        </div>
      </div>

      {/* Hero section */}
      <div className="max-w-5xl mx-auto text-center px-6 pt-20">
        <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight text-gray-900">
          Dai forma alle tue valutazioni
          <br className="hidden md:block" />
          posturali nel tuo modo
        </h1>
        <p className="mt-8 text-lg md:text-xl text-gray-700">
          {APP_NAME} ti aiuta a creare sessioni e analisi complete in pochi minuti,
          con strumenti semplici e flessibili.
        </p>
      </div>

      {/* Login card */}
      <div id="accesso" className="flex justify-center px-4 pb-16 pt-10">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Accedi</h2>
            <p className="text-gray-600 mt-2">{APP_DESCRIPTION}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-blue text-white py-3 rounded-md font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Badge NFC disponibile per accesso rapido</p>
          </div>
        </div>
      </div>
    </div>
  );
};
