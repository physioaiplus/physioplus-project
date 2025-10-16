import React, { useState, useEffect } from 'react';
import { Camera, Users, Activity, Settings, History, LogOut, Plus, Eye, Play, Square, AlertCircle, Check } from 'lucide-react';

const API_URL = 'http://localhost:8000';

export default function PostureAnalysisApp() {
  const [currentView, setCurrentView] = useState('login');
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [currentVisit, setCurrentVisit] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamData, setStreamData] = useState(null);
  const [ws, setWs] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [newPatientForm, setNewPatientForm] = useState({
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

  // Login (simulato - in produzione usare Firebase Auth via API)
  const handleLogin = async (e) => {
    e.preventDefault();
    // Simulazione login - in produzione fare chiamata a Firebase Auth
    setUser({ email: loginForm.email, uid: 'demo-user-123' });
    setCurrentView('dashboard');
    loadPatients();
  };

  // Logout
  const handleLogout = () => {
    setUser(null);
    setCurrentView('login');
    setPatients([]);
    setSelectedPatient(null);
  };

  // Carica pazienti
  const loadPatients = async () => {
    try {
      const response = await fetch(`${API_URL}/api/patients`);
      const data = await response.json();
      if (data.success) {
        setPatients(data.patients);
      }
    } catch (error) {
      console.error('Errore caricamento pazienti:', error);
    }
  };

  // Crea nuovo paziente
  const handleCreatePatient = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatientForm)
      });
      const data = await response.json();
      if (data.success) {
        alert('Paziente creato con successo!');
        loadPatients();
        setCurrentView('dashboard');
        setNewPatientForm({
          nome: '', cognome: '', email: '', altezza: '', peso: '',
          sesso: 'M', patologia: '', obiettivo: '', privacy_accepted: false
        });
      }
    } catch (error) {
      alert('Errore creazione paziente: ' + error.message);
    }
  };

  // Crea nuova visita
  const handleCreateVisit = async (tipoAnalisi) => {
    try {
      const response = await fetch(`${API_URL}/api/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatient.id,
          operator_id: user.uid,
          tipo_analisi: tipoAnalisi,
          note: ''
        })
      });
      const data = await response.json();
      if (data.success) {
        setCurrentVisit({ id: data.visit_id, tipo_analisi: tipoAnalisi });
        setCurrentView('exercise');
      }
    } catch (error) {
      alert('Errore creazione visita: ' + error.message);
    }
  };

  // Avvia streaming
  const startStreaming = async () => {
    try {
      // Avvia camera backend
      await fetch(`${API_URL}/api/camera/start`, { method: 'POST' });
      
      // Connetti WebSocket
      const websocket = new WebSocket(`ws://localhost:8000/ws/pose-stream/${currentVisit.id}`);
      
      websocket.onopen = () => {
        console.log('WebSocket connesso');
        setIsStreaming(true);
      };
      
      websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setStreamData(data);
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      websocket.onclose = () => {
        console.log('WebSocket disconnesso');
        setIsStreaming(false);
      };
      
      setWs(websocket);
    } catch (error) {
      alert('Errore avvio streaming: ' + error.message);
    }
  };

  // Ferma streaming
  const stopStreaming = async () => {
    if (ws) {
      ws.close();
      setWs(null);
    }
    await fetch(`${API_URL}/api/camera/stop`, { method: 'POST' });
    setIsStreaming(false);
    setStreamData(null);
  };

  // ==================== COMPONENTI ====================

  // Login Screen
  const LoginScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-full mb-4">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Human+™</h1>
          <p className="text-gray-600 mt-2">Sistema Rilevamento Posturale</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email / Username
            </label>
            <input
              type="text"
              value={loginForm.email}
              onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="esempio@medilab.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Accedi
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Badge NFC disponibile per accesso rapido</p>
        </div>
      </div>
    </div>
  );

  // Dashboard
  const Dashboard = () => (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Camera className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Human+™</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user?.email || 'Operatore'}</span>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Esci</span>
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center space-x-2 py-4 border-b-2 ${
                currentView === 'dashboard'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Pazienti</span>
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className={`flex items-center space-x-2 py-4 border-b-2 ${
                currentView === 'history'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <History className="w-5 h-5" />
              <span>Storico</span>
            </button>
            <button
              onClick={() => setCurrentView('settings')}
              className={`flex items-center space-x-2 py-4 border-b-2 ${
                currentView === 'settings'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>Impostazioni</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Pazienti</h2>
          <button
            onClick={() => setCurrentView('newPatient')}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Nuovo Paziente</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedPatient(patient);
                setCurrentView('patientDetail');
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-indigo-600">
                      {patient.nome?.charAt(0)}{patient.cognome?.charAt(0)}
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
          ))}
        </div>
      </main>
    </div>
  );

  // Nuovo Paziente
  const NewPatientForm = () => (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Nuovo Paziente</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleCreatePatient} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                <input
                  type="text"
                  value={newPatientForm.nome}
                  onChange={(e) => setNewPatientForm({...newPatientForm, nome: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cognome</label>
                <input
                  type="text"
                  value={newPatientForm.cognome}
                  onChange={(e) => setNewPatientForm({...newPatientForm, cognome: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={newPatientForm.email}
                onChange={(e) => setNewPatientForm({...newPatientForm, email: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Altezza (cm)</label>
                <input
                  type="number"
                  value={newPatientForm.altezza}
                  onChange={(e) => setNewPatientForm({...newPatientForm, altezza: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg)</label>
                <input
                  type="number"
                  value={newPatientForm.peso}
                  onChange={(e) => setNewPatientForm({...newPatientForm, peso: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sesso</label>
                <select
                  value={newPatientForm.sesso}
                  onChange={(e) => setNewPatientForm({...newPatientForm, sesso: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="M">Maschio</option>
                  <option value="F">Femmina</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Patologia</label>
              <input
                type="text"
                value={newPatientForm.patologia}
                onChange={(e) => setNewPatientForm({...newPatientForm, patologia: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Opzionale"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Obiettivo</label>
              <textarea
                value={newPatientForm.obiettivo}
                onChange={(e) => setNewPatientForm({...newPatientForm, obiettivo: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                rows="3"
                placeholder="Obiettivo della terapia"
              />
            </div>

            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={newPatientForm.privacy_accepted}
                onChange={(e) => setNewPatientForm({...newPatientForm, privacy_accepted: e.target.checked})}
                className="mt-1"
                required
              />
              <label className="text-sm text-gray-700">
                Il paziente acconsente al trattamento dei dati personali secondo il GDPR
              </label>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setCurrentView('dashboard')}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Crea Paziente
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );

  // Dettaglio Paziente
  const PatientDetail = () => (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="text-indigo-600 hover:text-indigo-700 mb-2"
          >
            ← Torna ai pazienti
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedPatient?.nome} {selectedPatient?.cognome}
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4">Informazioni Paziente</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{selectedPatient?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Altezza / Peso</p>
              <p className="font-medium">{selectedPatient?.altezza} cm / {selectedPatient?.peso} kg</p>
            </div>
            {selectedPatient?.patologia && (
              <div>
                <p className="text-sm text-gray-600">Patologia</p>
                <p className="font-medium">{selectedPatient?.patologia}</p>
              </div>
            )}
            {selectedPatient?.obiettivo && (
              <div>
                <p className="text-sm text-gray-600">Obiettivo</p>
                <p className="font-medium">{selectedPatient?.obiettivo}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-xl font-semibold mb-6">Nuova Analisi</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleCreateVisit('completa')}
              className="p-6 border-2 border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-all"
            >
              <Activity className="w-8 h-8 text-indigo-600 mb-2" />
              <h3 className="font-semibold text-lg mb-2">Analisi Completa</h3>
              <p className="text-sm text-gray-600">Postura + mobilità + peso + appoggi</p>
            </button>
            <button
              onClick={() => handleCreateVisit('posturale')}
              className="p-6 border-2 border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-all"
            >
              <Eye className="w-8 h-8 text-indigo-600 mb-2" />
              <h3 className="font-semibold text-lg mb-2">Analisi Posturale</h3>
              <p className="text-sm text-gray-600">Scansione statica e simmetria</p>
            </button>
            <button
              onClick={() => handleCreateVisit('mobilita_superiori')}
              className="p-6 border-2 border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-all"
            >
              <Activity className="w-8 h-8 text-indigo-600 mb-2" />
              <h3 className="font-semibold text-lg mb-2">Mobilità Arti Superiori</h3>
              <p className="text-sm text-gray-600">Spalla, braccio - frontale e laterale</p>
            </button>
            <button
              onClick={() => handleCreateVisit('mobilita_inferiori')}
              className="p-6 border-2 border-gray-300 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-all"
            >
              <Activity className="w-8 h-8 text-indigo-600 mb-2" />
              <h3 className="font-semibold text-lg mb-2">Mobilità Arti Inferiori</h3>
              <p className="text-sm text-gray-600">Ginocchio, anca - frontale e laterale</p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );

  // Exercise View
  const ExerciseView = () => (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">
              {selectedPatient?.nome} {selectedPatient?.cognome}
            </h1>
            <p className="text-sm text-gray-400">
              {currentVisit?.tipo_analisi?.replace('_', ' ').toUpperCase()}
            </p>
          </div>
          <div className="flex space-x-4">
            {!isStreaming ? (
              <button
                onClick={startStreaming}
                className="flex items-center space-x-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Play className="w-5 h-5" />
                <span>Avvia Analisi</span>
              </button>
            ) : (
              <button
                onClick={stopStreaming}
                className="flex items-center space-x-2 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <Square className="w-5 h-5" />
                <span>Ferma</span>
              </button>
            )}
            <button
              onClick={() => {
                stopStreaming();
                setCurrentView('patientDetail');
              }}
              className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Chiudi
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-gray-800 rounded-lg p-4">
            <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
              {!isStreaming ? (
                <div className="text-center">
                  <Camera className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Premi "Avvia Analisi" per iniziare</p>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-green-400">Streaming in corso...</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Metriche Real-Time</h3>
            
            {streamData?.analysis ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Angoli Articolari</h4>
                  <div className="space-y-2">
                    {Object.entries(streamData.analysis.angles || {}).map(([joint, angle]) => (
                      <div key={joint} className="flex justify-between items-center">
                        <span className="text-sm text-gray-300 capitalize">
                          {joint.replace('_', ' ')}
                        </span>
                        <span className={`text-sm font-semibold ${
                          angle > 160 && angle < 200 ? 'text-green-400' :
                          angle > 140 && angle < 220 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {angle.toFixed(1)}°
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Simmetria</h4>
                  <div className="space-y-2">
                    {Object.entries(streamData.analysis.symmetry || {}).map(([part, value]) => (
                      <div key={part} className="flex justify-between items-center">
                        <span className="text-sm text-gray-300 capitalize">{part}</span>
                        <span className="text-sm font-semibold text-blue-400">
                          {value.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">In attesa di dati...</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Istruzioni per il Paziente</h3>
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Check className="w-6 h-6 text-green-400" />
              <p className="text-white text-lg">Resta immobile con le mani lungo i fianchi</p>
            </div>
            <p className="text-gray-400 ml-9">
              Mantieni la posizione per permettere al sistema di acquisire i dati posturali
            </p>
          </div>
        </div>
      </main>
    </div>
  );

  // ==================== RENDER ====================

  if (!user) return <LoginScreen />;

  switch (currentView) {
    case 'dashboard':
      return <Dashboard />;
    case 'newPatient':
      return <NewPatientForm />;
    case 'patientDetail':
      return <PatientDetail />;
    case 'exercise':
      return <ExerciseView />;
    default:
      return <Dashboard />;
  }
}