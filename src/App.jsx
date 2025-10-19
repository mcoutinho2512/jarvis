import React, { useState, useEffect, useRef } from 'react';
import { Send, Activity, Cloud, Car, Droplets, AlertCircle, Zap, TrendingUp, Sun, Radio } from 'lucide-react';

const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const messagesEndRef = useRef(null);

  const APIs = {
    waze: 'http://localhost:3011/api/waze',
    pluviometria: 'http://localhost:3011/api/pluviometria',
    previsao: 'http://localhost:3011/api/previsao',
    previsaoCorrente: 'http://localhost:3011/api/previsao-corrente',
    sirenes: 'http://localhost:3011/api/sirenes'
  };

  const categories = [
    { id: 'all', name: 'Todas', icon: Activity },
    { id: 'sirens', name: 'Sirenes', icon: Radio },
    { id: 'weather', name: 'Previsão', icon: Sun },
    { id: 'rain', name: 'Chuvas', icon: Droplets },
    { id: 'traffic', name: 'Trânsito', icon: Car },
    { id: 'incidents', name: 'Ocorrências', icon: AlertCircle },
  ];

  const quickQuestions = [
    { text: 'Status das sirenes', category: 'sirens' },
    { text: 'Sirenes offline', category: 'sirens' },
    { text: 'Sirenes em alerta', category: 'sirens' },
    { text: 'Sirenes na Rocinha', category: 'sirens' },
    { text: 'Condições atuais do tempo', category: 'weather' },
    { text: 'Como está o tempo AGORA?', category: 'weather' },
    { text: 'Previsão para esta noite', category: 'weather' },
    { text: 'Temperatura por zona', category: 'weather' },
    { text: 'Tábua de marés hoje', category: 'weather' },
    { text: 'Onde está chovendo agora?', category: 'rain' },
    { text: 'Estação com mais chuva', category: 'rain' },
    { text: 'Acumulado últimas 24h', category: 'rain' },
    { text: 'Vias mais engarrafadas', category: 'traffic' },
    { text: 'Vias interditadas', category: 'traffic' },
    { text: 'Acidentes reportados', category: 'incidents' },
    { text: 'Panorama Completo', category: 'all' },
  ];

  useEffect(() => {
    setMessages([{
      type: 'assistant',
      content: '🌤️ Olá! Sou o **JARVIS Municipal do Rio**.\n\nPosso ajudar com:\n\n🚨 Sirenes de Alerta\n☀️ Previsão do Tempo\n💧 Pluviometria\n🚗 Trânsito\n⚠️ Ocorrências\n\nComo posso ajudar?',
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchAPI = async (url) => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Erro na API');
      return await response.json();
    } catch (error) {
      console.error('Erro:', error);
      return null;
    }
  };

  const detectIntent = (question) => {
    const q = question.toLowerCase();
    
    if (q.includes('sirene') || q.includes('alerta') || q.includes('alarme')) {
      if (q.includes('offline') || q.includes('fora') || q.includes('inativa')) return { type: 'sirens_offline', category: 'sirens' };
      if (q.includes('alerta') || q.includes('acionada') || q.includes('tocando')) return { type: 'sirens_alert', category: 'sirens' };
      if (q.includes('status') || q.includes('geral')) return { type: 'sirens_status', category: 'sirens' };
      
      const localMatch = q.match(/(?:na|no|em|da|do)\s+([a-záàâãéèêíïóôõöúçñ\s]+)/i);
      if (localMatch) return { type: 'sirens_location', category: 'sirens', location: localMatch[1].trim() };
      
      return { type: 'sirens_status', category: 'sirens' };
    }
    
    if (q.includes('agora') || q.includes('atual') || q.includes('corrente') || q.includes('condições')) {
      return { type: 'weather_current', category: 'weather' };
    }
    if (q.includes('noite') && (q.includes('esta') || q.includes('hoje'))) {
      return { type: 'weather_tonight', category: 'weather' };
    }
    if (q.includes('tarde') && (q.includes('esta') || q.includes('hoje'))) {
      return { type: 'weather_afternoon', category: 'weather' };
    }
    if (q.includes('maré') || q.includes('tábua')) {
      return { type: 'weather_tide', category: 'weather' };
    }
    if (q.includes('zona') || (q.includes('bairro') && q.includes('temperatura'))) {
      return { type: 'weather_zones', category: 'weather' };
    }
    if (q.includes('tempo') || q.includes('previsão') || q.includes('amanhã') || q.includes('semana')) {
      return { type: 'weather_general', category: 'weather' };
    }
    
    if (q.includes('chovendo') || q.includes('pluviom') || q.includes('estação') || q.includes('acumulado')) {
      if (q.includes('onde') || q.includes('chovendo')) return { type: 'rain_now', category: 'rain' };
      if (q.includes('mais') || q.includes('maior')) return { type: 'rain_top', category: 'rain' };
      if (q.includes('24')) return { type: 'rain_24h', category: 'rain' };
      return { type: 'rain_general', category: 'rain' };
    }
    
    if (q.includes('engarraf') || q.includes('trânsito') || q.includes('via')) {
      if (q.includes('interdita') || q.includes('fechada')) return { type: 'road_closed', category: 'traffic' };
      return { type: 'jams', category: 'traffic' };
    }
    
    if (q.includes('acidente') || q.includes('alagamento') || q.includes('ocorrência')) {
      if (q.includes('alagamento')) return { type: 'floods_waze', category: 'incidents' };
      if (q.includes('acidente')) return { type: 'accidents', category: 'incidents' };
      return { type: 'serious', category: 'incidents' };
    }
    
    if (q.includes('panorama') || q.includes('resumo') || q.includes('geral')) {
      return { type: 'overview', category: 'all' };
    }
    
    return { type: 'overview', category: 'all' };
  };

  const processSirensData = (data, type, location = null) => {
    if (!data || !data.estacoes || !data.estacoes.estacao) {
      return '❌ Dados de sirenes indisponíveis';
    }

    const sirenes = data.estacoes.estacao;
    const total = sirenes.length;
    const online = sirenes.filter(s => s.$.status.online === 'True').length;
    const offline = total - online;
    const emAlerta = sirenes.filter(s => s.$.status.status === 't').length;

    if (type === 'sirens_status') {
      const ultimaAtualizacao = new Date(data.estacoes.$.hora).toLocaleString('pt-BR');
      return `🚨 STATUS GERAL DAS SIRENES\n\n` +
             `Última atualização: ${ultimaAtualizacao}\n\n` +
             `📊 Estatísticas:\n` +
             `• Total: ${total} sirenes\n` +
             `• Online: ${online} (${((online/total)*100).toFixed(1)}%)\n` +
             `• Offline: ${offline} (${((offline/total)*100).toFixed(1)}%)\n` +
             `• Em alerta: ${emAlerta}\n\n` +
             `${online/total >= 0.95 ? '✅' : '⚠️'} Sistema com ${((online/total)*100).toFixed(1)}% de disponibilidade`;
    }

    if (type === 'sirens_offline') {
      const sirenasOffline = sirenes.filter(s => s.$.status.online === 'False');
      if (sirenasOffline.length === 0) {
        return '✅ EXCELENTE!\n\nTodas as sirenes estão online no momento.';
      }
      let response = `⚠️ SIRENES OFFLINE (${sirenasOffline.length})\n\n`;
      sirenasOffline.slice(0, 15).forEach((s, i) => {
        response += `${i + 1}. ${s.$.nome}\n   📍 ${s.localizacao.$.latitude}, ${s.localizacao.$.longitude}\n\n`;
      });
      if (sirenasOffline.length > 15) {
        response += `...e mais ${sirenasOffline.length - 15} sirenes offline.`;
      }
      return response;
    }

    if (type === 'sirens_alert') {
      const sirenasAlerta = sirenes.filter(s => s.$.status.status === 't');
      if (sirenasAlerta.length === 0) {
        return '✅ SITUAÇÃO NORMAL\n\nNenhuma sirene em estado de alerta.\nCidade em condições normais.';
      }
      let response = `🚨 ATENÇÃO - SIRENES EM ALERTA (${sirenasAlerta.length})\n\n`;
      sirenasAlerta.forEach((s, i) => {
        response += `${i + 1}. 🔴 ${s.$.nome}\n   ⚠️ ALERTA ATIVO\n   📍 ${s.localizacao.$.latitude}, ${s.localizacao.$.longitude}\n\n`;
      });
      return response;
    }

    if (type === 'sirens_location' && location) {
      const sirenasLocal = sirenes.filter(s => 
        s.$.nome.toLowerCase().includes(location.toLowerCase())
      );
      
      if (sirenasLocal.length === 0) {
        return `❌ NÃO ENCONTRADO\n\nNenhuma sirene encontrada em ${location}.\nVerifique a ortografia ou tente outro nome.`;
      }
      
      let response = `📍 SIRENES EM ${location.toUpperCase()} (${sirenasLocal.length})\n\n`;
      sirenasLocal.forEach((s, i) => {
        const statusIcon = s.$.status.online === 'True' ? '✅' : '🔴';
        const statusText = s.$.status.online === 'True' ? 'Online' : 'Offline';
        const alertaText = s.$.status.status === 't' ? ' 🚨 EM ALERTA' : '';
        
        response += `${i + 1}. ${statusIcon} ${s.$.nome}${alertaText}\n` +
                   `   Status: ${statusText}\n` +
                   `   📍 ${s.localizacao.$.latitude}, ${s.localizacao.$.longitude}\n\n`;
      });
      return response;
    }

    return `🚨 SIRENES\n\nTotal: ${total}\n✅ Online: ${online}\n❌ Offline: ${offline}\n⚠️ Alerta: ${emAlerta}`;
  };

  const processWeatherData = (data, type) => {
    const getIcon = (cond) => {
      if (cond.includes('Claro')) return '☀️';
      if (cond.includes('Nublado')) return '☁️';
      if (cond.includes('Chuva')) return '🌧️';
      return '🌤️';
    };

    if (type === 'weather_current') {
      if (!data || !data.previsoes) return '⚠️ Dados indisponíveis';
      const current = data.previsoes.previsao[data.previsoes.previsao.length - 1].$;
      const sinotico = data.previsoes.quadroSinotico.$.sinotico;
      return `🌤️ CONDIÇÕES ATUAIS\n\n` +
             `${getIcon(current.ceu)} ${current.ceu}\n` +
             `💧 ${current.precipitacao}\n` +
             `🌡️ ${current.temperatura}\n` +
             `💨 ${current.dirVento} - ${current.velVento}\n` +
             `⏰ ${current.periodo}\n\n` +
             `📊 Análise:\n${sinotico.substring(0, 180)}...`;
    }

    if (type === 'weather_tonight') {
      if (!data || !data.previsoes) return '⚠️ Dados indisponíveis';
      const tonight = data.previsoes.previsao.find(p => p.$.periodo === 'Noite');
      if (!tonight) return 'Previsão não disponível';
      return `🌙 ESTA NOITE\n\n` +
             `${getIcon(tonight.$.ceu)} ${tonight.$.ceu}\n` +
             `💧 ${tonight.$.precipitacao}\n` +
             `🌡️ ${tonight.$.temperatura}\n` +
             `💨 ${tonight.$.dirVento} - ${tonight.$.velVento}`;
    }

    if (type === 'weather_afternoon') {
      if (!data || !data.previsoes) return '⚠️ Dados indisponíveis';
      const afternoon = data.previsoes.previsao.find(p => p.$.periodo === 'Tarde');
      if (!afternoon) return 'Previsão não disponível';
      return `☀️ ESTA TARDE\n\n` +
             `${getIcon(afternoon.$.ceu)} ${afternoon.$.ceu}\n` +
             `💧 ${afternoon.$.precipitacao}\n` +
             `🌡️ ${afternoon.$.temperatura}\n` +
             `💨 ${afternoon.$.dirVento} - ${afternoon.$.velVento}`;
    }

    if (type === 'weather_zones') {
      if (!data || !data.previsoes || !data.previsoes.Temperatura) return '⚠️ Dados indisponíveis';
      const zones = data.previsoes.Temperatura.Zona;
      return `🌡️ TEMPERATURA POR ZONA\n\n` +
             zones.map(z => `📍 ${z.$.zona}\n   Mín: ${z.$.minima}°C | Máx: ${z.$.maxima}°C`).join('\n\n');
    }

    if (type === 'weather_tide') {
      if (!data || !data.previsoes || !data.previsoes.TabuasMares) return '⚠️ Dados indisponíveis';
      const tides = data.previsoes.TabuasMares.tabua;
      return `🌊 TÁBUA DE MARÉS\n\n` +
             tides.map(t => {
               const time = new Date(t.$.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
               const icon = t.$.elevacao === 'Alta' ? '⬆️' : '⬇️';
               return `${icon} ${t.$.elevacao}: ${time} - ${t.$.altura}m`;
             }).join('\n');
    }

    if (!data || !data.previsoesEstendidas) return '⚠️ Dados indisponíveis';
    const forecasts = data.previsoesEstendidas.previsaoEstendida.map(f => f.$);
    const next = forecasts[forecasts.length - 1];
    return `🌤️ PREVISÃO\n\n` +
           `${getIcon(next.ceu)} ${next.ceu}\n` +
           `🌡️ ${next.minTemp}°C - ${next.maxTemp}°C\n` +
           `💧 ${next.precipitacao}`;
  };

  const processRainData = (data, type) => {
    if (!data || !data.features) return '⚠️ Dados indisponíveis';

    const stations = data.features.map(f => ({
      name: f.properties.station.name,
      m15: parseFloat(f.properties.data.m15?.replace(',', '.')) || 0,
      h24: parseFloat(f.properties.data.h24?.replace(',', '.')) || 0,
    }));

    if (type === 'rain_now') {
      const raining = stations.filter(s => s.m15 > 0).sort((a, b) => b.m15 - a.m15);
      if (raining.length === 0) return '☀️ SEM CHUVA\n\nNenhuma estação registrou chuva';
      return `🌧️ CHOVENDO AGORA\n\n` +
             raining.slice(0, 10).map((s, i) => `${i + 1}. ${s.name}: ${s.m15} mm`).join('\n');
    }

    if (type === 'rain_top') {
      const top = [...stations].sort((a, b) => b.h24 - a.h24).slice(0, 10);
      return `🏆 MAIS CHUVA (24h)\n\n` +
             top.map((s, i) => `${i + 1}. ${s.name}: ${s.h24} mm`).join('\n');
    }

    if (type === 'rain_24h') {
      const last24 = [...stations].sort((a, b) => b.h24 - a.h24);
      const total = last24.reduce((sum, s) => sum + s.h24, 0);
      return `📊 ÚLTIMAS 24H\n\n` +
             `Total: ${total.toFixed(1)} mm\n\n` +
             `Top 5:\n` +
             last24.slice(0, 5).map((s, i) => `${i + 1}. ${s.name}: ${s.h24} mm`).join('\n');
    }

    const rainNow = stations.filter(s => s.m15 > 0).length;
    const top = [...stations].sort((a, b) => b.h24 - a.h24)[0];
    return `💧 PLUVIOMETRIA\n\nChovendo: ${rainNow} estações\nMaior 24h: ${top.name} (${top.h24} mm)`;
  };

  const processWazeData = (data, type) => {
    if (!data || !data.alerts) return '⚠️ Dados indisponíveis';

    const alerts = data.alerts;
    
    if (type === 'jams') {
      const jams = alerts.filter(a => a.type === 'JAM').slice(0, 10);
      if (jams.length === 0) return '✅ Trânsito fluindo';
      return `🚗 CONGESTIONAMENTOS (${jams.length})\n\n` +
             jams.map((j, i) => {
               const level = j.subtype === 'JAM_STAND_STILL_TRAFFIC' ? '🔴' : '🟡';
               return `${i + 1}. ${level} ${j.street || 'Via não identificada'}`;
             }).join('\n');
    }

    if (type === 'road_closed') {
      const closed = alerts.filter(a => a.type === 'ROAD_CLOSED').slice(0, 10);
      if (closed.length === 0) return '✅ Nenhuma via interditada';
      return `🚧 VIAS INTERDITADAS (${closed.length})\n\n` +
             closed.map((c, i) => `${i + 1}. ${c.street || 'Via não identificada'}`).join('\n');
    }

    if (type === 'accidents') {
      const accidents = alerts.filter(a => a.type === 'ACCIDENT').slice(0, 5);
      if (accidents.length === 0) return '✅ Sem acidentes';
      return `💥 ACIDENTES (${accidents.length})\n\n` +
             accidents.map((a, i) => `${i + 1}. ${a.street || 'Local não identificado'}`).join('\n');
    }

    if (type === 'floods_waze') {
      const floods = alerts.filter(a => a.subtype === 'HAZARD_WEATHER_FLOOD').slice(0, 10);
      if (floods.length === 0) return '✅ Sem alagamentos';
      return `🌊 ALAGAMENTOS (${floods.length})\n\n` +
             floods.map((f, i) => `${i + 1}. ${f.street || 'Local não identificado'}`).join('\n');
    }

    return `🚗 Congestionamentos: ${alerts.filter(a => a.type === 'JAM').length}\n` +
           `💥 Acidentes: ${alerts.filter(a => a.type === 'ACCIDENT').length}\n` +
           `🚧 Vias Fechadas: ${alerts.filter(a => a.type === 'ROAD_CLOSED').length}`;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = {
      type: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    const intent = detectIntent(input);
    await new Promise(resolve => setTimeout(resolve, 1000));

    let responseContent = '';

    if (intent.type === 'overview') {
      const [sirensData, weatherCurrent, rainData, wazeData] = await Promise.all([
        fetchAPI(APIs.sirenes),
        fetchAPI(APIs.previsaoCorrente),
        fetchAPI(APIs.pluviometria),
        fetchAPI(APIs.waze)
      ]);

      responseContent = `📊 PANORAMA COMPLETO - RIO DE JANEIRO\n` +
                       `${new Date().toLocaleString('pt-BR')}\n\n` +
                       `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                       processSirensData(sirensData, 'sirens_status') + '\n\n' +
                       `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                       processWeatherData(weatherCurrent, 'weather_current') + '\n\n' +
                       `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                       processRainData(rainData, 'rain_general') + '\n\n' +
                       `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                       processWazeData(wazeData, 'default');
    } else if (intent.category === 'sirens') {
      const sirensData = await fetchAPI(APIs.sirenes);
      responseContent = processSirensData(sirensData, intent.type, intent.location);
    } else if (intent.category === 'weather') {
      const api = ['weather_current', 'weather_tonight', 'weather_afternoon', 'weather_zones', 'weather_tide'].includes(intent.type) ? 
                  APIs.previsaoCorrente : APIs.previsao;
      const weatherData = await fetchAPI(api);
      responseContent = processWeatherData(weatherData, intent.type);
    } else if (intent.category === 'rain') {
      const rainData = await fetchAPI(APIs.pluviometria);
      responseContent = processRainData(rainData, intent.type);
    } else {
      const wazeData = await fetchAPI(APIs.waze);
      responseContent = processWazeData(wazeData, intent.type);
    }

    const assistantMessage = {
      type: 'assistant',
      content: responseContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsTyping(false);
  };

  const handleQuickQuestion = (question) => {
    setInput(question);
    setTimeout(() => handleSend(), 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="bg-slate-900/50 backdrop-blur-md border-b border-cyan-500/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Zap className="w-8 h-8 text-cyan-400" />
                <div className="absolute inset-0 blur-xl bg-cyan-400/50 animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">JARVIS Municipal Rio</h1>
                <p className="text-xs text-cyan-400">Sirenes • Previsão • Chuvas • Trânsito</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-400">5 APIs</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/50'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-cyan-500/20'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.name}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {quickQuestions
            .filter(q => activeCategory === 'all' || q.category === activeCategory)
            .map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickQuestion(q.text)}
                className="bg-slate-800/30 hover:bg-slate-700/50 border border-cyan-500/20 hover:border-cyan-500/50 rounded-xl p-4 text-left text-sm text-slate-300 hover:text-white transition-all"
              >
                <TrendingUp className="w-4 h-4 text-cyan-400 mb-2" />
                {q.text}
              </button>
            ))}
        </div>

        <div className="bg-slate-800/30 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-2xl">
          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-4 ${
                    msg.type === 'user'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                      : 'bg-slate-700/50 text-slate-100 border border-cyan-500/20'
                  }`}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                  <div className="text-xs opacity-50 mt-2">{msg.timestamp.toLocaleTimeString('pt-BR')}</div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-700/50 border border-cyan-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-300">Consultando APIs...</span>
                    <div className="flex gap-1 ml-2">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-cyan-500/30 p-4 bg-slate-800/50">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Pergunte sobre sirenes, tempo, chuvas ou trânsito..."
                className="flex-1 bg-slate-700/50 border border-cyan-500/30 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/30"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500 mt-6">
          Sirenes • Alerta Rio • Waze • Pluviometria | Tempo Real
        </div>
      </div>
    </div>
  );
};

export default App;