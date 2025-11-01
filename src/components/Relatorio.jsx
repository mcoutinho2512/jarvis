import React, { useState, useEffect } from 'react';

const Relatorio = ({ onClose }) => {
  const [periodo, setPeriodo] = useState(30);
  const [dados, setDados] = useState({
    sirenes: [],
    ocorrencias: [],
    pluviometros: [],
    waze: [],
    bairros: []
  });
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(new Date());

  useEffect(() => {
    carregarDados();
    const interval = setInterval(() => {
      carregarDados();
    }, 30000);
    return () => clearInterval(interval);
  }, [periodo]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [sirenes, ocorrencias, pluvio, wazeData, bairros] = await Promise.all([
        fetch('/api/sirenes').then(r => r.json()),
        fetch('/api/ocorrencias').then(r => r.json()),
        fetch('/api/pluviometria').then(r => r.json()),
        fetch('/api/waze/filtrado').then(r => r.json()),
        fetch('/api/bairros').then(r => r.json())
      ]);

      const pluvioArray = Array.isArray(pluvio) ? pluvio : (pluvio?.features || []);
      const wazeArray = Array.isArray(wazeData) ? wazeData : (wazeData?.alerts || []);
      const bairrosArray = Array.isArray(bairros) ? bairros : (bairros?.features || []);

      setDados({
        sirenes: sirenes || [],
        ocorrencias: ocorrencias || [],
        pluviometros: pluvioArray,
        waze: wazeArray,
        bairros: bairrosArray
      });

      calcularRanking(sirenes || [], ocorrencias || [], pluvioArray, wazeArray, bairrosArray);
      setUltimaAtualizacao(new Date());
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularRanking = (sirenes, ocorrencias, pluvio, waze, bairros) => {
    const pontuacaoBairros = {};
    bairros.forEach(b => {
      const props = b.properties || b;
      const nome = props?.nome || props?.NOME || props?.name;
      if (nome) {
        pontuacaoBairros[nome] = { nome, sirenes: 0, ocorrencias: 0, chuva: 0, transito: 0, total: 0 };
      }
    });

    if (Array.isArray(sirenes)) {
      sirenes.filter(s => s.status === 'acionada' || s.active).forEach(sirene => {
        const bairro = sirene.bairro || sirene.neighborhood;
        if (bairro && pontuacaoBairros[bairro]) pontuacaoBairros[bairro].sirenes += 10;
      });
    }

    if (Array.isArray(ocorrencias)) {
      ocorrencias.forEach(oc => {
        const location = (oc.location || '').toUpperCase();
        Object.keys(pontuacaoBairros).forEach(bairro => {
          if (location.includes(bairro.toUpperCase())) pontuacaoBairros[bairro].ocorrencias += 5;
        });
      });
    }

    if (Array.isArray(pluvio)) {
      pluvio.forEach(p => {
        const props = p.properties || p;
        const chuva = parseFloat(props.chuva_15min || props.precipitacao || 0);
        if (chuva > 0) {
          const estacao = (props.estacao || props.nome || '').toUpperCase();
          Object.keys(pontuacaoBairros).forEach(bairro => {
            if (estacao.includes(bairro.toUpperCase())) pontuacaoBairros[bairro].chuva += Math.min(chuva, 10);
          });
        }
      });
    }

    if (Array.isArray(waze)) {
      waze.forEach(w => {
        const location = (w.location || w.street || '').toUpperCase();
        Object.keys(pontuacaoBairros).forEach(bairro => {
          if (location.includes(bairro.toUpperCase())) pontuacaoBairros[bairro].transito += 3;
        });
      });
    }

    const rankingArray = Object.values(pontuacaoBairros)
      .map(b => ({ ...b, total: b.sirenes + b.ocorrencias + b.chuva + b.transito }))
      .filter(b => b.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    setRanking(rankingArray);
  };

  const sirenasAcionadas = dados.sirenes.filter(s => s.status === 'acionada' || s.active).length;
  const estacoesComChuva = dados.pluviometros.filter(p => {
    const props = p.properties || p;
    return parseFloat(props.chuva_15min || props.precipitacao || 0) > 0;
  }).length;

  if (loading && !dados.sirenes.length) {
    return (
      <div style={{ padding: '100px', textAlign: 'center', backgroundColor: 'white' }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '5px solid #3b82f6',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <p style={{ fontSize: '18px', color: '#666' }}>Carregando relatório...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        body { margin: 0; padding: 0; overflow-y: auto !important; }
        * { box-sizing: border-box; }
        @media print { button { display: none !important; } }
      `}</style>

      <div style={{ backgroundColor: 'white', padding: '0', margin: '0' }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '30px 20px'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
              <div>
                <h1 style={{ margin: '0 0 10px 0', fontSize: '32px', fontWeight: 'bold' }}>
                  📊 RELATÓRIO DE INTEMPÉRIES
                </h1>
                <p style={{ margin: 0, fontSize: '16px', opacity: 0.95 }}>
                  Sistema JARVIS Municipal Rio - Defesa Civil
                </p>
              </div>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '2px solid white',
                  color: 'white',
                  fontSize: '24px',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div>
                <strong>Emissão:</strong> {new Date().toLocaleString('pt-BR')}
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <strong>Período:</strong>
                <select
                  value={periodo}
                  onChange={(e) => setPeriodo(Number(e.target.value))}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '5px',
                    border: '1px solid white',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  <option value={30}>Últimos 30 min</option>
                  <option value={60}>Última 1 hora</option>
                  <option value={120}>Últimas 2 horas</option>
                </select>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '14px' }}>
                ⏱️ Atualizado: {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => window.print()}
                style={{
                  backgroundColor: 'white',
                  color: '#667eea',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                🖨️ Imprimir
              </button>
              <button
                onClick={() => window.print()}
                style={{
                  backgroundColor: 'white',
                  color: '#667eea',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                📥 Baixar PDF
              </button>
              <button
                onClick={carregarDados}
                style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}
              >
                🔄 Atualizar
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px 100px' }}>
          {/* Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px',
            marginBottom: '40px'
          }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #fecaca 0%, #dc2626 100%)',
              padding: '25px',
              borderRadius: '12px',
              color: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '5px' }}>{sirenasAcionadas}</div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>Sirenes Acionadas</div>
            </div>
            <div style={{ 
              background: 'linear-gradient(135deg, #fdba74 0%, #ea580c 100%)',
              padding: '25px',
              borderRadius: '12px',
              color: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '5px' }}>{dados.ocorrencias.length}</div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>Ocorrências Ativas</div>
            </div>
            <div style={{ 
              background: 'linear-gradient(135deg, #93c5fd 0%, #2563eb 100%)',
              padding: '25px',
              borderRadius: '12px',
              color: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '5px' }}>{estacoesComChuva}</div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>Estações com Chuva</div>
            </div>
            <div style={{ 
              background: 'linear-gradient(135deg, #fde047 0%, #ca8a04 100%)',
              padding: '25px',
              borderRadius: '12px',
              color: 'white',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '5px' }}>{dados.waze.length}</div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>Alertas de Trânsito</div>
            </div>
          </div>

          {/* Ranking */}
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ 
              fontSize: '28px', 
              fontWeight: 'bold',
              color: '#1f2937',
              marginBottom: '20px',
              paddingBottom: '10px',
              borderBottom: '3px solid #667eea'
            }}>
              🏆 RANKING DE BAIRROS MAIS AFETADOS
            </h2>
            
            <table style={{ 
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', borderBottom: '2px solid #e5e7eb' }}>Pos</th>
                  <th style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold', borderBottom: '2px solid #e5e7eb' }}>Bairro</th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', borderBottom: '2px solid #e5e7eb' }}>🚨 Sirenes</th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', borderBottom: '2px solid #e5e7eb' }}>🚨 Ocorrências</th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', borderBottom: '2px solid #e5e7eb' }}>💧 Chuva</th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', borderBottom: '2px solid #e5e7eb' }}>🚗 Trânsito</th>
                  <th style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', borderBottom: '2px solid #e5e7eb' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {ranking.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '50px', textAlign: 'center', color: '#6b7280', fontSize: '16px' }}>
                      ✅ Nenhum bairro significativamente afetado no momento
                    </td>
                  </tr>
                ) : (
                  ranking.map((b, i) => (
                    <tr key={b.nome} style={{ 
                      backgroundColor: i < 3 ? '#fef2f2' : 'white',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <td style={{ padding: '15px', textAlign: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                        {i === 0 && '🥇'}{i === 1 && '🥈'}{i === 2 && '🥉'}{i > 2 && `${i + 1}º`}
                      </td>
                      <td style={{ padding: '15px', fontWeight: '600' }}>{b.nome}</td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>{b.sirenes}</td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>{b.ocorrencias}</td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>{b.chuva.toFixed(1)}</td>
                      <td style={{ padding: '15px', textAlign: 'center' }}>{b.transito}</td>
                      <td style={{ padding: '15px', textAlign: 'center', fontWeight: 'bold', color: '#dc2626', fontSize: '18px' }}>
                        {b.total.toFixed(0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Detalhes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            <div style={{ 
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '25px',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc2626', marginBottom: '15px' }}>
                🚨 Sirenes Acionadas
              </h3>
              {sirenasAcionadas === 0 ? (
                <p style={{ color: '#6b7280' }}>Nenhuma sirene acionada</p>
              ) : (
                <ul style={{ fontSize: '14px', lineHeight: '2', paddingLeft: '20px', margin: 0 }}>
                  {dados.sirenes.filter(s => s.status === 'acionada' || s.active).map((s, i) => (
                    <li key={i}>{s.nome || s.name} - {s.bairro || s.neighborhood}</li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ 
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '25px',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ea580c', marginBottom: '15px' }}>
                🚨 Ocorrências Hexagon
              </h3>
              {dados.ocorrencias.length === 0 ? (
                <p style={{ color: '#6b7280' }}>Nenhuma ocorrência ativa</p>
              ) : (
                <ul style={{ fontSize: '14px', lineHeight: '2', paddingLeft: '20px', margin: 0 }}>
                  {dados.ocorrencias.slice(0, 10).map((oc, i) => (
                    <li key={i}>{oc.incidente} - {oc.prio}</li>
                  ))}
                  {dados.ocorrencias.length > 10 && (
                    <li style={{ color: '#6b7280', fontStyle: 'italic' }}>
                      ... e mais {dados.ocorrencias.length - 10} ocorrências
                    </li>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Rodapé */}
          <div style={{ 
            textAlign: 'center',
            padding: '30px 0',
            borderTop: '2px solid #e5e7eb',
            color: '#6b7280'
          }}>
            <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', fontSize: '16px' }}>
              Sistema JARVIS Municipal Rio - Defesa Civil
            </p>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Dados atualizados em tempo real • Relatório gerado automaticamente
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Relatorio;
