import React, { useState, useEffect } from 'react';

const MonitorOcorrencias = () => {
  const [ocorrencias, setOcorrencias] = useState([]);
  const [estatisticas, setEstatisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(new Date());

  const EVENT_DICT = {
    "POP01": "ACIDENTE SEM VITIMA",
    "POP02": "ACIDENTE COM VITIMA",
    "POP03": "ACIDENTE COM OBITO",
    "POP04": "INCENDIO EM VEICULO",
    "POP05": "BOLSAO DE AGUA EM VIA",
    "POP06": "MANIFESTACAO EM LOCAL PUBLICO",
    "POP07": "INCENDIO EM IMOVEL",
    "POP08": "SINAIS DE TRANSITO COM MAU FUNCIONAMENTO",
    "POP09": "REINTEGRACAO DE POSSE",
    "POP10": "QUEDA DE ARVORE",
    "POP11": "QUEDA DE POSTE",
    "POP12": "ACIDENTE COM QUEDA DE CARGA",
    "POP13": "INCENDIO NO ENTORNO DE VIAS PUBLICAS",
    "POP14": "INCENDIO DENTRO DE TUNEIS",
    "POP15": "VAZAMENTO DE AGUA E ESGOTO",
    "POP16": "FALTA CRITICA DE ENERGIA OU APAGAO",
    "POP17": "IMPLOSAO",
    "POP18": "ESCAPAMENTO DE GAS",
    "POP19": "EVENTO NAO PROGRAMADO",
    "POP20": "ATROPELAMENTO",
    "POP21": "AFUNDAMENTO DE PISTA OU BURACO NA VIA",
    "POP22": "ABALROAMENTO",
    "POP23": "OBRA/MANUTENÇÃO EM LOCAL PUBLICO",
    "POP24": "OPERACAO POLICIAL",
    "POP25": "ACIONAMENTO DE SIRENES",
    "POP26": "ALAGAMENTO",
    "POP27": "ENCHENTE OU INUNDACAO",
    "POP28": "LAMINA DE AGUA",
    "POP29": "ACIDENTE AMBIENTAL",
    "POP30": "INCIDENTE COM BUEIRO",
    "POP31": "QUEDA DE ARVORE SOBRE FIACAO",
    "POP32": "RESIDUOS NA VIA",
    "POP33": "INCENDIO EM VEGETACAO",
    "POP34": "DESLIZAMENTO",
    "POP35": "QUEDA DE ESTRUTURA DE ALVENARIA",
    "POP36": "RESGATE OU REMOCAO DE ANIMAIS TERRESTRES E AEREOS",
    "POP37": "REMOCAO DE ANIMAIS MORTOS NA AREIA",
    "POP38": "RESGATE DE ANIMAL MARINHO PRESO EM REDE OU ENCALHADO",
    "POP39": "ANIMAL EM LOCAL PUBLICO",
    "POP40": "QUEDA DE CARGA VIVA DE GRANDE PORTE",
    "POP41": "QUEDA DE CARGA VIVA DE PEQUENO PORTE",
    "POP42": "PROTOCOLO DE VIA",
    "POP43": "PROTOCOLO DE CICLOVIA",
    "POP44": "ENGUICO NA VIA",
    "POP45": "PROTOCOLO DE CALOR - NC2",
    "POP46": "PROTOCOLO DE CALOR - NC3",
    "POP47": "PROTOCOLO DE CALOR - NC4",
    "POP48": "PROTOCOLO DE CALOR - NC5",
    "POP49": "PROTOCOLO DE PARQUES",
    "POP50": "OCORRENCIA EM PARQUE AEROPORTUARIO",
    "POP51": "INTERRUPÇÃO PARCIAL OU TOTAL DE MODAL DE TRANSPORTE",
    "POP52": "FIAÇÃO PARTIDA/ARREADA",
    "POP53": "RESSACA/MARÉ ALTA"
  };

  const PRIORIDADE_DICT = {
    1: "BAIXA",
    2: "MÉDIA",
    3: "ALTA",
    4: "MUITO ALTA"
  };

  const CORES_PRIORIDADE = {
    "MUITO ALTA": { bg: '#fee2e2', border: '#ef4444', text: '#dc2626' },
    "ALTA": { bg: '#fed7aa', border: '#f97316', text: '#ea580c' },
    "MÉDIA": { bg: '#fef3c7', border: '#eab308', text: '#ca8a04' },
    "BAIXA": { bg: '#dbeafe', border: '#3b82f6', text: '#2563eb' }
  };

  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 30000); // Auto-refresh 30s
    return () => clearInterval(interval);
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ocorrencias');
      const data = await response.json();
      setOcorrencias(data);
      analisarEstatisticas(data);
      setUltimaAtualizacao(new Date());
    } catch (error) {
      console.error('Erro ao carregar ocorrências:', error);
    } finally {
      setLoading(false);
    }
  };

  const analisarEstatisticas = (data) => {
    if (!data || data.length === 0) {
      setEstatisticas(null);
      return;
    }

    const total = data.length;
    
    // Contar por prioridade
    const prioridades = {
      "MUITO ALTA": 0,
      "ALTA": 0,
      "MÉDIA": 0,
      "BAIXA": 0
    };

    // Contar por tipo
    const tiposCount = {};

    data.forEach(occ => {
      // Prioridade
      const prioNome = occ.prio || "BAIXA";
      if (prioridades[prioNome] !== undefined) {
        prioridades[prioNome]++;
      }

      // Tipo
      const tipo = occ.incidente || "OUTROS";
      tiposCount[tipo] = (tiposCount[tipo] || 0) + 1;
    });

    // Top 10 tipos
    const topTipos = Object.entries(tiposCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tipo, count]) => ({
        tipo,
        count,
        percentual: (count / total * 100).toFixed(1)
      }));

    // Ocorrências críticas (ALTA ou MUITO ALTA)
    const criticas = data.filter(occ => 
      occ.prio === "ALTA" || occ.prio === "MUITO ALTA"
    );

    setEstatisticas({
      total,
      prioridades,
      topTipos,
      criticas
    });
  };

  if (loading && !estatisticas) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        backgroundColor: '#0f172a',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '5px solid rgba(6, 182, 212, 0.3)',
            borderTop: '5px solid #06b6d4',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <div>Carregando monitor...</div>
        </div>
      </div>
    );
  }

  if (!estatisticas) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        backgroundColor: '#0f172a',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📊</div>
          <h2 style={{ margin: '0 0 10px 0' }}>Nenhuma ocorrência encontrada</h2>
          <p style={{ color: '#94a3b8' }}>Aguardando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      backgroundColor: '#0f172a',
      padding: '20px'
    }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* HEADER */}
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '20px',
        border: '1px solid rgba(6, 182, 212, 0.3)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <h1 style={{
              margin: '0 0 8px 0',
              fontSize: '28px',
              fontWeight: 'bold',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              🚨 Monitor de Ocorrências Hexagon
            </h1>
            <p style={{
              margin: 0,
              color: '#06b6d4',
              fontSize: '14px'
            }}>
              Análise em tempo real • Sistema JARVIS Municipal Rio
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={carregarDados}
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: loading ? '#475569' : '#06b6d4',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                opacity: loading ? 0.5 : 1
              }}
            >
              {loading ? '⏳ Atualizando...' : '🔄 Atualizar'}
            </button>

            <div style={{
              fontSize: '12px',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ animation: 'pulse 2s infinite', color: '#10b981' }}>●</span>
              {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
            </div>
          </div>
        </div>
      </div>

      {/* RESUMO GERAL */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '24px',
          borderRadius: '12px',
          color: 'white',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}>
          <div style={{ fontSize: '42px', fontWeight: 'bold', marginBottom: '8px' }}>
            {estatisticas.total}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Ocorrências Ativas</div>
        </div>

        {Object.entries(estatisticas.prioridades).map(([prio, count]) => {
          const cores = CORES_PRIORIDADE[prio];
          return (
            <div
              key={prio}
              style={{
                backgroundColor: cores.bg,
                border: `2px solid ${cores.border}`,
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{
                fontSize: '42px',
                fontWeight: 'bold',
                color: cores.text,
                marginBottom: '8px'
              }}>
                {count}
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: cores.text
              }}>
                {prio}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* GRÁFICO DE PRIORIDADES */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid rgba(6, 182, 212, 0.3)'
        }}>
          <h2 style={{
            margin: '0 0 20px 0',
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'white'
          }}>
            📊 Distribuição por Criticidade
          </h2>

          {Object.entries(estatisticas.prioridades).map(([prio, count]) => {
            const percentual = (count / estatisticas.total * 100).toFixed(1);
            const cores = CORES_PRIORIDADE[prio];

            return (
              <div key={prio} style={{ marginBottom: '16px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  color: 'white',
                  fontSize: '14px'
                }}>
                  <span style={{ fontWeight: '600' }}>{prio}</span>
                  <span>{count} ({percentual}%)</span>
                </div>
                <div style={{
                  width: '100%',
                  height: '24px',
                  backgroundColor: '#334155',
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${percentual}%`,
                    height: '100%',
                    backgroundColor: cores.border,
                    transition: 'width 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: '8px',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {count > 0 && percentual > 10 && `${count}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* TOP 10 TIPOS */}
        <div style={{
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid rgba(6, 182, 212, 0.3)'
        }}>
          <h2 style={{
            margin: '0 0 20px 0',
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'white'
          }}>
            📋 Top 10 Tipos de Ocorrência
          </h2>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {estatisticas.topTipos.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: index < 3 ? 'rgba(6, 182, 212, 0.1)' : 'rgba(51, 65, 85, 0.5)',
                  borderRadius: '8px',
                  border: index < 3 ? '1px solid rgba(6, 182, 212, 0.3)' : 'none'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: index < 3 
                    ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                    : '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  flexShrink: 0
                }}>
                  {index + 1}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '4px'
                  }}>
                    {item.tipo}
                  </div>
                  <div style={{
                    color: '#94a3b8',
                    fontSize: '12px'
                  }}>
                    {item.count} ocorrências ({item.percentual}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* OCORRÊNCIAS CRÍTICAS */}
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid rgba(6, 182, 212, 0.3)'
      }}>
        <h2 style={{
          margin: '0 0 20px 0',
          fontSize: '20px',
          fontWeight: 'bold',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          �� Ocorrências Críticas (Prioridade ALTA e MUITO ALTA)
          <span style={{
            backgroundColor: '#ef4444',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '14px'
          }}>
            {estatisticas.criticas.length}
          </span>
        </h2>

        {estatisticas.criticas.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#10b981',
            fontSize: '16px'
          }}>
            ✅ Nenhuma ocorrência crítica no momento!
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
            gap: '16px'
          }}>
            {estatisticas.criticas.map((occ, index) => {
              const cores = CORES_PRIORIDADE[occ.prio] || CORES_PRIORIDADE["BAIXA"];
              
              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: cores.bg,
                    border: `2px solid ${cores.border}`,
                    borderRadius: '10px',
                    padding: '16px'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: cores.text,
                      fontFamily: 'monospace'
                    }}>
                      {occ.id_c}
                    </div>
                    <div style={{
                      backgroundColor: cores.border,
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      {occ.prio}
                    </div>
                  </div>

                  <div style={{
                    color: cores.text,
                    fontSize: '15px',
                    fontWeight: 'bold',
                    marginBottom: '8px'
                  }}>
                    {occ.incidente}
                  </div>

                  <div style={{
                    color: '#64748b',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    marginBottom: '8px'
                  }}>
                    📍 {occ.location}
                  </div>

                  <div style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    fontFamily: 'monospace'
                  }}>
                    🌐 {occ.lat}, {occ.lon}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitorOcorrencias;
