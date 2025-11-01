import React, { useEffect, useRef, useState } from 'react';
import { Radio, Droplets, Car, AlertCircle, Layers, X, Menu } from 'lucide-react';
import Relatorio from "./components/Relatorio";

const Map = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [painelAberto, setPainelAberto] = useState(true);
  const [mostrarRelatorio, setMostrarRelatorio] = useState(false);
  
  // Constantes de layout
  const SIDEBAR_WIDTH = 380;
  const MARGIN_RIGHT = 0;
  const MARGIN_BOTTOM = 0;
  
  const [layers, setLayers] = useState({
    sirenes: false,
    pluviometros: false,
    transito: true,
    bairros: false,
    logradouros: false,
    ocorrencias: false,
    radar: false
  });
  
  const [stats, setStats] = useState({
    sirenes: 0,
    pluviometros: 0,
    transito: 0,
    ocorrencias: 0
  });
  
  const layerGroupsRef = useRef({
    sirenes: null,
    pluviometros: null,
    transito: null,
    bairros: null,
    logradouros: null,
    ocorrencias: null
  });

  // Refs para limites do município do Rio
  const rioBoundsRef = useRef(null);
  const rioPolygonsRef = useRef([]);

  const [filtrosWaze, setFiltrosWaze] = useState({
    buracos: false,
    obras: false,
    transito_parado: true,
    transito_lento: false,
    carros_parados: true,
    semaforo: false,
    eventos: false,
    acidentes: true,
    via_fechada: false
  });

  const [mostrarApenasSirenesAtivas, setMostrarApenasSirenesAtivas] = useState(false);
  const [mostrarApenasChuva, setMostrarApenasChuva] = useState(false);

  useEffect(() => {
    if (mapInstanceRef.current) {
      console.log('🔄 [MAP] Invalidando tamanho do mapa');
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 300);
    }
  }, [painelAberto]);

  useEffect(() => {
    if (mapInstanceRef.current && layers.transito) {
      console.log('🚗 [WAZE] Recarregando alertas com filtros:', filtrosWaze);
      fetch('/api/waze/filtrado')
        .then(r => r.json())
        .then(data => {
          console.log('📊 [WAZE] Dados recebidos:', data);
          addTransitoLayer(mapInstanceRef.current, window.L, data);
        })
        .catch(err => console.error('❌ [WAZE] Erro ao recarregar alertas:', err));
    }
  }, [filtrosWaze]);


  // Recarregar pluviômetros quando o filtro de chuva mudar
