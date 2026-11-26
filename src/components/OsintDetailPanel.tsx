import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bike,
  Box,
  Bus,
  Camera,
  ExternalLink,
  Image as ImageIcon,
  Newspaper,
  Pause,
  Plane,
  Play,
  Radio,
  Rocket,
  Satellite,
  ShieldAlert,
  X,
} from 'lucide-react';
import { resolveAircraftProfile, resolveSatelliteProfile } from '../engine/aerospaceCatalog';
import { formatLaunchCountdown, haversineKm, sanitizeExternalUrl } from '../engine/osintParsers';
import type { OsintEntitySelection, RadioStationNode } from '../engine/osintTypes';
import { Aerospace3DViewer } from './Aerospace3DViewer';
import { AEROSPACE_PHOTOS } from './aerospacePhotos';

interface OsintDetailPanelProps {
  selection: OsintEntitySelection;
  anchorCoord?: [number, number];
  usingGps?: boolean;
  playingRadioId: string | null;
  onBack: () => void;
  onPlayRadio: (station: RadioStationNode) => void;
  onFocusCoords: (lng: number, lat: number, zoom?: number) => void;
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800/80 last:border-0 text-xs">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 text-right">
        {value}
      </span>
    </div>
  );
}

export function OsintDetailPanel({
  selection,
  anchorCoord,
  usingGps = false,
  playingRadioId,
  onBack,
  onPlayRadio,
  onFocusCoords,
}: OsintDetailPanelProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [shakemapErr, setShakemapErr] = useState(false);
  const [mediaView, setMediaView] = useState<'3d' | 'photo'>('3d');
  const [expanded3d, setExpanded3d] = useState(false);

  const selectionKey =
    selection.type === 'aircraft'
      ? `ac-${selection.item.icao24}`
      : selection.type === 'satellite'
        ? `sat-${selection.item.noradId}`
        : selection.type === 'earthquake'
          ? `eq-${selection.item.id}`
          : selection.type;

  useEffect(() => {
    setShakemapErr(false);
    setMediaView('3d');
    setExpanded3d(false);
    const scroller = rootRef.current?.closest('.sepur-scroll');
    if (scroller) scroller.scrollTop = 0;
  }, [selectionKey]);

  const distLabel = usingGps ? 'Jarak dari Lokasimu' : 'Jarak dari Pusat Peta';
  const formatDist = (lng: number, lat: number): string | null => {
    if (!anchorCoord) return null;
    const km = haversineKm(anchorCoord[0], anchorCoord[1], lng, lat);
    if (!usingGps && km < 0.5) return null;
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km).toLocaleString('id-ID')} km`;
  };

  const renderContent = () => {
    switch (selection.type) {
      case 'aircraft': {
        const a = selection.item;
        const profile = resolveAircraftProfile(a);
        const photo = AEROSPACE_PHOTOS[profile.photoKey];
        const dist = formatDist(a.lng, a.lat);
        return (
          <>
            <div className="flex items-start gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white shadow-2xs"
                style={{ backgroundColor: profile.livery.tail }}
              >
                <Plane className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white font-mono truncate">
                    {a.callsign}
                  </h2>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300">
                    {profile.icaoType}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {profile.flightLevel}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5 truncate">
                  {profile.airlineName} · {profile.modelName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {a.source === 'adsb.lol' ? 'adsb.lol' : 'OpenSky anon'} · {profile.flightPhase}
                </p>
              </div>
            </div>

            {/* Interactive 3D & Photo Switcher */}
            <div className="flex flex-col gap-2">
              <div
                role="tablist"
                aria-label="Mode Visualisasi Pesawat"
                className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mediaView === '3d'}
                  data-testid="aircraft-tab-3d"
                  onClick={() => setMediaView('3d')}
                  className={`py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                    mediaView === '3d'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Model 3D</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mediaView === 'photo'}
                  data-testid="aircraft-tab-photo"
                  onClick={() => setMediaView('photo')}
                  className={`py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                    mediaView === 'photo'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Foto Pesawat</span>
                </button>
              </div>

              {mediaView === '3d' ? (
                <Aerospace3DViewer
                  mode="aircraft"
                  aircraftModelType={profile.model3dType}
                  aircraftLivery={profile.livery}
                  title={profile.modelName}
                  subtitle={`${profile.airlineName} · ${profile.icaoType}`}
                  heightClass="h-56"
                  onExpand={() => setExpanded3d(true)}
                  testId="aircraft-3d-canvas"
                />
              ) : (
                <figure
                  data-testid="aircraft-photo-card"
                  className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950"
                >
                  <img
                    src={photo.src}
                    alt={`${profile.modelName} — ${profile.airlineName}`}
                    className="w-full h-56 object-cover block"
                  />
                  <figcaption className="px-3 py-2 text-[11px] text-slate-300 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
                    <span className="truncate">{photo.caption}</span>
                    <span className="font-mono text-[10px] text-sky-400 shrink-0">{profile.icaoType}</span>
                  </figcaption>
                </figure>
              )}
            </div>

            {/* Live Flight Telemetry Strip */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Ketinggian
                </div>
                <div className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {profile.altitudeFt.toLocaleString('id-ID')} ft
                </div>
                <div className="font-mono tabular-nums text-[10px] text-slate-500 dark:text-slate-400">
                  {a.altitudeM.toLocaleString('id-ID')} m · {profile.flightLevel}
                </div>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Kecepatan
                </div>
                <div className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {a.velocityKmh} km/j
                </div>
                <div className="font-mono tabular-nums text-[10px] text-slate-500 dark:text-slate-400">
                  {profile.speedKnots} kt · {profile.machEstimate}
                </div>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Haluan &amp; Vertikal
                </div>
                <div className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {a.heading}° · {a.verticalRate >= 0 ? '+' : ''}{a.verticalRate} m/s
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {profile.flightPhase}
                </div>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Rute / Posisi
                </div>
                <div className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                  {a.routeHint || a.originCountry}
                </div>
                <div className="font-mono tabular-nums text-[10px] text-slate-500 dark:text-slate-400">
                  {dist ? `${dist} dari radar` : `Squawk ${a.squawk || '—'}`}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {profile.summary}
            </p>

            {/* Full Aircraft Type & Technical Specifications */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                Spesifikasi Jenis Pesawat
              </div>
              <MetricRow label="Jenis / Model" value={profile.modelName} />
              <MetricRow label="Kelas Pesawat" value={profile.aircraftClass} />
              <MetricRow label="Pabrikan" value={profile.manufacturer} />
              <MetricRow label="Operator / Maskapai" value={profile.airlineName} />
              <MetricRow label="Mesin Penggerak" value={profile.engines} />
              <MetricRow label="Kapasitas" value={profile.capacity} />
              <MetricRow label="Rentang Sayap / Panjang" value={`${profile.wingspanM} / ${profile.lengthM}`} />
              <MetricRow label="Kecepatan Jelajah Maks" value={profile.cruiseSpeedKmh} />
              <MetricRow label="Plafon / Jarak Tempuh" value={`${profile.maxCeilingFt} · ${profile.rangeKm}`} />
              <MetricRow label="ICAO24 / Squawk" value={`${a.icao24.toUpperCase()} · ${a.squawk || '—'}`} />
              {dist && <MetricRow label={distLabel} value={dist} />}
              <MetricRow label="Koordinat" value={`${a.lat.toFixed(4)}, ${a.lng.toFixed(4)}`} />
            </div>

            <button
              type="button"
              onClick={() => onFocusCoords(a.lng, a.lat, 9.5)}
              className="w-full py-2 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
            >
              Pusatkan Peta ke Pesawat
            </button>

            {expanded3d &&
              createPortal(
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Inspeksi 3D ${profile.modelName}`}
                  data-testid="aerospace-3d-modal"
                  className="fixed inset-0 z-[100] bg-slate-950/80 flex items-center justify-center p-4 sm:p-6"
                  onClick={() => setExpanded3d(false)}
                >
                  <div
                    className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white truncate">
                          {a.callsign} · {profile.modelName}
                        </h3>
                        <p className="text-xs text-slate-400 truncate">
                          {profile.airlineName} · {profile.aircraftClass} · {profile.engines}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpanded3d(false)}
                        aria-label="Tutup tampilan 3D penuh"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-3 bg-slate-950">
                      <Aerospace3DViewer
                        mode="aircraft"
                        aircraftModelType={profile.model3dType}
                        aircraftLivery={profile.livery}
                        title={`${profile.airlineName} — ${profile.modelName}`}
                        subtitle={`${profile.flightLevel} · ${a.velocityKmh} km/j · ${profile.machEstimate}`}
                        heightClass="h-[64vh] min-h-[380px]"
                        testId="aircraft-3d-modal-canvas"
                      />
                    </div>
                  </div>
                </div>,
                document.body,
              )}
          </>
        );
      }

      case 'earthquake': {
        const eq = selection.item;
        const safeUrl = sanitizeExternalUrl(eq.url);
        const isBmkg = eq.source === 'bmkg';
        const dtStr =
          eq.waktuWib ||
          `${new Date(eq.timeMs).toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })} WIB`;
        const dist = formatDist(eq.lng, eq.lat);
        return (
          <>
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Gempa M {eq.mag.toFixed(1)}
                  </h2>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isBmkg
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {isBmkg ? (eq.isLatestBmkg ? 'BMKG TERBARU' : 'BMKG RI') : 'USGS'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  {eq.place}
                </p>
              </div>
            </div>

            {eq.tsunami && (
              <div className="p-2.5 rounded-xl bg-red-600 text-white text-xs font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{eq.potensi || 'Waspada potensi tsunami — ikuti arahan resmi BMKG.'}</span>
              </div>
            )}

            {eq.shakemapUrl && !shakemapErr && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950">
                <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <span>Peta Guncangan (Shakemap BMKG)</span>
                  <span className="font-mono text-[10px] text-slate-400">TEWS</span>
                </div>
                <img
                  src={eq.shakemapUrl}
                  alt={`Peta guncangan BMKG ${eq.place}`}
                  onError={() => setShakemapErr(true)}
                  className="w-full h-auto max-h-64 object-contain bg-white"
                />
              </div>
            )}

            <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
              <MetricRow label="Sumber Data" value={isBmkg ? 'BMKG Indonesia (InaTEWS)' : 'USGS Earthquake Hazards'} />
              <MetricRow label="Waktu (WIB)" value={dtStr} />
              <MetricRow label="Magnitudo" value={`M ${eq.mag.toFixed(1)}`} />
              <MetricRow label="Kedalaman" value={`${eq.depthKm} km`} />
              {dist && <MetricRow label={distLabel} value={dist} />}
              <MetricRow
                label="Potensi / Status"
                value={eq.potensi || (eq.tsunami ? 'Waspada / Flag Aktif' : 'Tidak berpotensi tsunami')}
              />
              {eq.dirasakan && <MetricRow label="Dirasakan (MMI)" value={eq.dirasakan} />}
              <MetricRow
                label="Episenter"
                value={
                  eq.lintang && eq.bujur
                    ? `${eq.lintang}, ${eq.bujur}`
                    : `${eq.lat.toFixed(3)}, ${eq.lng.toFixed(3)}`
                }
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onFocusCoords(eq.lng, eq.lat, 8.2)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
              >
                Pusatkan Episenter
              </button>
              {safeUrl && (
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1"
                >
                  <span>{isBmkg ? 'BMKG' : 'USGS'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </>
        );
      }

      case 'satellite': {
        const s = selection.item;
        const profile = resolveSatelliteProfile(s);
        const photo = AEROSPACE_PHOTOS[profile.photoKey];
        return (
          <>
            <div className="flex items-start gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white shadow-2xs"
                style={{ backgroundColor: profile.accentColor }}
              >
                <Satellite className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {profile.displayName}
                  </h2>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300">
                    {s.isGeo ? 'GEO' : 'LEO'}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                  {profile.operatorFull}
                </p>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  CelesTrak GP · NORAD #{s.noradId} · {profile.country}
                </p>
              </div>
            </div>

            {/* Interactive 3D & Photo Switcher */}
            <div className="flex flex-col gap-2">
              <div
                role="tablist"
                aria-label="Mode Visualisasi Satelit"
                className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mediaView === '3d'}
                  data-testid="satellite-tab-3d"
                  onClick={() => setMediaView('3d')}
                  className={`py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                    mediaView === '3d'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>Model 3D</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mediaView === 'photo'}
                  data-testid="satellite-tab-photo"
                  onClick={() => setMediaView('photo')}
                  className={`py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${
                    mediaView === 'photo'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Foto Satelit</span>
                </button>
              </div>

              {mediaView === '3d' ? (
                <Aerospace3DViewer
                  mode="satellite"
                  satelliteModelType={profile.model3dType}
                  satelliteAccent={profile.accentColor}
                  title={s.name}
                  subtitle={`${s.isGeo ? 'GEO' : 'LEO'} · ${s.altitudeKm.toLocaleString('id-ID')} km`}
                  heightClass="h-56"
                  onExpand={() => setExpanded3d(true)}
                  testId="satellite-3d-canvas"
                />
              ) : (
                <figure
                  data-testid="satellite-photo-card"
                  className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950"
                >
                  <img
                    src={photo.src}
                    alt={profile.displayName}
                    className="w-full h-56 object-cover block"
                  />
                  <figcaption className="px-3 py-2 text-[11px] text-slate-300 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
                    <span className="truncate">{photo.caption}</span>
                    <span className="font-mono text-[10px] text-violet-400 shrink-0">#{s.noradId}</span>
                  </figcaption>
                </figure>
              )}
            </div>

            {/* Orbital Telemetry Strip */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Ketinggian Orbit
                </div>
                <div className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {s.altitudeKm.toLocaleString('id-ID')} km
                </div>
                <div className="font-mono tabular-nums text-[10px] text-slate-500 dark:text-slate-400">
                  Inklinasi {s.inclinationDeg}°
                </div>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Kecepatan Orbital
                </div>
                <div className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {s.velocityKms} km/s
                </div>
                <div className="font-mono tabular-nums text-[10px] text-slate-500 dark:text-slate-400">
                  {Math.round(s.velocityKms * 3600).toLocaleString('id-ID')} km/j
                </div>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Periode Orbit
                </div>
                <div className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {profile.orbitalPeriodMin >= 120
                    ? `${(profile.orbitalPeriodMin / 60).toFixed(1)} jam`
                    : `${profile.orbitalPeriodMin} mnt`}
                </div>
                <div className="font-mono tabular-nums text-[10px] text-slate-500 dark:text-slate-400">
                  {profile.orbitsPerDay} orbit / hari
                </div>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Radius Tapak (Footprint)
                </div>
                <div className="font-mono tabular-nums text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {profile.footprintRadiusKm.toLocaleString('id-ID')} km
                </div>
                <div className="font-mono tabular-nums text-[10px] text-slate-500 dark:text-slate-400">
                  RTT RF ~{profile.signalLatencyMs} ms
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {profile.summary}
            </p>

            {/* Full Satellite Mission & Technical Specifications */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                Spesifikasi Wahana &amp; Misi Satelit
              </div>
              <MetricRow label="Peran Misi" value={profile.missionRole} />
              <MetricRow label="Operator" value={profile.operatorFull} />
              <MetricRow label="Kelas Orbit" value={profile.orbitClass} />
              <MetricRow label="Pita Frekuensi / Sensor" value={profile.frequencyBand} />
              <MetricRow label="Tahun Peluncuran" value={profile.launchYear} />
              <MetricRow label="Roket Peluncur" value={profile.launchVehicle} />
              <MetricRow label="Massa Wahana" value={profile.launchMassKg} />
              <MetricRow label="Cakupan Wilayah" value={profile.coverageSummary} />
              <MetricRow label="Status Indonesia" value={s.overIndonesia ? 'Aktif di atas wilayah Indonesia' : 'Lintasan global'} />
              <MetricRow label="Titik Sub-Satelit" value={`${s.lat.toFixed(3)}, ${s.lng.toFixed(3)}`} />
            </div>

            <button
              type="button"
              onClick={() => onFocusCoords(s.lng, s.lat, 5.2)}
              className="w-full py-2 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
            >
              Ikuti Posisi Satelit di Peta
            </button>

            {expanded3d &&
              createPortal(
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Inspeksi 3D ${profile.displayName}`}
                  data-testid="aerospace-3d-modal"
                  className="fixed inset-0 z-[100] bg-slate-950/80 flex items-center justify-center p-4 sm:p-6"
                  onClick={() => setExpanded3d(false)}
                >
                  <div
                    className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white truncate">
                          {profile.displayName}
                        </h3>
                        <p className="text-xs text-slate-400 truncate">
                          {profile.operatorFull} · {profile.orbitClass} · NORAD #{s.noradId}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpanded3d(false)}
                        aria-label="Tutup tampilan 3D penuh"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-3 bg-slate-950">
                      <Aerospace3DViewer
                        mode="satellite"
                        satelliteModelType={profile.model3dType}
                        satelliteAccent={profile.accentColor}
                        title={profile.displayName}
                        subtitle={`${s.altitudeKm.toLocaleString('id-ID')} km · ${s.velocityKms} km/s · ${profile.frequencyBand}`}
                        heightClass="h-[64vh] min-h-[380px]"
                        testId="satellite-3d-modal-canvas"
                      />
                    </div>
                  </div>
                </div>,
                document.body,
              )}
          </>
        );
      }

      case 'cctv': {
        const c = selection.item;
        const safeUrl = sanitizeExternalUrl(c.streamPageUrl);
        return (
          <>
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{c.name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {c.city}, {c.province} · {c.operator}
                </p>
              </div>
            </div>

            {/* Clean Telemetry Monitor Frame (never broken external image) */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-emerald-400 font-semibold">● FEED TERDAFTAR · {c.id.toUpperCase()}</span>
                <span className="text-slate-400">{c.lat.toFixed(4)}, {c.lng.toFixed(4)}</span>
              </div>
              <div className="h-28 rounded-lg bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center px-4 gap-1.5">
                <Camera className="w-6 h-6 text-slate-400" />
                <p className="text-xs font-semibold text-slate-200">{c.road}</p>
                <p className="text-[11px] text-slate-400">
                  Koridor {c.corridor} · Buka portal resmi ATCS/Dishub untuk tayangan RTSP/HLS langsung.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
              <MetricRow label="Operator" value={c.operator} />
              <MetricRow label="Ruas Jalan" value={c.road} />
              <MetricRow label="Koridor" value={c.corridor} />
              {formatDist(c.lng, c.lat) && <MetricRow label={distLabel} value={formatDist(c.lng, c.lat)!} />}
              <MetricRow label="Status Node" value={c.status === 'online' ? 'Aktif (Terdata)' : 'Pemeliharaan'} />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onFocusCoords(c.lng, c.lat, 15.2)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
              >
                Zoom Lokasi CCTV
              </button>
              {safeUrl && (
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1"
                >
                  <span>Portal ATCS</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </>
        );
      }

      case 'alpr': {
        const cam = selection.item;
        const osmLink = cam.osmId.startsWith('node/') && /^\d+$/.test(cam.osmId.slice(5))
          ? `https://www.openstreetmap.org/${cam.osmId}`
          : `https://www.openstreetmap.org/?mlat=${cam.lat}&mlon=${cam.lng}#map=17/${cam.lat}/${cam.lng}`;
        return (
          <>
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{cam.name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  OSM ALPR / ETLE · {cam.city}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
              <MetricRow label="Ruas Jalan" value={cam.road} />
              <MetricRow label="Tipe Kamera" value={cam.cameraType} />
              <MetricRow label="Pengelola" value={cam.operator} />
              <MetricRow label="Arah Pantauan" value={cam.direction} />
              {cam.speedLimitKmh && <MetricRow label="Batas Kecepatan" value={`${cam.speedLimitKmh} km/j`} />}
              {formatDist(cam.lng, cam.lat) && <MetricRow label={distLabel} value={formatDist(cam.lng, cam.lat)!} />}
              <MetricRow label="Referensi OSM" value={cam.osmId} />
              <MetricRow label="Koordinat" value={`${cam.lat.toFixed(5)}, ${cam.lng.toFixed(5)}`} />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onFocusCoords(cam.lng, cam.lat, 15.8)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
              >
                Zoom Titik ALPR
              </button>
              <a
                href={osmLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1"
              >
                <span>OSM</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </>
        );
      }

      case 'gbfs': {
        const st = selection.item;
        return (
          <>
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Bike className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{st.name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {st.network} · {st.city}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <div className="font-mono tabular-nums text-lg font-bold text-teal-600 dark:text-teal-400">
                  {st.bikesAvailable}
                </div>
                <div className="text-[11px] text-slate-500">Sepeda</div>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <div className="font-mono tabular-nums text-lg font-bold text-blue-600 dark:text-blue-400">
                  {st.ebikesAvailable}
                </div>
                <div className="text-[11px] text-slate-500">E-Bike</div>
              </div>
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
                <div className="font-mono tabular-nums text-lg font-bold text-slate-900 dark:text-white">
                  {st.docksAvailable}
                </div>
                <div className="text-[11px] text-slate-500">Dock Kosong</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onFocusCoords(st.lng, st.lat, 15.5)}
              className="w-full py-2 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
            >
              Zoom Hub GBFS
            </button>
          </>
        );
      }

      case 'radio': {
        const rad = selection.item;
        const isPlaying = playingRadioId === rad.id;
        const safeHome = sanitizeExternalUrl(rad.homepage);
        return (
          <>
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Radio className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{rad.name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Radio Browser Indonesia · {rad.city}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
              <MetricRow label="Format / Bitrate" value={`${rad.codec} · ${rad.bitrate} kbps`} />
              <MetricRow label="Kategori" value={rad.tags || 'Indonesia'} />
              <MetricRow label="Dukungan Komunitas" value={`${rad.votes} votes`} />
              <MetricRow label="Koordinat Pemancar" value={`${rad.lat.toFixed(4)}, ${rad.lng.toFixed(4)}`} />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onPlayRadio(rad)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-1.5"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? 'Hentikan Siaran' : 'Putar Radio Langsung'}</span>
              </button>
              {safeHome && (
                <a
                  href={safeHome}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1"
                >
                  <span>Web</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </>
        );
      }

      case 'launch': {
        const l = selection.item;
        const safeUrl = sanitizeExternalUrl(l.url);
        return (
          <>
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                <Rocket className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{l.name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Launch Library 2 · {l.provider}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{l.mission}</p>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
              <MetricRow label="Hitung Mundur" value={formatLaunchCountdown(l.windowStart)} />
              <MetricRow label="Roket" value={l.rocket} />
              <MetricRow label="Target Orbit" value={l.orbit} />
              <MetricRow label="Status" value={l.status} />
              <MetricRow label="Landasan" value={l.pad} />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onFocusCoords(l.lng, l.lat, 6.5)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
              >
                Lihat Lokasi Landasan
              </button>
              {safeUrl && (
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1"
                >
                  <span>LL2</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </>
        );
      }

      case 'gdelt': {
        const g = selection.item;
        const safeUrl = sanitizeExternalUrl(g.url);
        return (
          <>
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Newspaper className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {g.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  GDELT · {g.source} · {g.location}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
              <MetricRow label="Kategori" value={g.category} />
              <MetricRow label="Sentimen Tone" value={g.tone > 0 ? `+${g.tone.toFixed(1)} (Positif)` : `${g.tone.toFixed(1)} (Netral/Waspada)`} />
              <MetricRow label="Koordinat Peristiwa" value={`${g.lat.toFixed(3)}, ${g.lng.toFixed(3)}`} />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onFocusCoords(g.lng, g.lat, 10.5)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
              >
                Zoom Lokasi Berita
              </button>
              {safeUrl && (
                <a
                  href={safeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1"
                >
                  <span>Baca</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </>
        );
      }

      case 'transit': {
        const tf = selection.item;
        return (
          <>
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Bus className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{tf.name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {tf.operator} · {tf.region}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-2">
              <MetricRow label="Moda" value={tf.mode} />
              <MetricRow label="Format Feed" value={tf.format} />
              <MetricRow label="Jumlah Rute / Koridor" value={`${tf.routesCount} koridor`} />
              <MetricRow label="Status Integrasi" value={tf.status === 'active' ? 'Aktif' : 'Beta'} />
            </div>

            <button
              type="button"
              onClick={() => onFocusCoords(tf.center[0], tf.center[1], 10.5)}
              className="w-full py-2 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors"
            >
              Zoom Koridor Transit
            </button>
          </>
        );
      }
    }
  };

  return (
    <div ref={rootRef} className="p-4 flex flex-col gap-4" data-testid="osint-detail-panel">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Intel</span>
        </button>
      </div>
      {renderContent()}
    </div>
  );
}
