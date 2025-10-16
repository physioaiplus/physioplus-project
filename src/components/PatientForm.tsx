import React, { useState } from 'react';
import type { NewPatientFormData } from '../types';
import { Header } from './header/Header';

interface PatientFormProps {
  onSubmit: (formData: NewPatientFormData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

export const PatientForm: React.FC<PatientFormProps> = ({
  onSubmit,
  onCancel,
  isLoading
}) => {
  const [formData, setFormData] = useState<NewPatientFormData>({
    nome: '',
    cognome: '',
    email: '',
    altezza: '',
    peso: '',
    sesso: 'M',
    patologia: '',
    obiettivo: '',
    privacy_accepted: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleInputChange = (field: keyof NewPatientFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : e.target.value;
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Nuovo Paziente" onBack={onCancel} />

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-md shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={handleInputChange('nome')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cognome *
                </label>
                <input
                  type="text"
                  value={formData.cognome}
                  onChange={handleInputChange('cognome')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Altezza (cm) *
                </label>
                <input
                  type="number"
                  value={formData.altezza}
                  onChange={handleInputChange('altezza')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Peso (kg) *
                </label>
                <input
                  type="number"
                  value={formData.peso}
                  onChange={handleInputChange('peso')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sesso *
                </label>
                <select
                  value={formData.sesso}
                  onChange={handleInputChange('sesso')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                  disabled={isLoading}
                >
                  <option value="M">Maschio</option>
                  <option value="F">Femmina</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patologia
              </label>
              <input
                type="text"
                value={formData.patologia}
                onChange={handleInputChange('patologia')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                placeholder="Opzionale"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Obiettivo
              </label>
              <textarea
                value={formData.obiettivo}
                onChange={handleInputChange('obiettivo')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Obiettivo della terapia"
                disabled={isLoading}
              />
            </div>

            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={formData.privacy_accepted}
                onChange={handleInputChange('privacy_accepted')}
                className="mt-1"
                required
                disabled={isLoading}
              />
              <label className="text-sm text-gray-700">
                Il paziente acconsente al trattamento dei dati personali secondo il GDPR
              </label>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                Annulla
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                disabled={isLoading || !formData.privacy_accepted}
              >
                {isLoading ? 'Creazione...' : 'Crea Paziente'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};