useEffect(() => {
  if (mapInstanceRef.current && layers.pluviometros) {
    console.log('🔄 [PLUVIO] Recarregando com filtro:', mostrarApenasChuva);
    fetch('/api/pluviometria')
      .then(r => r.json())
      .then(data => {
        const L = window.L;
        
        console.log('💧 [PLUVIO] Adicionando', data.features?.length || 0, 'pluviômetros');
        console.log('🔍 [PLUVIO] Filtro "apenas com chuva":', mostrarApenasChuva);
        
        if (layerGroupsRef.current.pluviometros) {
          layerGroupsRef.current.pluviometros.clearLayers();
        }
        
        const layerGroup = L.layerGroup().addTo(mapInstanceRef.current);
        layerGroupsRef.current.pluviometros = layerGroup;
        
        let count = 0;
        let skipped = 0;
        
        data.features?.forEach(feature => {
          const props = feature.properties;
          const coords = feature.geometry.coordinates;
          
          // ✅ ACESSA OS CAMPOS CORRETOS
          const nome = props.station?.name || 'Desconhecido';
          
          // ✅ CONVERTE STRING COM VÍRGULA PARA NÚMERO
          const m15 = props.data?.m15 || '0';
          const h01 = props.data?.h01 || '0';
          const h24 = props.data?.h24 || '0';
          
          // Substitui vírgula por ponto e converte para número
          const intensidade = parseFloat(m15.replace(',', '.')) || 0;
          const chuva1h = parseFloat(h01.replace(',', '.')) || 0;
          const chuva24h = parseFloat(h24.replace(',', '.')) || 0;
          
          // ✅ FILTRO: Se marcado "apenas com chuva" E intensidade = 0
          if (mostrarApenasChuva && intensidade === 0) {
            skipped++;
            return;
          }
          
          // 🎨 CORES SEGUINDO LEGENDA OFICIAL
          let color = '#22c55e'; // 🟢 Verde - Sem Chuva
          let label = 'Sem Chuva';
          
          if (intensidade > 50.0) {
            color = '#dc2626'; // 🔴 Vermelho - Muito Forte
            label = 'Chuva Muito Forte';
          } else if (intensidade >= 25.1) {
            color = '#f97316'; // 🟠 Laranja - Forte
            label = 'Chuva Forte';
          } else if (intensidade >= 5.1) {
            color = '#eab308'; // 🟡 Amarelo - Moderada
            label = 'Chuva Moderada';
          } else if (intensidade >= 0.2) {
            color = '#3b82f6'; // 🔵 Azul - Fraca
            label = 'Chuva Fraca';
          }
          
          const icon = L.divIcon({
            html: `
              <div style="
                width: 20px;
                height: 20px;
                background: ${color};
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              "></div>
            `,
            className: '',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          L.marker([coords[1], coords[0]], { icon }).addTo(layerGroup)
            .bindPopup(`
              <div style="min-width: 200px; font-family: 'Inter', sans-serif;">
                <div style="
                  font-weight: 600; 
                  color: ${color}; 
                  margin-bottom: 8px;
                  font-size: 14px;
                ">
                  💧 ${nome}
                </div>
                <div style="
                  padding: 8px;
                  background: ${color}22;
                  border-left: 3px solid ${color};
                  margin-bottom: 8px;
                  border-radius: 4px;
                ">
                  <div style="font-weight: 600; color: ${color};">${label}</div>
                </div>
                <div style="font-size: 12px; color: #475569; line-height: 1.6;">
                  <div style="margin-bottom: 4px;">
                    <strong style="color: #1e293b;">15 min:</strong> ${intensidade.toFixed(1)} mm
                  </div>
                  <div style="margin-bottom: 4px;">
                    <strong style="color: #1e293b;">1 hora:</strong> ${chuva1h.toFixed(1)} mm
                  </div>
                  <div>
                    <strong style="color: #1e293b;">24 horas:</strong> ${chuva24h.toFixed(1)} mm
                  </div>
                </div>
              </div>
            `);
          count++;
        });
        
        console.log('✅ [PLUVIO]', count, 'marcadores adicionados');
        console.log('⏭️  [PLUVIO]', skipped, 'pluviômetros filtrados (sem chuva)');
      })
      .catch(err => console.error('❌ [PLUVIO] Erro ao recarregar:', err));
  }
}, [mostrarApenasChuva, layers.pluviometros]);


  // Recarregar sirenes quando o filtro de tocando mudar
useEffect(() => {
  if (mapInstanceRef.current && layers.sirenes) {
    console.log('🔄 [SIRENES] Recarregando com filtro:', mostrarApenasSirenesAtivas);
    fetch('/api/sirenes')
      .then(r => r.json())
      .then(data => {
        addSirenesLayer(mapInstanceRef.current, window.L, data);
      })
      .catch(err => console.error('❌ [SIRENES] Erro ao recarregar:', err));
  }
}, [mostrarApenasSirenesAtivas]);

  // NOVA ABORDAGEM: Inicialização completa em um único useEffect
  useEffect(() => {
    console.log('🚀 [MAP] Iniciando componente Map');
    
    let mounted = true;
    let initAttempt = 0;
    const MAX_ATTEMPTS = 50;

    const loadLeaflet = async () => {
      try {
        console.log('📦 [LEAFLET] Carregando CSS...');
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
          console.log('✅ [LEAFLET] CSS carregado');
        }

        console.log('📦 [LEAFLET] Carregando JS...');
        if (!window.L) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => {
              console.log('✅ [LEAFLET] JS carregado com sucesso');
              resolve();
            };
            script.onerror = () => {
              console.error('❌ [LEAFLET] Erro ao carregar JS');
              reject(new Error('Falha ao carregar Leaflet'));
            };
            document.body.appendChild(script);
          });
        } else {
          console.log('✅ [LEAFLET] JS já estava carregado');
        }

        return true;
      } catch (error) {
        console.error('❌ [LEAFLET] Erro:', error);
        return false;
      }
    };

    const tryInitializeMap = () => {
      initAttempt++;
      console.log(`🔍 [MAP] Tentativa ${initAttempt}/${MAX_ATTEMPTS} de encontrar container`);
      
      if (!mounted) {
        console.log('⚠️ [MAP] Componente desmontado, abortando');
        return;
      }

      if (!mapRef.current) {
        console.log(`⏳ [MAP] Container não encontrado na tentativa ${initAttempt}`);
        
        // Tenta também por ID como backup
        const containerById = document.getElementById('leaflet-map-container');
        if (containerById) {
          console.log('✅ [MAP] Container encontrado por ID!');
          mapRef.current = containerById;
        }
      }

      if (mapRef.current) {
        console.log('✅ [MAP] Container encontrado!', mapRef.current);
        console.log('📏 [MAP] Dimensões:', {
          width: mapRef.current.offsetWidth,
          height: mapRef.current.offsetHeight,
          display: window.getComputedStyle(mapRef.current).display,
          visibility: window.getComputedStyle(mapRef.current).visibility
        });

        if (mapRef.current.offsetWidth === 0 || mapRef.current.offsetHeight === 0) {
          console.warn('⚠️ [MAP] Container encontrado mas tem dimensão zero!');
          if (initAttempt < MAX_ATTEMPTS) {
            setTimeout(tryInitializeMap, 100);
            return;
          }
        }

        initializeMap();
      } else if (initAttempt < MAX_ATTEMPTS) {
        // Usa requestAnimationFrame para aguardar o próximo frame
        requestAnimationFrame(() => {
          setTimeout(tryInitializeMap, 50);
        });
      } else {
        console.error('❌ [MAP] TIMEOUT: Container não encontrado após', MAX_ATTEMPTS, 'tentativas');
        setLoading(false);
      }
    };

    const start = async () => {
      const leafletLoaded = await loadLeaflet();
      if (!leafletLoaded || !mounted) {
        setLoading(false);
        return;
      }

      // Aguarda um pouco para o DOM estar completamente pronto
      setTimeout(() => {
        if (mounted) {
          tryInitializeMap();
        }
      }, 200);
    };

    start();

    return () => {
      console.log('🧹 [MAP] Limpando componente');
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const initializeMap = async () => {
    console.log('🗺️ [MAP] initializeMap() chamado');
    
    if (!mapRef.current) {
      console.error('❌ [MAP] ERRO: mapRef.current é null em initializeMap()');
      setLoading(false);
      return;
    }
    
    if (mapInstanceRef.current) {
      console.log('⚠️ [MAP] Mapa já foi inicializado');
      return;
    }

    const L = window.L;
    if (!L) {
      console.error('❌ [MAP] Leaflet não está disponível');
      setLoading(false);
      return;
    }

    try {
      console.log('🌍 [MAP] Criando mapa Leaflet...');
      
      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: true
      }).setView([-22.9068, -43.1729], 11);

      console.log('✅ [MAP] Instância do mapa criada');

      console.log('🎮 [MAP] Adicionando controles...');
      L.control.zoom({
        position: 'topright'
      }).addTo(map);

      console.log('🗺️ [MAP] Adicionando tiles...');
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
      console.log('✅ [MAP] Mapa configurado com sucesso');

      // Força invalidação do tamanho
      setTimeout(() => {
        map.invalidateSize();
        console.log('🔄 [MAP] Tamanho invalidado');
      }, 100);

      console.log('📡 [MAP] Carregando dados das APIs...');
      await loadAllLayers(map, L);
      
      setLoading(false);
      console.log('🎉 [MAP] Inicialização COMPLETA!');
    } catch (error) {
      console.error('❌ [MAP] Erro ao inicializar:', error);
      console.error('🔍 Stack:', error.stack);
      setLoading(false);
    }
  };

  const loadAllLayers = async (map, L) => {
    try {
      console.log('📡 [API] Buscando sirenes...');
      const sirenes = await fetch('/api/sirenes')
        .then(r => {
          console.log('📡 [API] Sirenes - Status:', r.status);
          return r.json();
        })
        .catch(err => {
          console.error('❌ [API] Erro sirenes:', err);
          return [];
        });
      
      console.log('📊 [SIRENES]', sirenes.length, 'sirenes recebidas');
      if (layers.sirenes) addSirenesLayer(map, L, sirenes);
      setStats(prev => ({ ...prev, sirenes: sirenes.length }));

      console.log('📡 [API] Buscando pluviometria...');
      const pluvio = await fetch('/api/pluviometria')
        .then(r => {
          console.log('📡 [API] Pluviometria - Status:', r.status);
          return r.json();
        })
        .catch(err => {
          console.error('❌ [API] Erro pluviometria:', err);
          return { features: [] };
        });
      
      console.log('📊 [PLUVIO]', pluvio.features?.length || 0, 'pluviômetros recebidos');
      if (layers.pluviometros) addPluviometrosLayer(map, L, pluvio);
      setStats(prev => ({ ...prev, pluviometros: pluvio.features?.length || 0 }));

      console.log('📡 [API] Buscando Waze...');
      const waze = await fetch('/api/waze/filtrado')
        .then(r => {
          console.log('📡 [API] Waze - Status:', r.status);
          return r.json();
        })
        .catch(err => {
          console.error('❌ [API] Erro Waze:', err);
          return { alerts: [] };
        });
      
      console.log('📊 [WAZE]', waze.alerts?.length || 0, 'alertas recebidos');
      if (layers.transito) addTransitoLayer(map, L, waze);
      setStats(prev => ({ ...prev, transito: waze.alerts?.length || 0 }));

      console.log('📡 [API] Buscando bairros...');
      const bairros = await fetch('/api/bairros')
        .then(r => {
          console.log('📡 [API] Bairros - Status:', r.status);
          return r.text();
        })
        .then(text => {
          try {
            // Remove aspas extras do JSON
            const cleanText = text.startsWith('"') ? JSON.parse(text) : text;
            return JSON.parse(cleanText);
          } catch (e) {
            console.error('❌ [API] Erro ao parsear bairros:', e);
            return { features: [] };
          }
        })
        .catch(err => {
          console.error('❌ [API] Erro bairros:', err);
          return { features: [] };
        });
      
      console.log('📊 [BAIRROS]', bairros.features?.length || 0, 'bairros recebidos');
      if (layers.bairros) addBairrosLayer(map, L, bairros);

      console.log('📡 [API] Buscando logradouros...');
      const logradouros = await fetch('/api/logradouros')
        .then(r => {
          console.log('📡 [API] Logradouros - Status:', r.status);
          return r.text();
        })
        .then(text => {
          try {
            // Remove aspas extras do JSON
            const cleanText = text.startsWith('"') ? JSON.parse(text) : text;
            return JSON.parse(cleanText);
          } catch (e) {
            console.error('❌ [API] Erro ao parsear logradouros:', e);
            return { features: [] };
          }
        })
        .catch(err => {
          console.error('❌ [API] Erro logradouros:', err);
          return { features: [] };
        });
      
      console.log('📊 [LOGRADOUROS]', logradouros.features?.length || 0, 'ruas recebidas');
      if (layers.logradouros) addLogradourosLayer(map, L, logradouros);

      console.log('📡 [API] Buscando ocorrências Hexagon...');
      const ocorrencias = await fetch('/api/ocorrencias')
        .then(r => {
          console.log('📡 [API] Ocorrências - Status:', r.status);
          return r.json();
        })
        .catch(err => {
          console.error('❌ [API] Erro ocorrências:', err);
          return [];
        });
      
      console.log('📊 [OCORRÊNCIAS]', ocorrencias.length || 0, 'ocorrências recebidas');
      if (layers.ocorrencias) addOcorrenciasLayer(map, L, ocorrencias);
      setStats(prev => ({ ...prev, ocorrencias: ocorrencias.length || 0 }));

    } catch (error) {
      console.error('❌ [API] Erro geral:', error);
    }
  };

  const addSirenesLayer = (map, L, sirenes) => {
  console.log('🚨 [SIRENES] Adicionando', sirenes.length, 'sirenes ao mapa');
  console.log('🔍 [SIRENES] Filtro "apenas tocando":', mostrarApenasSirenesAtivas);
  
  if (layerGroupsRef.current.sirenes) {
    layerGroupsRef.current.sirenes.clearLayers();
  }
  
  const layerGroup = L.layerGroup().addTo(map);
  layerGroupsRef.current.sirenes = layerGroup;
  
  let count = 0;
  let skipped = 0;
  
  sirenes.forEach(sirene => {
    // ✅ FILTRO: Se marcado "apenas tocando" E sirene NÃO está tocando
    if (mostrarApenasSirenesAtivas && !sirene.tocando) {
      skipped++;
      return;
    }
    
    // Cores baseadas no status
    const color = sirene.tocando ? '#ef4444' : sirene.online ? '#22c55e' : '#64748b';
    const status = sirene.tocando ? '🔴 TOCANDO' : sirene.online ? '🟢 Online' : '⚫ Offline';
    const animacao = sirene.tocando ? 'animation: pulse-sirene 1.5s infinite;' : '';
    
    // SVG de CORNETA/SIRENE
    const sireneIcon = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
        <path d="M12 2L6 8H2v8h4l6 6V2zm7 4v12c2.2-1.5 4-4.5 4-6s-1.8-4.5-4-6zm0 4.5c1.1.8 2 2.2 2 3.5s-.9 2.7-2 3.5v-7z"/>
      </svg>
    `;
    
    const icon = L.divIcon({
      html: `
        <style>
          @keyframes pulse-sirene {
            0%, 100% { 
              opacity: 1; 
              transform: scale(1);
              box-shadow: 0 0 20px ${color}, 0 0 40px ${color};
            }
            50% { 
              opacity: 0.8; 
              transform: scale(1.2);
              box-shadow: 0 0 30px ${color}, 0 0 60px ${color};
            }
          }
        </style>
        <div style="
          width: 32px;
          height: 32px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          ${animacao}
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        ">${sireneIcon}</div>
      `,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    L.marker([sirene.latitude, sirene.longitude], { icon }).addTo(layerGroup)
      .bindPopup(`
        <div style="min-width: 220px; font-family: 'Inter', sans-serif;">
          <div style="
            font-weight: 600; 
            color: ${color}; 
            margin-bottom: 8px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <div style="
              width: 26px;
              height: 26px;
              background: ${color};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid white;
            ">${sireneIcon}</div>
            ${sirene.nome}
          </div>
          <div style="
            padding: 8px;
            background: ${color}22;
            border-left: 3px solid ${color};
            margin-bottom: 8px;
            border-radius: 4px;
          ">
            <div style="font-weight: 600; color: ${color};">${status}</div>
          </div>
          <div style="font-size: 12px; color: #475569; line-height: 1.6;">
            <div style="margin-bottom: 4px;">
              <strong style="color: #1e293b;">Bairro:</strong> ${sirene.bairro || 'N/A'}
            </div>
            <div>
              <strong style="color: #1e293b;">Localização:</strong> ${sirene.latitude.toFixed(4)}, ${sirene.longitude.toFixed(4)}
            </div>
          </div>
        </div>
      `);
    count++;
  });
  
  console.log('✅ [SIRENES]', count, 'marcadores adicionados');
  console.log('⏭️  [SIRENES]', skipped, 'sirenes filtradas (não tocando)');
};

  const addPluviometrosLayer = (map, L, data) => {
    console.log('💧 [PLUVIO] Adicionando', data.features?.length || 0, 'pluviômetros');
    console.log('🔍 [PLUVIO] Filtro "apenas com chuva":', mostrarApenasChuva);
    
    if (layerGroupsRef.current.pluviometros) {
      layerGroupsRef.current.pluviometros.clearLayers();
    }
    
    const layerGroup = L.layerGroup().addTo(map);
    layerGroupsRef.current.pluviometros = layerGroup;
    
    let count = 0;
    let skipped = 0;
    
    data.features?.forEach(feature => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;
      
      // Converte para número e trata valores inválidos
      const intensidade = parseFloat(props.chuva_15min) || 0;
      
      // ✅ FILTRO: Se marcado "apenas com chuva" E intensidade = 0
      if (mostrarApenasChuva && intensidade === 0) {
        skipped++;
        return;
      }
      
      // 🎨 CORES SEGUINDO LEGENDA OFICIAL
      let color = '#22c55e'; // 🟢 Verde - Sem Chuva (0 mm/h)
      let label = 'Sem Chuva';
      
      if (intensidade > 50.0) {
        color = '#dc2626'; // 🔴 Vermelho - Muito Forte (>50,0mm/h)
        label = 'Chuva Muito Forte';
      } else if (intensidade >= 25.1) {
        color = '#f97316'; // 🟠 Laranja - Forte (25,1 - 50,0mm/h)
        label = 'Chuva Forte';
      } else if (intensidade >= 5.1) {
        color = '#eab308'; // 🟡 Amarelo - Moderada (5,1 - 25,0mm/h)
        label = 'Chuva Moderada';
      } else if (intensidade >= 0.2) {
        color = '#3b82f6'; // 🔵 Azul - Fraca (0,2 - 5,0mm/h)
        label = 'Chuva Fraca';
      }
      
      const icon = L.divIcon({
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background: ${color};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          "></div>
        `,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      L.marker([coords[1], coords[0]], { icon }).addTo(layerGroup)
        .bindPopup(`
          <div style="min-width: 200px; font-family: 'Inter', sans-serif;">
            <div style="
              font-weight: 600; 
              color: ${color}; 
              margin-bottom: 8px;
              font-size: 14px;
            ">
              💧 ${props.nome}
            </div>
            <div style="
              padding: 8px;
              background: ${color}22;
              border-left: 3px solid ${color};
              margin-bottom: 8px;
              border-radius: 4px;
            ">
              <div style="font-weight: 600; color: ${color};">${label}</div>
            </div>
            <div style="font-size: 12px; color: #475569; line-height: 1.6;">
              <div style="margin-bottom: 4px;">
                <strong style="color: #1e293b;">15 min:</strong> ${intensidade.toFixed(1)} mm/h
              </div>
              <div style="margin-bottom: 4px;">
                <strong style="color: #1e293b;">1 hora:</strong> ${(props.chuva_1h || 0).toFixed(1)} mm
              </div>
              <div>
                <strong style="color: #1e293b;">24 horas:</strong> ${(props.chuva_24h || 0).toFixed(1)} mm
              </div>
            </div>
          </div>
        `);
      count++;
    });
    
    console.log('✅ [PLUVIO]', count, 'marcadores adicionados');
    console.log('⏭️  [PLUVIO]', skipped, 'pluviômetros filtrados (sem chuva)');
  };

  const addBairrosLayer = (map, L, data) => {
    console.log('🗺️ [BAIRROS] Adicionando', data.features?.length || 0, 'bairros');
    
    if (layerGroupsRef.current.bairros) {
      layerGroupsRef.current.bairros.clearLayers();
    }
    
    const layerGroup = L.layerGroup().addTo(map);
    layerGroupsRef.current.bairros = layerGroup;
    
    let count = 0;
    const polygons = [];
    const allBounds = [];
    
    data.features?.forEach(feature => {
      const props = feature.attributes;
      const rings = feature.geometry?.rings;
      
      if (!rings || rings.length === 0) return;
      
      // Converte formato ESRI para GeoJSON
      const coordinates = rings.map(ring => 
        ring.map(coord => [coord[1], coord[0]]) // [lng, lat] → [lat, lng]
      );
      
      const polygon = L.polygon(coordinates, {
        color: '#06b6d4',
        weight: 2,
        opacity: 0.8,
        fillColor: '#06b6d4',
        fillOpacity: 0.1
      }).addTo(layerGroup);
      
      // Guarda polígono para verificação de ponto dentro
      polygons.push(polygon);
      
      // Guarda bounds de cada bairro
      allBounds.push(polygon.getBounds());
      
      polygon.bindPopup(`
        <div style="min-width: 180px; font-family: 'Inter', sans-serif;">
          <div style="
            font-weight: 600; 
            color: #06b6d4; 
            margin-bottom: 8px;
            font-size: 14px;
          ">
            🗺️ ${props.nome || 'Bairro'}
          </div>
          <div style="font-size: 12px; color: #475569; line-height: 1.6;">
            <div style="margin-bottom: 4px;">
              <strong style="color: #1e293b;">Região:</strong> ${props.regiao_adm || 'N/A'}
            </div>
            <div>
              <strong style="color: #1e293b;">Código:</strong> ${props.codbairro || 'N/A'}
            </div>
          </div>
        </div>
      `);
      
      count++;
    });
    
    // Salva polígonos para filtro do Waze
    rioPolygonsRef.current = polygons;
    
    // Calcula bounds geral do município
    if (allBounds.length > 0) {
      const featureGroup = L.featureGroup(polygons);
      rioBoundsRef.current = featureGroup.getBounds();
      console.log('📍 [RIO] Bounds calculados:', rioBoundsRef.current);
    }
    
    console.log('✅ [BAIRROS]', count, 'polígonos adicionados');
  };

  const addLogradourosLayer = (map, L, data) => {
    console.log('🛣️ [LOGRADOUROS] Adicionando', data.features?.length || 0, 'ruas');
    
    if (layerGroupsRef.current.logradouros) {
      layerGroupsRef.current.logradouros.clearLayers();
    }
    
    const layerGroup = L.layerGroup().addTo(map);
    layerGroupsRef.current.logradouros = layerGroup;
    
    let count = 0;
    
    data.features?.forEach(feature => {
      const props = feature.attributes;
      const paths = feature.geometry?.paths;
      
      if (!paths || paths.length === 0) return;
      
      // Converte formato ESRI para GeoJSON
      const coordinates = paths.map(path => 
        path.map(coord => [coord[1], coord[0]]) // [lng, lat] → [lat, lng]
      );
      
      const polyline = L.polyline(coordinates, {
        color: '#94a3b8',
        weight: 1,
        opacity: 0.6
      }).addTo(layerGroup);
      
      polyline.bindPopup(`
        <div style="min-width: 180px; font-family: 'Inter', sans-serif;">
          <div style="
            font-weight: 600; 
            color: #94a3b8; 
            margin-bottom: 8px;
            font-size: 14px;
          ">
            🛣️ ${props.completo || props.nome_mapa || 'Logradouro'}
          </div>
          <div style="font-size: 12px; color: #475569; line-height: 1.6;">
            <div>
              <strong style="color: #1e293b;">Bairro:</strong> ${props.bairro || 'N/A'}
            </div>
          </div>
        </div>
      `);
      
      count++;
    });
    
    console.log('✅ [LOGRADOUROS]', count, 'ruas adicionadas');
  };

  const addOcorrenciasLayer = (map, L, data) => {
    console.log('🚨 [OCORRÊNCIAS] Adicionando', data.length || 0, 'ocorrências');
    
    if (layerGroupsRef.current.ocorrencias) {
      layerGroupsRef.current.ocorrencias.clearLayers();
    }
    
    const layerGroup = L.layerGroup().addTo(map);
    layerGroupsRef.current.ocorrencias = layerGroup;
    
    // Mapeamento de palavras-chave para categorias
    const getCategoria = (incidente) => {
      const texto = incidente.toUpperCase();
      
      if (texto.includes('ACIDENTE') || texto.includes('ATROPELAMENTO') || 
          texto.includes('ABALROAMENTO') || texto.includes('ENGUICO')) {
        return 'acidentes';
      }
      if (texto.includes('INCENDIO') || texto.includes('INCÊNDIO')) {
        return 'incendios';
      }
      if (texto.includes('AGUA') || texto.includes('ÁGUA') || texto.includes('ALAGAMENTO') || 
          texto.includes('ENCHENTE') || texto.includes('INUNDACAO') || texto.includes('INUNDAÇÃO') ||
          texto.includes('LAMINA') || texto.includes('VAZAMENTO') || texto.includes('RESSACA')) {
        return 'agua';
      }
      if (texto.includes('QUEDA') || texto.includes('ARVORE') || texto.includes('ÁRVORE') ||
          texto.includes('POSTE') || texto.includes('DESLIZAMENTO') || texto.includes('ESTRUTURA')) {
        return 'quedas';
      }
      if (texto.includes('ANIMAL') || texto.includes('RESGATE')) {
        return 'animais';
      }
      if (texto.includes('SINAIS') || texto.includes('ENERGIA') || texto.includes('APAGAO') ||
          texto.includes('BURACO') || texto.includes('OBRA') || texto.includes('MANUTENCAO') ||
          texto.includes('MANUTENÇÃO') || texto.includes('BUEIRO') || texto.includes('FIACAO') ||
          texto.includes('FIAÇÃO')) {
        return 'infraestrutura';
      }
      if (texto.includes('MANIFESTACAO') || texto.includes('MANIFESTAÇÃO') || 
          texto.includes('REINTEGRACAO') || texto.includes('IMPLOSAO') || texto.includes('IMPLOSÃO') ||
          texto.includes('GAS') || texto.includes('GÁS') || texto.includes('POLICIAL') ||
          texto.includes('SIRENES') || texto.includes('AMBIENTAL')) {
        return 'emergencias';
      }
      
      return 'outros';
    };
    
    // Ícones SVG por categoria
    const iconSVG = {
      acidentes: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99z"/>
        <path d="M7 7l10 10M17 7L7 17" stroke="white" stroke-width="2"/>
      </svg>`,
      
      incendios: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M12 2c-1.5 4.5-6 5.5-6 10 0 3.3 2.7 6 6 6s6-2.7 6-6c0-4.5-4.5-5.5-6-10z"/>
        <path d="M12 14c-.8 0-1.5-.7-1.5-1.5 0-1.5 1.5-2 1.5-3.5.5 1.5 1.5 2 1.5 3.5 0 .8-.7 1.5-1.5 1.5z" fill="#fbbf24"/>
      </svg>`,
      
      agua: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
        <path d="M12 18c-2.21 0-4-1.79-4-4 0-1.76 2-4 4-6 2 2 4 4.24 4 6 0 2.21-1.79 4-4 4z" fill="#06b6d4" opacity="0.7"/>
      </svg>`,
      
      quedas: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M12 2L2 12h4v8h12v-8h4L12 2z"/>
        <line x1="8" y1="16" x2="16" y2="8" stroke="#ef4444" stroke-width="2.5"/>
      </svg>`,
      
      animais: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <circle cx="8" cy="8" r="2"/>
        <circle cx="16" cy="8" r="2"/>
        <circle cx="6" cy="14" r="2"/>
        <circle cx="18" cy="14" r="2"/>
        <circle cx="12" cy="18" r="3"/>
      </svg>`,
      
      infraestrutura: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M22 9L12 2 2 9v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9z"/>
        <path d="M12 6v12M8 10h8M8 14h8" stroke="#1e293b" stroke-width="1.5"/>
      </svg>`,
      
      emergencias: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
      </svg>`,
      
      outros: `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12" stroke="#1e293b" stroke-width="2"/>
        <circle cx="12" cy="16" r="1" fill="#1e293b"/>
      </svg>`
    };
    
    // Cores por prioridade
    const corPrioridade = {
      'MUITO ALTA': '#ef4444',
      'ALTA': '#f97316',
      'MÉDIA': '#eab308',
      'BAIXA': '#22c55e'
    };
    
    let count = 0;
    
    data.forEach(ocorrencia => {
      const lat = parseFloat(ocorrencia.lat);
      const lon = parseFloat(ocorrencia.lon);
      
      if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
        return;
      }
      
      const categoria = getCategoria(ocorrencia.incidente || '');
      const cor = corPrioridade[ocorrencia.prio] || '#64748b';
      
      const icon = L.divIcon({
        html: `
          <div style="
            width: 36px;
            height: 36px;
            background: ${cor};
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          ">${iconSVG[categoria] || iconSVG['outros']}</div>
        `,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });
      
      const marker = L.marker([lat, lon], { icon }).addTo(layerGroup);
      
      marker.bindPopup(`
        <div style="min-width: 250px; font-family: 'Inter', sans-serif;">
          <div style="
            font-weight: 600; 
            color: ${cor}; 
            margin-bottom: 8px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <div style="
              width: 28px;
              height: 28px;
              background: ${cor};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid white;
              flex-shrink: 0;
            ">${iconSVG[categoria] || iconSVG['outros']}</div>
            ${ocorrencia.incidente}
          </div>
          <div style="
            padding: 8px;
            background: ${cor}22;
            border-left: 3px solid ${cor};
            margin-bottom: 8px;
            border-radius: 4px;
          ">
            <div style="font-weight: 600; color: ${cor};">
              ${ocorrencia.prio}
            </div>
          </div>
          <div style="font-size: 12px; color: #475569; line-height: 1.6;">
            <div style="margin-bottom: 4px;">
              <strong style="color: #1e293b;">📍 Local:</strong> ${ocorrencia.location || 'Não informado'}
            </div>
            <div style="margin-bottom: 4px;">
              <strong style="color: #1e293b;">📋 Status:</strong> ${ocorrencia.status || 'Em andamento'}
            </div>
            <div>
              <strong style="color: #1e293b;">🆔 ID:</strong> ${ocorrencia.id_c}
            </div>
          </div>
        </div>
      `);
      
      count++;
    });
    
    console.log('✅ [OCORRÊNCIAS]', count, 'marcadores adicionados');
  };

  // Função helper para verificar se um ponto está dentro de um polígono (Ray Casting)
  const isPointInPolygon = (point, polygon) => {
    let inside = false;
    const x = point.lat;
    const y = point.lng;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat;
      const yi = polygon[i].lng;
      const xj = polygon[j].lat;
      const yj = polygon[j].lng;
      
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  };

  const addTransitoLayer = (map, L, data) => {
  console.log('🚗 [WAZE] Adicionando', data.alerts?.length || 0, 'alertas');
  console.log('🔍 [WAZE] Filtros ativos:', filtrosWaze);
  
  if (layerGroupsRef.current.transito) {
    layerGroupsRef.current.transito.clearLayers();
  }
  
  const layerGroup = L.layerGroup().addTo(map);
  layerGroupsRef.current.transito = layerGroup;
  
  // TRADUÇÃO dos tipos
  const traducaoTipos = {
    'ACCIDENT': 'Acidente',
    'JAM': 'Congestionamento',
    'ROAD_CLOSED': 'Via Fechada',
    'HAZARD': 'Perigo na Via',
    'WEATHERHAZARD': 'Alerta Climático',
    'CONSTRUCTION': 'Obra',
    'POLICE': 'Blitz Policial'
  };
  
  // TRADUÇÃO dos subtipos
  const traducaoSubtipos = {
    'STAND_STILL_TRAFFIC': 'Trânsito Parado',
    'HEAVY_TRAFFIC': 'Trânsito Pesado',
    'MODERATE_TRAFFIC': 'Trânsito Moderado',
    'LIGHT_TRAFFIC': 'Trânsito Leve',
    'POTHOLE': 'Buraco na Pista',
    'POT_HOLE': 'Buraco na Pista',
    'CONSTRUCTION': 'Obra na Via',
    'CAR_STOPPED': 'Carro Parado',
    'VEHICLE_STOPPED': 'Veículo Parado',
    'TRAFFIC_LIGHT_FAULT': 'Semáforo com Defeito',
    'HAZARD_ON_ROAD': 'Obstáculo na Pista',
    'HAZARD_ON_SHOULDER': 'Obstáculo no Acostamento',
    'ACCIDENT_MINOR': 'Acidente Leve',
    'ACCIDENT_MAJOR': 'Acidente Grave'
  };
  
  // SVGs INTUITIVOS E ESPECÍFICOS
  const iconSVG = {
    // ACIDENTE - Colisão com X
    'ACCIDENT': `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M15.5 1h-8l-7 7v8l7 7h8l7-7v-8l-7-7zm-1.5 14h-4v-4h4v4zm0-6h-4V5h4v4z"/>
      <path d="M7 7l10 10M17 7L7 17" stroke="white" stroke-width="2"/>
    </svg>`,
    
    // CONGESTIONAMENTO - Múltiplos carros enfileirados
    'JAM': `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M3 18v-1c0-.55.45-1 1-1h1v-3c0-.55.45-1 1-1h10c.55 0 1 .45 1 1v3h1c.55 0 1 .45 1 1v1h-16z"/>
      <rect x="5" y="8" width="3" height="3" rx="1"/>
      <rect x="10" y="8" width="3" height="3" rx="1"/>
      <path d="M20 13v-1c0-.55.45-1 1-1h1v-3c0-.55.45-1 1-1h10c.55 0 1 .45 1 1v3h1c.55 0 1 .45 1 1v1h-16z" transform="scale(0.5) translate(8, 0)"/>
    </svg>`,
    
    // VIA FECHADA - Barreira de trânsito
    'ROAD_CLOSED': `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <rect x="2" y="11" width="20" height="2" fill="white"/>
      <rect x="3" y="8" width="2" height="8" fill="white"/>
      <rect x="19" y="8" width="2" height="8" fill="white"/>
      <path d="M4 10l4-4 4 4 4-4 4 4" stroke="white" stroke-width="2" fill="none"/>
    </svg>`,
    
    // CARRO PARADO - Carro com sinal de parada
    'CAR_STOPPED': `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
      <circle cx="12" cy="9" r="2" fill="#ef4444"/>
    </svg>`,
    
    // BURACO - Cratera na pista
    'POTHOLE': `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <ellipse cx="12" cy="14" rx="8" ry="4" fill="white" opacity="0.5"/>
      <path d="M8 12c0-2 1-4 4-4s4 2 4 4c0 1-1 2-2 3-1 1-2 1-2 0-1-1-4-1-4-3z" fill="white"/>
    </svg>`,
    
    // OBRA - Cone de trânsito
    'CONSTRUCTION': `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M12 2L6 18h12L12 2z" stroke="white" stroke-width="1.5" fill="none"/>
      <rect x="5" y="18" width="14" height="2" fill="white"/>
      <line x1="8" y1="12" x2="16" y2="12" stroke="#f97316" stroke-width="2"/>
      <line x1="9" y1="8" x2="15" y2="8" stroke="#f97316" stroke-width="2"/>
    </svg>`,
    
    // SEMÁFORO - Semáforo com X
    'TRAFFIC_LIGHT': `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <rect x="8" y="2" width="8" height="18" rx="2" fill="white"/>
      <circle cx="12" cy="7" r="2" fill="#ef4444"/>
      <circle cx="12" cy="12" r="2" fill="#eab308"/>
      <circle cx="12" cy="17" r="2" fill="#64748b"/>
      <line x1="10" y1="5" x2="14" y2="9" stroke="#ef4444" stroke-width="1.5"/>
      <line x1="14" y1="5" x2="10" y2="9" stroke="#ef4444" stroke-width="1.5"/>
    </svg>`,
    
    // CLIMA - Nuvem com raio
    'WEATHERHAZARD': `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>
      <path d="M11 13h2l-3 5 1-3H9l3-5-1 3z" fill="#fbbf24"/>
    </svg>`,
    
    // BLITZ - Viatura policial com sirene
    'POLICE': `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <rect x="6" y="10" width="12" height="7" rx="1" fill="white"/>
      <rect x="8" y="8" width="8" height="2" fill="white"/>
      <circle cx="9" cy="15" r="1.5" fill="#1e293b"/>
      <circle cx="15" cy="15" r="1.5" fill="#1e293b"/>
      <rect x="10" y="5" width="4" height="3" rx="0.5" fill="#ef4444"/>
      <circle cx="12" cy="6" r="1" fill="#fbbf24" opacity="0.8"/>
    </svg>`,
    
    // GENÉRICO - Triângulo de alerta
    'HAZARD': `<svg width="18" height="18" viewBox="0 0 24 24" fill="white">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
    </svg>`
  };
  
  // Mapeamento de cores
  const colorMap = {
    'ACCIDENT': '#ef4444',
    'JAM': '#f97316',
    'ROAD_CLOSED': '#dc2626',
    'HAZARD': '#eab308',
    'WEATHERHAZARD': '#06b6d4',
    'CONSTRUCTION': '#f97316',
    'POLICE': '#3b82f6',
    'CAR_STOPPED': '#eab308',
    'POTHOLE': '#eab308',
    'TRAFFIC_LIGHT': '#ef4444'
  };

  let count = 0;
  let skippedCount = 0;
  const tiposEncontrados = new Set();
  const subtiposEncontrados = new Set();
  
  data.alerts?.forEach(alert => {
    const tipo = alert.type || 'HAZARD';
    const subtipo = alert.subtype || '';
    
    tiposEncontrados.add(tipo);
    if (subtipo) subtiposEncontrados.add(`${tipo}:${subtipo}`);
    
    let mostrar = false;
    let usarIcone = tipo;
    let cor = colorMap[tipo] || '#64748b';
    
    // ACIDENTES
    if (tipo === 'ACCIDENT' && filtrosWaze.acidentes) {
      mostrar = true;
    }
    
    // JAM (TRÂNSITO) - com animação
    if (tipo === 'JAM') {
      // Trânsito parado - VERMELHO PISCANDO
      if (subtipo.includes('STAND_STILL') && filtrosWaze.transito_parado) {
        mostrar = true;
        cor = '#dc2626';
      }
      // Trânsito lento - LARANJA PISCANDO
      else if ((subtipo.includes('HEAVY') || subtipo.includes('MODERATE') || 
                subtipo.includes('LIGHT')) && filtrosWaze.transito_lento) {
        mostrar = true;
        cor = '#f97316';
      }
      // Sem subtipo
      else if (!subtipo && (filtrosWaze.transito_parado || filtrosWaze.transito_lento)) {
        mostrar = true;
      }
    }
    
    // VIA FECHADA
    if (tipo === 'ROAD_CLOSED' && filtrosWaze.via_fechada) {
      mostrar = true;
    }
    
    // HAZARD (PERIGOS)
    if (tipo === 'HAZARD') {
      // Buracos
      if ((subtipo.includes('POTHOLE') || subtipo.includes('POT_HOLE')) && filtrosWaze.buracos) {
        mostrar = true;
        usarIcone = 'POTHOLE';
        cor = '#eab308';
      }
      // Obras
      else if (subtipo.includes('CONSTRUCTION') && filtrosWaze.obras) {
        mostrar = true;
        usarIcone = 'CONSTRUCTION';
        cor = '#f97316';
      }
      // Carros parados - ÍCONE ESPECÍFICO
      else if ((subtipo.includes('CAR_STOPPED') || subtipo.includes('VEHICLE_STOPPED')) && 
               filtrosWaze.carros_parados) {
        mostrar = true;
        usarIcone = 'CAR_STOPPED';
        cor = '#eab308';
      }
      // Semáforos - ÍCONE ESPECÍFICO
      else if ((subtipo.includes('TRAFFIC_LIGHT') || subtipo.includes('SIGNAL')) && 
               filtrosWaze.semaforo) {
        mostrar = true;
        usarIcone = 'TRAFFIC_LIGHT';
        cor = '#ef4444';
      }
      // Genérico
      else if (!subtipo && (filtrosWaze.buracos || filtrosWaze.obras || filtrosWaze.carros_parados)) {
        mostrar = true;
      }
    }
    
    // WEATHERHAZARD (Perigos climáticos)
    if (tipo === 'WEATHERHAZARD' && filtrosWaze.eventos) {
      mostrar = true;
    }
    
    // CONSTRUCTION (Obras)
    if (tipo === 'CONSTRUCTION' && filtrosWaze.obras) {
      mostrar = true;
    }
    
    // POLICE (Blitz)
    if (tipo === 'POLICE' && filtrosWaze.eventos) {
      mostrar = true;
    }
    
    if (!mostrar) {
      skippedCount++;
      return;
    }
    
    // FILTRO GEOGRÁFICO: Verificar se está dentro do município do Rio
    const coords = alert.location;
    if (rioPolygonsRef.current.length > 0) {
      const latLng = L.latLng(coords.y, coords.x);
      let dentroDoRio = false;
      
      // Verifica se o ponto está dentro de algum polígono de bairro
      for (const polygon of rioPolygonsRef.current) {
        if (polygon.getBounds().contains(latLng)) {
          // Verificação mais precisa usando ray casting
          const latlngs = polygon.getLatLngs()[0]; // Primeiro anel do polígono
          if (isPointInPolygon(latLng, latlngs)) {
            dentroDoRio = true;
            break;
          }
        }
      }
      
      if (!dentroDoRio) {
        skippedCount++;
        return;
      }
    }
    
    // Determinar se precisa animação de pulsação
    const precisaPulsar = (tipo === 'JAM' && 
      (subtipo.includes('STAND_STILL') || subtipo.includes('HEAVY') || 
       subtipo.includes('MODERATE')));
    
    const animacao = precisaPulsar ? `
      <style>
        @keyframes pulse-traffic {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1);
            box-shadow: 0 0 20px ${cor}, 0 0 40px ${cor};
          }
          50% { 
            opacity: 0.7; 
            transform: scale(1.15);
            box-shadow: 0 0 30px ${cor}, 0 0 60px ${cor};
          }
        }
      </style>
    ` : '';
    
    const icon = L.divIcon({
      html: `
        ${animacao}
        <div style="
          width: 34px;
          height: 34px;
          background: ${cor};
          border: 3px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          ${precisaPulsar ? 'animation: pulse-traffic 1.5s infinite;' : ''}
        ">${iconSVG[usarIcone] || iconSVG['HAZARD']}</div>
      `,
      className: '',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    // Traduzir subtipo
    let subtipoTraduzido = subtipo;
    for (const [chave, valor] of Object.entries(traducaoSubtipos)) {
      if (subtipo.includes(chave)) {
        subtipoTraduzido = valor;
        break;
      }
    }

    L.marker([coords.y, coords.x], { icon }).addTo(layerGroup)
      .bindPopup(`
        <div style="min-width: 220px; font-family: 'Inter', sans-serif;">
          <div style="
            font-weight: 600; 
            color: ${cor}; 
            margin-bottom: 8px;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <div style="
              width: 26px;
              height: 26px;
              background: ${cor};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid white;
            ">${iconSVG[usarIcone]}</div>
            ${traducaoTipos[tipo] || tipo}
          </div>
          <div style="font-size: 12px; color: #475569; line-height: 1.6;">
            <div style="margin-bottom: 4px;">
              <strong style="color: #1e293b;">Local:</strong> ${alert.street || 'Não informado'}
            </div>
            ${subtipo ? `
            <div style="margin-bottom: 4px;">
              <strong style="color: #1e293b;">Tipo:</strong> ${subtipoTraduzido}
            </div>
            ` : ''}
            <div>
              <strong style="color: #1e293b;">Confiança:</strong> ${alert.confidence || 0}/10
            </div>
          </div>
        </div>
      `);
    count++;
  });
  
  console.log('✅ [WAZE]', count, 'marcadores adicionados');
  console.log('⏭️  [WAZE]', skippedCount, 'alertas filtrados (não exibidos)');
  console.log('📊 [WAZE] Tipos encontrados:', Array.from(tiposEncontrados).join(', '));
  console.log('📊 [WAZE] Subtipos encontrados:', Array.from(subtiposEncontrados).join(', '));
};

  // Função para centralizar o mapa no município do Rio
  const centralizarNoRio = () => {
    if (mapInstanceRef.current && rioBoundsRef.current) {
      console.log('📍 [RIO] Centralizando no município');
      mapInstanceRef.current.fitBounds(rioBoundsRef.current, {
        padding: [50, 50],
        maxZoom: 11
      });
    } else if (mapInstanceRef.current && !rioBoundsRef.current) {
      // Se não tem bounds, ativa a camada de bairros primeiro
      console.log('📍 [RIO] Ativando bairros para calcular bounds...');
      toggleLayer('bairros');
      // Aguarda um pouco e tenta novamente
      setTimeout(() => {
        if (rioBoundsRef.current) {
          mapInstanceRef.current.fitBounds(rioBoundsRef.current, {
            padding: [50, 50],
            maxZoom: 11
          });
        }
      }, 1000);
    }
  };

  const toggleLayer = (layerName) => {
    console.log('🔄 [LAYER] Toggle:', layerName);
    const newLayers = { ...layers, [layerName]: !layers[layerName] };
    setLayers(newLayers);
    
    if (mapInstanceRef.current) {
      const L = window.L;
      
      if (newLayers[layerName]) {
        console.log('➕ [LAYER] Ativando:', layerName);
        if (layerName === 'sirenes') {
          fetch('/api/sirenes')
            .then(r => r.json())
            .then(data => addSirenesLayer(mapInstanceRef.current, L, data));
        }
        else if (layerName === 'pluviometros') {
          fetch('/api/pluviometria')
            .then(r => r.json())
            .then(data => addPluviometrosLayer(mapInstanceRef.current, L, data));
        }
        else if (layerName === 'transito') {
          fetch('/api/waze/filtrado')
            .then(r => r.json())
            .then(data => addTransitoLayer(mapInstanceRef.current, L, data));
        }
        else if (layerName === 'bairros') {
          fetch('/api/bairros')
            .then(r => r.text())
            .then(text => {
              const cleanText = text.startsWith('"') ? JSON.parse(text) : text;
              return JSON.parse(cleanText);
            })
            .then(data => addBairrosLayer(mapInstanceRef.current, L, data))
            .catch(err => console.error('❌ [BAIRROS] Erro:', err));
        }
        else if (layerName === 'logradouros') {
          fetch('/api/logradouros')
            .then(r => r.text())
            .then(text => {
              const cleanText = text.startsWith('"') ? JSON.parse(text) : text;
              return JSON.parse(cleanText);
            })
            .then(data => addLogradourosLayer(mapInstanceRef.current, L, data))
            .catch(err => console.error('❌ [LOGRADOUROS] Erro:', err));
        }
        else if (layerName === 'ocorrencias') {
          fetch('/api/ocorrencias')
            .then(r => r.json())
            .then(data => addOcorrenciasLayer(mapInstanceRef.current, L, data))
            .catch(err => console.error('❌ [OCORRÊNCIAS] Erro:', err));
        }
      } else {
        console.log('➖ [LAYER] Desativando:', layerName);
        if (layerGroupsRef.current[layerName]) {
          layerGroupsRef.current[layerName].clearLayers();
        }
      }
    }
  };

  const toggleFiltroWaze = (filtro) => {
    console.log('🔄 [FILTRO] Toggle Waze:', filtro);
    setFiltrosWaze(prev => ({
      ...prev,
      [filtro]: !prev[filtro]
    }));
  };

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(6, 182, 212, 0.3)',
            borderTop: '4px solid #06b6d4',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <div>Carregando mapa...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      overflow: 'hidden',
      backgroundColor: '#0f172a',
      position: 'relative'
    }}>
      {/* PAINEL LATERAL */}
      <div style={{
        width: painelAberto ? `${SIDEBAR_WIDTH}px` : '0px',
        height: '100%',
        backgroundColor: '#1e293b',
        borderRight: painelAberto ? '1px solid rgba(6, 182, 212, 0.3)' : 'none',
        transition: 'width 0.3s ease',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1000,
        flexShrink: 0
      }}>
        <div style={{ 
          width: `${SIDEBAR_WIDTH}px`,
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingBottom: '300px'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid rgba(6, 182, 212, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#1e293b'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Layers size={24} style={{ color: '#06b6d4' }} />
              <h2 style={{ 
                margin: 0, 
                fontSize: '18px', 
                fontWeight: 600,
                color: 'white'
              }}>
                Controles do Mapa
              </h2>
            </div>
            <button
              onClick={() => setPainelAberto(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ padding: '20px' }}>
            <div style={{
              backgroundColor: 'rgba(30, 41, 59, 0.5)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h3 style={{ 
                color: 'white', 
                fontWeight: 600, 
                fontSize: '14px', 
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Layers size={16} style={{ color: '#06b6d4' }} />
                Camadas
              </h3>
              
              <button
                onClick={() => toggleLayer('sirenes')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: layers.sirenes ? '1px solid #ef4444' : '1px solid rgba(71, 85, 105, 0.5)',
                  backgroundColor: layers.sirenes ? 'rgba(239, 68, 68, 0.2)' : 'rgba(51, 65, 85, 0.3)',
                  color: layers.sirenes ? '#fca5a5' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: layers.sirenes ? '0 4px 20px rgba(239, 68, 68, 0.2)' : 'none',
                  marginBottom: '8px'
                }}
              >
                <Radio size={16} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 500, fontSize: '14px' }}>Sirenes</div>
                  <div style={{ fontSize: '12px', opacity: 0.75 }}>{stats.sirenes} disponíveis</div>
                </div>
              </button>

              <button
                onClick={() => toggleLayer('pluviometros')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: layers.pluviometros ? '1px solid #3b82f6' : '1px solid rgba(71, 85, 105, 0.5)',
                  backgroundColor: layers.pluviometros ? 'rgba(59, 130, 246, 0.2)' : 'rgba(51, 65, 85, 0.3)',
                  color: layers.pluviometros ? '#93c5fd' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: layers.pluviometros ? '0 4px 20px rgba(59, 130, 246, 0.2)' : 'none',
                  marginBottom: '8px'
                }}
              >
                <Droplets size={16} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 500, fontSize: '14px' }}>Pluviômetros</div>
                  <div style={{ fontSize: '12px', opacity: 0.75 }}>{stats.pluviometros} disponíveis</div>
                </div>
              </button>

              <button
                onClick={() => toggleLayer('transito')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: layers.transito ? '1px solid #eab308' : '1px solid rgba(71, 85, 105, 0.5)',
                  backgroundColor: layers.transito ? 'rgba(234, 179, 8, 0.2)' : 'rgba(51, 65, 85, 0.3)',
                  color: layers.transito ? '#fde047' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: layers.transito ? '0 4px 20px rgba(234, 179, 8, 0.2)' : 'none',
                  marginBottom: '8px'
                }}
              >
                <Car size={16} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 500, fontSize: '14px' }}>Trânsito Waze</div>
                  <div style={{ fontSize: '12px', opacity: 0.75 }}>{stats.transito} alertas</div>
                </div>
              </button>

              <button
                onClick={() => toggleLayer('bairros')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: layers.bairros ? '1px solid #8b5cf6' : '1px solid rgba(71, 85, 105, 0.5)',
                  backgroundColor: layers.bairros ? 'rgba(139, 92, 246, 0.2)' : 'rgba(51, 65, 85, 0.3)',
                  color: layers.bairros ? '#c4b5fd' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: layers.bairros ? '0 4px 20px rgba(139, 92, 246, 0.2)' : 'none',
                  marginBottom: '8px'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 500, fontSize: '14px' }}>Limites dos Bairros</div>
                  <div style={{ fontSize: '12px', opacity: 0.75 }}>Rio de Janeiro</div>
                </div>
              </button>

              <button
                onClick={() => toggleLayer('logradouros')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: layers.logradouros ? '1px solid #64748b' : '1px solid rgba(71, 85, 105, 0.5)',
                  backgroundColor: layers.logradouros ? 'rgba(100, 116, 139, 0.2)' : 'rgba(51, 65, 85, 0.3)',
                  color: layers.logradouros ? '#94a3b8' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: layers.logradouros ? '0 4px 20px rgba(100, 116, 139, 0.2)' : 'none',
                  marginBottom: '8px'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18"/>
                  <path d="M18 17V9"/>
                  <path d="M13 17V5"/>
                  <path d="M8 17v-3"/>
                </svg>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 500, fontSize: '14px' }}>Logradouros</div>
                  <div style={{ fontSize: '12px', opacity: 0.75 }}>Ruas da cidade</div>
                </div>
              </button>

              <button
                onClick={() => toggleLayer('ocorrencias')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: layers.ocorrencias ? '1px solid #ef4444' : '1px solid rgba(71, 85, 105, 0.5)',
                  backgroundColor: layers.ocorrencias ? 'rgba(239, 68, 68, 0.2)' : 'rgba(51, 65, 85, 0.3)',
                  color: layers.ocorrencias ? '#fca5a5' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: layers.ocorrencias ? '0 4px 20px rgba(239, 68, 68, 0.2)' : 'none',
                  marginBottom: '8px'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <circle cx="12" cy="17" r="0.5" fill="currentColor"/>
                </svg>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 500, fontSize: '14px' }}>Ocorrências Hexagon</div>
                  <div style={{ fontSize: '12px', opacity: 0.75 }}>{stats.ocorrencias} abertas</div>
                </div>
              </button>

              <button
                onClick={() => toggleLayer('radar')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: layers.radar ? '1px solid #06b6d4' : '1px solid rgba(71, 85, 105, 0.5)',
                  backgroundColor: layers.radar ? 'rgba(6, 182, 212, 0.2)' : 'rgba(51, 65, 85, 0.3)',
                  color: layers.radar ? '#06b6d4' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: layers.radar ? '0 4px 20px rgba(6, 182, 212, 0.2)' : 'none'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="6"/>
                  <circle cx="12" cy="12" r="2"/>
                  <line x1="12" y1="2" x2="12" y2="12"/>
                </svg>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: 500, fontSize: '14px' }}>Radar Meteorológico</div>
                  <div style={{ fontSize: '12px', opacity: 0.75 }}>Alerta Rio</div>
                </div>
              </button>
            </div>

            {layers.sirenes && (
              <div style={{
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <h3 style={{ color: 'white', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>
                  🚨 Filtros de Sirenes
                </h3>
                <label htmlFor="filtro-sirenes" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#cbd5e1',
                  cursor: 'pointer'
                }}>
                  <input
                    id="filtro-sirenes"
                    type="checkbox"
                    checked={mostrarApenasSirenesAtivas}
                    onChange={(e) => {
                      setMostrarApenasSirenesAtivas(e.target.checked);
                      if (mapInstanceRef.current) {
                        fetch('/api/sirenes')
                          .then(r => r.json())
                          .then(data => addSirenesLayer(mapInstanceRef.current, window.L, data));
                      }
                    }}
                    style={{ width: '16px', height: '16px' }}
                  />
                  Mostrar apenas tocando
                </label>
              </div>
            )}

            {layers.pluviometros && (
              <div style={{
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <h3 style={{ color: 'white', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>
                  💧 Filtros de Chuva
                </h3>
                <label htmlFor="filtro-chuva" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  color: '#cbd5e1',
                  cursor: 'pointer'
                }}>
                  <input
                    id="filtro-chuva"
                    type="checkbox"
                    checked={mostrarApenasChuva}
                    onChange={(e) => {
                      setMostrarApenasChuva(e.target.checked);
                      if (mapInstanceRef.current) {
                        fetch('/api/pluviometria')
                          .then(r => r.json())
                          .then(data => addPluviometrosLayer(mapInstanceRef.current, window.L, data));
                      }
                    }}
                    style={{ width: '16px', height: '16px' }}
                  />
                  Mostrar apenas com chuva
                </label>
              </div>
            )}
          
            {layers.transito && (
              <div style={{
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px'
  }}>
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      marginBottom: '12px' 
    }}>
      <h3 style={{ 
        color: 'white', 
        fontWeight: 600, 
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <AlertCircle size={16} style={{ color: '#06b6d4' }} />
        Filtros Waze
      </h3>
      <button
        onClick={() => {
          const todosAtivos = Object.values(filtrosWaze).every(v => v);
          setFiltrosWaze({
            acidentes: !todosAtivos,
            transito_parado: !todosAtivos,
            transito_lento: !todosAtivos,
            via_fechada: !todosAtivos,
            carros_parados: !todosAtivos,
            obras: !todosAtivos,
            buracos: !todosAtivos,
            semaforo: !todosAtivos,
            eventos: !todosAtivos
          });
        }}
        style={{
          padding: '4px 8px',
          backgroundColor: 'rgba(51, 65, 85, 0.5)',
          border: 'none',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#cbd5e1',
          cursor: 'pointer'
        }}
      >
        {Object.values(filtrosWaze).every(v => v) ? 'Desmarcar' : 'Marcar'} Todos
      </button>
    </div>
    
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(2, 1fr)', 
      gap: '8px' 
    }}>
      <button
        onClick={() => toggleFiltroWaze('acidentes')}
        style={{
          padding: '10px',
          borderRadius: '8px',
          border: filtrosWaze.acidentes ? '2px solid #ef4444' : '1px solid rgba(71, 85, 105, 0.5)',
          backgroundColor: filtrosWaze.acidentes ? 'rgba(239, 68, 68, 0.15)' : 'rgba(51, 65, 85, 0.3)',
          color: filtrosWaze.acidentes ? '#ef4444' : '#64748b',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>💥</span> Acidentes
      </button>

      <button
        onClick={() => toggleFiltroWaze('transito_parado')}
        style={{
          padding: '10px',
          borderRadius: '8px',
          border: filtrosWaze.transito_parado ? '2px solid #dc2626' : '1px solid rgba(71, 85, 105, 0.5)',
          backgroundColor: filtrosWaze.transito_parado ? 'rgba(220, 38, 38, 0.15)' : 'rgba(51, 65, 85, 0.3)',
          color: filtrosWaze.transito_parado ? '#dc2626' : '#64748b',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>🚗</span> Parado
      </button>

      <button
        onClick={() => toggleFiltroWaze('transito_lento')}
        style={{
          padding: '10px',
          borderRadius: '8px',
          border: filtrosWaze.transito_lento ? '2px solid #f97316' : '1px solid rgba(71, 85, 105, 0.5)',
          backgroundColor: filtrosWaze.transito_lento ? 'rgba(249, 115, 22, 0.15)' : 'rgba(51, 65, 85, 0.3)',
          color: filtrosWaze.transito_lento ? '#f97316' : '#64748b',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>🐌</span> Lento
      </button>

      <button
        onClick={() => toggleFiltroWaze('via_fechada')}
        style={{
          padding: '10px',
          borderRadius: '8px',
          border: filtrosWaze.via_fechada ? '2px solid #dc2626' : '1px solid rgba(71, 85, 105, 0.5)',
          backgroundColor: filtrosWaze.via_fechada ? 'rgba(220, 38, 38, 0.15)' : 'rgba(51, 65, 85, 0.3)',
          color: filtrosWaze.via_fechada ? '#dc2626' : '#64748b',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>⛔</span> Via Fechada
      </button>

      <button
        onClick={() => toggleFiltroWaze('carros_parados')}
        style={{
          padding: '10px',
          borderRadius: '8px',
          border: filtrosWaze.carros_parados ? '2px solid #eab308' : '1px solid rgba(71, 85, 105, 0.5)',
          backgroundColor: filtrosWaze.carros_parados ? 'rgba(234, 179, 8, 0.15)' : 'rgba(51, 65, 85, 0.3)',
          color: filtrosWaze.carros_parados ? '#eab308' : '#64748b',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>🚙</span> Carro Parado
      </button>

      <button
        onClick={() => toggleFiltroWaze('obras')}
        style={{
          padding: '10px',
          borderRadius: '8px',
          border: filtrosWaze.obras ? '2px solid #f97316' : '1px solid rgba(71, 85, 105, 0.5)',
          backgroundColor: filtrosWaze.obras ? 'rgba(249, 115, 22, 0.15)' : 'rgba(51, 65, 85, 0.3)',
          color: filtrosWaze.obras ? '#f97316' : '#64748b',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>🚧</span> Obras
      </button>

      <button
        onClick={() => toggleFiltroWaze('buracos')}
        style={{
          padding: '10px',
          borderRadius: '8px',
          border: filtrosWaze.buracos ? '2px solid #eab308' : '1px solid rgba(71, 85, 105, 0.5)',
          backgroundColor: filtrosWaze.buracos ? 'rgba(234, 179, 8, 0.15)' : 'rgba(51, 65, 85, 0.3)',
          color: filtrosWaze.buracos ? '#eab308' : '#64748b',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>🕳️</span> Buracos
      </button>

      <button
        onClick={() => toggleFiltroWaze('semaforo')}
        style={{
          padding: '10px',
          borderRadius: '8px',
          border: filtrosWaze.semaforo ? '2px solid #ef4444' : '1px solid rgba(71, 85, 105, 0.5)',
          backgroundColor: filtrosWaze.semaforo ? 'rgba(239, 68, 68, 0.15)' : 'rgba(51, 65, 85, 0.3)',
          color: filtrosWaze.semaforo ? '#ef4444' : '#64748b',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>🚦</span> Semáforo
      </button>

      <button
        onClick={() => toggleFiltroWaze('eventos')}
        style={{
          padding: '10px',
          borderRadius: '8px',
          border: filtrosWaze.eventos ? '2px solid #3b82f6' : '1px solid rgba(71, 85, 105, 0.5)',
          backgroundColor: filtrosWaze.eventos ? 'rgba(59, 130, 246, 0.15)' : 'rgba(51, 65, 85, 0.3)',
          color: filtrosWaze.eventos ? '#3b82f6' : '#64748b',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <span>🚓</span> Eventos
      </button>
    </div>
  </div>
)}
          </div>
        </div>
      </div>

      {/* BOTÃO PARA ABRIR PAINEL */}
      {!painelAberto && (
        <button
          onClick={() => setPainelAberto(true)}
          style={{
            position: 'absolute',
            left: '10px',
            top: '10px',
            zIndex: 1001,
            backgroundColor: '#1e293b',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: '8px',
            padding: '10px',
            color: '#06b6d4',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}
        >
          <Menu size={20} />
        </button>
      )}


      {mostrarRelatorio && (
        <Relatorio onClose={() => setMostrarRelatorio(false)} />
      )}

      {/* CONTAINER DO MAPA */}
      <div style={{
        flex: 1,
        height: '100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0f172a',
        padding: `0 ${MARGIN_RIGHT}px ${MARGIN_BOTTOM}px 0`
      }}>
        <div 
          ref={mapRef}
          id="leaflet-map-container"
          style={{ 
            width: '100%', 
            height: '100%',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#1e293b',
            position: 'relative'
          }}
        />
      </div>

      {/* BOTÃO FLUTUANTE: CENTRALIZAR NO RIO */}
      <button
        onClick={centralizarNoRio}
        style={{
          position: 'absolute',
          top: '80px',
          right: '10px',
          zIndex: 1000,
          backgroundColor: 'rgba(139, 92, 246, 0.95)',
          border: '2px solid white',
          borderRadius: '8px',
          padding: '10px 16px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'white',
          fontWeight: 600,
          fontSize: '13px',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(139, 92, 246, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        }}
        title="Centralizar no Município do Rio de Janeiro"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3" fill="white"/>
          <line x1="12" y1="2" x2="12" y2="6"/>
          <line x1="12" y1="18" x2="12" y2="22"/>
          <line x1="2" y1="12" x2="6" y2="12"/>
          <line x1="18" y1="12" x2="22" y2="12"/>
        </svg>
        📍 Centralizar Rio
      </button>

      {/* OVERLAY DO RADAR METEOROLÓGICO */}
      {layers.radar && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: painelAberto ? `${SIDEBAR_WIDTH}px` : '0px',
          right: 0,
          bottom: 0,
          pointerEvents: 'auto',
          zIndex: 999,
          transition: 'left 0.3s ease'
        }}>
          {/* Barra de controle */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '60px',
            zIndex: 1000,
            backgroundColor: 'rgba(30, 41, 59, 0.95)',
            padding: '8px 12px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}>
            <span style={{ 
              fontSize: '12px', 
              color: '#06b6d4', 
              fontWeight: 600 
            }}>
              🌩️ Radar Alerta Rio
            </span>
            <button
              onClick={() => toggleLayer('radar')}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '18px'
              }}
              title="Fechar Radar"
            >
              ✕
            </button>
          </div>

          {/* Iframe do Radar */}
          <iframe 
            src="http://www.sistema-alerta-rio.com.br/upload/Mapa/mapaRadar.html" 
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '8px'
            }}
            title="Radar Meteorológico Alerta Rio"
          />
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Map;