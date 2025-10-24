import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { parseString } from 'xml2js';
import fs from 'fs';
import Papa from 'papaparse';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Carrega e processa o CSV de hierarquias
let viasHierarquia = [];

const carregarHierarquias = () => {
  console.log('📋 Carregando hierarquias do CSV...');
  const csvPath = './Hierarquias.csv';
  
  if (!fs.existsSync(csvPath)) {
    console.error('❌ Arquivo Hierarquias.csv não encontrado!');
    return;
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  viasHierarquia = [];
  
  // Busca todos os blocos que contenham hierarquias
  const hierarquias = ['Estrutural', 'Arterial primária', 'Arterial secundária'];
  
  hierarquias.forEach(hierarquia => {
    let index = 0;
    while ((index = csvContent.indexOf(hierarquia, index)) !== -1) {
      const inicio = Math.max(0, index - 500);
      const trecho = csvContent.substring(inicio, index);
      
      const regexNome = /(Avenida|Rua|Estrada|Autoestrada|Rodovia|Via|Túnel|Viaduto|Ponte)\s+[^",\n]+/g;
      let ultimoMatch = null;
      let matchNome;
      
      while ((matchNome = regexNome.exec(trecho)) !== null) {
        ultimoMatch = matchNome[0];
      }
      
      if (ultimoMatch) {
        const nome = ultimoMatch.trim();
        const nomeLimpo = nome
          .toLowerCase()
          .replace(/\(pista central\)/gi, '')
          .replace(/\(pista lateral\)/gi, '')
          .trim();
        
        if (!viasHierarquia.some(v => v.nome === nomeLimpo)) {
          viasHierarquia.push({
            nomeOriginal: nome,
            nome: nomeLimpo,
            hierarquia: hierarquia
          });
        }
      }
      
      index++;
    }
  });
  
  console.log(`✅ ${viasHierarquia.length} vias carregadas`);
  console.log(`   Estrutural: ${viasHierarquia.filter(v => v.hierarquia === 'Estrutural').length}`);
  console.log(`   Arterial primária: ${viasHierarquia.filter(v => v.hierarquia === 'Arterial primária').length}`);
  console.log(`   Arterial secundária: ${viasHierarquia.filter(v => v.hierarquia === 'Arterial secundária').length}`);
  
  if (viasHierarquia.length > 0) {
    console.log('\n🔍 Primeiras 10 vias carregadas:');
    viasHierarquia.slice(0, 10).forEach(v => {
      console.log(`   - ${v.nomeOriginal} (${v.hierarquia})`);
    });
  }
};

// Função para verificar se um alerta está em uma via de hierarquia relevante
const alertaNaViaRelevante = (nomeRua) => {
  if (!nomeRua) return false;
  
  // Converte para string primeiro!
  const nomeStr = String(nomeRua);
  
  const ruaLower = nomeStr.toLowerCase().trim()
    .replace(/\(pista central\)/gi, '')
    .replace(/\(pista lateral\)/gi, '')
    .replace(/^rua /i, '')
    .replace(/^avenida /i, '')
    .replace(/^av\.? /i, '')
    .replace(/^r\.? /i, '')
    .trim();
  
  const encontrou = viasHierarquia.some(via => {
    const viaNome = via.nome
      .replace(/^rua /i, '')
      .replace(/^avenida /i, '')
      .replace(/^av\.? /i, '')
      .replace(/^r\.? /i, '')
      .trim();
    
    return ruaLower.includes(viaNome) || viaNome.includes(ruaLower);
  });
  
  return encontrou;
};

// Carrega as hierarquias ao iniciar
carregarHierarquias();

app.get('/api/sirenes', async (req, res) => {
  try {
    console.log('📡 Buscando sirenes...');
    const response = await fetch('http://websirene.rio.rj.gov.br/xml/sirenes.xml');
    const xmlText = await response.text();
    
    parseString(xmlText, { explicitArray: false }, (err, result) => {
      if (err) {
        console.error('❌ Erro:', err.message);
        return res.status(500).json({ error: 'Erro ao processar' });
      }
      
      try {
        const estacoes = result?.estacoes?.estacao || [];
        const lista = Array.isArray(estacoes) ? estacoes : [estacoes];
        
        const sirenes = lista.map(s => ({
          id: s.$.id,
          nome: s.$.nome,
          bairro: s.localizacao.$.bacia,
          localizacao: `Lat: ${s.localizacao.$.latitude}, Lon: ${s.localizacao.$.longitude}`,
          latitude: parseFloat(s.localizacao.$.latitude),
          longitude: parseFloat(s.localizacao.$.longitude),
          online: s.status.$.online === 'True',
          tocando: s.status.$.status === 'ac',
          status: s.status.$.status,
          ultimaAtualizacao: result.estacoes.$.hora
        }));
        
        console.log(`✅ ${sirenes.length} sirenes | Online: ${sirenes.filter(s => s.online).length}`);
        res.json(sirenes);
      } catch (e) {
        console.error('❌ Erro ao processar:', e.message);
        res.status(500).json({ error: e.message });
      }
    });
  } catch (error) {
    console.error('❌ Erro na API:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pluviometria', async (req, res) => {
  try {
    const response = await fetch('https://websempre.rio.rj.gov.br/json/dados_pluviometricos');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

app.get('/api/waze', async (req, res) => {
  try {
    const response = await fetch('https://www.waze.com/row-partnerhub-api/partners/14420996249/waze-feeds/c5c19146-e0f9-44a7-9815-3862c8a6ed67?format=1');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

app.get('/api/waze/filtrado', async (req, res) => {
  console.log('\n🔴🔴🔴 ENDPOINT /api/waze/filtrado CHAMADO! 🔴🔴🔴\n');
  
  try {
    console.log('🚗 Buscando alertas do Waze (filtrado por hierarquia)...');
    
    const response = await fetch('https://www.waze.com/row-partnerhub-api/partners/14420996249/waze-feeds/c5c19146-e0f9-44a7-9815-3862c8a6ed67?format=1');
    
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      console.log('❌ Response não OK!');
      throw new Error(`Waze API retornou: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📊 Dados recebidos:', data.alerts?.length || 0, 'alertas');
    
    if (!data.alerts) {
      console.log('⚠️ Nenhum alerta na resposta');
      return res.json({ alerts: [], jams: [], irregularities: [] });
    }
    
    console.log('🔍 Iniciando filtragem...');
    const alertasFiltrados = data.alerts.filter(alert => {
      const nomeRua = alert.street || alert.roadType || '';
      return alertaNaViaRelevante(nomeRua);
    });
    
    console.log(`✅ Filtrado: ${data.alerts.length} → ${alertasFiltrados.length}`);
    
    res.json({
      ...data,
      alerts: alertasFiltrados,
      _meta: {
        total_original: data.alerts.length,
        total_filtrado: alertasFiltrados.length,
        hierarquias: ['Estrutural', 'Arterial primária', 'Arterial secundária']
      }
    });
    
  } catch (error) {
    console.error('\n❌❌❌ ERRO CAPTURADO:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Erro ao buscar dados', detalhes: error.message });
  }
  
  console.log('\n🔵🔵🔵 ENDPOINT /api/waze/filtrado FINALIZADO! 🔵🔵🔵\n');
});

app.get('/api/previsao', async (req, res) => {
  try {
    const response = await fetch('https://www.sistema-alerta-rio.com.br/upload/xml/PrevisaoEstendida.xml');
    const xmlText = await response.text();
    parseString(xmlText, { explicitArray: false }, (err, result) => {
      if (err) {
        res.status(500).json({ error: 'Erro' });
      } else {
        res.json(result);
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro' });
  }
});

app.get('/api/previsao-corrente', async (req, res) => {
  try {
    const response = await fetch('https://www.sistema-alerta-rio.com.br/upload/xml/PrevisaoNew.xml');
    const xmlText = await response.text();
    parseString(xmlText, { explicitArray: false }, (err, result) => {
      if (err) {
        res.status(500).json({ error: 'Erro' });
      } else {
        res.json(result);
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro' });
  }
});

app.get('/api/logradouros', async (req, res) => {
  try {
    console.log('📍 Buscando logradouros...');
    const url = 'https://pgeo3.rio.rj.gov.br/arcgis/rest/services/CadLog/Trechos_Logradouros/MapServer/0/query?where=1%3D1&outFields=*&outSR=4326&f=json';
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`✅ ${data.features?.length || 0} logradouros carregados`);
    res.json(data);
  } catch (error) {
    console.error('❌ Erro na API Logradouros:', error.message);
    res.status(500).json({ error: 'Erro ao buscar logradouros' });
  }
});

app.get('/api/hierarquias/stats', (req, res) => {
  const stats = {
    total: viasHierarquia.length,
    estrutural: viasHierarquia.filter(v => v.hierarquia === 'Estrutural').length,
    arterial_primaria: viasHierarquia.filter(v => v.hierarquia === 'Arterial primária').length,
    arterial_secundaria: viasHierarquia.filter(v => v.hierarquia === 'Arterial secundária').length,
    vias: viasHierarquia.slice(0, 10)
  };
  res.json(stats);
});

// Endpoint para analisar tipos de alertas
app.get('/api/waze/tipos', async (req, res) => {
  try {
    const response = await fetch('https://www.waze.com/row-partnerhub-api/partners/14420996249/waze-feeds/c5c19146-e0f9-44a7-9815-3862c8a6ed67?format=1');
    const data = await response.json();
    
    // Conta os tipos
    const tipos = {};
    const subtipos = {};
    
    data.alerts.forEach(alert => {
      tipos[alert.type] = (tipos[alert.type] || 0) + 1;
      if (alert.subtype) {
        subtipos[alert.subtype] = (subtipos[alert.subtype] || 0) + 1;
      }
    });
    
    res.json({
      total: data.alerts.length,
      tipos: tipos,
      subtipos: subtipos,
      exemplos: data.alerts.slice(0, 5).map(a => ({
        type: a.type,
        subtype: a.subtype,
        street: a.street
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3011, () => {
  console.log('🚀 Servidor rodando em http://localhost:3011');
  console.log('📋 Hierarquias carregadas e prontas para filtrar alertas');
  
  // Teste simples
  console.log('\n🧪 Testando endpoint filtrado internamente...');
  fetch('http://localhost:3011/api/waze/filtrado')
    .then(res => res.json())
    .then(data => console.log('✅ Endpoint responde:', data._meta || data.error || 'OK'))
    .catch(err => console.log('❌ Erro no teste:', err.message));
});