import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { parseString } from 'xml2js';

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

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

app.listen(3011, () => {
  console.log('🚀 Servidor rodando em http://localhost:3011');
});
