import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, MapPin, Droplets, Clock, Bell } from 'lucide-react';

class AlertSystem {
  constructor() {
    this.listeners = [];
    this.alertsShown = new Set();
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify(alert) {
    const alertKey = `${alert.name}-${alert.m15.toFixed(1)}`;
    if (this.alertsShown.has(alertKey)) return;
    
    this.alertsShown.add(alertKey);
    this.listeners.forEach(callback => callback(alert));
    
    setTimeout(() => {
      this.alertsShown.delete(alertKey);
    }, 5 * 60 * 1000);
  }

  clear() {
    this.alertsShown.clear();
  }
}

export const alertSystem = new AlertSystem();

export const usePluviometrosAlerts = () => {
  useEffect(() => {
    const checkAlerts = async () => {
      try {
        const response = await fetch('/api/pluviometros');
        const data = await response.json();
        
        if (data.features) {
          data.features.forEach(feature => {
            const m15 = parseFloat(feature.properties.data?.m15?.replace(',', '.')) || 0;
            const h24 = parseFloat(feature.properties.data?.h24?.replace(',', '.')) || 0;
            const name = feature.properties.station?.name || 'Estacao desconhecida';
            
            if (m15 >= 5.1) {
              let nivel, cor, mensagem, riscos;
              
              if (m15 >= 50) {
                nivel = 'Muito Forte';
                cor = '#dc2626';
                mensagem = 'CHUVA MUITO FORTE DETECTADA!';
                riscos = [
                  'Alto risco de alagamentos',
                  'Deslizamentos possiveis',
                  'Acionar sirenes da regiao',
                  'Alertar Defesa Civil'
                ];
              } else if (m15 >= 25.1) {
                nivel = 'Forte';
                cor = '#f97316';
                mensagem = 'Chuva Forte Detectada';
                riscos = [
                  'Risco de alagamentos',
                  'Atencao em areas de risco',
                  'Monitorar situacao'
                ];
              } else {
                nivel = 'Moderada';
                cor = '#eab308';
                mensagem = 'Chuva Moderada Detectada';
                riscos = [
                  'Possiveis pontos de alagamento',
                  'Atencao ao transito',
                  'Monitorar evolucao'
                ];
              }
              
              alertSystem.notify({
                name,
                m15,
                h24,
                nivel,
                cor,
                mensagem,
                riscos,
                coords: feature.geometry.coordinates
              });
            }
          });
        }
      } catch (error) {
        console.error('Erro ao verificar alertas:', error);
      }
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 60000);
    return () => clearInterval(interval);
  }, []);
};

const AlertNotification = ({ alert, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`bg-gradient-to-br from-slate-800 to-slate-900 border-2 rounded-xl shadow-2xl max-w-md w-full transform transition-all duration-300 ${isExiting ? 'translate-x-[500px] opacity-0' : 'translate-x-0 opacity-100'}`}
      style={{ borderColor: alert.cor }}
    >
      <div className="p-4 rounded-t-xl border-b" style={{ backgroundColor: `${alert.cor}15`, borderColor: `${alert.cor}40` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center animate-pulse" style={{ backgroundColor: `${alert.cor}30` }}>
              <AlertTriangle className="w-5 h-5" style={{ color: alert.cor }} />
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: alert.cor }}>{alert.mensagem}</div>
              <div className="text-xs text-slate-400 mt-1">Alerta de Chuva {alert.nivel}</div>
            </div>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3 text-sm">
          <MapPin className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
          <div className="text-cyan-400 font-semibold">{alert.name}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border" style={{ backgroundColor: `${alert.cor}10`, borderColor: `${alert.cor}30` }}>
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="w-4 h-4" style={{ color: alert.cor }} />
              <span className="text-xs text-slate-400">Agora (15min)</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: alert.cor }}>{alert.m15.toFixed(1)}</div>
            <div className="text-xs text-slate-400">mm/h</div>
          </div>
          <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400">Ultimas 24h</span>
            </div>
            <div className="text-2xl font-bold text-slate-300">{alert.h24.toFixed(1)}</div>
            <div className="text-xs text-slate-400">mm</div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
          <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-2">
            <Bell className="w-3 h-3" />
            Acoes Recomendadas:
          </div>
          <ul className="space-y-1">
            {alert.riscos.map((risco, i) => (
              <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>{risco}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="p-4 border-t border-slate-700">
        <button onClick={handleClose} className="w-full py-2 px-4 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 hover:border-slate-500 rounded-lg text-slate-300 hover:text-white text-sm font-medium transition-all">
          Fechar
        </button>
      </div>
    </div>
  );
};

const AlertsContainer = () => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const unsubscribe = alertSystem.subscribe((alert) => {
      setAlerts(prev => [...prev, { ...alert, id: Date.now() }]);
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => a.id !== alert.id));
      }, 30000);
    });
    return unsubscribe;
  }, []);

  const handleClose = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
      {alerts.map(alert => (
        <div key={alert.id} className="pointer-events-auto">
          <AlertNotification alert={alert} onClose={() => handleClose(alert.id)} />
        </div>
      ))}
    </div>
  );
};

export default AlertsContainer;
