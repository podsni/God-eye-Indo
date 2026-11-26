import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bike,
  Bus,
  Camera,
  CloudSun,
  Database,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  LocateFixed,
  Navigation,
  Newspaper,
  Pause,
  Plane,
  Play,
  Radio,
  RefreshCw,
  Rocket,
  Satellite,
  Search,
  ShieldAlert,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { describeWmoWeather, formatWindCompass } from '../engine/weather';
import { resolveAircraftProfile, resolveSatelliteProfile } from '../engine/aerospaceCatalog';
import { formatLaunchCountdown, haversineKm, sanitizeExternalUrl } from '../engine/osintParsers';
import type {
  AircraftTrack,
  AlprCameraNode,
  BundledDatasetMeta,
  CityCctvNode,
  DualWeatherComparison,
  EarthquakeEvent,
  FeedSourceMode,
  GbfsStationNode,
  GdeltNewsEvent,
  OsintEntitySelection,
  OsintLayerState,
  RadioStationNode,
  SatelliteTrack,
  SpaceLaunchEvent,
  TransitFeedEntry,
} from '../engine/osintTypes';

type IntelSubTab = 'udara' | 'bumi' | 'kota' | 'berita';

const WEATHER_CITIES = [
  { id: 'jkt', name: 'Jakarta', lat: -6.2088, lng: 106.8456 },
  { id: 'bdg', name: 'Bandung', lat: -6.9175, lng: 107.6191 },
  { id: 'smg', name: 'Semarang', lat: -6.9667, lng: 110.4167 },
  { id: 'yk', name: 'Yogyakarta', lat: -7.7956, lng: 110.3695 },
  { id: 'sby', name: 'Surabaya', lat: -7.2575, lng: 112.7521 },
  { id: 'dps', name: 'Denpasar', lat: -8.6705, lng: 115.2126 },
  { id: 'mdn', name: 'Medan', lat: 3.5952, lng: 98.6722 },
  { id: 'bpn', name: 'IKN / Balikpapan', lat: -1.2379, lng: 116.8529 },
  { id: 'mks', name: 'Makassar', lat: -5.1477, lng: 119.4327 },
  { id: 'djj', name: 'Jayapura', lat: -2.5916, lng: 140.669 },
] as const;

export interface OsintFeedsState {
  aircraft: { items: AircraftTrack[]; mode: FeedSourceMode; provider: string; loading: boolean };
  earthquakes: { items: EarthquakeEvent[]; mode: FeedSourceMode; provider: string; loading: boolean };
  satellites: { items: SatelliteTrack[]; mode: FeedSourceMode; provider: string; loading: boolean };
  cctv: { items: CityCctvNode[]; mode: FeedSourceMode; provider: string; loading: boolean };
  alpr: { items: AlprCameraNode[]; mode: FeedSourceMode; provider: string; loading: boolean };
  gbfs: { items: GbfsStationNode[]; mode: FeedSourceMode; provider: string; loading: boolean };
  radio: { items: RadioStationNode[]; mode: FeedSourceMode; provider: string; loading: boolean };
  launches: { items: SpaceLaunchEvent[]; mode: FeedSourceMode; provider: string; loading: boolean };
  gdelt: { items: GdeltNewsEvent[]; mode: FeedSourceMode; provider: string; loading: boolean };
  transitFeeds: { items: TransitFeedEntry[]; mode: FeedSourceMode; provider: string; loading: boolean };
  datasets: { items: BundledDatasetMeta[]; loading: boolean };
  weather: { data: DualWeatherComparison | null; loading: boolean };
}

interface IntelHubPanelProps {
  osintLayers: OsintLayerState;
  feeds: OsintFeedsState;
  userLocation: [number, number] | null;
  mapCenter: [number, number];
  locating: boolean;
  playingRadio: RadioStationNode | null;
  radioMuted: boolean;
  radioError: string | null;
  onLocateMe: () => void;
  onToggleOsintLayer: (key: keyof OsintLayerState) => void;
  onEnableAllPrimaryIntel: () => void;
  onSelectEntity: (sel: OsintEntitySelection) => void;
  onRefreshFeed: (feed: keyof OsintLayerState | 'weather', opts?: { query?: string; lat?: number; lng?: number; city?: string }) => void;
  onToggleRadioPlay: (station: RadioStationNode) => void;
  onToggleRadioMute: () => void;
  onOpenJplLayer: () => void;
  onOpenOsrmPlanner: () => void;
}

