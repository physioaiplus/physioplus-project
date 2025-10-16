import React from 'react';
import type { Patient } from '../types';

interface PatientCardProps {
  patient: Patient;
  onClick: (patient: Patient) => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient, onClick }) => {
  const initials = `${patient.nome.charAt(0)}${patient.cognome.charAt(0)}`;

  return (
    <div
      className="bg-white rounded-md shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onClick(patient)}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-lg font-semibold text-indigo-600">
              {initials}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {patient.nome} {patient.cognome}
            </h3>
            <p className="text-sm text-gray-600">{patient.email}</p>
          </div>
        </div>
      </div>
      <div className="space-y-2 text-sm text-gray-600">
        <p>Altezza: {patient.altezza} cm</p>
        <p>Peso: {patient.peso} kg</p>
        {patient.patologia && <p>Patologia: {patient.patologia}</p>}
      </div>
    </div>
  );
};





