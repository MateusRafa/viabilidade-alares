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
  let coverageCircle = null;
  let lastSearchKey = '';
  let isMapMinimized = false;
  let isListMinimized = false;

  $: isDark = $theme === 'dark';
  $: coordsReady = lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));
  $: ctosRua = ctos.filter((c) => !c.is_condominio);
  $: totalPortas = ctosRua.reduce(
    (sum, cto) => sum + Math.max(0, Number(cto.vagas_total || 0) - Number(cto.clientes_conectados || 0)),
    0
  );
  $: equipmentTitle =
    ctosRua.length === 0
      ? 'Tabela de Equipamentos Encontrados - Nenhum Equipamento Pesquisado'
      : `Tabela de Equipamentos Encontrados - ${ctosRua.length} Equipamento${ctosRua.length === 1 ? '' : 's'} Encontrado${ctosRua.length === 1 ? '' : 's'}`;

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
    if (cto.is_out_of_limit) return '#f97316';
    if (livres <= 0) return '#ef4444';
    return '#2563eb';
  }

  async function fetchNearbyCtos() {
    const response = await fetch(
      getApiUrl(`/api/ctos/nearby?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}&radius=250`)
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || data.message || 'Falha ao buscar CTOs próximas');
    }
    return response.json();
  }

  function drawClientAndCoverage() {
    if (!map || !window.google?.maps) return;
    const center = { lat: Number(lat), lng: Number(lng) };

    if (clientMarker) clientMarker.setMap(null);
    clientMarker = new google.maps.Marker({
      map,
      position: center,
      title: 'Cliente',
      icon: {
        url: HOUSE_ICON,
        scaledSize: new google.maps.Size(36, 36),
        anchor: new google.maps.Point(18, 18)
      },
      zIndex: 999
    });

    if (coverageCircle) coverageCircle.setMap(null);
    if (dentroCobertura != null) {
      coverageCircle = new google.maps.Circle({
        map,
        center,
        radius: 250,
        strokeColor: dentroCobertura ? '#16a34a' : '#dc2626',
        strokeOpacity: 0.85,
        strokeWeight: 2,
        fillColor: dentroCobertura ? '#22c55e' : '#ef4444',
        fillOpacity: 0.08,
        clickable: false
      });
    }
  }

  function drawCtoMarkers(list) {
    if (!map || !window.google?.maps) return;
    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: Number(lat), lng: Number(lng) });

    list.forEach((cto, index) => {
      const cLat = Number(cto.latitude ?? cto.lat);
      const cLng = Number(cto.longitude ?? cto.lng);
      if (Number.isNaN(cLat) || Number.isNaN(cLng)) return;

      const color = markerColorForCto(cto);
      const marker = new google.maps.Marker({
        map,
        position: { lat: cLat, lng: cLng },
        label: {
          text: String(index + 1),
          color: '#fff',
          fontSize: '11px',
          fontWeight: '700'
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2
        },
        title: cto.nome || cto.id_cto || `CTO ${index + 1}`
      });
      markers.push(marker);
      bounds.extend({ lat: cLat, lng: cLng });

      const path = [
        { lat: Number(lat), lng: Number(lng) },
        { lat: cLat, lng: cLng }
      ];
      const line = new google.maps.Polyline({
        map,
        path,
        strokeColor: color,
        strokeOpacity: 0.65,
        strokeWeight: 2
      });
      polylines.push(line);
    });

    if (list.length > 0) {
      map.fitBounds(bounds, 48);
    }
  }

  async function searchNearby() {
    if (!coordsReady) {
      clearOverlays();
      ctos = [];
      error = '';
      lastSearchKey = '';
      if (typeof onCtosLoaded === 'function') onCtosLoaded([]);
      return;
    }

    const key = `${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}`;
    if (key === lastSearchKey && ctos.length > 0) {
      await tick();
      initMap();
      clearOverlays();
      drawClientAndCoverage();
      drawCtoMarkers(ctos.filter((c) => !c.is_condominio));
      return;
    }

    loading = true;
    error = '';
    lastSearchKey = key;

    try {
      await loadGoogleMaps();
      await tick();
      initMap();
      clearOverlays();
      drawClientAndCoverage();

      const data = await fetchNearbyCtos();
      ctos = Array.isArray(data?.ctos) ? data.ctos : Array.isArray(data) ? data : [];
      drawCtoMarkers(ctos.filter((c) => !c.is_condominio));
      if (typeof onCtosLoaded === 'function') onCtosLoaded(ctos);
    } catch (err) {
      error = err?.message || 'Não foi possível carregar o mapa/CTOs.';
      ctos = [];
      if (typeof onCtosLoaded === 'function') onCtosLoaded([]);
    } finally {
      loading = false;
    }
  }

  $: lat, lng, dentroCobertura, void searchNearby();

  onDestroy(() => {
    clearOverlays();
    map = null;
  });

  function formatDist(cto) {
    const m = Number(cto.distancia_real || cto.distancia_metros || 0);
    const km = (m / 1000).toFixed(3);
    return `${m}m (${km}km)`;
  }

  function toggleMap() {
    isMapMinimized = !isMapMinimized;
    if (!isMapMinimized && map && window.google?.maps) {
      setTimeout(() => google.maps.event.trigger(map, 'resize'), 100);
    }
  }
