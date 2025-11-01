import React, { useState, useEffect } from 'react';

const Relatorio = ({ onClose }) => {
  const [dados, setDados] = useState({
    sirenes: [],
    ocorrencias: [],
    chuvas: { data: [] },
    waze: { alerts: [] },
    previsao: null
  });
  const [periodo, setPeriodo] = useState('1h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    buscarDados();
    const interval = setInterval(buscarDados, 60000);
    return () => clearInterval(interval);
  }, [periodo]);

  const buscarDados = async () => {
    try {
      const [sirenes, ocorrencias, chuvas, waze, previsao] = await Promise.all([
        fetch('/api/sirenes').then(r => r.json()).catch(() => []),
        fetch('/api/ocorrencias').then(r => r.json()).catch(() => []),
        fetch('/api/chuvas').then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/waze/filtrado').then(r => r.json()).catch(() => ({ alerts: [] })),
        fetch('/api/previsao').then(r => r.json()).catch(() => null)
      ]);
      
      setDados({ sirenes, ocorrencias, chuvas, waze, previsao });
      setLoading(false);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      setLoading(false);
    }
  };

  const gerarPDF = () => {
    // Gerar data/hora para nome do arquivo
    const agora = new Date();
    const dataHora = agora.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19);
    const nomeArquivo = `JARVIS_Relatorio_Intemperies_${dataHora}.pdf`;
    
    window.print();
  };

  const imprimirRelatorio = () => {
    const agora = new Date();
    const dataHora = agora.toLocaleString('pt-BR').replace(/[\/,:]/g, '-');
    
    const conteudoImpressao = document.getElementById('relatorio-conteudo').innerHTML;
    
    const janelaImpressao = window.open('', '_blank');
    janelaImpressao.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>JARVIS - Relatório de Intempéries - ${dataHora}</title>
        <style>
          @page { 
            margin: 1.5cm;
            size: A4;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: white;
            color: #1e293b;
          }
          .header-relatorio {
            background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
          }
          .header-relatorio h1 {
            font-size: 32px;
            margin-bottom: 8px;
          }
          .header-relatorio h2 {
            font-size: 18px;
            opacity: 0.9;
          }
          .info-linha {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.3);
          }
          .info-item {
            font-size: 14px;
          }
          .cards-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          .card-stat {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border: 2px solid #06b6d4;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
          }
          .card-stat-numero {
            font-size: 48px;
            font-weight: bold;
            color: #0891b2;
            margin-bottom: 8px;
          }
          .card-stat-label {
            font-size: 14px;
            color: #334155;
            font-weight: 600;
          }
          .secao {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          .secao-titulo {
            font-size: 20px;
            font-weight: bold;
            color: #0891b2;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          th {
            background: linear-gradient(135deg, #0891b2 0%, #06b6d4 100%);
            color: white;
            padding: 12px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
          }
          td {
            padding: 10px 12px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 11px;
          }
          tr:nth-child(even) {
            background: #f8fafc;
          }
          .ranking-item {
            display: flex;
            align-items: center;
            padding: 12px;
            background: white;
            border-radius: 8px;
            margin-bottom: 8px;
            border-left: 4px solid #06b6d4;
          }
          .ranking-numero {
            font-size: 20px;
            font-weight: bold;
            color: #0891b2;
            margin-right: 15px;
            min-width: 30px;
          }
          .ranking-info {
            flex: 1;
          }
          .ranking-valor {
            font-size: 16px;
            font-weight: 600;
            color: #1e293b;
          }
          .footer-relatorio {
            text-align: center;
            margin-top: 40px;
            padding: 20px;
            border-top: 2px solid #e2e8f0;
            color: #64748b;
            font-size: 12px;
          }
          .alerta-critico {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin: 15px 0;
            border-radius: 8px;
          }
          .alerta-critico strong {
            color: #dc2626;
          }
        </style>
      </head>
      <body>
        ${conteudoImpressao}
      </body>
      </html>
    `);
    
    janelaImpressao.document.close();
    setTimeout(() => {
      janelaImpressao.print();
    }, 500);
  };

  // Calcular estatísticas
  const sirenes AcionadasArray = dados.sirenes.filter(s => s.tocando === true);
  const sirenesTocando = sirenesTocandoArray.length;
  const estacoesComChuva = dados.chuvas.data?.filter(e => (e.chuva_1h || 0) > 0).length || 0;
  const alertasTransito = dados.waze.alerts?.length || 0;
  const ocorrenciasAtivas = dados.ocorrencias?.length || 0;

  // Calcular ranking de bairros
  const rankingBairros = {};
  
  // Processar chuvas
  dados.chuvas.data?.forEach(estacao => {
    if (estacao && estacao.nome) {
      const bairro = estacao.nome;
      if (!rankingBairros[bairro]) {
        rankingBairros[bairro] = { sirenes: 0, ocorrencias: 0, chuva: 0, transito: 0, score: 0 };
      }
      const chuva = parseFloat(estacao.chuva_1h) || 0;
      rankingBairros[bairro].chuva = chuva;
      rankingBairros[bairro].score += chuva * 2;
    }
  });

  // Processar ocorrências
  dados.ocorrencias?.forEach(oc => {
    if (oc && oc.bairro) {
      const bairro = oc.bairro;
      if (!rankingBairros[bairro]) {
        rankingBairros[bairro] = { sirenes: 0, ocorrencias: 0, chuva: 0, transito: 0, score: 0 };
      }
      rankingBairros[bairro].ocorrencias += 1;
      rankingBairros[bairro].score += 5;
    }
  });

  // Processar sirenes
  sirenesTocandoArray.forEach(sirene => {
    if (sirene && sirene.bairro) {
      const bairro = sirene.bairro;
      if (!rankingBairros[bairro]) {
        rankingBairros[bairro] = { sirenes: 0, ocorrencias: 0, chuva: 0, transito: 0, score: 0 };
      }
      rankingBairros[bairro].sirenes += 1;
      rankingBairros[bairro].score += 10;
    }
  });

  const top10Bairros = Object.entries(rankingBairros)
    .filter(([_, dados]) => dados.score > 0)
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 10);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#0f172a',
        borderRadius: '16px',
        maxWidth: '1400px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '2px solid #06b6d4'
      }}>
        {/* HEADER DO MODAL */}
        <div style={{
          background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
          padding: '24px 32px',
          borderTopLeftRadius: '14px',
          borderTopRightRadius: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '3px solid #0891b2'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              color: 'white',
              fontSize: '28px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              ⚡ RELATÓRIO DE INTEMPÉRIES
            </h2>
            <p style={{
              margin: '6px 0 0 0',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '14px'
            }}>
              Centro de Operações Rio • Sistema JARVIS Municipal
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={imprimirRelatorio}
              style={{
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '2px solid white',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              🖨️ Imprimir/PDF
            </button>
            
            <button
              onClick={onClose}
              style={{
                width: '40px',
                height: '40px',
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '2px solid white',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '20px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* CONTEÚDO COM SCROLL */}
        <div id="relatorio-conteudo" style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px',
          background: '#0f172a'
        }}>
          {/* HEADER PARA IMPRESSÃO */}
          <div className="header-relatorio" style={{
            background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
            color: 'white',
            padding: '30px',
            borderRadius: '12px',
            marginBottom: '30px'
          }}>
            <h1 style={{ margin: 0, fontSize: '32px' }}>⚡ INTEMPÉRIES</h1>
            <h2 style={{ margin: '8px 0 0 0', fontSize: '18px', opacity: 0.9 }}>
              Relatório Operacional
            </h2>
            <div className="info-linha" style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255,255,255,0.3)',
              fontSize: '14px'
            }}>
              <div>
                <strong>Emissão:</strong> {new Date().toLocaleString('pt-BR')}
              </div>
              <div>
                <strong>Período:</strong> Última(s) {periodo === '30min' ? '30 minutos' : periodo === '1h' ? '1 hora' : '2 horas'}
              </div>
              <div>
                <strong>Atualizado:</strong> {new Date().toLocaleTimeString('pt-BR')}
              </div>
            </div>
          </div>

          {/* CARDS DE ESTATÍSTICAS */}
          <div className="cards-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            <div className="card-stat" style={{
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
              border: '2px solid #ef4444',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center'
            }}>
              <div className="card-stat-numero" style={{
                fontSize: '56px',
                fontWeight: 'bold',
                color: sirenesTocando > 0 ? '#dc2626' : '#10b981',
                marginBottom: '8px'
              }}>
                {sirenesTocando}
              </div>
              <div className="card-stat-label" style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#334155'
              }}>
                🚨 Sirenes Acionadas
              </div>
            </div>

            <div className="card-stat" style={{
              background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
              border: '2px solid #f97316',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center'
            }}>
              <div className="card-stat-numero" style={{
                fontSize: '56px',
                fontWeight: 'bold',
                color: '#ea580c',
                marginBottom: '8px'
              }}>
                {ocorrenciasAtivas}
              </div>
              <div className="card-stat-label" style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#334155'
              }}>
                🔔 Ocorrências Ativas
              </div>
            </div>

            <div className="card-stat" style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: '2px solid #06b6d4',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center'
            }}>
              <div className="card-stat-numero" style={{
                fontSize: '56px',
                fontWeight: 'bold',
                color: '#0891b2',
                marginBottom: '8px'
              }}>
                {estacoesComChuva}
              </div>
              <div className="card-stat-label" style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#334155'
              }}>
                💧 Estações com Chuva
              </div>
            </div>

            <div className="card-stat" style={{
              background: 'linear-gradient(135deg, #fef9c3 0%, #fef08a 100%)',
              border: '2px solid #eab308',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center'
            }}>
              <div className="card-stat-numero" style={{
                fontSize: '56px',
                fontWeight: 'bold',
                color: '#ca8a04',
                marginBottom: '8px'
              }}>
                {alertasTransito}
              </div>
              <div className="card-stat-label" style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#334155'
              }}>
                🚗 Alertas de Trânsito
              </div>
            </div>
          </div>

          {/* ALERTA CRÍTICO SE HOUVER SIRENES */}
          {sirenesTocando > 0 && (
            <div className="alerta-critico" style={{
              background: '#fef2f2',
              borderLeft: '4px solid #ef4444',
              padding: '20px',
              marginBottom: '30px',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️ <strong style={{ color: '#dc2626' }}>ALERTA CRÍTICO</strong></div>
              <div style={{ fontSize: '14px', color: '#991b1b' }}>
                Há {sirenesTocando} sirene(s) acionada(s) no momento. Verificar imediatamente as áreas afetadas.
              </div>
            </div>
          )}

          {/* RANKING DE BAIRROS */}
          <div className="secao" style={{
            background: '#1e293b',
            border: '2px solid #334155',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '20px'
          }}>
            <div className="secao-titulo" style={{
              fontSize: '22px',
              fontWeight: 'bold',
              color: '#06b6d4',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              🏆 RANKING DE BAIRROS MAIS AFETADOS
            </div>

            {top10Bairros.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {top10Bairros.map(([bairro, dados], index) => {
                  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}°`;
                  return (
                    <div key={bairro} className="ranking-item" style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '16px',
                      background: '#334155',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${index < 3 ? '#06b6d4' : '#475569'}`
                    }}>
                      <div className="ranking-numero" style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#06b6d4',
                        marginRight: '20px',
                        minWidth: '50px'
                      }}>
                        {medal}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="ranking-valor" style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: 'white',
                          marginBottom: '8px'
                        }}>
                          {bairro}
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#94a3b8' }}>
                          {dados.sirenes > 0 && <span>🚨 {dados.sirenes} sirene(s)</span>}
                          {dados.ocorrencias > 0 && <span>🔔 {dados.ocorrencias} ocorrência(s)</span>}
                          {dados.chuva > 0 && <span>💧 {dados.chuva.toFixed(1)}mm</span>}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: '#06b6d4',
                        padding: '8px 16px',
                        background: 'rgba(6, 182, 212, 0.1)',
                        borderRadius: '8px'
                      }}>
                        {dados.score.toFixed(0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: '#94a3b8',
                fontSize: '16px'
              }}>
                ✅ Nenhum bairro significativamente afetado no momento
              </div>
            )}
          </div>

          {/* OCORRÊNCIAS ATIVAS */}
          {ocorrenciasAtivas > 0 && (
            <div className="secao" style={{
              background: '#1e293b',
              border: '2px solid #334155',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '20px'
            }}>
              <div className="secao-titulo" style={{
                fontSize: '22px',
                fontWeight: 'bold',
                color: '#f97316',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                🚨 OCORRÊNCIAS ATIVAS ({ocorrenciasAtivas})
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{
                      background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
                      color: 'white',
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '13px'
                    }}>Tipo</th>
                    <th style={{
                      background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
                      color: 'white',
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '13px'
                    }}>Local</th>
                    <th style={{
                      background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
                      color: 'white',
                      padding: '12px',
                      textAlign: 'left',
                      fontSize: '13px'
                    }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.ocorrencias.slice(0, 15).map((oc, i) => (
                    <tr key={i}>
                      <td style={{
                        padding: '12px',
                        borderBottom: '1px solid #334155',
                        color: '#e2e8f0',
                        fontSize: '13px'
                      }}>
                        {oc.tipo || 'N/D'}
                      </td>
                      <td style={{
                        padding: '12px',
                        borderBottom: '1px solid #334155',
                        color: '#e2e8f0',
                        fontSize: '13px'
                      }}>
                        {oc.local || oc.endereco || oc.bairro || 'N/D'}
                      </td>
                      <td style={{
                        padding: '12px',
                        borderBottom: '1px solid #334155',
                        color: '#e2e8f0',
                        fontSize: '13px'
                      }}>
                        {oc.status || 'Em andamento'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {ocorrenciasAtivas > 15 && (
                <div style={{
                  textAlign: 'center',
                  marginTop: '15px',
                  color: '#94a3b8',
                  fontSize: '13px'
                }}>
                  ... e mais {ocorrenciasAtivas - 15} ocorrência(s)
                </div>
              )}
            </div>
          )}

          {/* FOOTER */}
          <div className="footer-relatorio" style={{
            textAlign: 'center',
            marginTop: '40px',
            paddingTop: '20px',
            borderTop: '2px solid #334155',
            color: '#94a3b8',
            fontSize: '13px'
          }}>
            <div style={{ marginBottom: '8px', fontWeight: '600' }}>
              Sistema JARVIS Municipal Rio • Centro de Operações Rio
            </div>
            <div>
              Dados atualizados em tempo real • Relatório gerado automaticamente
            </div>
            <div style={{ marginTop: '8px', fontSize: '11px' }}>
              Documento restrito. A utilização, cópia e divulgação não autorizada é expressamente proibida.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Relatorio;