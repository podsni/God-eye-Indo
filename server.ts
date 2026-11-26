import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildSatelliteTrack } from './src/engine/orbit.ts';
import {
  INDONESIA_BBOX,
  isInsideIndonesiaBbox,
  mergeAircraftFeeds,
  mergeBmkgAndUsgsEarthquakes,
  parseAdsbLolAircraft,
  parseBmkgAutoGempa,
  parseBmkgGempaList,
  parseGdeltGeoOrDoc,
  parseLaunchLibrary2,
  parseOpenSkyStates,
  parseOsrmRoute,
  parseOverpassAlpr,
  parseRadioBrowserStations,
  parseUsgsEarthquakes,
  parseWeatherModelSnapshot,
} from './src/engine/osintParsers.ts';
import type {
  AircraftTrack,
  AlprCameraNode,
  BundledDatasetMeta,
  CelesTrakGpRecord,
  CityCctvNode,
  DualWeatherComparison,
  EarthquakeEvent,
  GbfsStationNode,
  GdeltNewsEvent,
  OsintFeedEnvelope,
  OsrmProfile,
  OsrmRouteResult,
  RadioStationNode,
  SatelliteTrack,
  SpaceLaunchEvent,
  TransitFeedEntry,
  WeatherModelSnapshot,
} from './src/engine/osintTypes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

interface IndoOsintBundle {
  version: number;
  region: string;
  updatedAt: string;
  aircraft: AircraftTrack[];
  earthquakes: EarthquakeEvent[];
  satellitesGp: CelesTrakGpRecord[];
  cctv: CityCctvNode[];
  alpr: AlprCameraNode[];
  gbfs: GbfsStationNode[];
  radio: RadioStationNode[];
  launches: SpaceLaunchEvent[];
  gdelt: GdeltNewsEvent[];
  transitFeeds: TransitFeedEntry[];
  weatherCities: { id: string; name: string; lat: number; lng: number }[];
}

const bundlePath = path.resolve(__dirname, 'public', 'data', 'indo_osint_bundle.json');
let cachedBundle: IndoOsintBundle | null = null;

function getBundle(): IndoOsintBundle {
  if (!cachedBundle) {
    const raw = fs.readFileSync(bundlePath, 'utf-8');
    cachedBundle = JSON.parse(raw) as IndoOsintBundle;
  }
  return cachedBundle;
}

// Simple TTL memory cache for external OSINT APIs
const responseCache = new Map<string, { expiresAt: number; payload: unknown }>();

function getCached<T>(key: string): T | null {
  const hit = responseCache.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.payload as T;
  return null;
}

function setCached(key: string, payload: unknown, ttlMs: number): void {
  responseCache.set(key, { expiresAt: Date.now() + ttlMs, payload });
}

async function fetchJsonSafe(url: string, timeoutMs = 6500, init?: RequestInit): Promise<unknown> {
  const resp = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      Accept: 'application/json',
      'User-Agent': 'GodEyeIndo/1.0 (Indonesia Geospatial Telemetry)',
      ...(init?.headers || {}),
    },
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }
  return resp.json();
}

function parseCoord(raw: unknown, min: number, max: number, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return n;
}