</script>

<div class="viab-results" class:theme-dark={isDark}>
  <section class="result-box map-box" class:minimized={isMapMinimized} aria-label="Mapa">
    <div class="box-header">
      <h3>Mapa</h3>
      <button
        type="button"
        class="minimize-button"
        on:click={toggleMap}
        aria-label={isMapMinimized ? 'Expandir mapa' : 'Minimizar mapa'}
        title={isMapMinimized ? 'Expandir' : 'Minimizar'}
      >
        {isMapMinimized ? '⬇️' : '⬆️'}
      </button>
    </div>

    {#if !isMapMinimized}
      {#if !coordsReady}
        <div class="map-empty">
          Sem coordenadas neste chamado. Use <strong>Localizar no Mapa</strong> ou <strong>Analisar localização</strong>.
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
      {/if}
    {/if}
  </section>

  <section class="result-box table-box" class:minimized={isListMinimized} aria-label="Tabela de equipamentos">
    <div class="box-header">
      <h3>{equipmentTitle}</h3>
      <button
        type="button"
        class="minimize-button"
        on:click={() => (isListMinimized = !isListMinimized)}
        aria-label={isListMinimized ? 'Expandir tabela' : 'Minimizar tabela'}
        title={isListMinimized ? 'Expandir' : 'Minimizar'}
      >
        {isListMinimized ? '⬇️' : '⬆️'}
      </button>
    </div>

    {#if !isListMinimized}
      <div class="cto-table-wrap">
        {#if !coordsReady}
          <p class="empty-hint">Nenhum equipamento pesquisado ainda.</p>
        {:else}
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
        {/if}
      </div>
      {#if coordsReady && ctosRua.length > 0}
        <div class="ports-footer">
          {totalPortas}
          {totalPortas === 1 ? 'porta disponível' : 'portas disponíveis'}
        </div>
      {/if}
    {/if}
  </section>
</div>

<style>
  .viab-results {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-height: 0;
    flex: 0 0 auto;
  }

  .result-box {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }

  .result-box.minimized {
    flex: 0 0 auto;
  }

  .box-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    background: #f9fafb;
  }

  .result-box.minimized .box-header {
    border-bottom: none;
  }

  .box-header h3 {
    margin: 0;
    color: #4c1d95;
    font-size: 1.1rem;
    font-weight: 600;
    line-height: 1.3;
  }

  .minimize-button {
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 1rem;
    padding: 0.2rem 0.35rem;
    border-radius: 6px;
    line-height: 1;
  }

  .minimize-button:hover {
    background: rgba(123, 104, 238, 0.12);
  }

  .map-canvas-wrap {
    position: relative;
    height: min(42vh, 380px);
    min-height: 260px;
    background: #e5e7eb;
  }

  .map-canvas {
    width: 100%;
    height: 100%;
  }

  .map-overlay,
  .map-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.78);
    color: #374151;
    font-size: 0.92rem;
    text-align: center;
    padding: 1.5rem 1rem;
    min-height: 220px;
  }

  .map-overlay {
    position: absolute;
    inset: 0;
    min-height: 0;
  }

  .map-empty {
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
    min-height: 140px;
    max-height: 280px;
    overflow: auto;
    padding: 0 0.25rem 0.25rem;
  }

  .empty-hint {
    margin: 0;
    padding: 1.5rem 1rem;
    text-align: center;
    color: #6b7280;
    font-size: 0.9rem;
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

  .ports-footer {
    padding: 0.55rem 1rem;
    border-top: 1px solid #e5e7eb;
    font-size: 0.82rem;
    color: #6b7280;
    background: #fafafa;
  }

  .viab-results.theme-dark .result-box {
    background: #1a1f33;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
  }

  .theme-dark .box-header {
    background: #232a42;
    border-bottom-color: #2d3550;
  }

  .theme-dark .box-header h3 {
    color: #c4b5fd;
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

  .theme-dark .cto-table .empty,
  .theme-dark .empty-hint,
  .theme-dark .ports-footer {
    color: #9ca3af;
  }

  .theme-dark .ports-footer {
    background: #151a2b;
    border-top-color: #2d3550;
  }
</style>
