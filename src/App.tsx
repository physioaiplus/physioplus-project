import React, { useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { Dashboard } from './components/Dashboard';
import { PatientForm } from './components/PatientForm';
import { PatientDetail } from './components/PatientDetail';
import { Settings } from './components/settings/Settings';
import { History as HistoryViewComp } from './components/history/History';
import { ExerciseView } from './components/ExerciseView';
import { NavHeader } from './components/header/NavHeader';

import { useAuth } from './hooks/useAuth';
import { usePatients } from './hooks/usePatients';
import { useVisits } from './hooks/useVisits';
import { useCamera } from './hooks/useCamera';
import { useWebSocket } from './hooks/useWebSocket';

import { ViewType } from './types';
import type { Patient, NewPatientFormData, AnalysisType } from './types';

export default function App() {
  // Hooks
  const { 
    user, 
    isLoading: authLoading, 
    isAuthenticated, 
    authError,
    login, 
    logout, 
    setAuthError 
  } = useAuth();
  
  const { 
    patients, 
    isLoading: patientsLoading, 
    loadPatients, 
    createPatient 
  } = usePatients();
  
  const { 
    currentVisit, 
    createVisit 
  } = useVisits();
  
  const { 
    isStreaming, 
    startCamera, 
    stopCamera 
  } = useCamera();
  
  const { 
    streamData, 
    isConnected, 
    connect, 
    disconnect 
  } = useWebSocket();

  // State
  const [currentView, setCurrentView] = React.useState<ViewType>(ViewType.DASHBOARD);
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);

  // L'inizializzazione auth è ora gestita automaticamente dal hook useAuth

  // Caricamento pazienti quando autenticato
  useEffect(() => {
    if (isAuthenticated && user) {
      loadPatients();
    }
  }, [isAuthenticated, user, loadPatients]);

  // Gestione view e selezione paziente
  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setCurrentView(ViewType.PATIENT_DETAIL);
  };

  const handleCreateVisit = async (tipoAnalisi: string) => {
    if (!selectedPatient || !user) return;
    
    const visitId = await createVisit(
      selectedPatient.id,
      user.uid,
      tipoAnalisi as AnalysisType
    );
    
    if (visitId) {
      setCurrentView(ViewType.EXERCISE);
    }
  };

  const handleStartStreaming = async () => {
    if (!currentVisit) return;
    
    const cameraStarted = await startCamera();
    if (cameraStarted) {
      connect(currentVisit.id);
    }
  };

  const handleStopStreaming = async () => {
    disconnect();
    await stopCamera();
  };

  const handleCloseExercise = () => {
    handleStopStreaming();
    setCurrentView(ViewType.PATIENT_DETAIL);
  };

  // Login handler
  const handleLogin = async (formData: any) => {
    const success = await login(formData);
    if (success) {
      setCurrentView(ViewType.DASHBOARD);
    }
  };

  // Create patient handler
  const handleCreatePatient = async (formData: NewPatientFormData) => {
    const patientId = await createPatient(formData);
    if (patientId) {
      setCurrentView(ViewType.DASHBOARD);
    }
  };

  // View routing
  const renderCurrentView = () => {
    if (!isAuthenticated || !user) {
      return (
        <LoginScreen 
          onLogin={handleLogin} 
          isLoading={authLoading}
          authError={authError}
          onClearError={() => setAuthError(null)}
        />
      );
    }

    // Header per tutte le views tranne exercise
    if (currentView !== ViewType.EXERCISE && currentView !== ViewType.NEW_PATIENT) {
      return (
        <>
          <NavHeader
            currentView={currentView}
            onViewChange={handleViewChange}
            onLogout={logout}
            userEmail={user.email}
          />
          {renderViewContent()}
        </>
      );
    }

    return renderViewContent();
  };

  const renderViewContent = () => {
    switch (currentView) {
      case ViewType.DASHBOARD:
        return (
          <Dashboard
            patients={patients}
            isLoading={patientsLoading}
            onAddPatient={() => setCurrentView(ViewType.NEW_PATIENT)}
            onPatientSelect={handlePatientSelect}
            onViewChange={handleViewChange}
          />
        );

      case ViewType.NEW_PATIENT:
        return (
          <PatientForm
            onSubmit={handleCreatePatient}
            onCancel={() => setCurrentView(ViewType.DASHBOARD)}
            isLoading={patientsLoading}
          />
        );

      case ViewType.PATIENT_DETAIL:
        if (!selectedPatient) {
          setCurrentView(ViewType.DASHBOARD);
          return null;
        }
        return (
          <PatientDetail
            patient={selectedPatient}
            onBack={() => setCurrentView(ViewType.DASHBOARD)}
            onCreateVisit={handleCreateVisit}
          />
        );

      case ViewType.SETTINGS:
        return (
          <Settings onBack={() => setCurrentView(ViewType.DASHBOARD)} />
        );

      case ViewType.EXERCISE:
        if (!selectedPatient || !currentVisit) {
          setCurrentView(ViewType.DASHBOARD);
          return null;
        }
        return (
          <ExerciseView
            patient={selectedPatient}
            visit={currentVisit}
            streamData={streamData}
            isStreaming={isStreaming}
            isConnecting={!isConnected && isStreaming}
            onStartStreaming={handleStartStreaming}
            onStopStreaming={handleStopStreaming}
            onClose={handleCloseExercise}
          />
        );

      case ViewType.HISTORY:
        return (
          <HistoryViewComp onBack={() => setCurrentView(ViewType.DASHBOARD)} />
        );

      default:
        return (
          <Dashboard
            patients={patients}
            isLoading={patientsLoading}
            onAddPatient={() => setCurrentView(ViewType.NEW_PATIENT )}
            onPatientSelect={handlePatientSelect}
            onViewChange={handleViewChange}
          />
        );
    }
  };

  return (
    <div className="App">
      {renderCurrentView()}
    </div>
  );
}
