import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Map from './Map';
import Dashboard from './Dashboard';
import ChatJarvis from './ChatJarvis';
import MonitorOcorrencias from './MonitorOcorrencias';
import RelatorioPage from './RelatorioPage';

function App() {
  const [currentView, setCurrentView] = React.useState('mapa');

  const abrirRelatorio = () => {
    window.open('/relatorio', '_blank');
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/relatorio" element={<RelatorioPage />} />
        
        <Route path="/*" element={
          <div style={{ 
            width: '100vw', 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: '#0f172a',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <header style={{
              backgroundColor: '#1e293b',
              borderBottom: '2px solid #06b6d4',
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '32px' }}>⚡</div>
                <div>
                  <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
                    JARVIS Municipal Rio
                  </h1>
                  <p style={{ margin: 0, fontSize: '14px', color: '#06b6d4' }}>
                    Sirenes • Previsão • Chuvas • Trânsito
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10b981',
                  animation: 'pulse 2s infinite'
                }}></div>
                <span style={{ color: '#10b981', fontSize: '14px' }}>5/5 APIs</span>
              </div>
            </header>

            {/* Navigation */}
            <nav style={{
              backgroundColor: '#1e293b',
              padding: '12px 24px',
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => setCurrentView('chat')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: currentView === 'chat' ? '#06b6d4' : '#334155',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 500
                }}
              >
                💬 Chat JARVIS
              </button>
              
              <button
                onClick={() => setCurrentView('dashboard')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: currentView === 'dashboard' ? '#06b6d4' : '#334155',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 500
                }}
              >
                📊 Dashboard
              </button>
              
              <button
                onClick={() => setCurrentView('mapa')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: currentView === 'mapa' ? '#06b6d4' : '#334155',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 500
                }}
              >
                🗺️ Mapa
              </button>

              <button
                onClick={() => setCurrentView('monitor')}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: currentView === 'monitor' ? '#06b6d4' : '#334155',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 500
                }}
              >
                🚨 Monitor
              </button>

              {/* BOTÃO RELATÓRIO NO MENU */}
              <button
                onClick={abrirRelatorio}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '2px solid #3b82f6',
                  background: 'linear-gradient(to right, #2563eb, #1e40af)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 600,
                  marginLeft: 'auto'
                }}
              >
                📊 Relatório de Intempéries
              </button>
            </nav>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {currentView === 'mapa' && <Map />}
              {currentView === 'dashboard' && <Dashboard />}
              {currentView === 'chat' && <ChatJarvis />}
              {currentView === 'monitor' && <MonitorOcorrencias />}
            </div>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
