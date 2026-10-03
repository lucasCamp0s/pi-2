import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CircleHelp, Check, CheckCircle2, ChevronDown, Clock3, LocateFixed, MapPin, MapPinned, Menu, Minus, Plus, Search, SlidersHorizontal, Sparkles, X, Accessibility, LandPlot, CarFront, Toilet, Footprints, Languages, Eye, LoaderCircle, ArrowUpRight, List, Map as MapIcon, ArrowLeft } from 'lucide-react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api, type AccessibilityFeature, type AccessibilityFeatureType, type FeatureStatus, type GeocodingResult, type Place } from './api';

const DEFAULT_CENTER: [number, number] = [-23.5505, -46.6333];
const categoryLabels: Record<string, string> = {
  library: 'Biblioteca', restaurant: 'Restaurante', cafe: 'Café', shop: 'Comércio',
  health: 'Saúde', culture: 'Cultura', education: 'Educação', hotel: 'Hotel', other: 'Outro'
};

function featureIcon(type: string, size = 17) {
  const props = { size, strokeWidth: 1.8 };
  if (type.includes('bathroom')) return <Toilet {...props} />;
  if (type.includes('parking')) return <CarFront {...props} />;
  if (type.includes('ramp') || type.includes('step_free') || type.includes('wheelchair')) return <Accessibility {...props} />;
  if (type.includes('tactile')) return <Footprints {...props} />;
  if (type.includes('braille')) return <Eye {...props} />;
  if (type.includes('libras') || type.includes('hearing')) return <Languages {...props} />;
  return <LandPlot {...props} />;
}

function statusLabel(status: FeatureStatus) {
  if (status === 'available') return 'Disponível';
  if (status === 'unavailable') return 'Não disponível';
  return 'Não informado';
}

function StatusIcon({ status }: { status: FeatureStatus }) {
  if (status === 'available') return <span className="status-symbol is-available"><Check size={13} strokeWidth={3} /></span>;
  if (status === 'unavailable') return <span className="status-symbol is-unavailable"><X size={13} strokeWidth={2.5} /></span>;
  return <span className="status-symbol is-unknown"><CircleHelp size={13} strokeWidth={2.5} /></span>;
}

function makeMarkerIcon(selected: boolean) {
  return L.divIcon({
    className: 'place-marker-wrapper',
    html: `<div class="place-marker ${selected ? 'selected' : ''}"><span>♿</span></div>`,
    iconSize: [42, 50],
    iconAnchor: [21, 45],
    popupAnchor: [0, -42]
  });
}

function MapEffects({ center, selectedId, places }: { center: [number, number]; selectedId: number | null; places: Place[] }) {
  const map = useMap();
  useEffect(() => { map.flyTo(center, Math.max(map.getZoom(), 14), { duration: 0.65 }); }, [center, map]);
  useEffect(() => {
    if (!selectedId) return;
    const selected = places.find((place) => place.id === selectedId);
    if (selected) map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 15), { duration: 0.55 });
  }, [selectedId, places, map]);
  return null;
}

function MapButtons() {
  const map = useMap();
  return <div className="map-controls" aria-label="Controles do mapa">
    <button type="button" aria-label="Minha localização" onClick={() => map.flyTo(DEFAULT_CENTER, 14)}><LocateFixed size={19} /></button>
    <button type="button" aria-label="Aumentar zoom" onClick={() => map.zoomIn()}><Plus size={19} /></button>
    <button type="button" aria-label="Diminuir zoom" onClick={() => map.zoomOut()}><Minus size={19} /></button>
  </div>;
}

function FeatureRow({ feature, label }: { feature: AccessibilityFeature; label: string }) {
  return <div className="feature-row">
    <span className={`feature-icon status-${feature.status}`}>{featureIcon(feature.type)}</span>
    <span className="feature-label">{label}</span>
    <span className={`feature-status text-${feature.status}`}><StatusIcon status={feature.status} />{statusLabel(feature.status)}</span>
  </div>;
}

