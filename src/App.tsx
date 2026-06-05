import React, { useEffect } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { ContactPage } from './components/ContactPage';
import { Dashboard } from './components/Dashboard';
import { NewPatientWizard } from './components/NewPatientWizard';
import { PatientDetail } from './components/PatientDetail';
import { Settings } from './components/settings/Settings';
import { History as HistoryViewComp } from './components/history/History';
import { ScanPage } from './components/ScanPage';
import { NavHeader } from './components/header/NavHeader';
import { AdminDashboard } from './components/AdminDashboard';
import { CalendarPage } from './components/CalendarPage';

// ... (imports)

// ...

import { useAuth } from './hooks/useAuth';
import { usePatients } from './hooks/usePatients';
import { useVisits } from './hooks/useVisits';
import { useCamera } from './hooks/useCamera';
import { useHeartbeat } from './hooks/useHeartbeat';

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

  // Add heartbeat for activity tracking
  useHeartbeat();

  const {
    stopCamera
  } = useCamera();

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

  const handleStopStreaming = async () => {
    // disconnect();
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
      if (currentView === ViewType.CONTACT) {
        return (
          <ContactPage onBack={() => setCurrentView(ViewType.LOGIN)} />
        );
      }
      return (
        <LoginScreen
          onLogin={handleLogin}
          isLoading={authLoading}
          authError={authError}
          onClearError={() => setAuthError(null)}
          onOpenContact={() => setCurrentView(ViewType.CONTACT)}
        />
      );
    }

    // If user is admin, show Admin Dashboard exclusively
    if (user.isAdmin) {
      return <AdminDashboard onLogout={logout} userEmail={user.email} />;
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
          <NewPatientWizard
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
          <ScanPage
            patient={selectedPatient}
            visit={currentVisit}
            onBack={handleCloseExercise}
          />
        );

      case ViewType.HISTORY:
        return (
          <HistoryViewComp onBack={() => setCurrentView(ViewType.DASHBOARD)} />
        );

      case ViewType.CALENDAR:
        return (
          <CalendarPage />
        );



      default:
        return (
          <Dashboard
            patients={patients}
            isLoading={patientsLoading}
            onAddPatient={() => setCurrentView(ViewType.NEW_PATIENT)}
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