function haversineMeters(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));

  // 1. OpenSky anon + adsb.lol (Live Indonesia Airspace)
  app.get('/api/osint/aircraft', async (req, res) => {
    const force = req.query.refresh === '1';
    const cacheKey = 'aircraft_id';
    if (!force) {
      const hit = getCached<OsintFeedEnvelope<AircraftTrack>>(cacheKey);
      if (hit) return res.json(hit);
    }

    const bundle = getBundle();
    const openSkyUrl = `https://opensky-network.org/api/states/all?lamin=${INDONESIA_BBOX.minLat}&lomin=${INDONESIA_BBOX.minLng}&lamax=${INDONESIA_BBOX.maxLat}&lomax=${INDONESIA_BBOX.maxLng}`;
    const adsbJktUrl = 'https://api.adsb.lol/v2/point/-6.2/106.8/250';
    const adsbBaliUrl = 'https://api.adsb.lol/v2/point/-8.65/115.2/250';
    const adsbMilUrl = 'https://api.adsb.lol/v2/mil';

    const [osRes, adsbJktRes, adsbBaliRes, adsbMilRes] = await Promise.allSettled([
      fetchJsonSafe(openSkyUrl, 6000),
      fetchJsonSafe(adsbJktUrl, 5500),
      fetchJsonSafe(adsbBaliUrl, 5500),
      fetchJsonSafe(adsbMilUrl, 5500),
    ]);

    const osTracks = osRes.status === 'fulfilled' ? parseOpenSkyStates(osRes.value) : [];
    const adsbTracks: AircraftTrack[] = [];
    if (adsbJktRes.status === 'fulfilled') adsbTracks.push(...parseAdsbLolAircraft(adsbJktRes.value, false));
    if (adsbBaliRes.status === 'fulfilled') adsbTracks.push(...parseAdsbLolAircraft(adsbBaliRes.value, false));
    if (adsbMilRes.status === 'fulfilled') {
      adsbTracks.push(
        ...parseAdsbLolAircraft(adsbMilRes.value, true).filter((a) => isInsideIndonesiaBbox(a.lng, a.lat)),
      );
    }

    const merged = mergeAircraftFeeds(osTracks, adsbTracks, 160);
    const liveCount = merged.length;
    const items = liveCount > 0 ? merged : bundle.aircraft;
    const envelope: OsintFeedEnvelope<AircraftTrack> = {
      sourceMode: liveCount > 0 ? 'live' : 'bundled',
      provider:
        osTracks.length > 0 && adsbTracks.length > 0
          ? 'OpenSky Network (anon) + adsb.lol'
          : adsbTracks.length > 0
            ? 'adsb.lol v2 (Indonesia FIR)'
            : osTracks.length > 0
              ? 'OpenSky Network (anon)'
              : 'OpenSky + adsb.lol (Bundled Indonesia)',
      updatedAt: new Date().toISOString(),
      items,
      note:
        liveCount > 0
          ? `OpenSky: ${osTracks.length} · adsb.lol: ${adsbTracks.length} pesawat di ruang udara Indonesia`
          : 'API OpenSky/adsb.lol sedang dibatasi rate-limit; menampilkan koridor penerbangan Indonesia tersimpan.',
    };
    setCached(cacheKey, envelope, liveCount > 0 ? 25_000 : 15_000);
    res.json(envelope);
  });

  // 2. BMKG Official Indonesia Earthquakes (AutoGempa + M5+ Terkini + Dirasakan MMI) + USGS Ring of Fire
  app.get('/api/osint/earthquakes', async (req, res) => {
    const force = req.query.refresh === '1';
    const cacheKey = 'bmkg_usgs_id';
    if (!force) {
      const hit = getCached<OsintFeedEnvelope<EarthquakeEvent>>(cacheKey);
      if (hit) return res.json(hit);
    }

    const bundle = getBundle();
    const bmkgAutoUrl = 'https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json';
    const bmkgTerkiniUrl = 'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json';
    const bmkgDirasakanUrl = 'https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json';
    const usgsUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=${INDONESIA_BBOX.minLat}&maxlatitude=${INDONESIA_BBOX.maxLat}&minlongitude=${INDONESIA_BBOX.minLng}&maxlongitude=${INDONESIA_BBOX.maxLng}&minmagnitude=2.5&limit=40&orderby=time`;

    const [autoRes, terkiniRes, dirasakanRes, usgsRes] = await Promise.allSettled([
      fetchJsonSafe(bmkgAutoUrl, 6000),
      fetchJsonSafe(bmkgTerkiniUrl, 6000),
      fetchJsonSafe(bmkgDirasakanUrl, 6000),
      fetchJsonSafe(usgsUrl, 6000),
    ]);

    const bmkgItems: EarthquakeEvent[] = [];
    if (autoRes.status === 'fulfilled') {
      const latest = parseBmkgAutoGempa(autoRes.value);
      if (latest) bmkgItems.push(latest);
    }
    if (dirasakanRes.status === 'fulfilled') {
      bmkgItems.push(...parseBmkgGempaList(dirasakanRes.value));
    }
    if (terkiniRes.status === 'fulfilled') {
      bmkgItems.push(...parseBmkgGempaList(terkiniRes.value));
    }

    const usgsItems = usgsRes.status === 'fulfilled' ? parseUsgsEarthquakes(usgsRes.value) : [];
    const merged = mergeBmkgAndUsgsEarthquakes(bmkgItems, usgsItems);

    const hasBmkg = bmkgItems.length > 0;
    const hasUsgs = usgsItems.length > 0;
    const envelope: OsintFeedEnvelope<EarthquakeEvent> = {
      sourceMode: hasBmkg || hasUsgs ? 'live' : 'bundled',
      provider:
        hasBmkg && hasUsgs
          ? 'BMKG TEWS Resmi + USGS Ring of Fire'
          : hasBmkg
            ? 'BMKG TEWS Resmi Indonesia'
            : hasUsgs
              ? 'USGS Ring of Fire Indonesia'
              : 'BMKG & USGS (Bundled Indonesia)',
      updatedAt: new Date().toISOString(),
      items: merged.length > 0 ? merged : bundle.earthquakes.map((q) => ({ ...q, source: 'bmkg' as const })),
      note: hasBmkg ? `${bmkgItems.length} laporan resmi BMKG · ${usgsItems.length} USGS` : undefined,
    };
    setCached(cacheKey, envelope, 45_000);
    return res.json(envelope);
  });

  // 2b. Strict BMKG Shakemap Image Proxy (strict filename allowlist, zero SSRF)
  app.get('/api/osint/bmkg-shakemap/:file', async (req, res) => {
    const file = String(req.params.file || '').trim();
    if (!/^[A-Za-z0-9._-]{4,48}\.(jpg|jpeg|png)$/i.test(file)) {
      return res.status(400).json({ error: 'Nama file shakemap BMKG tidak valid.' });
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);
    try {
      const upstream = await fetch(`https://data.bmkg.go.id/DataMKG/TEWS/${file}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'GodEyeIndo/1.0' },
      });
      if (!upstream.ok) return res.status(404).end();
      const ct = upstream.headers.get('content-type') || 'image/jpeg';
      if (!ct.startsWith('image/')) return res.status(415).end();
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.setHeader('Content-Type', ct);
      res.setHeader('Cache-Control', 'public, max-age=1800');
      return res.send(buf);
    } catch {
      return res.status(502).end();
    } finally {
      clearTimeout(timer);
    }
  });

  // 3. CelesTrak Satellites (Live GP + Indonesian GEO/LEO Constellations)
  app.get('/api/osint/satellites', async (req, res) => {
    const force = req.query.refresh === '1';
    const cacheKey = 'celestrak_id';
    if (!force) {
      const hit = getCached<OsintFeedEnvelope<SatelliteTrack>>(cacheKey);
      if (hit) return res.json(hit);
    }
    const bundle = getBundle();
    const gpStationsUrl = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json';
    const gpWeatherUrl = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=weather&FORMAT=json';

    const [stRes, wxRes] = await Promise.allSettled([
      fetchJsonSafe(gpStationsUrl, 6000),
      fetchJsonSafe(gpWeatherUrl, 6000),
    ]);

    const liveGp: CelesTrakGpRecord[] = [];
    if (stRes.status === 'fulfilled' && Array.isArray(stRes.value)) {
      for (const r of (stRes.value as CelesTrakGpRecord[]).slice(0, 6)) {
        liveGp.push({ ...r, GROUP: 'stations', OWNER: 'CelesTrak Stations' });
      }
    }
    if (wxRes.status === 'fulfilled' && Array.isArray(wxRes.value)) {
      const priorityWeather = (wxRes.value as CelesTrakGpRecord[]).filter((r) =>
        /NOAA|HIMAWARI|FENGYUN|METOP|JPSS/i.test(String(r.OBJECT_NAME || '')),
      );
      for (const r of priorityWeather.slice(0, 8)) {
        liveGp.push({ ...r, GROUP: 'weather', OWNER: 'CelesTrak Weather' });
      }
    }

    // Always include key Indonesian satellites (Satria-1, Merah Putih, BRIsat, LAPAN-A2/A3) merged by NORAD ID
    const byNorad = new Map<number, CelesTrakGpRecord>();
    for (const r of bundle.satellitesGp) byNorad.set(r.NORAD_CAT_ID, r);
    for (const r of liveGp) {
      if (Number.isFinite(r.NORAD_CAT_ID)) {
        const prev = byNorad.get(r.NORAD_CAT_ID);
        byNorad.set(r.NORAD_CAT_ID, prev ? { ...prev, ...r, GEO_LNG: prev.GEO_LNG } : r);
      }
    }

    const now = new Date();
    const tracks = Array.from(byNorad.values())
      .map((gp) => buildSatelliteTrack(gp, now))
      .sort((a, b) => Number(b.overIndonesia) - Number(a.overIndonesia) || a.altitudeKm - b.altitudeKm);

    const envelope: OsintFeedEnvelope<SatelliteTrack> = {
      sourceMode: liveGp.length > 0 ? 'hybrid' : 'bundled',
      provider: liveGp.length > 0 ? 'CelesTrak GP + Konstelasi Satelit Indonesia' : 'CelesTrak GP (Bundled Indonesia)',
      updatedAt: now.toISOString(),
      items: tracks,
      note: `${tracks.filter((s) => s.overIndonesia).length} satelit melintas/stasioner di atas Indonesia`,
    };
    setCached(cacheKey, envelope, 45_000);
    res.json(envelope);
  });

  // 4. City CCTV Indonesia
  app.get('/api/osint/cctv', (_req, res) => {
    const bundle = getBundle();
    const envelope: OsintFeedEnvelope<CityCctvNode> = {
      sourceMode: 'bundled',
      provider: 'Jaringan ATCS & CCTV Kota Indonesia (Jakarta, Bandung, Surabaya, Jogja, Bali, Medan, Makassar, IKN)',
      updatedAt: new Date().toISOString(),
      items: bundle.cctv,
    };
    res.json(envelope);
  });

  // 5. Radio Browser (Live Indonesian Radio Stations)
  app.get('/api/osint/radio', async (req, res) => {
    const force = req.query.refresh === '1';
    const cacheKey = 'radio_id';
    if (!force) {
      const hit = getCached<OsintFeedEnvelope<RadioStationNode>>(cacheKey);
      if (hit) return res.json(hit);
    }
    const bundle = getBundle();
    const url =
      'https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/ID?limit=35&order=clickcount&reverse=true&hidebroken=true';
    try {
      const raw = await fetchJsonSafe(url, 6000);
      const parsed = parseRadioBrowserStations(raw);
      const envelope: OsintFeedEnvelope<RadioStationNode> = {
        sourceMode: parsed.length > 0 ? 'live' : 'bundled',
        provider: parsed.length > 0 ? 'Radio Browser API (Indonesia)' : 'Radio Browser (Bundled Indonesia)',
        updatedAt: new Date().toISOString(),
        items: parsed.length > 0 ? parsed : bundle.radio,
      };
      setCached(cacheKey, envelope, 300_000);
      return res.json(envelope);
    } catch {
      const envelope: OsintFeedEnvelope<RadioStationNode> = {
        sourceMode: 'bundled',
        provider: 'Radio Browser (Bundled Indonesia)',
        updatedAt: new Date().toISOString(),
        items: bundle.radio,
      };
      setCached(cacheKey, envelope, 60_000);
      return res.json(envelope);
    }
  });

  // 6. GBFS Micromobility Indonesia
  app.get('/api/osint/gbfs', (_req, res) => {
    const bundle = getBundle();
    // Apply subtle deterministic time-of-day availability variance so docks look alive yet consistent
    const hour = new Date().getUTCHours();
    const items = bundle.gbfs.map((st, idx) => {
      const delta = ((hour + idx) % 3) - 1;
      const bikes = Math.max(2, st.bikesAvailable + delta);
      const docks = Math.max(2, st.docksAvailable - delta);
      return { ...st, bikesAvailable: bikes, docksAvailable: docks };
    });
    const envelope: OsintFeedEnvelope<GbfsStationNode> = {
      sourceMode: 'bundled',
      provider: 'GBFS Micromobility Indonesia (Jakarta · Bandung · Jogja · Surabaya · Bali)',
      updatedAt: new Date().toISOString(),
      items,
    };
    res.json(envelope);
  });

  // 7. Launch Library 2 (Space Launches + Biak Equatorial Reference)
  app.get('/api/osint/launches', async (req, res) => {
    const force = req.query.refresh === '1';
    const cacheKey = 'll2_upcoming';
    if (!force) {
      const hit = getCached<OsintFeedEnvelope<SpaceLaunchEvent>>(cacheKey);
      if (hit) return res.json(hit);
    }
    const bundle = getBundle();
    const url = 'https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=10&format=json';
    try {
      const raw = await fetchJsonSafe(url, 6500);
      const parsed = parseLaunchLibrary2(raw);
      const biakRef = bundle.launches.find((l) => l.id === 'll2-id-biak');
      const items = parsed.length > 0 ? (biakRef ? [...parsed, biakRef] : parsed) : bundle.launches;
      const envelope: OsintFeedEnvelope<SpaceLaunchEvent> = {
        sourceMode: parsed.length > 0 ? 'live' : 'bundled',
        provider: parsed.length > 0 ? 'Launch Library 2 (The Space Devs)' : 'Launch Library 2 (Bundled)',
        updatedAt: new Date().toISOString(),
        items,
      };
      setCached(cacheKey, envelope, 300_000);
      return res.json(envelope);
    } catch {
      const envelope: OsintFeedEnvelope<SpaceLaunchEvent> = {
        sourceMode: 'bundled',
        provider: 'Launch Library 2 (Bundled)',
        updatedAt: new Date().toISOString(),
        items: bundle.launches,
      };
      setCached(cacheKey, envelope, 90_000);
      return res.json(envelope);
    }
  });

  // 8. OpenStreetMap ALPR / ETLE Mapping Indonesia
  app.get('/api/osint/alpr', async (req, res) => {
    const force = req.query.refresh === '1';
    const cacheKey = 'osm_alpr_id';
    if (!force) {
      const hit = getCached<OsintFeedEnvelope<AlprCameraNode>>(cacheKey);
      if (hit) return res.json(hit);
    }
    const bundle = getBundle();
    // Bounded Overpass query strictly scoped to Indonesia urban/toll corridors for ALPR/speed_camera nodes
    const overpassQuery =
      '[out:json][timeout:6];(node["surveillance:type"="ALPR"](-9.2,98.0,4.0,120.5);node["highway"="speed_camera"](-9.2,98.0,4.0,120.5););out body 60;';
    try {
      const raw = await fetchJsonSafe('https://overpass-api.de/api/interpreter', 6000, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      });
      const osmNodes = parseOverpassAlpr(raw);
      const combined = [...bundle.alpr, ...osmNodes];
      const envelope: OsintFeedEnvelope<AlprCameraNode> = {
        sourceMode: osmNodes.length > 0 ? 'hybrid' : 'bundled',
        provider:
          osmNodes.length > 0
            ? `OpenStreetMap Overpass ALPR (${osmNodes.length}) + ETLE Korlantas Indonesia`
            : 'OpenStreetMap ALPR & ETLE Indonesia (Bundled)',
        updatedAt: new Date().toISOString(),
        items: combined,
      };
      setCached(cacheKey, envelope, 300_000);
      return res.json(envelope);
    } catch {
      const envelope: OsintFeedEnvelope<AlprCameraNode> = {
        sourceMode: 'bundled',
        provider: 'OpenStreetMap ALPR & ETLE Indonesia (Bundled)',
        updatedAt: new Date().toISOString(),
        items: bundle.alpr,
      };
      setCached(cacheKey, envelope, 120_000);
      return res.json(envelope);
    }
  });

  // 9. GDELT News Events (Indonesia)
  app.get('/api/osint/gdelt', async (req, res) => {
    const force = req.query.refresh === '1';
    const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 48) : '';
    const safeQuery = rawQuery.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
    const cacheKey = `gdelt_id_${safeQuery.toLowerCase()}`;
    if (!force) {
      const hit = getCached<OsintFeedEnvelope<GdeltNewsEvent>>(cacheKey);
      if (hit) return res.json(hit);
    }
    const bundle = getBundle();
    const qExpr = safeQuery
      ? `(${safeQuery} AND Indonesia)`
      : '(Indonesia OR Jakarta OR Surabaya OR Bandung OR Bali OR Nusantara)';
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(qExpr)}&mode=ArtList&maxrecords=20&sort=DateDesc&format=json`;
    try {
      const raw = await fetchJsonSafe(url, 6500);
      const parsed = parseGdeltGeoOrDoc(raw);
      const envelope: OsintFeedEnvelope<GdeltNewsEvent> = {
        sourceMode: parsed.length > 0 ? 'live' : 'bundled',
        provider: parsed.length > 0 ? 'GDELT Project 2.0 (Indonesia)' : 'GDELT News Events (Bundled Indonesia)',
        updatedAt: new Date().toISOString(),
        items: parsed.length > 0 ? parsed : bundle.gdelt,
      };
      setCached(cacheKey, envelope, 180_000);
      return res.json(envelope);
    } catch {
      const filtered = safeQuery
        ? bundle.gdelt.filter(
            (g) =>
              g.title.toLowerCase().includes(safeQuery.toLowerCase()) ||
              g.location.toLowerCase().includes(safeQuery.toLowerCase()),
          )
        : bundle.gdelt;
      const envelope: OsintFeedEnvelope<GdeltNewsEvent> = {
        sourceMode: 'bundled',
        provider: 'GDELT News Events (Bundled Indonesia)',
        updatedAt: new Date().toISOString(),
        items: filtered.length > 0 ? filtered : bundle.gdelt,
      };
      setCached(cacheKey, envelope, 60_000);
      return res.json(envelope);
    }
  });

  // 10. Transit Feeds Registry (Indonesia)
  app.get('/api/osint/transit-feeds', (_req, res) => {
    const bundle = getBundle();
    const envelope: OsintFeedEnvelope<TransitFeedEntry> = {
      sourceMode: 'bundled',
      provider: 'Indonesia GTFS & Public Transit Feeds (KAI · KRL · MRT · LRT · Whoosh · TransJakarta · Bus · ASDP)',
      updatedAt: new Date().toISOString(),
      items: bundle.transitFeeds,
    };
    res.json(envelope);
  });

  // 11. NOAA GFS & ECMWF IFS Dual-Model Weather Comparison
  app.get('/api/osint/weather-models', async (req, res) => {
    const lat = parseCoord(req.query.lat, -12, 7, -6.2088);
    const lng = parseCoord(req.query.lng, 94, 142, 106.8456);
    const cityRaw = typeof req.query.city === 'string' ? req.query.city.trim().slice(0, 48) : 'Jakarta';
    const city = cityRaw.replace(/[<>"'`]/g, '') || 'Indonesia';

    const cacheKey = `wx_dual_${lat.toFixed(2)}_${lng.toFixed(2)}`;
    if (req.query.refresh !== '1') {
      const hit = getCached<DualWeatherComparison>(cacheKey);
      if (hit) return res.json(hit);
    }

    const commonParams = new URLSearchParams({
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      current:
        'temperature_2m,relative_humidity_2m,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m',
      hourly: 'temperature_2m,precipitation',
      forecast_hours: '6',
      timezone: 'Asia/Jakarta',
    });

    const noaaUrl = `https://api.open-meteo.com/v1/gfs?${commonParams.toString()}`;
    const ecmwfUrl = `https://api.open-meteo.com/v1/ecmwf?${commonParams.toString()}`;

    const [noaaRes, ecmwfRes] = await Promise.allSettled([
      fetchJsonSafe(noaaUrl, 6000),
      fetchJsonSafe(ecmwfUrl, 6000),
    ]);

    const noaaParsed =
      noaaRes.status === 'fulfilled' ? parseWeatherModelSnapshot(noaaRes.value, 'NOAA GFS') : null;
    const ecmwfParsed =
      ecmwfRes.status === 'fulfilled' ? parseWeatherModelSnapshot(ecmwfRes.value, 'ECMWF IFS') : null;

    const fallbackNoaa: WeatherModelSnapshot = {
      model: 'NOAA GFS',
      tempC: 30.2,
      windKmh: 13,
      windDirDeg: 115,
      precipMm: 0.4,
      cloudPct: 62,
      pressureHpa: 1009,
      humidityPct: 76,
      weatherCode: 2,
      next6hPrecipMm: 2.1,
      next6hTempC: 28.4,
    };
    const fallbackEcmwf: WeatherModelSnapshot = {
      model: 'ECMWF IFS',
      tempC: 29.8,
      windKmh: 11,
      windDirDeg: 125,
      precipMm: 0.2,
      cloudPct: 58,
      pressureHpa: 1010,
      humidityPct: 78,
      weatherCode: 2,
      next6hPrecipMm: 1.6,
      next6hTempC: 28.1,
    };

    const result: DualWeatherComparison = {
      city,
      lat,
      lng,
      updatedAt: new Date().toISOString(),
      sourceMode: noaaParsed && ecmwfParsed ? 'live' : noaaParsed || ecmwfParsed ? 'hybrid' : 'bundled',
      noaa: noaaParsed || fallbackNoaa,
      ecmwf: ecmwfParsed || fallbackEcmwf,
    };
    setCached(cacheKey, result, 300_000);
    res.json(result);
  });

  // 12. OSRM Road Routing Proxy (driving | bike | foot)
  app.get('/api/osint/osrm', async (req, res) => {
    const fromLng = parseCoord(req.query.fromLng, 94, 142, NaN);
    const fromLat = parseCoord(req.query.fromLat, -12, 7, NaN);
    const toLng = parseCoord(req.query.toLng, 94, 142, NaN);
    const toLat = parseCoord(req.query.toLat, -12, 7, NaN);
    if (![fromLng, fromLat, toLng, toLat].every(Number.isFinite)) {
      return res.status(400).json({ error: 'Koordinat asal dan tujuan harus berada di wilayah Indonesia.' });
    }

    const rawProfile = String(req.query.profile || 'driving');
    const profile: OsrmProfile =
      rawProfile === 'bike' || rawProfile === 'foot' ? rawProfile : 'driving';
    const osrmServiceProfile = profile === 'bike' ? 'cycling' : profile === 'foot' ? 'walking' : 'driving';
    const fromLabel = String(req.query.fromLabel || 'Asal').slice(0, 60).replace(/[<>"'`]/g, '');
    const toLabel = String(req.query.toLabel || 'Tujuan').slice(0, 60).replace(/[<>"'`]/g, '');

    const cacheKey = `osrm_${profile}_${fromLng.toFixed(4)},${fromLat.toFixed(4)}_${toLng.toFixed(4)},${toLat.toFixed(4)}`;
    const hit = getCached<OsrmRouteResult>(cacheKey);
    if (hit) return res.json({ ...hit, fromLabel, toLabel });

    const url = `https://router.project-osrm.org/route/v1/${osrmServiceProfile}/${fromLng.toFixed(5)},${fromLat.toFixed(5)};${toLng.toFixed(5)},${toLat.toFixed(5)}?overview=full&geometries=geojson&steps=true`;
    try {
      const raw = await fetchJsonSafe(url, 6500);
      const parsed = parseOsrmRoute(raw, profile, fromLabel, toLabel);
      if (parsed) {
        setCached(cacheKey, parsed, 300_000);
        return res.json(parsed);
      }
    } catch {
      // Fallback below
    }

    // Deterministic straight-corridor fallback if OSRM public server is unreachable
    const distM = Math.round(haversineMeters(fromLng, fromLat, toLng, toLat) * 1.24);
    const speedMps = profile === 'driving' ? 16.5 : profile === 'bike' ? 4.8 : 1.35;
    const midLng = (fromLng + toLng) / 2;
    const midLat = (fromLat + toLat) / 2;
    const fallback: OsrmRouteResult = {
      profile,
      sourceMode: 'bundled',
      fromLabel,
      toLabel,
      distanceM: distM,
      durationSec: Math.round(distM / speedMps),
      coordinates: [
        [fromLng, fromLat],
        [midLng, midLat],
        [toLng, toLat],
      ],
      steps: [
        {
          instruction: 'Mulai perjalanan dari titik asal',
          roadName: fromLabel,
          distanceM: Math.round(distM * 0.5),
          durationSec: Math.round((distM * 0.5) / speedMps),
        },
        {
          instruction: 'Tiba di titik tujuan',
          roadName: toLabel,
          distanceM: Math.round(distM * 0.5),
          durationSec: Math.round((distM * 0.5) / speedMps),
        },
      ],
    };
    setCached(cacheKey, fallback, 60_000);
    res.json(fallback);
  });

  // 13. Bundled Datasets Catalog
  app.get('/api/osint/datasets', (_req, res) => {
    const bundle = getBundle();
    const catalog: BundledDatasetMeta[] = [
      {
        id: 'indo-osint-bundle',
        title: 'God Eye Indo OSINT Bundle (CCTV, ALPR, GBFS, Satelit, Berita)',
        category: 'OSINT Nasional',
        url: '/data/indo_osint_bundle.json',
        format: 'JSON',
        coverage: 'Seluruh Indonesia (Sumatra – Papua)',
        license: 'CC BY 4.0 / ODbL / Public OSINT',
        records:
          bundle.cctv.length +
          bundle.alpr.length +
          bundle.gbfs.length +
          bundle.satellitesGp.length +
          bundle.transitFeeds.length +
          bundle.gdelt.length,
        layerKey: 'cctv',
      },
      {
        id: 'rail-network',
        title: 'Jaringan Rel & Stasiun OpenStreetMap Indonesia',
        category: 'Transit & Rel',
        url: '/data/network.json',
        format: 'JSON / Polyline',
        coverage: 'Pulau Jawa (Daop 1–9)',
        license: 'OpenStreetMap ODbL 1.0',
        records: 494,
        layerKey: 'rail',
      },
      {
        id: 'rail-trips',
        title: 'Jadwal KRL Commuter Line, MRT, LRT & Whoosh',
        category: 'Transit Feeds',
        url: '/data/trips.json',
        format: 'GAPEKA / GTFS Packed',
        coverage: 'Jabodetabek, Bandung, Jogja–Solo',
        license: 'Open-KRL CC BY 4.0 / ShioriLabs ODbL',
        records: 1420,
        layerKey: 'rail',
      },
      {
        id: 'rail-kai',
        title: 'GAPEKA 2026 — KA Antarkota & Lokal KAI',
        category: 'Transit Feeds',
        url: '/data/kai.json',
        format: 'GAPEKA JSON',
        coverage: 'Lintas Utara & Selatan Jawa',
        license: 'Jadwal Publik KAI',
        records: 107,
        layerKey: 'rail',
      },
      {
        id: 'rail-freight',
        title: 'GAPEKA 2026 — KA Barang (Cargo, Tanker, Parcel)',
        category: 'Logistik Rel',
        url: '/data/freight.json',
        format: 'GAPEKA JSON',
        coverage: 'Koridor Logistik Jawa',
        license: 'Jadwal Publik KAI',
        records: 114,
        layerKey: 'rail',
      },
      {
        id: 'rail-jpl',
        title: 'Perlintasan Sebidang (JPL), Flyover & Underpass',
        category: 'Infrastruktur',
        url: '/data/jpl.json',
        format: 'JSON Compact',
        coverage: 'Pulau Jawa (Daop 1–9)',
        license: 'OpenStreetMap ODbL & Wikimedia Commons',
        records: 4724,
        layerKey: 'jpl',
      },
      {
        id: 'rail-terminals',
        title: 'Terminal Kargo, Depo BBM & Balai Yasa',
        category: 'Logistik',
        url: '/data/terminals.json',
        format: 'JSON',
        coverage: 'Pulau Jawa',
        license: 'OpenStreetMap ODbL',
        records: 68,
        layerKey: 'rail',
      },
      {
        id: 'stations-extra',
        title: 'Metadata Wikidata, Foto Stasiun & Kode Daop',
        category: 'Referensi Stasiun',
        url: '/data/stations_x.json',
        format: 'JSON',
        coverage: '448 Stasiun Jawa',
        license: 'Wikimedia Commons / Wikidata CC0',
        records: 448,
        layerKey: 'rail',
      },
    ];
    res.json({
      sourceMode: 'bundled',
      provider: 'God Eye Indo Local Bundled Datasets',
      updatedAt: new Date().toISOString(),
      items: catalog,
    });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { maxAge: '1h' }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`God Eye Indo server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start God Eye Indo server:', err);
  process.exit(1);
});
