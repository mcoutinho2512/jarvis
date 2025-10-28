import React, { useState, useEffect } from 'react';
import { Cloud, Droplets, AlertTriangle, TrendingUp } from 'lucide-react';

const PluviometrosCard = () => {
  const [pluviometros, setPluviometros] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    muitoForte: 0,
    forte: 0,
    moderada: 0,
    fraca: 0,
    sem: 0
  });

  useEffect(() => {
    fetchPluviometros();
    const interval = setInterval(fetchPluviometros, 120000); // 2 minutos
    return () => clearInterval(interval);
  }, []);

  const fetchPluviometros = async () => {
    try {
      const response = await fetch('/api/pluviometros');
      const data = await response.json();
      
      if (data.features) {
        const processed = data.features
          .map(feature => {
            const m15 = parseFloat(feature.properties.data?.m15?.replace(',', '.')) || 0;
            const h24 = parseFloat(feature.properties.data?.h24?.replace(',', '.')) || 0;
            const name = feature.properties.station?.name || 'Estacao desconhecida';
            
            return {
              name,
              m15,
              h24,
              coords: feature.geometry.coordinates,
              categoria: getCategoriaByValue(m15),
              cor: getCorByValue(m15)
            };
          })
          .sort((a, b) => b.m15 - a.m15);
        
        setPluviometros(processed);
        
        const stats = {
          total: processed.length,
          muitoForte: processed.filter(p => p.m15 > 50).length,
          forte: processed.filter(p => p.m15 >= 25.1 && p.m15 <= 50).length,
          moderada: processed.filter(p => p.m15 >= 5.1 && p.m15 <= 25).length,
          fraca: processed.filter(p => p.m15 >= 0.2 && p.m15 <= 5).length,
          sem: processed.filter(p => p.m15 === 0).length
        };
        
        setStats(stats);
      }
    } catch (error) {
      console.error('Erro ao buscar pluviometros:', error);
    }
  };

  const getCategoriaByValue = (m15) => {
    if (m15 === 0) return 'Sem Chuva';
    if (m15 >= 0.2 && m15 <= 5.0) return 'Chuva Fraca';
    if (m15 >= 5.1 && m15 <= 25.0) return 'Chuva Moderada';
    if (m15 >= 25.1 && m15 <= 50.0) return 'Chuva Forte';
    return 'Chuva Muito Forte';
  };

  const getCorByValue = (m15) => {
    if (m15 === 0) return '#22c55e';
    if (m15 >= 0.2 && m15 <= 5.0) return '#3b82f6';
    if (m15 >= 5.1 && m15 <= 25.0) return '#eab308';
    if (m15 >= 25.1 && m15 <= 50.0) return '#f97316';
    return '#dc2626';
  };

  const getIconByCategoria = (categoria) => {
    switch (categoria) {
      case 'Sem Chuva': return '🟢';
      case 'Chuva Fraca': return '🔵';
      case 'Chuva Moderada': return '🟡';
      case 'Chuva Forte': return '🟠';
      case 'Chuva Muito Forte': return '🔴';
      default: return '⚪';
    }
  };

  const top5 = pluviometros.slice(0, 5);
  const temAlerta = stats.moderada > 0 || stats.forte > 0 || stats.muitoForte > 0;

  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-cyan-500/30 rounded-xl p-6 h-full backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
            <Cloud className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Pluviometros</h2>
            <p className="text-sm text-slate-400">{stats.total} estacoes monitoradas</p>
          </div>
        </div>
        
        {temAlerta && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 border border-orange-500/50 rounded-lg animate-pulse">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-semibold text-orange-300">Alertas Ativos</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2 mb-6">
        {stats.muitoForte > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-400">{stats.muitoForte}</div>
            <div className="text-xs text-red-300 mt-1">Muito Forte</div>
          </div>
        )}
        {stats.forte > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-400">{stats.forte}</div>
            <div className="text-xs text-orange-300 mt-1">Forte</div>
          </div>
        )}
        {stats.moderada > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.moderada}</div>
            <div className="text-xs text-yellow-300 mt-1">Moderada</div>
          </div>
        )}
        {stats.fraca > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.fraca}</div>
            <div className="text-xs text-blue-300 mt-1">Fraca</div>
          </div>
        )}
        {stats.sem > 0 && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.sem}</div>
            <div className="text-xs text-green-300 mt-1">Sem Chuva</div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-white font-semibold mb-4">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="text-sm">Top 5 com Mais Chuva</span>
        </div>

        {top5.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Droplets className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum pluviometro com dados</p>
          </div>
        ) : (
          top5.map((pluv, index) => (
            <div
              key={index}
              className="group bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 hover:border-cyan-500/50 rounded-lg p-3 transition-all cursor-pointer"
              style={{ borderLeft: `4px solid ${pluv.cor}` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-lg font-bold text-slate-400 group-hover:text-cyan-400 transition-colors">
                    #{index + 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getIconByCategoria(pluv.categoria)}</span>
                    <div>
                      <div className="font-semibold text-white text-sm">{pluv.name}</div>
                      <div className="text-xs text-slate-400">{pluv.categoria}</div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold" style={{ color: pluv.cor }}>{pluv.m15.toFixed(1)}</div>
                  <div className="text-xs text-slate-400">mm/h</div>
                </div>
              </div>
              {pluv.h24 > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-700/50 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-3 h-3" />
                    <span>Ultimas 24h: <strong className="text-cyan-400">{pluv.h24.toFixed(1)} mm</strong></span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {pluviometros.length > 5 && (
        <button className="w-full mt-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 hover:border-cyan-500/50 rounded-lg text-slate-300 hover:text-white text-sm font-medium transition-all">
          Ver Todos ({pluviometros.length})
        </button>
      )}

      <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-500 text-center">
        Atualizacao a cada 2 minutos 
      </div>
    </div>
  );
};

export default PluviometrosCard;