function PlaceCard({ place, catalog, selected, onSelect }: { place: Place; catalog: AccessibilityFeatureType[]; selected: boolean; onSelect: () => void }) {
  const labels = useMemo(() => new Map(catalog.map((item) => [item.type, item.label])), [catalog]);
  const updated = new Date(place.updatedAt.replace(' ', 'T') + 'Z');
  const relative = Number.isNaN(updated.getTime()) ? 'Atualização recente' : new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }).format(-Math.max(0, Math.floor((Date.now() - updated.getTime()) / 86400000)), 'day');
  const features = selected ? place.accessibilityFeatures : place.accessibilityFeatures.slice(0, 4);
  return <article className={`place-card ${selected ? 'card-selected' : ''}`}>
    <button type="button" className="place-card-main" onClick={onSelect} aria-label={`Ver ${place.name} no mapa`}>
      <div className="place-photo-placeholder"><LandPlot size={34} strokeWidth={1.4} /><span>{categoryLabels[place.category] ?? place.category}</span></div>
      <div className="place-card-content">
        <div className="place-title-line"><h2>{place.name}</h2><ArrowUpRight size={17} /></div>
        <p className="place-address"><MapPin size={15} />{place.address}</p>
        <div className="feature-list">
          {features.length ? features.map((feature) => <FeatureRow key={feature.type} feature={feature} label={labels.get(feature.type) ?? feature.type} />) : <p className="no-feature-data">Ainda não há recursos registrados para este lugar.</p>}
          {place.accessibilityFeatures.length > 4 && !selected && <span className="more-features">+{place.accessibilityFeatures.length - 4} recursos</span>}
        </div>
        <div className="place-card-footer"><span><Clock3 size={14} />Atualizado {relative}</span><span className="details-link">Ver detalhes <ArrowUpRight size={14} /></span></div>
      </div>
    </button>
  </article>;
}

