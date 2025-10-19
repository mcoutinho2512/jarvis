import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import { parseString } from 'xml2js';

const app = express();
app.use(cors());

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

app.get('/api/sirenes', async (req, res) => {
  try {
    const response = await fetch('http://websirene.rio.rj.gov.br/xml/sirenes.xml');
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
  console.log('Proxy na porta 3011');
});
