import React, { useEffect, useRef, useState } from 'react';
import { Radio, Droplets, Car, AlertCircle, Layers, X } from 'lucide-react';

const Map = () => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [layers, setLayers] = useState({
    sirenes: false,
    pluviometros: false,
    transito: true,
    logradouros: false
  });
  const [stats, setStats] = useState({
    sirenes: 0,
    pluviometros: 0,
    transito: 0
  });
  
  const layerGroupsRef = useRef({
    sirenes: null,
    pluviometros: null,
    transito: null
  });

  const [filtrosWaze, setFiltrosWaze] = useState({
    buracos: false,
    obras: false,
    transito_parado: false,
    transito_lento: true,
    carros_parados: true,
    semaforo: false,
    eventos: false,
    acidentes: true,
    via_fechada: false
  });

  const [mostrarApenasSirenesAtivas, setMostrarApenasSirenesAtivas] = useState(true);
  const [mostrarApenasChuva, setMostrarApenasChuva] = useState(true);

  useEffect(() => {
    const loadLeaflet = async () => {
      console.log('🔧 loadLeaflet iniciado');
      
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      console.log('✅ CSS do Leaflet adicionado');

      if (!window.L) {
        console.log('📦 Carregando script Leaflet...');
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
        console.log('✅ Script Leaflet carregado!');
      }

      console.log('📍 Pronto para inicializar mapa');
      initializeMap();
    };

    const timer = setTimeout(() => {
      loadLeaflet();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const initializeMap = async (attempt = 1) => {
    console.log(`🗺️ initializeMap chamado (tentativa ${attempt})`);
    console.log('mapRef.current:', mapRef.current);
    console.log('mapInstanceRef.current:', mapInstanceRef.current);
    
    if (!mapRef.current) {
      if (attempt < 20) {
        console.log(`⏳ mapRef ainda null, tentando novamente em 50ms...`);
        setTimeout(() => initializeMap(attempt + 1), 50);
        return;
      } else {
        console.error('❌ mapRef.current é null após 20 tentativas!');
        setLoading(false);
        return;
      }
    }
    
    if (mapInstanceRef.current) {
      console.log('⚠️ Mapa já existe, ignorando...');
      return;
    }

    const L = window.L;
    console.log('✅ window.L existe:', !!L);

    try {
      console.log('🌍 Criando mapa...');
      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true
      }).setView([-22.9068, -43.1729], 11);

      console.log('✅ Mapa criado!');

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      console.log('✅ TileLayer adicionado!');

      mapInstanceRef.current = map;

      console.log('📡 Carregando dados das APIs...');
      await loadAllLayers(map, L);
      
      setLoading(false);
      console.log('🎉 Mapa pronto!');
    } catch (error) {
      console.error('❌ Erro ao criar mapa:', error);
      setLoading(false);
    }
  };

  const loadAllLayers = async (map, L) => {
    try {
      console.log('🚨 Buscando sirenes...');
      const sirenes = await fetch('/api/sirenes').then(r => r.json());
      console.log(`✅ ${sirenes.length} sirenes carregadas`);
      if (layers.sirenes) addSirenesLayer(map, L, sirenes);
      setStats(prev => ({ ...prev, sirenes: sirenes.length }));

      console.log('💧 Buscando pluviômetros...');
      const pluvio = await fetch('/api/pluviometria').then(r => r.json());
      console.log(`✅ ${pluvio.features?.length || 0} pluviômetros carregados`);
      if (layers.pluviometros) addPluviometrosLayer(map, L, pluvio);
      setStats(prev => ({ ...prev, pluviometros: pluvio.features?.length || 0 }));

      console.log('🚗 Buscando dados Waze...');
      const waze = await fetch('/api/waze/filtrado').then(r => r.json());
      console.log(`✅ ${waze.alerts?.length || 0} alertas carregados`);
      if (layers.transito) addTransitoLayer(map, L, waze);
      setStats(prev => ({ ...prev, transito: waze.alerts?.length || 0 }));

    } catch (error) {
      console.error('❌ Erro ao carregar camadas:', error);
    }
  };

  const addSirenesLayer = (map, L, sirenes) => {
    if (layerGroupsRef.current.sirenes) {
      layerGroupsRef.current.sirenes.clearLayers();
    }
    
    const layerGroup = L.layerGroup().addTo(map);
    layerGroupsRef.current.sirenes = layerGroup;
    
    sirenes.forEach(sirene => {
      if (mostrarApenasSirenesAtivas && !sirene.tocando) return;
      
      const color = sirene.tocando ? '#ef4444' : sirene.online ? '#22c55e' : '#6b7280';
      const animacao = sirene.tocando ? 'animation: pulse 1s infinite;' : '';
      
      const icon = L.divIcon({
        html: `
          <style>
            @keyframes pulse {
              0%, 100% { 
                opacity: 1; 
                transform: scale(1);
                box-shadow: 0 0 20px ${color}, 0 0 40px ${color};
              }
              50% { 
                opacity: 0.7; 
                transform: scale(1.2);
                box-shadow: 0 0 30px ${color}, 0 0 60px ${color};
              }
            }
          </style>
          <div style="
            position: relative;
            width: 28px;
            height: 28px;
            ${animacao}
          ">
            <div style="
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              font-size: 24px;
              filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
            ">🚨</div>
            <div style="
              position: absolute;
              bottom: -2px;
              left: 50%;
              transform: translateX(-50%);
              width: 12px;
              height: 4px;
              background: ${color};
              border-radius: 2px;
              box-shadow: 0 0 8px ${color};
            "></div>
          </div>
        `,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([sirene.latitude, sirene.longitude], { icon });
      
      const statusText = sirene.tocando 
        ? '⚠️ TOCANDO AGORA!' 
        : sirene.online 
        ? '✅ Online' 
        : '❌ Offline';
      
      const statusColor = sirene.tocando 
        ? '#ef4444' 
        : sirene.online 
        ? '#22c55e' 
        : '#6b7280';
      
      const popup = `
        <div style="font-family: system-ui; min-width: 220px;">
          <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: bold; color: #1e293b;">
            🚨 ${sirene.nome}
          </h3>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
            📍 ${sirene.bairro}
          </div>
          <div style="
            font-size: 13px; 
            padding: 6px 12px; 
            background: ${statusColor}; 
            color: white; 
            border-radius: 6px; 
            display: inline-block;
            font-weight: bold;
            ${sirene.tocando ? 'animation: pulse 1s infinite;' : ''}
          ">
            ${statusText}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
            ${sirene.localizacao}
          </div>
        </div>
      `;
      
      marker.bindPopup(popup);
      marker.addTo(layerGroup);
    });
  };

  const addPluviometrosLayer = (map, L, data) => {
    if (!data.features) return;

    if (layerGroupsRef.current.pluviometros) {
      layerGroupsRef.current.pluviometros.clearLayers();
    }
    
    const layerGroup = L.layerGroup().addTo(map);
    layerGroupsRef.current.pluviometros = layerGroup;

    data.features.forEach(feature => {
      const coords = feature.geometry.coordinates;
      const props = feature.properties;
      const m15 = parseFloat(props.data?.m15?.replace(',', '.')) || 0;
      
      if (mostrarApenasChuva && m15 <= 0) return;
      
      const color = m15 > 10 ? '#dc2626' : m15 > 5 ? '#f59e0b' : m15 > 0 ? '#3b82f6' : '#94a3b8';
      
      const icon = L.divIcon({
        html: `<div style="background-color: ${color}; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
        className: '',
        iconSize: [10, 10]
      });

      const marker = L.marker([coords[1], coords[0]], { icon });
      
      const popup = `
        <div style="font-family: system-ui; min-width: 180px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #1e293b;">
            💧 ${props.station?.name || 'Estação'}
          </h3>
          <div style="font-size: 12px; margin: 4px 0;">
            <strong>Últimos 15 min:</strong> ${m15.toFixed(1)} mm
          </div>
          <div style="font-size: 12px; margin: 4px 0;">
            <strong>Últimas 24h:</strong> ${parseFloat(props.data?.h24?.replace(',', '.') || 0).toFixed(1)} mm
          </div>
        </div>
      `;
      
      marker.bindPopup(popup);
      marker.addTo(layerGroup);
    });
  };

  const addTransitoLayer = (map, L, data) => {
    if (!data.alerts) return;

    if (layerGroupsRef.current.transito) {
      layerGroupsRef.current.transito.clearLayers();
    }
    
    const layerGroup = L.layerGroup().addTo(map);
    layerGroupsRef.current.transito = layerGroup;

    const deveMostrarAlerta = (alert) => {
      switch(alert.subtype) {
        case 'HAZARD_ON_ROAD_POT_HOLE':
          return filtrosWaze.buracos;
        case 'HAZARD_ON_ROAD_CONSTRUCTION':
          return filtrosWaze.obras;
        case 'JAM_STAND_STILL_TRAFFIC':
          return filtrosWaze.transito_parado;
        case 'JAM_HEAVY_TRAFFIC':
          return filtrosWaze.transito_lento;
        case 'HAZARD_ON_SHOULDER_CAR_STOPPED':
        case 'HAZARD_ON_ROAD_CAR_STOPPED':
          return filtrosWaze.carros_parados;
        case 'HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT':
          return filtrosWaze.semaforo;
        case 'ROAD_CLOSED_EVENT':
          return filtrosWaze.eventos;
        default:
          if (alert.type === 'ACCIDENT') return filtrosWaze.acidentes;
          if (alert.type === 'ROAD_CLOSED') return filtrosWaze.via_fechada;
          return true;
      }
    };

    data.alerts.forEach(alert => {
      if (!alert.location) return;
      
      if (!deveMostrarAlerta(alert)) return;
      
      const coords = alert.location;
      let iconHtml = '';
      let cor = '';
      let titulo = '';
      
      switch(alert.subtype) {
        case 'HAZARD_ON_ROAD_POT_HOLE':
        case 'HAZARD_ON_ROAD':
        case 'HAZARD_ON_ROAD_OBJECT':
          cor = '#FDB913';
          titulo = 'Perigo';
          iconHtml = `
            <div style="width: 40px; height: 40px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(0,0,0,0.3);">
              <div style="width: 34px; height: 34px; border-radius: 50%; background: ${cor}; display: flex; align-items: center; justify-content: center;">
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <path d="M12 2L2 20h20L12 2z" fill="#1a1a1a" stroke="#1a1a1a" stroke-width="1.5"/>
                  <text x="12" y="17" text-anchor="middle" font-size="14" font-weight="bold" fill="${cor}">!</text>
                </svg>
              </div>
            </div>
          `;
          break;
          
        case 'HAZARD_ON_ROAD_CONSTRUCTION':
        case 'ROAD_CLOSED':
          cor = '#FF9F1C';
          titulo = 'Obras';
          iconHtml = `
            <div style="width: 40px; height: 40px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(0,0,0,0.3);">
              <div style="width: 34px; height: 34px; border-radius: 50%; background: ${cor}; display: flex; align-items: center; justify-content: center; padding-top: 2px;">
                <svg width="18" height="20" viewBox="0 0 24 24">
                  <path d="M12 3L6 21h12L12 3z" fill="white" stroke="white" stroke-width="0.5"/>
                  <rect x="5.5" y="20" width="13" height="2" rx="1" fill="white"/>
                  <line x1="8" y1="15" x2="16" y2="15" stroke="${cor}" stroke-width="2"/>
                  <line x1="9" y1="10" x2="15" y2="10" stroke="${cor}" stroke-width="2"/>
                </svg>
              </div>
            </div>
          `;
          break;
          
        case 'JAM_STAND_STILL_TRAFFIC':
        case 'JAM_HEAVY_TRAFFIC':
        case 'HAZARD_ON_SHOULDER_CAR_STOPPED':
        case 'HAZARD_ON_ROAD_CAR_STOPPED':
          cor = '#FF4444';
          titulo = alert.subtype?.includes('JAM') ? 'Congestionamento' : 'Carro Parado';
          iconHtml = `
            <div style="width: 40px; height: 40px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(0,0,0,0.3);">
              <div style="width: 34px; height: 34px; border-radius: 50%; background: ${cor}; display: flex; align-items: center; justify-content: center; position: relative;">
                <svg width="22" height="22" viewBox="0 0 24 24">
                  <g transform="translate(0, -2)">
                    <rect x="6" y="8" width="12" height="7" rx="2" fill="white"/>
                    <rect x="7" y="9" width="3" height="2" fill="${cor}"/>
                    <rect x="14" y="9" width="3" height="2" fill="${cor}"/>
                    <circle cx="8.5" cy="16" r="1.5" fill="#333"/>
                    <circle cx="15.5" cy="16" r="1.5" fill="#333"/>
                  </g>
                  <g transform="translate(0, 4)">
                    <rect x="6" y="8" width="12" height="7" rx="2" fill="white"/>
                    <rect x="7" y="9" width="3" height="2" fill="${cor}"/>
                    <rect x="14" y="9" width="3" height="2" fill="${cor}"/>
                    <circle cx="8.5" cy="16" r="1.5" fill="#333"/>
                    <circle cx="15.5" cy="16" r="1.5" fill="#333"/>
                  </g>
                </svg>
              </div>
            </div>
          `;
          break;
          
        case 'ROAD_CLOSED_EVENT':
          cor = '#A855F7';
          titulo = 'Evento';
          iconHtml = `
            <div style="width: 40px; height: 40px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(0,0,0,0.3);">
              <div style="width: 34px; height: 34px; border-radius: 50%; background: ${cor}; display: flex; align-items: center; justify-content: center;">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="white"/>
                </svg>
              </div>
            </div>
          `;
          break;
          
        case 'HAZARD_ON_ROAD_TRAFFIC_LIGHT_FAULT':
          cor = '#FF4444';
          titulo = 'Semáforo';
          iconHtml = `
            <div style="width: 40px; height: 40px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(0,0,0,0.3);">
              <div style="width: 34px; height: 34px; border-radius: 50%; background: ${cor}; display: flex; align-items: center; justify-content: center;">
                <svg width="16" height="20" viewBox="0 0 16 20">
                  <rect x="2" y="0" width="12" height="20" rx="2" fill="white"/>
                  <rect x="3" y="1" width="10" height="6" rx="1" fill="${cor}"/>
                  <rect x="3" y="7" width="10" height="6" rx="1" fill="white"/>
                  <rect x="3" y="13" width="10" height="6" rx="1" fill="white"/>
                </svg>
              </div>
            </div>
          `;
          break;
          
        default:
          switch(alert.type) {
            case 'ACCIDENT':
              cor = '#CBD5E1';
              titulo = 'Acidente';
              iconHtml = `
                <div style="width: 40px; height: 40px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(0,0,0,0.3);">
                  <div style="width: 34px; height: 34px; border-radius: 50%; background: ${cor}; display: flex; align-items: center; justify-content: center;">
                    <svg width="24" height="24" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="8" fill="#FF9F1C" opacity="0.3"/>
                      <path d="M8 8 L16 16 M16 8 L8 16" stroke="#FF4444" stroke-width="3" stroke-linecap="round"/>
                    </svg>
                  </div>
                </div>
              `;
              break;
            case 'JAM':
              cor = '#FF4444';
              titulo = 'Congestionamento';
              iconHtml = `
                <div style="width: 40px; height: 40px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(0,0,0,0.3);">
                  <div style="width: 34px; height: 34px; border-radius: 50%; background: ${cor}; display: flex; align-items: center; justify-content: center;">
                    <svg width="22" height="22" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="7" rx="2" fill="white"/>
                      <circle cx="8.5" cy="14" r="1.5" fill="#333"/>
                      <circle cx="15.5" cy="14" r="1.5" fill="#333"/>
                    </svg>
                  </div>
                </div>
              `;
              break;
            case 'HAZARD':
              cor = '#FDB913';
              titulo = 'Perigo';
              iconHtml = `
                <div style="width: 40px; height: 40px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(0,0,0,0.3);">
                  <div style="width: 34px; height: 34px; border-radius: 50%; background: ${cor}; display: flex; align-items: center; justify-content: center;">
                    <svg width="22" height="22" viewBox="0 0 24 24">
                      <path d="M12 2L2 20h20L12 2z" fill="#1a1a1a" stroke="#1a1a1a" stroke-width="1.5"/>
                      <text x="12" y="17" text-anchor="middle" font-size="14" font-weight="bold" fill="${cor}">!</text>
                    </svg>
                  </div>
                </div>
              `;
              break;
            default:
              cor = '#94A3B8';
              titulo = 'Alerta';
              iconHtml = `
                <div style="width: 40px; height: 40px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(0,0,0,0.3);">
                  <div style="width: 34px; height: 34px; border-radius: 50%; background: ${cor}; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: bold;">!</div>
                </div>
              `;
          }
      }
      
      const icon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const marker = L.marker([coords.y, coords.x], { icon });
      
      const popup = `
        <div style="font-family: system-ui; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: bold; color: #1e293b;">
            ${titulo}
          </h3>
          <div style="font-size: 13px; color: #475569; margin-bottom: 6px;">
            📍 ${alert.street || 'Via não identificada'}
          </div>
          <div style="font-size: 12px; color: #64748b;">
            ${alert.city || 'Rio de Janeiro'}
          </div>
        </div>
      `;
      
      marker.bindPopup(popup);
      marker.addTo(layerGroup);
    });
  };

  const toggleLayer = (layerName) => {
    setLayers(prev => {
      const newState = { ...prev, [layerName]: !prev[layerName] };
      
      if (layerGroupsRef.current[layerName]) {
        const map = mapInstanceRef.current;
        if (newState[layerName]) {
          if (layerName === 'sirenes') {
            fetch('/api/sirenes')
              .then(r => r.json())
              .then(data => addSirenesLayer(map, window.L, data));
          } else if (layerName === 'pluviometros') {
            fetch('/api/pluviometria')
              .then(r => r.json())
              .then(data => addPluviometrosLayer(map, window.L, data));
          } else {
            layerGroupsRef.current[layerName].addTo(map);
          }
        } else {
          map.removeLayer(layerGroupsRef.current[layerName]);
        }
      }
      
      return newState;
    });
  };

  const toggleFiltroWaze = (filtro) => {
    setFiltrosWaze(prev => {
      const newState = { ...prev, [filtro]: !prev[filtro] };
      
      if (mapInstanceRef.current && layers.transito) {
        fetch('/api/waze/filtrado')
          .then(r => r.json())
          .then(data => {
            addTransitoLayer(mapInstanceRef.current, window.L, data);
          });
      }
      
      return newState;
    });
  };

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm rounded-2xl">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-300">Carregando mapa...</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-slate-800/50 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-5 h-5 text-green-400" />
            <span className="text-slate-300 font-semibold">Sirenes</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.sirenes}</div>
        </div>

        <div className="bg-slate-800/50 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Droplets className="w-5 h-5 text-blue-400" />
            <span className="text-slate-300 font-semibold">Pluviômetros</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.pluviometros}</div>
        </div>

        <div className="bg-slate-800/50 border border-orange-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-5 h-5 text-orange-400" />
            <span className="text-slate-300 font-semibold">Alertas</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.transito}</div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-5 h-5 text-purple-400" />
          <span className="text-white font-semibold">Controle de Camadas</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => toggleLayer('sirenes')}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              layers.sirenes
                ? 'bg-green-500/20 border-2 border-green-500 text-green-300'
                : 'bg-slate-700/50 border-2 border-slate-600 text-slate-400'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span className="text-sm font-medium">Sirenes</span>
          </button>

          <button
            onClick={() => toggleLayer('pluviometros')}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              layers.pluviometros
                ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-300'
                : 'bg-slate-700/50 border-2 border-slate-600 text-slate-400'
            }`}
          >
            <Droplets className="w-4 h-4" />
            <span className="text-sm font-medium">Pluviômetros</span>
          </button>

          <button
            onClick={() => toggleLayer('transito')}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
              layers.transito
                ? 'bg-orange-500/20 border-2 border-orange-500 text-orange-300'
                : 'bg-slate-700/50 border-2 border-slate-600 text-slate-400'
            }`}
          >
            <Car className="w-4 h-4" />
            <span className="text-sm font-medium">Alertas</span>
          </button>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-600">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                setMostrarApenasSirenesAtivas(!mostrarApenasSirenesAtivas);
                if (mapInstanceRef.current && layers.sirenes) {
                  fetch('/api/sirenes')
                    .then(r => r.json())
                    .then(data => addSirenesLayer(mapInstanceRef.current, window.L, data));
                }
              }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                mostrarApenasSirenesAtivas
                  ? 'bg-slate-700/50 border border-slate-600 text-slate-400'
                  : 'bg-green-500/20 border border-green-500 text-green-300'
              }`}
            >
              {mostrarApenasSirenesAtivas ? '🔴 Apenas Ativas' : '✅ Todas Sirenes'}
            </button>
            
            <button
              onClick={() => {
                setMostrarApenasChuva(!mostrarApenasChuva);
                if (mapInstanceRef.current && layers.pluviometros) {
                  fetch('/api/pluviometria')
                    .then(r => r.json())
                    .then(data => addPluviometrosLayer(mapInstanceRef.current, window.L, data));
                }
              }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                mostrarApenasChuva
                  ? 'bg-slate-700/50 border border-slate-600 text-slate-400'
                  : 'bg-blue-500/20 border border-blue-500 text-blue-300'
              }`}
            >
              {mostrarApenasChuva ? '💧 Apenas Chuva' : '✅ Todos Pluviômetros'}
            </button>
          </div>
        </div>
      </div>

      {layers.transito && (
        <div className="bg-slate-800/50 border border-orange-500/30 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Car className="w-5 h-5 text-orange-400" />
            <span className="text-white font-semibold">Filtros de Alertas Waze</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => toggleFiltroWaze('buracos')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                filtrosWaze.buracos
                  ? 'bg-yellow-500/20 border border-yellow-500 text-yellow-300'
                  : 'bg-slate-700/50 border border-slate-600 text-slate-400'
              }`}
            >
              🕳️ Buracos
            </button>
            <button
              onClick={() => toggleFiltroWaze('obras')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                filtrosWaze.obras
                  ? 'bg-orange-500/20 border border-orange-500 text-orange-300'
                  : 'bg-slate-700/50 border border-slate-600 text-slate-400'
              }`}
            >
              🚧 Obras
            </button>
            <button
              onClick={() => toggleFiltroWaze('transito_parado')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                filtrosWaze.transito_parado
                  ? 'bg-red-500/20 border border-red-500 text-red-300'
                  : 'bg-slate-700/50 border border-slate-600 text-slate-400'
              }`}
            >
              🚗 Parado
            </button>
            <button
              onClick={() => toggleFiltroWaze('transito_lento')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                filtrosWaze.transito_lento
                  ? 'bg-orange-500/20 border border-orange-500 text-orange-300'
                  : 'bg-slate-700/50 border border-slate-600 text-slate-400'
              }`}
            >
              🐌 Lento
            </button>
            <button
              onClick={() => toggleFiltroWaze('carros_parados')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                filtrosWaze.carros_parados
                  ? 'bg-blue-500/20 border border-blue-500 text-blue-300'
                  : 'bg-slate-700/50 border border-slate-600 text-slate-400'
              }`}
            >
              🚙 Carro Parado
            </button>
            <button
              onClick={() => toggleFiltroWaze('semaforo')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                filtrosWaze.semaforo
                  ? 'bg-red-500/20 border border-red-500 text-red-300'
                  : 'bg-slate-700/50 border border-slate-600 text-slate-400'
              }`}
            >
              🚦 Semáforo
            </button>
            <button
              onClick={() => toggleFiltroWaze('eventos')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                filtrosWaze.eventos
                  ? 'bg-purple-500/20 border border-purple-500 text-purple-300'
                  : 'bg-slate-700/50 border border-slate-600 text-slate-400'
              }`}
            >
              🎪 Eventos
            </button>
            <button
              onClick={() => toggleFiltroWaze('acidentes')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                filtrosWaze.acidentes
                  ? 'bg-gray-500/20 border border-gray-500 text-gray-300'
                  : 'bg-slate-700/50 border border-slate-600 text-slate-400'
              }`}
            >
              💥 Acidentes
            </button>
            <button
              onClick={() => toggleFiltroWaze('via_fechada')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                filtrosWaze.via_fechada
                  ? 'bg-orange-500/20 border border-orange-500 text-orange-300'
                  : 'bg-slate-700/50 border border-slate-600 text-slate-400'
              }`}
            >
              ⛔ Via Fechada
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 border border-cyan-500/30 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-5 h-5 text-cyan-400" />
          <span className="text-white font-semibold">Legenda</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-slate-300">Sirene Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-slate-300">Sirene Alerta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-slate-300">Chuva</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-slate-300">Congestionamento</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/30 border border-cyan-500/30 rounded-2xl overflow-hidden">
        <div 
          ref={mapRef} 
          style={{ height: '600px', width: '100%' }}
          className="z-0"
        ></div>
      </div>
    </div>
  );
};

export default Map;