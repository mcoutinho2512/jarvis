import { useEffect, useState } from 'react';

/**
 * Hook para adicionar limites administrativos ao mapa
 * IMPORTANTE: Só chame depois que o mapa estiver pronto!
 */
const useAdministrativeBoundaries = (map) => {
  const [bairrosLayer, setBairrosLayer] = useState(null);
  const [municipioLayer, setMunicipioLayer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showBairros, setShowBairros] = useState(false); // Começa desligado
  const [showMunicipio, setShowMunicipio] = useState(false); // Começa desligado

  // Carregar limites quando necessário
  useEffect(() => {
    if (!map || !window.L) return;

    const L = window.L;
    let mounted = true;

    const loadBoundaries = async () => {
      if (loading) return; // Evita carregar múltiplas vezes
      
      setLoading(true);
      console.log('🗺️ Carregando limites administrativos...');

      try {
        // Carregar bairros se ainda não foi carregado
        if (!bairrosLayer) {
          console.log('📍 Buscando bairros...');
          const bairrosResponse = await fetch('/api/bairros');
          const bairrosData = await bairrosResponse.json();

          if (bairrosData.features && bairrosData.features.length > 0 && mounted) {
            const layer = L.geoJSON(
              {
                type: 'FeatureCollection',
                features: bairrosData.features.map(f => ({
                  type: 'Feature',
                  geometry: f.geometry,
                  properties: f.attributes
                }))
              },
              {
                style: () => ({
                  color: '#8B5CF6',
                  weight: 2,
                  opacity: 0.7,
                  fillColor: '#8B5CF6',
                  fillOpacity: 0.1
                }),
                onEachFeature: (feature, layer) => {
                  if (feature.properties.nome) {
                    layer.bindPopup(`
                      <div style="font-family: system-ui; padding: 8px;">
                        <strong style="font-size: 14px; color: #1e293b;">
                          ${feature.properties.nome}
                        </strong>
                        <div style="margin-top: 4px; font-size: 12px; color: #64748b;">
                          ${feature.properties.regiao_adm || 'Região não informada'}
                        </div>
                      </div>
                    `);
                    
                    layer.on({
                      mouseover: (e) => {
                        e.target.setStyle({
                          weight: 3,
                          opacity: 1,
                          fillOpacity: 0.3
                        });
                      },
                      mouseout: (e) => {
                        e.target.setStyle({
                          weight: 2,
                          opacity: 0.7,
                          fillOpacity: 0.1
                        });
                      }
                    });
                  }
                }
              }
            );

            setBairrosLayer(layer);
            console.log(`✅ ${bairrosData.features.length} bairros carregados`);
          }
        }

        // Carregar limite municipal se ainda não foi carregado
        if (!municipioLayer) {
          console.log('🏙️ Buscando limite municipal...');
          const limiteResponse = await fetch('/api/limite-municipal');
          const limiteData = await limiteResponse.json();

          if (limiteData.features && limiteData.features.length > 0 && mounted) {
            const feature = limiteData.features[0];
            const layer = L.geoJSON(
              {
                type: 'Feature',
                geometry: feature.geometry,
                properties: feature.attributes
              },
              {
                style: {
                  color: '#00ffff',
                  weight: 4,
                  opacity: 0.9,
                  fillOpacity: 0,
                  dashArray: '10, 5'
                }
              }
            );

            setMunicipioLayer(layer);
            console.log('✅ Limite municipal carregado');
          }
        }

      } catch (error) {
        console.error('❌ Erro ao carregar limites:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadBoundaries();

    return () => {
      mounted = false;
    };
  }, [map]);

  // Adicionar/remover bairros do mapa
  useEffect(() => {
    if (!map || !bairrosLayer) return;

    if (showBairros) {
      if (!map.hasLayer(bairrosLayer)) {
        bairrosLayer.addTo(map);
        console.log('✅ Bairros exibidos no mapa');
      }
    } else {
      if (map.hasLayer(bairrosLayer)) {
        map.removeLayer(bairrosLayer);
        console.log('🔴 Bairros removidos do mapa');
      }
    }
  }, [map, bairrosLayer, showBairros]);

  // Adicionar/remover município do mapa
  useEffect(() => {
    if (!map || !municipioLayer) return;

    if (showMunicipio) {
      if (!map.hasLayer(municipioLayer)) {
        municipioLayer.addTo(map);
        console.log('✅ Limite municipal exibido no mapa');
      }
    } else {
      if (map.hasLayer(municipioLayer)) {
        map.removeLayer(municipioLayer);
        console.log('🔴 Limite municipal removido do mapa');
      }
    }
  }, [map, municipioLayer, showMunicipio]);

  return {
    bairrosLayer,
    municipioLayer,
    loading,
    showBairros,
    showMunicipio,
    toggleBairros: () => setShowBairros(!showBairros),
    toggleMunicipio: () => setShowMunicipio(!showMunicipio)
  };
};

export default useAdministrativeBoundaries;