<script>
  import { onDestroy, tick } from 'svelte';
  import { Loader } from '@googlemaps/js-api-loader';
  import { getApiUrl } from '../config.js';
  import { theme } from '../themeStore.js';

  export let lat = null;
  export let lng = null;
  export let dentroCobertura = null;
  /** Callback opcional com a lista de CTOs encontradas */
  export let onCtosLoaded = null;

  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const HOUSE_ICON =
    'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="#16a34a"/>
        <path fill="#fff" d="M12 5.5 4.5 12h2v6.5h4V14h3v4.5h4V12h2L12 5.5z"/>
      </svg>`
    );

  let mapEl;
  let map;
  let googleMapsLoaded = false;
  let loading = false;
  let error = '';
  let ctos = [];
  let markers = [];
  let polylines = [];
  let clientMarker = null;
  $: isDark = $theme === 'dark';
  let coverageCircle = null;
  let lastSearchKey = '';

  $: coordsReady = lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));
  $: ctosRua = ctos.filter((c) => !c.is_condominio);
  $: totalPortas = ctosRua.reduce(
    (sum, cto) => sum + Math.max(0, Number(cto.vagas_total || 0) - Number(cto.clientes_conectados || 0)),
    0
  );

  function clearOverlays() {
    markers.forEach((m) => m.setMap(null));
    markers = [];
    polylines.forEach((p) => p.setMap(null));
    polylines = [];
    if (clientMarker) {
      clientMarker.setMap(null);
      clientMarker = null;
    }
    if (coverageCircle) {
      coverageCircle.setMap(null);
      coverageCircle = null;
    }
  }

  async function loadGoogleMaps() {
    if (googleMapsLoaded && window.google?.maps) return;
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'SUA_CHAVE_AQUI') {
      throw new Error('VITE_GOOGLE_MAPS_API_KEY não configurada no frontend');
    }
    try {
      const loader = new Loader({
        apiKey: GOOGLE_MAPS_API_KEY,
        version: 'weekly',
        libraries: ['geometry']
      });
      await loader.load();
    } catch (err) {
      if (err?.message?.includes('Loader must not be called again') && window.google?.maps) {
        // ok — loader já iniciado por outra ferramenta
      } else {
        throw err;
      }
    }
    googleMapsLoaded = true;
  }

  function initMap() {
    if (!mapEl || !window.google?.maps) return;
    const center = { lat: Number(lat), lng: Number(lng) };
    if (!map) {
      map = new google.maps.Map(mapEl, {
        center,
        zoom: 17,
        mapTypeId: 'roadmap',
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        gestureHandling: 'greedy'
      });
    } else {
      map.setCenter(center);
      map.setZoom(17);
    }
  }

  function markerColorForCto(cto) {
    const livres = Number(cto.vagas_total || 0) - Number(cto.clientes_conectados || 0);
    if (cto.is_out_of_limit) return '#F44336';
    return livres > 0 ? '#F97316' : '#EF4444';
  }

  function drawClientAndCtos() {
    if (!map || !window.google?.maps) return;
    clearOverlays();

    const center = { lat: Number(lat), lng: Number(lng) };
    clientMarker = new google.maps.Marker({
      map,
      position: center,
      title: 'Localização do Cliente',
      zIndex: 999,
      icon: {
        url: HOUSE_ICON,
        scaledSize: new google.maps.Size(36, 36),
        anchor: new google.maps.Point(18, 18)
      }
    });

    coverageCircle = new google.maps.Circle({
      map,
      center,
      radius: 250,
      strokeColor: '#7B68EE',
      strokeOpacity: 0.7,
      strokeWeight: 2,
      fillColor: '#7B68EE',
      fillOpacity: 0.08,
      clickable: false
    });

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(center);

    ctosRua.forEach((cto, index) => {
      const pos = {
        lat: Number(cto.latitude),
        lng: Number(cto.longitude)
      };
      if (Number.isNaN(pos.lat) || Number.isNaN(pos.lng)) return;

      const color = markerColorForCto(cto);
      const n = index + 1;
      const marker = new google.maps.Marker({
        map,
        position: pos,
        title: cto.nome || `CTO ${n}`,
        label: {
          text: String(n),
          color: '#fff',
          fontWeight: '700',
          fontSize: '12px'
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2
        },
        zIndex: 100 + n
      });
      markers.push(marker);
      bounds.extend(pos);

      const line = new google.maps.Polyline({
        map,
        path: [center, pos],
        strokeColor: color,
        strokeOpacity: 0.9,
        strokeWeight: 3,
        geodesic: true
      });
      polylines.push(line);
    });

    if (ctosRua.length > 0) {
      map.fitBounds(bounds, 48);
    } else {
      map.setCenter(center);
      map.setZoom(17);
    }
  }

  async function fetchCtosInRadius(radius) {
    const response = await fetch(
      getApiUrl(`/api/ctos/nearby?lat=${Number(lat)}&lng=${Number(lng)}&radius=${radius}`)
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) {
      throw new Error(data.error || `Erro ao buscar CTOs (${response.status})`);
    }
    return (data.ctos || [])
      .filter((cto) => !cto.is_condominio)
      .map((cto) => ({
        ...cto,
        distancia_metros: Number(cto.distancia_metros || 0),
        distancia_km: Math.round((Number(cto.distancia_metros || 0) / 1000) * 1000) / 1000,
        distancia_real: Number(cto.distancia_metros || 0),
        is_out_of_limit: Number(cto.distancia_metros || 0) > 250
      }))
      .sort((a, b) => a.distancia_metros - b.distancia_metros);
  }

  async function searchLikeViabilidade() {
    if (!coordsReady) {
      error = 'Sem coordenadas para pesquisar no mapa.';
      ctos = [];
      return;
    }

    loading = true;
    error = '';
    ctos = [];

    try {
      await loadGoogleMaps();
      await tick();
      if (!mapEl) await tick();
      initMap();

      let found = [];
      if (dentroCobertura !== false) {
        found = (await fetchCtosInRadius(250)).filter((c) => c.distancia_metros <= 250);
      }

      if (found.length === 0) {
        const raios = [500, 700, 900, 1200];
        let nearest = null;
        for (const raio of raios) {
          const batch = await fetchCtosInRadius(raio);
          if (batch.length) {
            nearest = { ...batch[0], is_out_of_limit: batch[0].distancia_metros > 250 };
            break;
          }
        }
        found = nearest ? [nearest] : [];
      }

      ctos = found;
      drawClientAndCtos();
      if (typeof onCtosLoaded === 'function') onCtosLoaded(ctos);
    } catch (err) {
      error = err?.message || 'Falha ao carregar mapa/CTOs';
      ctos = [];
    } finally {
      loading = false;
    }
  }

  $: if (coordsReady) {
    const key = `${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}|${dentroCobertura}`;
    if (key !== lastSearchKey) {
      lastSearchKey = key;
      searchLikeViabilidade();
    }
  }

  onDestroy(() => {
    clearOverlays();
    map = null;
  });

  function formatDist(cto) {
    const m = Number(cto.distancia_real || cto.distancia_metros || 0);
    const km = (m / 1000).toFixed(3);
    return `${m}m (${km}km)`;
  }
</script>

<div class="viab-map-panel" class:theme-dark={isDark}>
  <div class="map-toolbar">
    <strong>Mapa</strong>
    <span class="map-meta">
      {#if coordsReady}
        {Number(lat).toFixed(6)}, {Number(lng).toFixed(6)}
      {:else}
        Sem coordenadas
      {/if}
    </span>
  </div>

  {#if !coordsReady}
    <div class="map-empty">
      Sem coordenadas neste chamado. Clique em <strong>Analisar localização</strong> primeiro.
    </div>
  {:else}
    <div class="map-canvas-wrap">
      <div class="map-canvas" bind:this={mapEl}></div>
      {#if loading}
        <div class="map-overlay">Pesquisando CTOs próximas…</div>
      {/if}
    </div>

    {#if error}
      <p class="map-error" role="alert">{error}</p>
    {/if}

    <div class="cto-toolbar">
      <strong>
        Tabela de Equipamentos Encontrados —
        {ctosRua.length}
        {ctosRua.length === 1 ? 'Equipamento Encontrado' : 'Equipamentos Encontrados'}
      </strong>
      <span class="ports-meta">
        {totalPortas}
        {totalPortas === 1 ? 'porta disponível' : 'portas disponíveis'}
      </span>
    </div>

    <div class="cto-table-wrap">
      <table class="cto-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Cidade</th>
            <th>POP</th>
            <th>Nome</th>
            <th>ID</th>
            <th>Total de Portas</th>
            <th>Portas Conectadas</th>
            <th>Portas Disponíveis</th>
            <th>Distância</th>
          </tr>
        </thead>
        <tbody>
          {#if loading && ctosRua.length === 0}
            <tr>
              <td colspan="9" class="empty">Carregando equipamentos…</td>
            </tr>
          {:else if ctosRua.length === 0}
            <tr>
              <td colspan="9" class="empty">Nenhum equipamento CTO encontrado próximo a este local.</td>
            </tr>
          {:else}
            {#each ctosRua as cto, index}
              {@const livres = Math.max(0, Number(cto.vagas_total || 0) - Number(cto.clientes_conectados || 0))}
              <tr class:sem-porta={livres === 0} class:fora-limite={cto.is_out_of_limit}>
                <td>{index + 1}</td>
                <td>{cto.cidade || '—'}</td>
                <td>{cto.pop || '—'}</td>
                <td>{cto.nome || '—'}</td>
                <td>{cto.id || cto.id_cto || '—'}</td>
                <td>{cto.vagas_total ?? 0}</td>
                <td>{cto.clientes_conectados ?? 0}</td>
                <td>{livres}</td>
                <td>{formatDist(cto)}</td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<style>
  .viab-map-panel {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-height: 0;
    flex: 1;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    overflow: hidden;
  }

  .map-toolbar,
  .cto-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.65rem 0.85rem;
    background: linear-gradient(135deg, #7B68EE 0%, #6B5BEE 100%);
    color: #fff;
  }

  .map-toolbar strong,
  .cto-toolbar strong {
    font-size: 0.92rem;
  }

  .map-meta,
  .ports-meta {
    font-size: 0.8rem;
    opacity: 0.95;
  }

  .map-canvas-wrap {
    position: relative;
    height: min(46vh, 420px);
    min-height: 280px;
    background: #e5e7eb;
  }

  .map-canvas {
    width: 100%;
    height: 100%;
  }

  .map-overlay,
  .map-empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.78);
    color: #374151;
    font-size: 0.92rem;
    text-align: center;
    padding: 1rem;
  }

  .map-empty {
    position: relative;
    min-height: 220px;
    background: #faf5ff;
    color: #6b7280;
  }

  .map-error {
    margin: 0;
    padding: 0.55rem 0.85rem;
    background: #fff7ed;
    color: #c2410c;
    font-size: 0.85rem;
  }

  .cto-table-wrap {
    flex: 1;
    min-height: 160px;
    max-height: 280px;
    overflow: auto;
  }

  .cto-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
  }

  .cto-table th,
  .cto-table td {
    padding: 0.45rem 0.5rem;
    border-bottom: 1px solid #e5e7eb;
    text-align: left;
    white-space: nowrap;
  }

  .cto-table thead th {
    position: sticky;
    top: 0;
    background: #f3f4f6;
    color: #374151;
    font-weight: 700;
    z-index: 1;
  }

  .cto-table tbody tr:nth-child(even) {
    background: #fafafa;
  }

  .cto-table tr.sem-porta td,
  .cto-table tr.fora-limite td {
    color: #dc2626;
  }

  .cto-table .empty {
    text-align: center;
    color: #6b7280;
    padding: 1rem;
    white-space: normal;
  }

  .viab-map-panel.theme-dark {
    background: #1a1f33;
    border-color: #2d3550;
  }

  .theme-dark .map-canvas-wrap {
    background: #111827;
  }

  .theme-dark .map-overlay {
    background: rgba(15, 18, 32, 0.78);
    color: #e5e7eb;
  }

  .theme-dark .map-empty {
    background: #1a1f33;
    color: #9ca3af;
  }

  .theme-dark .map-error {
    background: #422006;
    color: #fdba74;
  }

  .theme-dark .cto-table th,
  .theme-dark .cto-table td {
    border-bottom-color: #2d3550;
    color: #e5e7eb;
  }

  .theme-dark .cto-table thead th {
    background: #232a42;
    color: #e5e7eb;
  }

  .theme-dark .cto-table tbody tr:nth-child(even) {
    background: #151a2b;
  }

  .theme-dark .cto-table tr.sem-porta td,
  .theme-dark .cto-table tr.fora-limite td {
    color: #f87171;
  }

  .theme-dark .cto-table .empty {
    color: #9ca3af;
  }
</style>