function sourceLabel(mode: FeedSourceMode): string {
  if (mode === 'live') return 'Live API';
  if (mode === 'hybrid') return 'Live + Bundled';
  return 'Bundled ID';
}

function LayerToggleBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-2 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 ${
        active
          ? 'bg-slate-900 dark:bg-blue-600 text-white'
          : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
      }`}
    >
      {active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
      <span>{label}</span>
    </button>
  );
}

export function IntelHubPanel({
  osintLayers,
  feeds,
  userLocation,
  mapCenter,
  locating,
  playingRadio,
  radioMuted,
  radioError,
  onLocateMe,
  onToggleOsintLayer,
  onEnableAllPrimaryIntel,
  onSelectEntity,
  onRefreshFeed,
  onToggleRadioPlay,
  onToggleRadioMute,
  onOpenJplLayer,
  onOpenOsrmPlanner,
}: IntelHubPanelProps) {
  const [subTab, setSubTab] = useState<IntelSubTab>('udara');
  const [aircraftFilter, setAircraftFilter] = useState<'all' | 'civil' | 'military'>('all');
  const [quakeFilter, setQuakeFilter] = useState<'all' | 'bmkg' | 'felt' | 'usgs'>('all');
  const [cctvCity, setCctvCity] = useState<string>('all');
  const [gdeltQuery, setGdeltQuery] = useState('');
  const [selectedWxCity, setSelectedWxCity] = useState<string>('jkt');

  const anchorCoord = userLocation ?? mapCenter;
  const usingGps = userLocation !== null;

  const fmtKm = (lng: number, lat: number) => {
    const km = haversineKm(anchorCoord[0], anchorCoord[1], lng, lat);
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km).toLocaleString('id-ID')} km`;
  };

  // Auto-load dual weather when entering Bumi & Cuaca (prefer user GPS if available)
  useEffect(() => {
    if (subTab === 'bumi' && !feeds.weather.data && !feeds.weather.loading) {
      if (userLocation) {
        onRefreshFeed('weather', { lat: userLocation[1], lng: userLocation[0], city: 'Lokasi Saya (GPS)' });
      } else {
        const c = WEATHER_CITIES[0];
        onRefreshFeed('weather', { lat: c.lat, lng: c.lng, city: c.name });
      }
    }
  }, [subTab, feeds.weather.data, feeds.weather.loading, userLocation, onRefreshFeed]);

  const filteredAircraft = useMemo(() => {
    const base =
      aircraftFilter === 'all'
        ? feeds.aircraft.items
        : aircraftFilter === 'military'
          ? feeds.aircraft.items.filter((a) => a.category !== 'civil')
          : feeds.aircraft.items.filter((a) => a.category === 'civil');
    return [...base].sort(
      (a, b) =>
        haversineKm(anchorCoord[0], anchorCoord[1], a.lng, a.lat) -
        haversineKm(anchorCoord[0], anchorCoord[1], b.lng, b.lat),
    );
  }, [feeds.aircraft.items, aircraftFilter, anchorCoord[0], anchorCoord[1]]);

  const latestBmkg = useMemo(
    () => feeds.earthquakes.items.find((q) => q.isLatestBmkg) || feeds.earthquakes.items.find((q) => q.source === 'bmkg') || null,
    [feeds.earthquakes.items],
  );

  const filteredEarthquakes = useMemo(() => {
    const items = feeds.earthquakes.items;
    if (quakeFilter === 'bmkg') return items.filter((q) => q.source === 'bmkg');
    if (quakeFilter === 'felt') return items.filter((q) => Boolean(q.dirasakan));
    if (quakeFilter === 'usgs') return items.filter((q) => q.source !== 'bmkg');
    return items;
  }, [feeds.earthquakes.items, quakeFilter]);

  const cctvCities = useMemo(() => {
    const s = new Set(feeds.cctv.items.map((c) => c.city));
    return ['all', ...Array.from(s)];
  }, [feeds.cctv.items]);

  const filteredCctv = useMemo(() => {
    const base = cctvCity === 'all' ? feeds.cctv.items : feeds.cctv.items.filter((c) => c.city === cctvCity);
    return [...base].sort(
      (a, b) =>
        haversineKm(anchorCoord[0], anchorCoord[1], a.lng, a.lat) -
        haversineKm(anchorCoord[0], anchorCoord[1], b.lng, b.lat),
    );
  }, [feeds.cctv.items, cctvCity, anchorCoord[0], anchorCoord[1]]);

  const sortedAlpr = useMemo(
    () =>
      [...feeds.alpr.items].sort(
        (a, b) =>
          haversineKm(anchorCoord[0], anchorCoord[1], a.lng, a.lat) -
          haversineKm(anchorCoord[0], anchorCoord[1], b.lng, b.lat),
      ),
    [feeds.alpr.items, anchorCoord[0], anchorCoord[1]],
  );

  const activeLayerCount = Object.values(osintLayers).filter(Boolean).length;

  return (
    <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/80" data-testid="intel-hub-panel">
      {/* Header & Quick Activation */}
      <section className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              God Eye Indo · Intel &amp; OSINT
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pantauan ruang udara, orbit, seismik, cuaca, CCTV, ALPR, radio &amp; berita Indonesia.
            </p>
          </div>
          <button
            type="button"
            onClick={onEnableAllPrimaryIntel}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap shrink-0 transition-colors"
          >
            {activeLayerCount > 0 ? `${activeLayerCount} Aktif` : 'Aktifkan Radar'}
          </button>
        </div>

        {/* Current Location Radar Anchor Bar */}
        <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
          <div className="min-w-0 flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-slate-900 dark:text-white truncate">
                {usingGps ? 'Anchor: Lokasi GPS Saat Ini' : 'Anchor: Pusat Peta Saat Ini'}
              </div>
              <div className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
                {anchorCoord[1].toFixed(3)}, {anchorCoord[0].toFixed(3)} · radar jarak
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onLocateMe}
            disabled={locating}
            data-testid="intel-locate-btn"
            className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-1 whitespace-nowrap shrink-0 disabled:opacity-65"
          >
            {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <LocateFixed className="w-3 h-3" />}
            <span>{usingGps ? 'Perbarui' : 'GPS Saya'}</span>
          </button>
        </div>

        {/* Sub-category segmented bar */}
        <div
          role="tablist"
          aria-label="Kategori Intel OSINT"
          className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800"
        >
          {(
            [
              ['udara', 'Udara'],
              ['bumi', 'Bumi'],
              ['kota', 'Kota'],
              ['berita', 'Berita'],
            ] as [IntelSubTab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={subTab === id}
              data-testid={`intel-subtab-${id}`}
              onClick={() => setSubTab(id)}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                subTab === id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Live Radio Mini-Player Bar (sticks visibly inside Intel when a station is playing) */}
      {playingRadio && (
        <section
          aria-label="Pemutar Radio Browser Indonesia"
          className="px-4 py-2.5 bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-between gap-2"
        >
          <div className="min-w-0 flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">{playingRadio.name}</div>
              <div className="text-[10px] text-slate-300 font-mono truncate">
                {radioError || `${playingRadio.city} · ${playingRadio.codec} ${playingRadio.bitrate}k`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onToggleRadioMute}
              aria-label={radioMuted ? 'Bunyikan radio' : 'Bisukan radio'}
              className="p-1.5 rounded-lg hover:bg-slate-800 dark:hover:bg-slate-700"
            >
              {radioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => onToggleRadioPlay(playingRadio)}
              aria-label="Hentikan radio"
              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      )}

      {/* TAB 1: UDARA & ORBIT (OpenSky anon, adsb.lol, CelesTrak, Launch Library 2) */}
      {subTab === 'udara' && (
        <>
          {/* OpenSky anon + adsb.lol */}
          <section className="p-4 flex flex-col gap-2.5" data-testid="intel-aircraft-section">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Plane className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span className="truncate">OpenSky anon &amp; adsb.lol</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {sourceLabel(feeds.aircraft.mode)} · {feeds.aircraft.items.length} pesawat FIR Indonesia
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onRefreshFeed('aircraft')}
                  aria-label="Muat ulang data pesawat"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${feeds.aircraft.loading ? 'animate-spin' : ''}`} />
                </button>
                <LayerToggleBtn
                  active={osintLayers.aircraft}
                  onClick={() => onToggleOsintLayer('aircraft')}
                  label="Peta"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              {(
                [
                  ['all', `Semua (${feeds.aircraft.items.length})`],
                  ['civil', 'OpenSky Sipil'],
                  ['military', 'adsb.lol Mil'],
                ] as ['all' | 'civil' | 'military', string][]
              ).map(([id, lbl]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAircraftFilter(id)}
                  className={`py-1 rounded-md text-[11px] font-semibold whitespace-nowrap ${
                    aircraftFilter === id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/70 max-h-56 overflow-y-auto sepur-scroll">
              {filteredAircraft.slice(0, 14).map((a) => {
                const prof = resolveAircraftProfile(a);
                return (
                  <button
                    key={a.icao24}
                    type="button"
                    onClick={() => onSelectEntity({ type: 'aircraft', item: a })}
                    className="py-2 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-1 -mx-1 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {a.callsign}
                        </span>
                        <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300">
                          {prof.icaoType}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                          {prof.airlineName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {prof.modelName.split(' ').slice(0, 3).join(' ')} · {a.routeHint || a.originCountry} · {fmtKm(a.lng, a.lat)}
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        {a.velocityKmh} km/j
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {prof.flightLevel} · 3D →
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* CelesTrak Satellites */}
          <section className="p-4 flex flex-col gap-2.5" data-testid="intel-satellites-section">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Satellite className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                  <span className="truncate">CelesTrak · Satelit &amp; Orbit</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {sourceLabel(feeds.satellites.mode)} · Satria-1, Merah Putih, ISS, Himawari-9
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onRefreshFeed('satellites')}
                  aria-label="Muat ulang data satelit CelesTrak"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${feeds.satellites.loading ? 'animate-spin' : ''}`} />
                </button>
                <LayerToggleBtn
                  active={osintLayers.satellites}
                  onClick={() => onToggleOsintLayer('satellites')}
                  label="Orbit"
                />
              </div>
            </div>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/70 max-h-48 overflow-y-auto sepur-scroll">
              {feeds.satellites.items.slice(0, 10).map((s) => {
                const sProf = resolveSatelliteProfile(s);
                return (
                  <button
                    key={s.noradId}
                    type="button"
                    onClick={() => onSelectEntity({ type: 'satellite', item: s })}
                    className="py-2 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-1 -mx-1 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {s.name}
                        </span>
                        <span className="px-1 py-0.2 rounded text-[9px] font-mono font-bold bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 shrink-0">
                          {s.isGeo ? 'GEO' : 'LEO'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {sProf.missionRole}
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        {s.altitudeKm.toLocaleString('id-ID')} km
                      </div>
                      <div className="text-[10px] text-slate-500">{s.velocityKms} km/s · 3D →</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Launch Library 2 */}
          <section className="p-4 flex flex-col gap-2.5" data-testid="intel-launches-section">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
                  <span className="truncate">Launch Library 2</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {sourceLabel(feeds.launches.mode)} · Jadwal peluncuran &amp; Situs Biak
                </p>
              </div>
              <LayerToggleBtn
                active={osintLayers.launches}
                onClick={() => onToggleOsintLayer('launches')}
                label="Landasan"
              />
            </div>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/70">
              {feeds.launches.items.slice(0, 6).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => onSelectEntity({ type: 'launch', item: l })}
                  className="py-2 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-1 -mx-1 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {l.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {l.provider} · {l.orbit} · {l.status}
                    </div>
                  </div>
                  <span className="font-mono tabular-nums text-xs font-bold text-orange-600 dark:text-orange-400 shrink-0">
                    {formatLaunchCountdown(l.windowStart)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {/* TAB 2: BUMI & CUACA (BMKG Indonesia + USGS Earthquakes, NOAA GFS & ECMWF IFS Weather) */}
      {subTab === 'bumi' && (
        <>
          {/* BMKG Indonesia & USGS Earthquakes */}
          <section className="p-4 flex flex-col gap-2.5" data-testid="intel-earthquakes-section">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span className="truncate">Deteksi Gempa BMKG RI &amp; USGS</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {sourceLabel(feeds.earthquakes.mode)} · {feeds.earthquakes.items.length} kejadian seismik Indonesia
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onRefreshFeed('earthquakes')}
                  aria-label="Muat ulang data gempa BMKG dan USGS"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${feeds.earthquakes.loading ? 'animate-spin' : ''}`} />
                </button>
                <LayerToggleBtn
                  active={osintLayers.earthquakes}
                  onClick={() => onToggleOsintLayer('earthquakes')}
                  label="Episenter"
                />
              </div>
            </div>

            {/* BMKG AutoGempa Latest Spotlight */}
            {latestBmkg && (
              <button
                type="button"
                onClick={() => onSelectEntity({ type: 'earthquake', item: latestBmkg })}
                data-testid="bmkg-autogempa-card"
                className="w-full p-3 rounded-xl border border-rose-300/90 dark:border-rose-900/70 bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-50 dark:hover:bg-rose-950/45 text-left transition-colors flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white">
                    BMKG AUTOGEMPA TERBARU
                  </span>
                  <span className="font-mono tabular-nums text-xs font-extrabold text-rose-700 dark:text-rose-300">
                    M {latestBmkg.mag.toFixed(1)} · {latestBmkg.depthKm} km
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                  {latestBmkg.place}
                </div>
                {latestBmkg.tsunami && (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-red-700 dark:text-red-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{latestBmkg.potensi}</span>
                  </div>
                )}
                {latestBmkg.dirasakan && (
                  <div className="text-[11px] text-slate-700 dark:text-slate-300">
                    Dirasakan (MMI): <strong className="font-semibold">{latestBmkg.dirasakan}</strong>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-mono tabular-nums pt-1 border-t border-rose-200/70 dark:border-rose-900/50">
                  <span>{latestBmkg.waktuWib || 'BMKG TEWS'}</span>
                  <span className="font-semibold text-rose-700 dark:text-rose-300">
                    {fmtKm(latestBmkg.lng, latestBmkg.lat)} · Shakemap →
                  </span>
                </div>
              </button>
            )}

            {/* Source filter */}
            <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              {(
                [
                  ['all', 'Semua'],
                  ['bmkg', 'BMKG RI'],
                  ['felt', 'Dirasakan'],
                  ['usgs', 'USGS'],
                ] as ['all' | 'bmkg' | 'felt' | 'usgs', string][]
              ).map(([id, lbl]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setQuakeFilter(id)}
                  className={`py-1 rounded-md text-[11px] font-semibold whitespace-nowrap ${
                    quakeFilter === id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/70 max-h-60 overflow-y-auto sepur-scroll">
              {filteredEarthquakes.slice(0, 18).map((eq) => (
                <button
                  key={eq.id}
                  type="button"
                  onClick={() => onSelectEntity({ type: 'earthquake', item: eq })}
                  className="py-2 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-1 -mx-1 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1 py-0.2 rounded text-[9px] font-bold shrink-0 ${
                          eq.source === 'bmkg'
                            ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {eq.source === 'bmkg' ? 'BMKG' : 'USGS'}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {eq.place}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5 truncate">
                      {eq.depthKm} km · {fmtKm(eq.lng, eq.lat)} ·{' '}
                      {eq.waktuWib ||
                        new Date(eq.timeMs).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                  <span
                    className={`font-mono tabular-nums text-xs font-bold shrink-0 ${
                      eq.mag >= 5.5
                        ? 'text-rose-600 dark:text-rose-400'
                        : eq.mag >= 4.5
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    M {eq.mag.toFixed(1)}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* NOAA GFS vs ECMWF IFS Weather */}
          <section className="p-4 flex flex-col gap-3" data-testid="intel-weather-section">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CloudSun className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">Cuaca NOAA GFS &amp; ECMWF IFS</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Komparasi dua model numerik global untuk lokasimu &amp; kota Indonesia
                </p>
              </div>
              <LayerToggleBtn
                active={osintLayers.weatherNodes}
                onClick={() => onToggleOsintLayer('weatherNodes')}
                label="Titik Kota"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <select
                aria-label="Pilih kota Indonesia untuk komparasi cuaca NOAA dan ECMWF"
                value={selectedWxCity}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedWxCity(id);
                  const found = WEATHER_CITIES.find((c) => c.id === id);
                  if (found) onRefreshFeed('weather', { lat: found.lat, lng: found.lng, city: found.name });
                }}
                className="flex-1 px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                {WEATHER_CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  onRefreshFeed('weather', {
                    lat: anchorCoord[1],
                    lng: anchorCoord[0],
                    city: usingGps ? 'Lokasi Saya (GPS)' : 'Pusat Peta',
                  })
                }
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/70 whitespace-nowrap"
              >
                {usingGps ? 'Lokasi Saya' : 'Pusat Peta'}
              </button>
            </div>

            {feeds.weather.loading && !feeds.weather.data ? (
              <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengambil model NOAA GFS &amp; ECMWF…</span>
              </div>
            ) : feeds.weather.data ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>
                    Lokasi: <strong className="text-slate-800 dark:text-slate-200">{feeds.weather.data.city}</strong>
                  </span>
                  <span className="font-mono">{sourceLabel(feeds.weather.data.sourceMode)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[feeds.weather.data.noaa, feeds.weather.data.ecmwf].map((m) => {
                    const desc = describeWmoWeather(m.weatherCode, true);
                    return (
                      <div
                        key={m.model}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col gap-1.5"
                      >
                        <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          {m.model}
                        </div>
                        <div>
                          <div className="font-mono tabular-nums text-2xl font-bold leading-none text-slate-900 dark:text-white">
                            {m.tempC}°
                          </div>
                          <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mt-1">
                            {desc.label}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono tabular-nums space-y-0.5 pt-1 border-t border-slate-200/70 dark:border-slate-700/60">
                          <div>Angin: {m.windKmh} km/j {formatWindCompass(m.windDirDeg)}</div>
                          <div>Hujan 6j: {m.next6hPrecipMm} mm</div>
                          <div>Tekanan: {m.pressureHpa} hPa</div>
                          <div>Awan / RH: {m.cloudPct}% / {m.humidityPct}%</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  Selisih suhu NOAA vs ECMWF:{' '}
                  {Math.abs(feeds.weather.data.noaa.tempC - feeds.weather.data.ecmwf.tempC).toFixed(1)} °C ·
                  Selisih hujan 6 jam:{' '}
                  {Math.abs(feeds.weather.data.noaa.next6hPrecipMm - feeds.weather.data.ecmwf.next6hPrecipMm).toFixed(1)} mm
                </p>
              </div>
            ) : null}
          </section>
        </>
      )}

      {/* TAB 3: KOTA & MEDIA (City CCTV, Radio Browser, OSM ALPR, GBFS) */}
      {subTab === 'kota' && (
        <>
          {/* City CCTV Indonesia */}
          <section className="p-4 flex flex-col gap-2.5" data-testid="intel-cctv-section">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">City CCTV Indonesia (ATCS &amp; Tol)</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {feeds.cctv.items.length} titik kamera kota &amp; jalan tol Nusantara
                </p>
              </div>
              <LayerToggleBtn
                active={osintLayers.cctv}
                onClick={() => onToggleOsintLayer('cctv')}
                label="Peta"
              />
            </div>

            <select
              aria-label="Filter kota CCTV"
              value={cctvCity}
              onChange={(e) => setCctvCity(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              {cctvCities.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'Semua Kota Indonesia' : c}
                </option>
              ))}
            </select>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/70 max-h-44 overflow-y-auto sepur-scroll">
              {filteredCctv.map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => onSelectEntity({ type: 'cctv', item: cam })}
                  className="py-2 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-1 -mx-1 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {cam.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {cam.city} · {cam.operator}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                    {fmtKm(cam.lng, cam.lat)}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Radio Browser Indonesia */}
          <section className="p-4 flex flex-col gap-2.5" data-testid="intel-radio-section">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span className="truncate">Radio Browser Indonesia</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {sourceLabel(feeds.radio.mode)} · {feeds.radio.items.length} stasiun siaran langsung
                </p>
              </div>
              <LayerToggleBtn
                active={osintLayers.radio}
                onClick={() => onToggleOsintLayer('radio')}
                label="Pemancar"
              />
            </div>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/70 max-h-48 overflow-y-auto sepur-scroll">
              {feeds.radio.items.slice(0, 12).map((rad) => {
                const isPlaying = playingRadio?.id === rad.id;
                return (
                  <div key={rad.id} className="py-2 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectEntity({ type: 'radio', item: rad })}
                      className="min-w-0 flex-1 text-left hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {rad.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {rad.city} · {rad.codec} {rad.bitrate}k
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleRadioPlay(rad)}
                      aria-label={isPlaying ? `Hentikan ${rad.name}` : `Putar ${rad.name}`}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isPlaying
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* OpenStreetMap ALPR / ETLE Mapping */}
          <section className="p-4 flex flex-col gap-2.5" data-testid="intel-alpr-section">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate">OpenStreetMap ALPR / ETLE</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {sourceLabel(feeds.alpr.mode)} · {feeds.alpr.items.length} kamera plat nomor &amp; speed camera
                </p>
              </div>
              <LayerToggleBtn
                active={osintLayers.alpr}
                onClick={() => onToggleOsintLayer('alpr')}
                label="ALPR"
              />
            </div>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/70 max-h-40 overflow-y-auto sepur-scroll">
              {sortedAlpr.slice(0, 12).map((cam) => (
                <button
                  key={cam.id}
                  type="button"
                  onClick={() => onSelectEntity({ type: 'alpr', item: cam })}
                  className="py-2 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-1 -mx-1"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {cam.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {cam.road} · {cam.city}
                    </div>
                  </div>
                  <span className="font-mono tabular-nums text-[11px] text-amber-700 dark:text-amber-400 shrink-0">
                    {fmtKm(cam.lng, cam.lat)}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* GBFS Micromobility */}
          <section className="p-4 flex flex-col gap-2.5" data-testid="intel-gbfs-section">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span className="truncate">GBFS · Sepeda &amp; Mikromobilitas</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {feeds.gbfs.items.length} stasiun GBFS Jakarta, Bandung, Jogja, Surabaya, Bali
                </p>
              </div>
              <LayerToggleBtn
                active={osintLayers.gbfs}
                onClick={() => onToggleOsintLayer('gbfs')}
                label="GBFS"
              />
            </div>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/70 max-h-40 overflow-y-auto sepur-scroll">
              {feeds.gbfs.items.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => onSelectEntity({ type: 'gbfs', item: st })}
                  className="py-2 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-1 -mx-1"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {st.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {st.city} · {st.network}
                    </div>
                  </div>
                  <span className="font-mono tabular-nums text-[11px] font-semibold text-teal-700 dark:text-teal-400 shrink-0">
                    {st.bikesAvailable} unit · {st.docksAvailable} dock
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {/* TAB 4: BERITA & DATA (GDELT News, Transit Feeds, OSRM Shortcut, Bundled Datasets) */}
      {subTab === 'berita' && (
        <>
          {/* GDELT News Events */}
          <section className="p-4 flex flex-col gap-2.5" data-testid="intel-gdelt-section">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Newspaper className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate">GDELT News Events Indonesia</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {sourceLabel(feeds.gdelt.mode)} · Pemantauan peristiwa &amp; media nasional
                </p>
              </div>
              <LayerToggleBtn
                active={osintLayers.gdelt}
                onClick={() => onToggleOsintLayer('gdelt')}
                label="Pin Berita"
              />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onRefreshFeed('gdelt', { query: gdeltQuery });
              }}
              className="flex gap-1.5"
            >
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  aria-label="Cari topik berita GDELT Indonesia"
                  placeholder="Filter topik (mis. kereta, gempa, IKN)…"
                  value={gdeltQuery}
                  onChange={(e) => setGdeltQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-blue-600 text-white whitespace-nowrap"
              >
                Cari
              </button>
            </form>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/70 max-h-56 overflow-y-auto sepur-scroll">
              {feeds.gdelt.items.slice(0, 12).map((ev) => {
                const safeHref = sanitizeExternalUrl(ev.url);
                return (
                  <div key={ev.id} className="py-2 flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectEntity({ type: 'gdelt', item: ev })}
                      className="min-w-0 flex-1 text-left hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <div className="text-xs font-semibold text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {ev.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {ev.source} · {ev.location}
                      </div>
                    </button>
                    {safeHref && (
                      <a
                        href={safeHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Buka artikel ${ev.source}`}
                        className="p-1.5 text-slate-400 hover:text-blue-600 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Transit Feeds Indonesia + OSRM Quick Link */}
          <section className="p-4 flex flex-col gap-2.5" data-testid="intel-transit-section">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Bus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="truncate">Transit Feeds &amp; OSRM Indonesia</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {feeds.transitFeeds.items.length} jaringan GTFS &amp; jadwal publik
                </p>
              </div>
              <LayerToggleBtn
                active={osintLayers.transitFeeds}
                onClick={() => onToggleOsintLayer('transitFeeds')}
                label="Koridor"
              />
            </div>

            <button
              type="button"
              onClick={onOpenOsrmPlanner}
              className="w-full py-2 px-3 rounded-lg border border-blue-200 dark:border-blue-800/80 bg-blue-50/60 dark:bg-blue-950/40 text-xs font-semibold text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-colors flex items-center justify-between gap-2"
            >
              <span className="whitespace-nowrap">Rute Jalan OSRM</span>
              <span className="font-mono text-[11px] whitespace-nowrap">Mobil · Sepeda · Kaki →</span>
            </button>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/70 max-h-44 overflow-y-auto sepur-scroll">
              {feeds.transitFeeds.items.map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => onSelectEntity({ type: 'transit', item: tf })}
                  className="py-2 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-1 -mx-1"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {tf.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {tf.region} · {tf.format}
                    </div>
                  </div>
                  <span className="font-mono tabular-nums text-[11px] text-slate-500 shrink-0">
                    {tf.routesCount} rute
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Bundled Datasets Manager */}
          <section className="p-4 flex flex-col gap-2.5" data-testid="intel-datasets-section">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 shrink-0" />
                  <span>Bundled Datasets Indonesia</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {feeds.datasets.items.length} bundel data lokal offline-ready (JSON / GAPEKA / OSM)
                </p>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800/70">
              {feeds.datasets.items.map((ds) => (
                <div key={ds.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {ds.title}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {ds.coverage} · {ds.records.toLocaleString('id-ID')} entri · {ds.format}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {ds.layerKey === 'jpl' && (
                      <button
                        type="button"
                        onClick={onOpenJplLayer}
                        className="px-2 py-1 rounded-md text-[10px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        Peta
                      </button>
                    )}
                    <a
                      href={ds.url}
                      download
                      aria-label={`Unduh dataset ${ds.title}`}
                      className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
