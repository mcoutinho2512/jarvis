import React, { useState, useEffect } from 'react';
import { Activity, Radio, AlertTriangle, CheckCircle, XCircle, MapPin, Clock, TrendingUp, Cloud, Droplets } from 'lucide-react';
// ✅ NOVOS IMPORTS - Sistema de Pluviômetros
import PluviometrosCard from './components/PluviometrosCard';
import AlertsContainer, { usePluviometrosAlerts } from './components/AlertsContainer';

const Dashboard = () => {
  const [sirenes, setSirenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    offline: 0,
    tocando: 0
  });

  // ✅ NOVO - Estado dos pluviômetros
  const [pluvioStats, setPluvioStats] = useState({
    total: 0,
    emAlerta: 0,
    maiorNome: null,
    maiorValor: 0,
    categoria: 'Sem Chuva',
    cor: '#22c55e'
  });

  // ✅ NOVO - Ativa sistema de alertas de chuva
  usePluviometrosAlerts();

  // Buscar dados das sirenes
  useEffect(() => {
    fetchSirenes();
    const interval = setInterval(fetchSirenes, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, []);

  // ✅ NOVO - Buscar dados dos pluviômetros
  useEffect(() => {
    fetchPluviometros();
    const interval = setInterval(fetchPluviometros, 120000); // Atualiza a cada 2min
    return () => clearInterval(interval);
  }, []);

  const fetchSirenes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/sirenes');
      
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Aceitar diferentes formatos de resposta
      let sirenesList = [];
      
      if (Array.isArray(data)) {
        // Formato: [...]
        sirenesList = data;
      } else if (data && Array.isArray(data.sirenes)) {
        // Formato: { sirenes: [...] }
        sirenesList = data.sirenes;
      } else if (data && Array.isArray(data.data)) {
        // Formato: { data: [...] }
        sirenesList = data.data;
      } else if (data && typeof data === 'object') {
        // Se for um objeto único, coloca em array
        sirenesList = [data];
      } else {
        throw new Error(`Formato inesperado: ${JSON.stringify(data).substring(0, 100)}`);
      }
      
      setSirenes(sirenesList);
      calcularStats(sirenesList);
      
    } catch (err) {
      console.error('Erro ao buscar sirenes:', err);
      setError(err.message);
      // Define dados vazios em caso de erro
      setSirenes([]);
      setStats({ total: 0, online: 0, offline: 0, tocando: 0 });
    } finally {
      setLoading(false);
    }
  };

  // ✅ NOVO - Função para buscar e processar pluviômetros
  const fetchPluviometros = async () => {
    try {
      const response = await fetch('/api/pluviometros');
      const data = await response.json();
      
      if (data.features) {
        const processed = data.features.map(feature => {
          const m15 = parseFloat(feature.properties.data?.m15?.replace(',', '.')) || 0;
          const name = feature.properties.station?.name || 'Estação desconhecida';
          return { name, m15 };
        });

        // Encontrar o maior índice
        const maior = processed.reduce((prev, current) => 
          (prev.m15 > current.m15) ? prev : current
        , { name: null, m15: 0 });

        // Contar quantos estão em alerta (≥ 5.1 mm/h)
        const emAlerta = processed.filter(p => p.m15 >= 5.1).length;

        // Determinar categoria e cor
        let categoria = 'Sem Chuva';
        let cor = '#22c55e';
        
        if (maior.m15 >= 50) {
          categoria = 'Chuva Muito Forte';
          cor = '#dc2626';
        } else if (maior.m15 >= 25.1) {
          categoria = 'Chuva Forte';
          cor = '#f97316';
        } else if (maior.m15 >= 5.1) {
          categoria = 'Chuva Moderada';
          cor = '#eab308';
        } else if (maior.m15 >= 0.2) {
          categoria = 'Chuva Fraca';
          cor = '#3b82f6';
        }

        setPluvioStats({
          total: processed.length,
          emAlerta,
          maiorNome: maior.name,
          maiorValor: maior.m15,
          categoria,
          cor
        });
      }
    } catch (error) {
      console.error('Erro ao buscar pluviômetros:', error);
    }
  };

  const calcularStats = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      setStats({ total: 0, online: 0, offline: 0, tocando: 0 });
      return;
    }

    const stats = {
      total: data.length,
      online: 0,
      offline: 0,
      tocando: 0
    };

    data.forEach(sirene => {
      // Verificar se sirene e suas propriedades existem
      if (!sirene) return;
      
      // Contar online (com tratamento de undefined)
      if (sirene.online === true) {
        stats.online++;
      } else if (sirene.online === false) {
        stats.offline++;
      }
      
      // Contar tocando (com tratamento de undefined)
      if (sirene.tocando === true || sirene.status === 'tocando') {
        stats.tocando++;
      }
    });

    setStats(stats);
  };

  const getStatusColor = (online, tocando) => {
    // Tratamento seguro de valores undefined
    if (tocando === true) return 'text-red-400 bg-red-500/20';
    if (online === true) return 'text-green-400 bg-green-500/20';
    if (online === false) return 'text-gray-400 bg-gray-500/20';
    return 'text-yellow-400 bg-yellow-500/20'; // Status desconhecido
  };

  const getStatusIcon = (online, tocando) => {
    if (tocando === true) return AlertTriangle;
    if (online === true) return CheckCircle;
    if (online === false) return XCircle;
    return Activity; // Status desconhecido
  };

  const getStatusText = (online, tocando) => {
    if (tocando === true) return 'TOCANDO';
    if (online === true) return 'Online';
    if (online === false) return 'Offline';
    return 'Desconhecido';
  };

  if (loading && sirenes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="w-12 h-12 text-cyan-400 animate-pulse mx-auto mb-4" />
          <p className="text-slate-300">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ NOVO - Container de Pop-ups de Alerta */}
      <AlertsContainer />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Dashboard de Monitoramento</h2>
          <p className="text-slate-400">Sistema de Sirenes e Pluviômetros - Defesa Civil Rio</p>
        </div>
        <button
          onClick={() => {
            fetchSirenes();
            fetchPluviometros();
          }}
          className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 px-4 py-2 rounded-lg transition-all"
        >
          <Activity className="w-5 h-5" />
        </button>
      </div>

      {/* Estatísticas - EXPANDIDO COM 6 CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* Card 1 - Total de Sirenes */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-cyan-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Radio className="w-8 h-8 text-cyan-400" />
            <span className="text-3xl font-bold text-white">{stats.total}</span>
          </div>
          <p className="text-slate-400 text-sm">Total de Sirenes</p>
        </div>

        {/* Card 2 - Online */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-400" />
            <span className="text-3xl font-bold text-white">{stats.online}</span>
          </div>
          <p className="text-slate-400 text-sm">Online</p>
        </div>

        {/* Card 3 - Offline */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-gray-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <XCircle className="w-8 h-8 text-gray-400" />
            <span className="text-3xl font-bold text-white">{stats.offline}</span>
          </div>
          <p className="text-slate-400 text-sm">Offline</p>
        </div>

        {/* Card 4 - Tocando */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-red-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <span className="text-3xl font-bold text-white">{stats.tocando}</span>
          </div>
          <p className="text-slate-400 text-sm">Tocando</p>
        </div>

        {/* ✅ NOVO - Card 5 - Total Pluviômetros + Maior Índice */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <Cloud className="w-8 h-8 text-blue-400" />
            <span className="text-3xl font-bold text-white">{pluvioStats.total}</span>
          </div>
          <p className="text-slate-400 text-sm">Pluviômetros</p>
          {pluvioStats.maiorValor > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Maior:</span>
                <span 
                  className="text-lg font-bold"
                  style={{ color: pluvioStats.cor }}
                >
                  {pluvioStats.maiorValor.toFixed(1)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 truncate">
                {pluvioStats.maiorNome}
              </p>
            </div>
          )}
        </div>

        {/* ✅ NOVO - Card 6 - Alertas de Chuva Ativos */}
        <div 
          className={`bg-slate-800/50 backdrop-blur-xl border rounded-xl p-6 ${
            pluvioStats.emAlerta > 0 
              ? 'border-orange-500/50 animate-pulse' 
              : 'border-slate-700/30'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <Droplets 
              className={`w-8 h-8 ${
                pluvioStats.emAlerta > 0 ? 'text-orange-400' : 'text-slate-600'
              }`} 
            />
            <span 
              className={`text-3xl font-bold ${
                pluvioStats.emAlerta > 0 ? 'text-orange-400' : 'text-white'
              }`}
            >
              {pluvioStats.emAlerta}
            </span>
          </div>
          <p className="text-slate-400 text-sm">Em Alerta</p>
          {pluvioStats.emAlerta > 0 && (
            <div className="mt-3 pt-3 border-t border-orange-500/30">
              <p className="text-xs text-orange-300 font-semibold">
                {pluvioStats.categoria}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-red-300 font-semibold">Erro ao carregar dados</p>
              <p className="text-red-400/80 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Card de Pluviômetros */}
      <div className="bg-slate-800/30 backdrop-blur-xl border border-cyan-500/30 rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-b border-cyan-500/30 p-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-cyan-400" />
            Monitoramento de Chuva
          </h3>
        </div>
        <div className="p-4">
          <PluviometrosCard />
        </div>
      </div>

      {/* Lista de Sirenes */}
      <div className="bg-slate-800/30 backdrop-blur-xl border border-cyan-500/30 rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-b border-cyan-500/30 p-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className="w-6 h-6 text-cyan-400" />
            Sirenes Cadastradas ({sirenes.length})
          </h3>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {sirenes.length === 0 ? (
            <div className="p-8 text-center">
              <Radio className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Nenhuma sirene encontrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
              {sirenes.map((sirene, index) => {
                const StatusIcon = getStatusIcon(sirene.online, sirene.tocando);
                const statusColor = getStatusColor(sirene.online, sirene.tocando);
                const statusText = getStatusText(sirene.online, sirene.tocando);

                return (
                  <div
                    key={sirene.id || index}
                    className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-4 hover:border-cyan-500/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold text-lg mb-1">
                          {sirene.nome || `Sirene ${index + 1}`}
                        </h4>
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <MapPin className="w-4 h-4" />
                          <span>{sirene.bairro || 'Bairro não informado'}</span>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-lg flex items-center gap-2 ${statusColor}`}>
                        <StatusIcon className="w-4 h-4" />
                        <span className="text-sm font-semibold">{statusText}</span>
                      </div>
                    </div>

                    {sirene.localizacao && (
                      <div className="text-slate-400 text-sm mb-2">
                        📍 {sirene.localizacao}
                      </div>
                    )}

                    {sirene.ultimaAtualizacao && (
                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>Última atualização: {new Date(sirene.ultimaAtualizacao).toLocaleString('pt-BR')}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;