function NewPlaceDialog({ catalog, initialAddress, initialResult, onClose, onCreated }: {
  catalog: AccessibilityFeatureType[];
  initialAddress: string;
  initialResult: GeocodingResult | null;
  onClose: () => void;
  onCreated: (place: Place) => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState(initialResult?.displayName ?? initialAddress);
  const [latitude, setLatitude] = useState(initialResult ? String(initialResult.latitude) : '');
  const [longitude, setLongitude] = useState(initialResult ? String(initialResult.longitude) : '');
  const [lookupResults, setLookupResults] = useState<GeocodingResult[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, { status: FeatureStatus; notes: string }>>({});
  const [busySearch, setBusySearch] = useState(false);
  const [busySave, setBusySave] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    document.body.classList.add('dialog-open');
    return () => { window.removeEventListener('keydown', onKeyDown); document.body.classList.remove('dialog-open'); };
  }, [onClose]);

  async function searchAddress() {
    if (address.trim().length < 3) { setError('Digite ao menos 3 caracteres do endereço.'); return; }
    setBusySearch(true); setError('');
    try { setLookupResults(await api.geocode(address)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível buscar o endereço.'); }
    finally { setBusySearch(false); }
  }

  function chooseAddress(result: GeocodingResult) {
    setAddress(result.displayName); setLatitude(String(result.latitude)); setLongitude(String(result.longitude)); setLookupResults([]); setError('');
  }

  function toggleFeature(type: string) {
    setSelectedFeatures((current) => {
      const next = { ...current };
      if (next[type]) delete next[type];
      else next[type] = { status: 'unknown', notes: '' };
      return next;
    });
  }

  function changeFeature(type: string, patch: Partial<{ status: FeatureStatus; notes: string }>) {
    setSelectedFeatures((current) => ({ ...current, [type]: { ...current[type], ...patch } }));
  }

  async function savePlace(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!latitude || !longitude) { setError('Pesquise o endereço e selecione uma sugestão para preencher as coordenadas.'); return; }
    setBusySave(true);
    try {
      const place = await api.createPlace({
        name: name.trim(), category, description: description.trim(), address: address.trim(),
        latitude: Number(latitude), longitude: Number(longitude),
        accessibilityFeatures: Object.entries(selectedFeatures).map(([type, value]) => ({ type, status: value.status, notes: value.notes.trim() || null }))
      });
      onCreated(place);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível salvar o local.'); }
    finally { setBusySave(false); }
  }

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="place-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="dialog-heading"><div><span className="eyebrow">CONTRIBUA COM A CIDADE</span><h2 id="dialog-title">Adicionar um local</h2><p>Compartilhe informações de acessibilidade com a comunidade.</p></div><button className="icon-button" type="button" onClick={onClose} aria-label="Fechar"><X size={21} /></button></div>
      <form onSubmit={savePlace} className="place-form">
        <div className="form-grid">
          <label className="field full-field">Nome do local<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Biblioteca Mário de Andrade" /></label>
          <label className="field">Categoria<select value={category} onChange={(event) => setCategory(event.target.value)}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field">Descrição <span className="optional">opcional</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Uma breve descrição" /></label>
        </div>
        <div className="section-heading"><div><h3>Onde fica?</h3><p>Busque o endereço e selecione a sugestão correta.</p></div><MapPinned size={19} /></div>
        <div className="address-search-row"><input value={address} onChange={(event) => { setAddress(event.target.value); setLatitude(''); setLongitude(''); }} placeholder="Rua, número, bairro e cidade" /><button type="button" className="secondary-button" onClick={() => void searchAddress()} disabled={busySearch}>{busySearch ? <LoaderCircle className="spin" size={16} /> : <Search size={16} />}Buscar</button></div>
        {lookupResults.length > 0 && <div className="address-suggestions" role="listbox" aria-label="Sugestões de endereço">{lookupResults.map((result) => <button type="button" role="option" key={`${result.latitude},${result.longitude}`} onClick={() => chooseAddress(result)}><MapPin size={16} /><span>{result.displayName}</span></button>)}</div>}
        {lookupResults.length === 0 && address.length >= 3 && !latitude && !busySearch && <p className="manual-coordinate-hint">Se não encontrar o endereço, você pode preencher as coordenadas manualmente.</p>}
        <div className="coordinate-fields"><label className="field">Latitude<input required type="number" step="any" min="-90" max="90" value={latitude} onChange={(event) => setLatitude(event.target.value)} placeholder="Ex.: -23.5505" /></label><label className="field">Longitude<input required type="number" step="any" min="-180" max="180" value={longitude} onChange={(event) => setLongitude(event.target.value)} placeholder="Ex.: -46.6333" /></label></div>
        {latitude && longitude && <div className="coordinates-confirmed"><CheckCircle2 size={16} /><span>Coordenadas preenchidas</span><code>{Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}</code></div>}
        <div className="section-heading accessibility-heading"><div><h3>Recursos de acessibilidade</h3><p>Selecione os itens e indique o que sabe sobre cada um.</p></div><Accessibility size={20} /></div>
        <div className="feature-editor">{catalog.map((feature) => {
          const selected = selectedFeatures[feature.type];
          return <div className={`feature-editor-row ${selected ? 'feature-editor-selected' : ''}`} key={feature.type}>
            <label className="feature-check"><input type="checkbox" checked={Boolean(selected)} onChange={() => toggleFeature(feature.type)} /><span className="custom-checkbox"><Check size={13} /></span><span className="feature-editor-icon">{featureIcon(feature.type, 16)}</span><span>{feature.label}</span></label>
            {selected && <div className="feature-config"><select aria-label={`Disponibilidade: ${feature.label}`} value={selected.status} onChange={(event) => changeFeature(feature.type, { status: event.target.value as FeatureStatus })}><option value="available">Disponível</option><option value="unavailable">Não disponível</option><option value="unknown">Não informado</option></select><input aria-label={`Observação: ${feature.label}`} value={selected.notes} onChange={(event) => changeFeature(feature.type, { notes: event.target.value })} placeholder="Observação (opcional)" /></div>}
          </div>;
        })}</div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-actions"><button type="button" className="text-button" onClick={onClose}>Cancelar</button><button type="submit" className="primary-button" disabled={busySave}>{busySave ? <><LoaderCircle className="spin" size={17} />Salvando…</> : <><Plus size={17} />Salvar local</>}</button></div>
      </form>
    </section>
  </div>;
}

export default function App() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [catalog, setCatalog] = useState<AccessibilityFeatureType[]>([]);
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [geocodeResults, setGeocodeResults] = useState<GeocodingResult[]>([]);
  const [selectedGeocode, setSelectedGeocode] = useState<GeocodingResult | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailPlaceId, setDetailPlaceId] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAddress, setDialogAddress] = useState('');
  const [dialogResult, setDialogResult] = useState<GeocodingResult | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  async function loadPlaces(search = submittedQuery, feature = activeFilter) {
    setLoadingPlaces(true); setError('');
    try { setPlaces(await api.getPlaces({ q: search || undefined, feature: feature || undefined })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os locais.'); }
    finally { setLoadingPlaces(false); }
  }

  useEffect(() => {
    api.getFeatureCatalog().then(setCatalog).catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Não foi possível carregar os filtros.'));
    void loadPlaces('', '');
  }, []);

  async function submitSearch(event: FormEvent) {
    event.preventDefault();
    const value = query.trim();
    setSubmittedQuery(value); setGeocodeResults([]); setSelectedGeocode(null); setDialogResult(null); setDialogAddress(''); setSearchBusy(true); setError('');
    try {
      const foundPlaces = await api.getPlaces({ q: value || undefined, feature: activeFilter || undefined });
      const locations = foundPlaces.length === 0 && value.length >= 3 ? await api.geocode(value) : [];
      setPlaces(foundPlaces); setGeocodeResults(locations);
      if (foundPlaces.length) { setSelectedId(foundPlaces[0].id); setMapCenter([foundPlaces[0].latitude, foundPlaces[0].longitude]); }
      else if (locations.length) { setSelectedGeocode(locations[0]); setMapCenter([locations[0].latitude, locations[0].longitude]); }
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Não foi possível realizar a busca.'); }
    finally { setSearchBusy(false); setLoadingPlaces(false); }
  }

  function chooseGeoResult(result: GeocodingResult) {
    setMapCenter([result.latitude, result.longitude]); setSelectedGeocode(result); setDialogAddress(result.displayName); setDialogResult(result); setGeocodeResults([]);
  }

  function choosePlace(place: Place, openDetails = false) {
    setSelectedId(place.id); setSelectedGeocode(null); setDialogResult(null); setMapCenter([place.latitude, place.longitude]);
    if (openDetails) {
      setDetailPlaceId(place.id);
      if (window.matchMedia('(max-width: 720px)').matches) setViewMode('list');
    }
  }

  function openCreateDialog(address = '', result: GeocodingResult | null = null) {
    setDialogAddress(address); setDialogResult(result); setDialogOpen(true);
  }

  function onCreated(place: Place) {
    setPlaces((current) => [place, ...current.filter((item) => item.id !== place.id)]);
    setSelectedId(place.id); setMapCenter([place.latitude, place.longitude]); setDialogOpen(false); setDialogAddress(''); setDialogResult(null); setSelectedGeocode(null); setQuery(''); setSubmittedQuery(''); setActiveFilter(''); setGeocodeResults([]);
  }

  const chips = [
    { type: 'ramp', label: 'Rampa' }, { type: 'accessible_bathroom', label: 'Banheiro acessível' },
    { type: 'step_free_access', label: 'Sem degraus' }, { type: 'preferential_parking', label: 'Vaga preferencial' }
  ];
  const detailPlace = places.find((place) => place.id === detailPlaceId) ?? null;
  const featureLabels = new Map(catalog.map((item) => [item.type, item.label]));

  return <main className={`app-shell ${viewMode === 'list' ? 'list-mode' : ''}`}>
    <aside className={`sidebar ${viewMode === 'list' ? 'mobile-list-active' : ''}`}>
      <header className="sidebar-header"><a className="brand" href="#top" aria-label="AcessoMap página inicial"><span className="brand-symbol"><Accessibility size={26} strokeWidth={2.5} /></span><span>Acesso<span className="brand-accent">Map</span></span></a><div className="view-switch list-mode-switch" role="group" aria-label="Visualização"><button className={viewMode === 'map' ? 'view-active' : ''} type="button" onClick={() => setViewMode('map')}><MapIcon size={16} />Mapa</button><button className={viewMode === 'list' ? 'view-active' : ''} type="button" onClick={() => setViewMode('list')}><List size={16} />Lista</button></div><button type="button" className="icon-button menu-button" aria-label="Menu"><Menu size={22} /></button></header>
      <p className="tagline">Lugares mais acessíveis para uma cidade mais inclusiva.</p>
      <form className="search-form" onSubmit={submitSearch}><label className="search-box"><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busque um lugar ou endereço" aria-label="Busque um lugar ou endereço" /><button type="submit" aria-label="Pesquisar" disabled={searchBusy}>{searchBusy ? <LoaderCircle className="spin" size={17} /> : <ArrowUpRight size={18} />}</button></label></form>
      {geocodeResults.length > 0 && <div className="search-suggestions"><span className="suggestion-label">ENDEREÇOS ENCONTRADOS</span>{geocodeResults.map((result) => <button key={`${result.latitude},${result.longitude}`} type="button" onClick={() => chooseGeoResult(result)}><MapPin size={16} /><span>{result.displayName}</span></button>)}</div>}
      {geocodeResults.length === 0 && dialogResult && !dialogOpen && <button type="button" className="search-address-cta" onClick={() => openCreateDialog(dialogAddress, dialogResult)}><Plus size={16} />Cadastrar local neste endereço</button>}
      {geocodeResults.length === 0 && !dialogResult && !searchBusy && submittedQuery.length >= 3 && places.length === 0 && !error && <button type="button" className="search-address-cta" onClick={() => openCreateDialog(submittedQuery)}><MapPin size={16} />Não encontrou? Adicione este endereço</button>}
      <div className="filter-heading"><span>Explorar por acessibilidade</span><SlidersHorizontal size={16} /></div>
      <div className="filter-chips">{chips.map((chip) => <button key={chip.type} type="button" className={`filter-chip ${activeFilter === chip.type ? 'chip-active' : ''}`} onClick={() => { const next = activeFilter === chip.type ? '' : chip.type; setActiveFilter(next); setSelectedId(null); void loadPlaces(submittedQuery, next); }} aria-pressed={activeFilter === chip.type}>{featureIcon(chip.type, 16)}{chip.label}</button>)}</div>
      {!detailPlace && <div className="result-heading"><h1>{loadingPlaces ? 'Carregando locais…' : `${places.length} ${places.length === 1 ? 'lugar' : 'lugares'}`}</h1><button type="button" className="sort-button">Mais relevantes <ChevronDown size={15} /></button></div>}
      {detailPlace ? <section className="place-detail-view" aria-label={`Detalhes de ${detailPlace.name}`}>
        <button type="button" className="back-to-results" onClick={() => setDetailPlaceId(null)}><ArrowLeft size={16} />Voltar para resultados</button>
        <div className="detail-hero"><div className="detail-hero-icon"><LandPlot size={31} /></div><span>{categoryLabels[detailPlace.category] ?? detailPlace.category}</span></div>
        <div className="detail-content"><span className="detail-eyebrow"><MapPin size={13} />LOCAL SELECIONADO NO MAPA</span><h1>{detailPlace.name}</h1><p className="detail-address"><MapPin size={17} />{detailPlace.address}</p>
          {detailPlace.description && <p className="detail-description">{detailPlace.description}</p>}
          <div className="detail-accessibility-heading"><div><h2>Acessibilidade</h2><p>Informações compartilhadas pela comunidade</p></div><span>{detailPlace.accessibilityFeatures.length} {detailPlace.accessibilityFeatures.length === 1 ? 'item' : 'itens'}</span></div>
          <div className="detail-feature-list">{detailPlace.accessibilityFeatures.length ? detailPlace.accessibilityFeatures.map((feature) => <div className="detail-feature-item" key={feature.type}><FeatureRow feature={feature} label={featureLabels.get(feature.type) ?? feature.type} />{feature.notes && <p className="feature-note">{feature.notes}</p>}</div>) : <p className="no-feature-data">Ainda não há recursos de acessibilidade informados para este local.</p>}</div>
          <p className="detail-contribution"><Clock3 size={14} />Última atualização em {new Date(detailPlace.updatedAt.replace(' ', 'T') + 'Z').toLocaleDateString('pt-BR')}</p>
        </div>
      </section> : <section className="place-results" aria-label="Lugares encontrados">
        {error && <div className="error-panel"><CircleHelp size={18} /><span>{error}</span><button type="button" onClick={() => void loadPlaces()}>Tentar novamente</button></div>}
        {loadingPlaces && <div className="loading-state"><LoaderCircle className="spin" size={22} />Buscando lugares…</div>}
        {!loadingPlaces && !error && places.map((place) => <PlaceCard key={place.id} place={place} catalog={catalog} selected={selectedId === place.id} onSelect={() => choosePlace(place, true)} />)}
        {!loadingPlaces && !error && places.length === 0 && <div className="empty-state"><span className="empty-illustration"><MapPinned size={28} /></span><h2>Nenhum lugar por aqui ainda</h2><p>Se conhece um lugar acessível, ajude outras pessoas compartilhando.</p><button type="button" className="primary-button" onClick={() => openCreateDialog(query)}><Plus size={17} />Adicionar um local</button></div>}
      </section>}
      <footer className="sidebar-footer"><span><Sparkles size={14} />Informações feitas pela comunidade</span><button type="button" onClick={() => openCreateDialog()}><Plus size={16} />Adicionar local</button></footer>
    </aside>

    <section className={`map-pane ${viewMode === 'list' ? 'mobile-map-hidden' : ''}`} aria-label="Mapa de lugares acessíveis">
      <div className="map-topbar"><div className="view-switch" role="group" aria-label="Visualização"><button className={viewMode === 'map' ? 'view-active' : ''} type="button" onClick={() => setViewMode('map')}><MapIcon size={16} />Mapa</button><button className={viewMode === 'list' ? 'view-active' : ''} type="button" onClick={() => setViewMode('list')}><List size={16} />Lista</button></div><button type="button" className="map-add-button" onClick={() => openCreateDialog()}><Plus size={17} />Adicionar um local</button></div>
      <MapContainer center={DEFAULT_CENTER} zoom={14} zoomControl={false} className="leaflet-map" scrollWheelZoom>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapEffects center={mapCenter} selectedId={selectedId} places={places} />
        <MapButtons />
        {places.map((place) => <Marker key={place.id} position={[place.latitude, place.longitude]} icon={makeMarkerIcon(selectedId === place.id)} eventHandlers={{ click: () => choosePlace(place, true) }} />)}
        {geocodeResults.map((result) => <Marker key={`search-${result.latitude}-${result.longitude}`} position={[result.latitude, result.longitude]} icon={L.divIcon({ className: 'search-marker-wrapper', html: '<div class="search-result-marker"><span></span></div>', iconSize: [22, 22], iconAnchor: [11, 11] })} eventHandlers={{ click: () => chooseGeoResult(result) }} />)}
        {selectedGeocode && <Marker key={`selected-${selectedGeocode.latitude}-${selectedGeocode.longitude}`} position={[selectedGeocode.latitude, selectedGeocode.longitude]} icon={L.divIcon({ className: 'search-marker-wrapper', html: '<div class="search-result-marker"><span></span></div>', iconSize: [22, 22], iconAnchor: [11, 11] })} />}
      </MapContainer>
      <div className="map-legend"><span className="legend-dot"></span>Lugares com informações de acessibilidade</div>
      {selectedId && places.find((place) => place.id === selectedId) && <div className="map-selection-card"><div className="selection-icon"><Accessibility size={20} /></div><div><strong>{places.find((place) => place.id === selectedId)?.name}</strong><span>{places.find((place) => place.id === selectedId)?.address}</span></div><button type="button" aria-label="Fechar local selecionado" onClick={() => setSelectedId(null)}><X size={17} /></button></div>}
      {geocodeResults.length === 0 && submittedQuery && places.length === 0 && <div className="map-empty-note"><MapPin size={18} /><span>Endereço não encontrado. Tente outra busca ou adicione o local manualmente.</span></div>}
      <div className="map-attribution-note">A busca por endereço usa OpenStreetMap contributors.</div>
    </section>

    <nav className="mobile-view-toggle" aria-label="Alternar visualização"><button type="button" className={viewMode === 'map' ? 'mobile-toggle-active' : ''} onClick={() => setViewMode('map')}><MapIcon size={17} />Mapa</button><button type="button" className={viewMode === 'list' ? 'mobile-toggle-active' : ''} onClick={() => setViewMode('list')}><List size={17} />Lista</button></nav>
    {dialogOpen && <NewPlaceDialog catalog={catalog} initialAddress={dialogAddress} initialResult={dialogResult} onClose={() => setDialogOpen(false)} onCreated={onCreated} />}
  </main>;
}
