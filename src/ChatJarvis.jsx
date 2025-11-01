import React, { useState, useEffect, useRef } from 'react';

const ChatJarvis = () => {
  const [mensagens, setMensagens] = useState([
    {
      id: 1,
      tipo: 'jarvis',
      texto: '👋 Olá! Sou o JARVIS, seu assistente de inteligência para Defesa Civil do Rio de Janeiro. Como posso ajudar?',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversas, setConversas] = useState([]);
  const [conversaAtual, setConversaAtual] = useState(null);
  const messagesEndRef = useRef(null);

  const comandosRapidos = [
    { icon: '🌤️', texto: 'Previsão do tempo', comando: '/previsao' },
    { icon: '🚨', texto: 'Sirenes acionadas', comando: '/sirenes' },
    { icon: '💧', texto: 'Situação das chuvas', comando: '/chuvas' },
    { icon: '🚗', texto: 'Trânsito agora', comando: '/transito' },
    { icon: '🏆', texto: 'Bairros afetados', comando: '/ranking' },
    { icon: '🔔', texto: 'Ocorrências ativas', comando: '/ocorrencias' },
    { icon: '📊', texto: 'Resumo geral', comando: '/resumo' },
    { icon: '📈', texto: 'Status das APIs', comando: '/status' }
  ];

  // Dicionários de tradução
  const TIPO_ALERTA_WAZE = {
    'ACCIDENT': 'Acidente',
    'JAM': 'Congestionamento',
    'WEATHERHAZARD': 'Condição Climática',
    'ROAD_CLOSED': 'Via Fechada',
    'ROAD_CLOSED_HAZARD': 'Via Fechada (Perigo)',
    'ROAD_CLOSED_CONSTRUCTION': 'Via Fechada (Obra)',
    'ROAD_CLOSED_EVENT': 'Via Fechada (Evento)',
    'HAZARD': 'Perigo na Via',
    'HAZARD_ON_ROAD': 'Perigo na Pista',
    'HAZARD_ON_ROAD_POT_HOLE': 'Buraco na Via',
    'HAZARD_ON_ROAD_OBJECT': 'Objeto na Via',
    'HAZARD_ON_ROAD_ROAD_KILL': 'Animal Morto',
    'HAZARD_ON_ROAD_CAR_STOPPED': 'Veículo Parado',
    'HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT': 'Semáforo com Defeito',
    'HAZARD_ON_SHOULDER': 'Perigo no Acostamento',
    'HAZARD_ON_SHOULDER_CAR_STOPPED': 'Carro Parado no Acostamento',
    'HAZARD_WEATHER': 'Condição Climática Adversa',
    'HAZARD_WEATHER_FOG': 'Neblina',
    'HAZARD_WEATHER_HAIL': 'Granizo',
    'HAZARD_WEATHER_HEAVY_RAIN': 'Chuva Forte',
    'HAZARD_WEATHER_HEAVY_SNOW': 'Neve Forte',
    'HAZARD_WEATHER_FLOOD': 'Alagamento',
    'HAZARD_ON_ROAD_CONSTRUCTION': 'Obra na Via',
    'HAZARD_ON_ROAD_LANE_CLOSED': 'Faixa Fechada'
  };

  const TIPO_VIA = {
    1: 'Via Local',
    2: 'Via Secundária',
    3: 'Via Primária',
    4: 'Via Arterial',
    5: 'Via Coletora',
    6: 'Via Estrutural',
    7: 'Via Expressa'
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  useEffect(() => {
    const conversasSalvas = JSON.parse(localStorage.getItem('jarvis_conversas') || '[]');
    setConversas(conversasSalvas);
  }, []);

  const salvarConversa = () => {
    const novaConversa = {
      id: Date.now(),
      titulo: mensagens[1]?.texto?.substring(0, 50) || 'Nova conversa',
      mensagens: mensagens,
      timestamp: new Date()
    };
    const novasConversas = [novaConversa, ...conversas].slice(0, 20);
    setConversas(novasConversas);
    localStorage.setItem('jarvis_conversas', JSON.stringify(novasConversas));
  };

  // Função para detectar intenção do usuário (linguagem natural)
  const detectarIntencao = (texto) => {
    const textoLower = texto.toLowerCase();
    
    // Trânsito
    if (textoLower.match(/trânsito|transito|tráfego|trafego|engarrafamento|congestionamento|trânsito|como (está|esta) (o )?trânsito|tem engarrafamento/)) {
      return '/transito';
    }
    
    // Previsão
    if (textoLower.match(/previsão|previsao|tempo|clima|vai chover|chuva hoje|temperatura/)) {
      return '/previsao';
    }
    
    // Sirenes
    if (textoLower.match(/sirene|sirenes|alarme|acionada/)) {
      return '/sirenes';
    }
    
    // Chuvas
    if (textoLower.match(/chuva|chove|chovendo|precipitação|precipitacao|pluviômetro|pluviometro/)) {
      return '/chuvas';
    }
    
    // Ocorrências
    if (textoLower.match(/ocorrência|ocorrencia|emergência|emergencia|chamado|incidente/)) {
      return '/ocorrencias';
    }
    
    // Resumo
    if (textoLower.match(/resumo|situação|situacao|panorama|geral|tudo/)) {
      return '/resumo';
    }
    
    // Status
    if (textoLower.match(/status|api|sistema|funcionando/)) {
      return '/status';
    }
    
    // Ajuda
    if (textoLower.match(/ajuda|help|comandos|o que (você|voce) (pode|faz)|como usar/)) {
      return '/ajuda';
    }
    
    return texto;
  };

  const processarComando = async (comando) => {
    setLoading(true);
    
    try {
      // Detectar intenção do usuário
      const comandoFinal = detectarIntencao(comando);
      
      // PREVISÃO DO TEMPO
      if (comandoFinal === '/previsao' || comandoFinal.toLowerCase().includes('previsão') || 
          comandoFinal.toLowerCase().includes('previsao') || comandoFinal.toLowerCase().includes('tempo')) {
        
        try {
          const response = await fetch('/api/previsao');
          if (!response.ok) throw new Error('API não disponível');
          
          const data = await response.json();
          const previsoes = data?.previsoesEstendidas?.previsaoEstendida;
          
          if (previsoes && Array.isArray(previsoes) && previsoes.length > 0) {
            const hoje = previsoes[previsoes.length - 1].$;
            const amanha = previsoes.length > 1 ? previsoes[previsoes.length - 2].$ : null;
            
            let texto = `🌤️ **PREVISÃO DO TEMPO - RIO DE JANEIRO**\n\n`;
            texto += `📅 **${hoje.data || 'Hoje'}**\n`;
            texto += `🌡️ Temperatura: ${hoje.minTemp}°C - ${hoje.maxTemp}°C\n`;
            texto += `☁️ Céu: ${hoje.ceu}\n`;
            texto += `💧 Precipitação: ${hoje.precipitacao}\n`;
            texto += `💨 Vento: ${hoje.dirVento} (${hoje.velVento})\n`;
            
            if (amanha) {
              texto += `\n📅 **Amanhã (${amanha.data})**\n`;
              texto += `🌡️ ${amanha.minTemp}°C - ${amanha.maxTemp}°C\n`;
              texto += `☁️ ${amanha.ceu}\n`;
              texto += `💧 ${amanha.precipitacao}\n`;
            }
            
            texto += `\n⏰ Atualizado: ${data.previsoesEstendidas.$.Createdate}`;
            
            return { texto: texto, tipo: 'sucesso' };
          }
        } catch (error) {
          console.error('Erro API Previsão:', error);
        }
        
        return {
          texto: '⚠️ **Previsão do tempo temporariamente indisponível.**\n\n' +
            'Tente novamente em alguns instantes ou consulte:\n' +
            '• Situação das chuvas: `/chuvas`\n' +
            '• Alerta Rio: https://alertario.rio',
          tipo: 'aviso'
        };
      }
      
      // SIRENES
      else if (comandoFinal === '/sirenes' || comandoFinal.toLowerCase().includes('sirene')) {
        const response = await fetch('/api/sirenes');
        const sirenes = await response.json();
        
        if (!Array.isArray(sirenes)) {
          throw new Error('Formato de dados inválido');
        }
        
        const acionadas = sirenes.filter(s => s.tocando === true);
        const online = sirenes.filter(s => s.online === true && s.tocando !== true);
        const offline = sirenes.filter(s => s.online === false);
        
        return {
          texto: `🚨 **STATUS DAS SIRENES**\n\n` +
            `🔴 **Acionadas (Tocando)**: ${acionadas.length}\n` +
            (acionadas.length > 0 
              ? acionadas.slice(0, 5).map(s => `   • ${s.nome} - ${s.bairro || 'N/D'}`).join('\n') + '\n' +
                (acionadas.length > 5 ? `   ... e mais ${acionadas.length - 5}\n` : '') + '\n'
              : '') +
            `🟢 **Online**: ${online.length}\n` +
            `⚫ **Offline**: ${offline.length}\n` +
            `📊 **Total**: ${sirenes.length} sirenes\n\n` +
            `⏰ Última atualização: ${sirenes[0]?.ultimaAtualizacao || 'N/D'}\n\n` +
            (acionadas.length > 0 
              ? '⚠️ **ATENÇÃO**: Há sirenes acionadas no momento!'
              : '✅ Sistema operando normalmente.'),
          tipo: acionadas.length > 0 ? 'alerta' : 'sucesso'
        };
      }
      
      // TRÂNSITO - ANÁLISE MELHORADA E DETALHADA
      else if (comandoFinal === '/transito' || comandoFinal.toLowerCase().includes('trânsito') || 
               comandoFinal.toLowerCase().includes('transito') || comandoFinal.toLowerCase().includes('tráfego')) {
        
        const response = await fetch('/api/waze/filtrado');
        const data = await response.json();
        const alertas = data.alerts || [];
        
        if (alertas.length === 0) {
          return {
            texto: '🚗 **SITUAÇÃO DO TRÂNSITO**\n\n' +
              '✅ Nenhum alerta de trânsito no momento.\n' +
              '🎉 Trânsito fluindo normalmente no Rio de Janeiro!',
            tipo: 'sucesso'
          };
        }
        
        // Análise detalhada por via
        const viasAgregadas = {};
        const tiposContagem = {};
        const acidentesGraves = [];
        const viasComProblemas = [];
        
        alertas.forEach(a => {
          // Traduzir tipo
          const tipoOriginal = a.subtype || a.type || 'OUTROS';
          const tipoTraduzido = TIPO_ALERTA_WAZE[tipoOriginal] || tipoOriginal;
          tiposContagem[tipoTraduzido] = (tiposContagem[tipoTraduzido] || 0) + 1;
          
          // Ignorar vias não identificadas para a análise principal
          const via = a.street || 'Via Não Identificada';
          const cidade = a.city || 'Rio de Janeiro';
          
          // Só processar se tiver nome de via
          if (via !== 'Via Não Identificada') {
            const chaveVia = `${via}|||${cidade}`;
            
            if (!viasAgregadas[chaveVia]) {
              viasAgregadas[chaveVia] = {
                via: via,
                cidade: cidade,
                count: 0,
                problemas: [],
                temAcidente: false,
                temEngarrafamento: false,
                gravidade: 0,
                roadType: a.roadType || 1
              };
            }
            
            viasAgregadas[chaveVia].count++;
            viasAgregadas[chaveVia].problemas.push(tipoTraduzido);
            
            // Marcar tipos críticos
            if (tipoTraduzido.toLowerCase().includes('acidente')) {
              viasAgregadas[chaveVia].temAcidente = true;
              viasAgregadas[chaveVia].gravidade += 10;
              acidentesGraves.push({ via, cidade, tipo: tipoTraduzido });
            }
            if (tipoTraduzido.toLowerCase().includes('congestionamento') || 
                tipoOriginal === 'JAM') {
              viasAgregadas[chaveVia].temEngarrafamento = true;
              viasAgregadas[chaveVia].gravidade += 5;
            }
            if (tipoTraduzido.toLowerCase().includes('fechada')) {
              viasAgregadas[chaveVia].gravidade += 7;
            }
            
            // Gravidade base por quantidade
            viasAgregadas[chaveVia].gravidade += 1;
          }
        });
        
        // Ordenar vias por gravidade e quantidade
        const topVias = Object.values(viasAgregadas)
          .sort((a, b) => {
            // Priorizar gravidade, depois quantidade
            if (b.gravidade !== a.gravidade) {
              return b.gravidade - a.gravidade;
            }
            return b.count - a.count;
          })
          .slice(0, 10);
        
        // Top tipos
        const topTipos = Object.entries(tiposContagem)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        
        // Acidentes específicos
        const totalAcidentes = alertas.filter(a => {
          const tipo = a.subtype || a.type || '';
          return tipo.includes('ACCIDENT') || 
                 TIPO_ALERTA_WAZE[tipo]?.toLowerCase().includes('acidente');
        }).length;
        
        // Construir resposta formatada
        let texto = '🚗 **ANÁLISE DE TRÂNSITO - RIO DE JANEIRO**\n\n';
        
        // Resumo executivo
        texto += '📊 **Resumo Executivo**\n';
        texto += `• **Total de alertas ativos**: ${alertas.length}\n`;
        texto += `• **Acidentes reportados**: ${totalAcidentes}\n`;
        texto += `• **Vias com problemas**: ${Object.keys(viasAgregadas).length}\n\n`;
        
        // Nível de criticidade (no topo)
        let nivelCriticidade = '';
        let emojiNivel = '';
        if (alertas.length > 80 || totalAcidentes > 3) {
          nivelCriticidade = '🔴 **CRÍTICO**';
          emojiNivel = '⚠️ ATENÇÃO: Evite deslocamentos não essenciais!';
        } else if (alertas.length > 50 || totalAcidentes > 1) {
          nivelCriticidade = '🟠 **ALTO**';
          emojiNivel = '⚠️ Planeje rotas alternativas';
        } else if (alertas.length > 30) {
          nivelCriticidade = '🟡 **MODERADO**';
          emojiNivel = 'ℹ️ Atenção em pontos específicos';
        } else {
          nivelCriticidade = '🟢 **NORMAL**';
          emojiNivel = '✅ Trânsito dentro da normalidade';
        }
        
        texto += `🎯 **Nível de Criticidade**: ${nivelCriticidade}\n`;
        texto += `${emojiNivel}\n\n`;
        
        // Acidentes em destaque (se houver)
        if (acidentesGraves.length > 0) {
          texto += '🚨 **ACIDENTES EM DESTAQUE**\n';
          acidentesGraves.slice(0, 3).forEach((ac, i) => {
            texto += `${i + 1}. ${ac.via} (${ac.cidade})\n`;
            texto += `   ${ac.tipo}\n`;
          });
          if (acidentesGraves.length > 3) {
            texto += `   ... e mais ${acidentesGraves.length - 3} acidentes\n`;
          }
          texto += '\n';
        }
        
        // Top vias com mais problemas
        texto += '🛣️ **PRINCIPAIS VIAS AFETADAS**\n';
        topVias.forEach((viaData, index) => {
          const icone = viaData.temAcidente ? '🚨' : 
                       viaData.temEngarrafamento ? '🚦' : '⚠️';
          const tipoVia = TIPO_VIA[viaData.roadType] || 'Via Local';
          
          texto += `\n${icone} **${index + 1}. ${viaData.via}** (${tipoVia})\n`;
          
          // Mostrar problemas únicos
          const problemasUnicos = [...new Set(viaData.problemas)];
          if (problemasUnicos.length === 1) {
            texto += `   ${viaData.count}x ${problemasUnicos[0]}\n`;
          } else {
            texto += `   ${viaData.count} alertas:\n`;
            const contagemProblemas = {};
            viaData.problemas.forEach(p => {
              contagemProblemas[p] = (contagemProblemas[p] || 0) + 1;
            });
            Object.entries(contagemProblemas)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .forEach(([prob, qtd]) => {
                texto += `   • ${qtd}x ${prob}\n`;
              });
          }
        });
        
        // Top tipos de incidentes
        texto += '\n\n📋 **TIPOS DE INCIDENTES MAIS COMUNS**\n';
        topTipos.forEach(([tipo, qtd], i) => {
          const porcentagem = ((qtd / alertas.length) * 100).toFixed(1);
          texto += `${i + 1}. ${tipo}: ${qtd}x (${porcentagem}%)\n`;
        });
        
        // Recomendações
        texto += '\n\n💡 **RECOMENDAÇÕES**\n';
        if (totalAcidentes > 0) {
          texto += '• Dirija com cautela redobrada\n';
        }
        if (alertas.length > 50) {
          texto += '• Considere usar transporte público\n';
          texto += '• Evite horários de pico se possível\n';
        }
        texto += '• Consulte aplicativos de navegação para rotas alternativas\n';
        
        return {
          texto: texto,
          tipo: alertas.length > 80 ? 'alerta' : alertas.length > 50 ? 'aviso' : 'sucesso'
        };
      }
      
      // CHUVAS
      else if (comandoFinal === '/chuvas' || comandoFinal.toLowerCase().includes('chuva')) {
        const response = await fetch('/api/pluviometria');
        const data = await response.json();
        const pluvio = Array.isArray(data) ? data : (data.features || []);
        
        const comChuva = pluvio.filter(p => {
          const props = p.properties || p;
          return parseFloat(props.chuva_15min || props.precipitacao || 0) > 0;
        }).sort((a, b) => {
          const chuvaA = parseFloat((a.properties || a).chuva_15min || 0);
          const chuvaB = parseFloat((b.properties || b).chuva_15min || 0);
          return chuvaB - chuvaA;
        });
        
        const forte = comChuva.filter(p => parseFloat((p.properties || p).chuva_15min || 0) >= 10);
        const moderada = comChuva.filter(p => {
          const val = parseFloat((p.properties || p).chuva_15min || 0);
          return val >= 5 && val < 10;
        });
        
        return {
          texto: `💧 **SITUAÇÃO DAS CHUVAS**\n\n` +
            `📊 **Estações monitorando**: ${pluvio.length}\n` +
            `🌧️ **Com precipitação**: ${comChuva.length}\n` +
            `🔴 **Chuva forte (≥10mm)**: ${forte.length}\n` +
            `🟡 **Chuva moderada (5-10mm)**: ${moderada.length}\n\n` +
            (comChuva.length > 0
              ? `**Top 5 estações:**\n` +
                comChuva.slice(0, 5).map(p => {
                  const props = p.properties || p;
                  return `   • ${props.estacao || props.nome}: ${props.chuva_15min || props.precipitacao}mm`;
                }).join('\n')
              : '✅ Sem registro de chuvas no momento.'),
          tipo: forte.length > 0 ? 'alerta' : 'sucesso'
        };
      }
      
      // OCORRÊNCIAS
      else if (comandoFinal === '/ocorrencias' || comandoFinal.toLowerCase().includes('ocorrên')) {
        const response = await fetch('/api/ocorrencias');
        const ocorrencias = await response.json();
        
        if (!Array.isArray(ocorrencias)) {
          throw new Error('Formato de dados inválido');
        }
        
        const criticas = ocorrencias.filter(o => o.prio === 'MUITO ALTA' || o.prio === 'ALTA');
        const tipos = {};
        ocorrencias.forEach(o => {
          const tipo = o.incidente || 'OUTROS';
          tipos[tipo] = (tipos[tipo] || 0) + 1;
        });
        const topTipos = Object.entries(tipos)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        
        return {
          texto: `🔔 **OCORRÊNCIAS HEXAGON**\n\n` +
            `📊 **Total ativo**: ${ocorrencias.length}\n` +
            `🚨 **Críticas**: ${criticas.length}\n\n` +
            `**Tipos mais frequentes:**\n` +
            topTipos.map(([tipo, qtd]) => `   ${qtd}x - ${tipo}`).join('\n') + '\n\n' +
            (criticas.length > 0
              ? `⚠️ **ATENÇÃO**: ${criticas.length} ocorrências críticas!\n\n` +
                criticas.slice(0, 3).map(o => 
                  `   • ${o.incidente} - ${o.location}`
                ).join('\n')
              : '✅ Sem ocorrências críticas no momento.'),
          tipo: criticas.length > 0 ? 'alerta' : 'sucesso'
        };
      }
      
      // RANKING BAIRROS
      else if (comandoFinal === '/ranking' || comandoFinal.toLowerCase().includes('ranking') || 
               comandoFinal.toLowerCase().includes('bairro')) {
        return {
          texto: '🏆 **RANKING DE BAIRROS**\n\n' +
            'Para ver o ranking completo com análise detalhada dos bairros mais afetados, ' +
            'clique no botão **"Relatório de Intempéries"** no menu superior.\n\n' +
            'O relatório inclui:\n' +
            '• Pontuação por sirenes acionadas\n' +
            '• Ocorrências por região\n' +
            '• Índice de precipitação\n' +
            '• Alertas de trânsito\n\n' +
            'Ou acesse o **Monitor de Ocorrências** para análise em tempo real!',
          tipo: 'info'
        };
      }
      
      // RESUMO GERAL
      else if (comandoFinal === '/resumo' || comandoFinal.toLowerCase().includes('resumo') || 
               comandoFinal.toLowerCase().includes('geral') || comandoFinal.toLowerCase().includes('situação')) {
        const [sirenes, ocorrencias, pluvio, wazeData] = await Promise.all([
          fetch('/api/sirenes').then(r => r.json()),
          fetch('/api/ocorrencias').then(r => r.json()),
          fetch('/api/pluviometria').then(r => r.json()),
          fetch('/api/waze/filtrado').then(r => r.json())
        ]);
        
        const sirenasAcionadas = sirenes.filter(s => s.tocando === true).length;
        const pluvioArray = Array.isArray(pluvio) ? pluvio : (pluvio.features || []);
        const waze = wazeData.alerts || [];
        const comChuva = pluvioArray.filter(p => {
          const props = p.properties || p;
          return parseFloat(props.chuva_15min || props.precipitacao || 0) > 0;
        }).length;
        const criticas = ocorrencias.filter(o => o.prio === 'MUITO ALTA' || o.prio === 'ALTA').length;
        
        const nivel = sirenasAcionadas > 0 || criticas > 5 ? 'CRÍTICO' :
                      criticas > 0 || comChuva > 10 ? 'ALERTA' :
                      ocorrencias.length > 5 ? 'ATENÇÃO' : 'NORMAL';
        
        const emoji = nivel === 'CRÍTICO' ? '🔴' :
                      nivel === 'ALERTA' ? '🟡' :
                      nivel === 'ATENÇÃO' ? '🟠' : '🟢';
        
        return {
          texto: `${emoji} **RESUMO EXECUTIVO - RIO DE JANEIRO**\n\n` +
            `**Nível de Criticidade**: ${nivel}\n\n` +
            `🚨 **Sirenes**: ${sirenasAcionadas} acionadas / ${sirenes.length} total\n` +
            `🔔 **Ocorrências**: ${ocorrencias.length} ativas (${criticas} críticas)\n` +
            `💧 **Chuvas**: ${comChuva} de ${pluvioArray.length} estações\n` +
            `🚗 **Trânsito**: ${waze.length} alertas Waze\n\n` +
            `⏰ **Atualizado**: ${new Date().toLocaleTimeString('pt-BR')}\n\n` +
            (nivel === 'CRÍTICO' 
              ? '⚠️ **ATENÇÃO MÁXIMA REQUERIDA!**'
              : nivel === 'ALERTA'
              ? '⚠️ Situação requer monitoramento.'
              : nivel === 'ATENÇÃO'
              ? 'ℹ️ Sistema operando com ocorrências normais.'
              : '✅ Tudo sob controle!'),
          tipo: nivel === 'CRÍTICO' || nivel === 'ALERTA' ? 'alerta' : 'sucesso'
        };
      }
      
      // STATUS DAS APIS
      else if (comandoFinal === '/status' || comandoFinal.toLowerCase().includes('status') || 
               comandoFinal.toLowerCase().includes('api')) {
        const apis = [
          { nome: 'Sirenes Alerta Rio', endpoint: '/api/sirenes' },
          { nome: 'Ocorrências Hexagon', endpoint: '/api/ocorrencias' },
          { nome: 'Pluviometria', endpoint: '/api/pluviometria' },
          { nome: 'Waze Trânsito', endpoint: '/api/waze/filtrado' },
          { nome: 'Previsão Tempo', endpoint: '/api/previsao' }
        ];
        
        const resultados = await Promise.all(
          apis.map(async (api) => {
            try {
              const response = await fetch(api.endpoint);
              const status = response.ok ? '🟢 Online' : '🔴 Erro';
              return `${status} - ${api.nome}`;
            } catch {
              return `🔴 Offline - ${api.nome}`;
            }
          })
        );
        
        const online = resultados.filter(r => r.includes('🟢')).length;
        
        return {
          texto: `📈 **STATUS DAS APIS**\n\n` +
            resultados.join('\n') + '\n\n' +
            `**Disponibilidade**: ${online}/5 APIs online (${(online/5*100).toFixed(0)}%)\n\n` +
            (online === 5 
              ? '✅ Todos os sistemas operacionais!'
              : online >= 3
              ? '⚠️ Alguns sistemas com problemas.'
              : '🔴 Problemas críticos detectados!'),
          tipo: online === 5 ? 'sucesso' : online >= 3 ? 'aviso' : 'erro'
        };
      }
      
      // RELATÓRIO
      else if (comandoFinal === '/relatorio' || comandoFinal.toLowerCase().includes('relatório') || 
               comandoFinal.toLowerCase().includes('relatorio')) {
        window.open('/relatorio', '_blank');
        return {
          texto: '📊 **RELATÓRIO ABERTO**\n\nO relatório completo de intempéries foi aberto em uma nova aba!',
          tipo: 'sucesso'
        };
      }
      
      // AJUDA
      else if (comandoFinal === '/ajuda' || comandoFinal.toLowerCase().includes('ajuda') || 
               comandoFinal.toLowerCase().includes('help') || comandoFinal.toLowerCase().includes('comandos')) {
        return {
          texto: `📚 **COMANDOS DISPONÍVEIS**\n\n` +
            `🌤️ **/previsao** - Previsão do tempo\n` +
            `🚨 **/sirenes** - Status das sirenes\n` +
            `🚗 **/transito** - Análise completa de trânsito\n` +
            `💧 **/chuvas** - Monitoramento de chuvas\n` +
            `🔔 **/ocorrencias** - Ocorrências Hexagon\n` +
            `🏆 **/ranking** - Bairros mais afetados\n` +
            `📊 **/resumo** - Resumo executivo geral\n` +
            `📈 **/status** - Status das APIs\n` +
            `📋 **/relatorio** - Abrir relatório completo\n` +
            `❓ **/ajuda** - Mostrar esta ajuda\n\n` +
            `💡 **NOVIDADE: Linguagem Natural!**\n` +
            `Você pode fazer perguntas naturalmente:\n` +
            `• "Como está o trânsito?"\n` +
            `• "Vai chover hoje?"\n` +
            `• "Tem alguma sirene tocando?"\n` +
            `• "Qual a situação geral?"\n\n` +
            `Experimente! Fale naturalmente comigo! 😊`,
          tipo: 'info'
        };
      }
      
      // COMANDO NÃO RECONHECIDO
      else {
        return {
          texto: '🤔 Desculpe, não entendi seu comando.\n\n' +
            'Tente perguntas como:\n' +
            '• "Como está o trânsito?"\n' +
            '• "Vai chover?"\n' +
            '• "Tem alguma emergência?"\n\n' +
            'Ou digite **/ajuda** para ver todos os comandos!',
          tipo: 'aviso'
        };
      }
      
    } catch (error) {
      console.error('Erro ao processar comando:', error);
      return {
        texto: `❌ Erro ao buscar dados: ${error.message}\n\nPor favor, tente novamente ou verifique o status das APIs com **/status**`,
        tipo: 'erro'
      };
    } finally {
      setLoading(false);
    }
  };

  const enviarMensagem = async () => {
    if (!inputText.trim() || loading) return;

    const novaMensagemUsuario = {
      id: Date.now(),
      tipo: 'usuario',
      texto: inputText,
      timestamp: new Date()
    };

    setMensagens(prev => [...prev, novaMensagemUsuario]);
    const comandoOriginal = inputText;
    setInputText('');

    const resposta = await processarComando(comandoOriginal);
    
    const novaMensagemJarvis = {
      id: Date.now() + 1,
      tipo: 'jarvis',
      texto: resposta.texto,
      timestamp: new Date(),
      status: resposta.tipo
    };

    setMensagens(prev => [...prev, novaMensagemJarvis]);
  };

  const novaConversa = () => {
    if (mensagens.length > 1) {
      salvarConversa();
    }
    setMensagens([
      {
        id: Date.now(),
        tipo: 'jarvis',
        texto: '👋 Nova conversa iniciada! Como posso ajudar?',
        timestamp: new Date()
      }
    ]);
    setConversaAtual(null);
  };

  const carregarConversa = (conversa) => {
    setMensagens(conversa.mensagens);
    setConversaAtual(conversa.id);
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '100%', 
      backgroundColor: '#0f172a',
      overflow: 'hidden'
    }}>
      {/* SIDEBAR */}
      <div style={{
        width: '300px',
        backgroundColor: '#1e293b',
        borderRight: '1px solid rgba(6, 182, 212, 0.3)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(6, 182, 212, 0.3)' }}>
          <button
            onClick={novaConversa}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#06b6d4',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px'
            }}
          >
            ➕ Nova Conversa
          </button>
        </div>

        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '10px',
          paddingBottom: '100px'
        }}>
          <h3 style={{ 
            color: '#94a3b8', 
            fontSize: '12px', 
            fontWeight: 600, 
            padding: '10px',
            margin: 0,
            textTransform: 'uppercase'
          }}>
            Conversas Recentes
          </h3>
          
          {conversas.length === 0 ? (
            <p style={{ 
              color: '#64748b', 
              fontSize: '13px', 
              padding: '10px',
              textAlign: 'center'
            }}>
              Nenhuma conversa salva
            </p>
          ) : (
            conversas.map(conv => (
              <div
                key={conv.id}
                onClick={() => carregarConversa(conv)}
                style={{
                  padding: '12px',
                  margin: '5px 0',
                  backgroundColor: conversaAtual === conv.id ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: conversaAtual === conv.id ? '1px solid #06b6d4' : '1px solid transparent'
                }}
              >
                <div style={{ color: 'white', fontSize: '13px', fontWeight: 500 }}>
                  {conv.titulo}
                </div>
                <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px' }}>
                  {new Date(conv.timestamp).toLocaleDateString('pt-BR')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ÁREA PRINCIPAL */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative'
      }}>
        {/* HEADER */}
        <div style={{
          padding: '20px',
          backgroundColor: '#1e293b',
          borderBottom: '1px solid rgba(6, 182, 212, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              🤖
            </div>
            <div>
              <h2 style={{ 
                margin: 0, 
                color: 'white', 
                fontSize: '18px',
                fontWeight: 'bold'
              }}>
                JARVIS Assistant
              </h2>
              <p style={{ 
                margin: 0, 
                color: '#06b6d4', 
                fontSize: '12px'
              }}>
                Defesa Civil Rio de Janeiro
              </p>
            </div>
          </div>
          
          <button
            onClick={salvarConversa}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(6, 182, 212, 0.2)',
              color: '#06b6d4',
              border: '1px solid #06b6d4',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            💾 Salvar
          </button>
        </div>

        {/* MENSAGENS */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          paddingBottom: '100px'
        }}>
          {mensagens.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '20px',
                flexDirection: msg.tipo === 'usuario' ? 'row-reverse' : 'row'
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: msg.tipo === 'usuario' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {msg.tipo === 'usuario' ? '👤' : '🤖'}
              </div>
              
              <div style={{
                maxWidth: '70%',
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: msg.tipo === 'usuario' ? '#334155' : '#1e293b',
                border: msg.tipo === 'usuario' ? 'none' : '1px solid rgba(6, 182, 212, 0.3)'
              }}>
                <div style={{
                  color: 'white',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.texto}
                </div>
                <div style={{
                  color: '#64748b',
                  fontSize: '11px',
                  marginTop: '8px'
                }}>
                  {msg.timestamp.toLocaleTimeString('pt-BR')}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                🤖
              </div>
              <div style={{
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: '#1e293b',
                border: '1px solid rgba(6, 182, 212, 0.3)'
              }}>
                <div style={{ color: '#06b6d4' }}>
                  Processando...
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* COMANDOS RÁPIDOS */}
        <div style={{
          padding: '10px 20px',
          borderTop: '1px solid rgba(6, 182, 212, 0.3)',
          backgroundColor: '#1e293b'
        }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '5px'
          }}>
            {comandosRapidos.map((cmd, i) => (
              <button
                key={i}
                onClick={() => {
                  setInputText(cmd.comando);
                  setTimeout(enviarMensagem, 100);
                }}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'rgba(6, 182, 212, 0.1)',
                  color: '#06b6d4',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>{cmd.icon}</span>
                <span>{cmd.texto}</span>
              </button>
            ))}
          </div>
        </div>

        {/* INPUT */}
        <div style={{
          padding: '20px',
          backgroundColor: '#1e293b',
          borderTop: '1px solid rgba(6, 182, 212, 0.3)'
        }}>
          <div style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
          }}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && enviarMensagem()}
              placeholder="Pergunte algo... Ex: Como está o trânsito?"
              style={{
                flex: 1,
                padding: '14px 18px',
                backgroundColor: '#334155',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            <button
              onClick={enviarMensagem}
              disabled={loading || !inputText.trim()}
              style={{
                padding: '14px 24px',
                backgroundColor: loading || !inputText.trim() ? '#475569' : '#06b6d4',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: loading || !inputText.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: loading || !inputText.trim() ? 0.5 : 1
              }}
            >
              {loading ? '⏳' : '📤'} Enviar
            </button>
          </div>
          <div style={{
            marginTop: '8px',
            fontSize: '11px',
            color: '#64748b',
            textAlign: 'center'
          }}>
            💡 Fale naturalmente! Ex: "Como está o trânsito?" ou "/ajuda" para comandos
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatJarvis;