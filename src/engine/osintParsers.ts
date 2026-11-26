import type {
  AircraftTrack,
  AlprCameraNode,
  EarthquakeEvent,
  GdeltNewsEvent,
  OsrmProfile,
  OsrmRouteResult,
  OsrmStep,
  RadioStationNode,
  SpaceLaunchEvent,
  WeatherModelSnapshot,
} from './osintTypes';

export const INDONESIA_BBOX = {
  minLat: -11.5,
  maxLat: 6.5,
  minLng: 94.5,
  maxLng: 141.5,
} as const;

export function isInsideIndonesiaBbox(lng: number, lat: number): boolean {
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lat >= INDONESIA_BBOX.minLat &&
    lat <= INDONESIA_BBOX.maxLat &&
    lng >= INDONESIA_BBOX.minLng &&
    lng <= INDONESIA_BBOX.maxLng
  );
}

/**
 * Safely validates external http(s) URLs so javascript:/data: links are never emitted.
 */
export function sanitizeExternalUrl(raw: unknown, fallback = ''): string {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return fallback;
  }
  return fallback;
}

/**
 * Escapes untrusted strings before interpolation inside MapLibre HTML hover popups.
 */
export function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Parses anonymous OpenSky Network `/api/states/all` response rows.
 */
export function parseOpenSkyStates(raw: unknown): AircraftTrack[] {
  if (!raw || typeof raw !== 'object') return [];
  const states = (raw as { states?: unknown[] }).states;
  if (!Array.isArray(states)) return [];

  const out: AircraftTrack[] = [];
  for (const row of states) {
    if (!Array.isArray(row) || row.length < 11) continue;
    const icao24 = String(row[0] ?? '').trim().toLowerCase();
    const callsign = String(row[1] ?? '').trim() || icao24.toUpperCase();
    const originCountry = String(row[2] ?? 'Unknown').trim();
    const lng = Number(row[5]);
    const lat = Number(row[6]);
    const baroAlt = Number(row[7] ?? row[13] ?? 0);
    const onGround = Boolean(row[8]);
    const velMps = Number(row[9] ?? 0);
    const heading = Number(row[10] ?? 0);
    const vRate = Number(row[11] ?? 0);
    const squawk = row[14] ? String(row[14]) : undefined;

    if (!icao24 || !Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) continue;

    out.push({
      icao24,
      callsign,
      originCountry,
      lng: Number(lng.toFixed(4)),
      lat: Number(lat.toFixed(4)),
      altitudeM: Number.isFinite(baroAlt) ? Math.max(0, Math.round(baroAlt)) : 0,
      velocityKmh: Number.isFinite(velMps) ? Math.max(0, Math.round(velMps * 3.6)) : 0,
      heading: Number.isFinite(heading) ? Math.round(((heading % 360) + 360) % 360) : 0,
      verticalRate: Number.isFinite(vRate) ? Number(vRate.toFixed(1)) : 0,
      onGround,
      source: 'opensky',
      category: /^(IDAF|TNIAU|TNI|POLRI|BASARNAS)/i.test(callsign) ? 'military' : 'civil',
      squawk,
    });
  }
  return out;
}

/**
 * Parses adsb.lol v2 `/v2/point` or `/v2/mil` response payload.
 */
export function parseAdsbLolAircraft(raw: unknown, forceMilitary = false): AircraftTrack[] {
  if (!raw || typeof raw !== 'object') return [];
  const ac = (raw as { ac?: unknown[] }).ac;
  if (!Array.isArray(ac)) return [];

  const out: AircraftTrack[] = [];
  for (const item of ac) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const icao24 = String(r.hex ?? '').trim().toLowerCase();
    const lat = Number(r.lat);
    const lng = Number(r.lon);
    if (!icao24 || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const callsign = String(r.flight ?? r.r ?? icao24).trim() || icao24.toUpperCase();
    const altFt = typeof r.alt_baro === 'number' ? r.alt_baro : typeof r.alt_geom === 'number' ? r.alt_geom : 0;
    const gsKt = typeof r.gs === 'number' ? r.gs : 0;
    const track = typeof r.track === 'number' ? r.track : 0;
    const baroRateFpm = typeof r.baro_rate === 'number' ? r.baro_rate : 0;
    const dbFlags = typeof r.dbFlags === 'number' ? r.dbFlags : 0;
    const isMil = forceMilitary || (dbFlags & 1) === 1 || /^(IDAF|TNIAU|RCH|CNV)/i.test(callsign);

    out.push({
      icao24,
      callsign,
      originCountry: String(r.ownOp ?? 'ADS-B Exchange / adsb.lol').trim(),
      lng: Number(lng.toFixed(4)),
      lat: Number(lat.toFixed(4)),
      altitudeM: Math.max(0, Math.round(altFt * 0.3048)),
      velocityKmh: Math.max(0, Math.round(gsKt * 1.852)),
      heading: Math.round(((track % 360) + 360) % 360),
      verticalRate: Number((baroRateFpm * 0.00508).toFixed(1)),
      onGround: r.alt_baro === 'ground',
      source: 'adsb.lol',
      category: isMil ? 'military' : 'civil',
      squawk: r.squawk ? String(r.squawk) : undefined,
      aircraftType: r.t ? String(r.t) : undefined,
    });
  }
  return out;
}

/**
 * Merges OpenSky and adsb.lol tracks deduplicating by ICAO24 (preferring adsb.lol metadata for military/rich fields).
 */
export function mergeAircraftFeeds(
  opensky: AircraftTrack[],
  adsbLol: AircraftTrack[],
  limit = 160,
): AircraftTrack[] {
  const byIcao = new Map<string, AircraftTrack>();
  for (const a of opensky) {
    byIcao.set(a.icao24, a);
  }
  for (const b of adsbLol) {
    const existing = byIcao.get(b.icao24);
    if (!existing) {
      byIcao.set(b.icao24, b);
    } else {
      byIcao.set(b.icao24, {
        ...existing,
        ...b,
        originCountry: existing.originCountry !== 'Unknown' ? existing.originCountry : b.originCountry,
        source: b.category === 'military' ? 'adsb.lol' : existing.source,
      });
    }
  }
  return Array.from(byIcao.values())
    .sort((a, b) => {
      const catRank = (c: AircraftTrack['category']) => (c === 'military' ? 0 : c === 'gov' ? 1 : 2);
      return catRank(a.category) - catRank(b.category) || b.altitudeM - a.altitudeM;
    })
    .slice(0, limit);
}

/**
 * Parses USGS GeoJSON earthquake feed into typed EarthquakeEvent records.
 */
export function parseUsgsEarthquakes(raw: unknown): EarthquakeEvent[] {
  if (!raw || typeof raw !== 'object') return [];
  const features = (raw as { features?: unknown[] }).features;
  if (!Array.isArray(features)) return [];

  const out: EarthquakeEvent[] = [];
  for (const f of features) {
    if (!f || typeof f !== 'object') continue;
    const feat = f as {
      id?: string;
      properties?: Record<string, unknown>;
      geometry?: { coordinates?: unknown[] };
    };
    const coords = feat.geometry?.coordinates;
    const props = feat.properties;
    if (!Array.isArray(coords) || coords.length < 2 || !props) continue;

    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    const depthKm = Number(coords[2] ?? 10);
    const mag = Number(props.mag ?? 0);
    const timeMs = Number(props.time ?? Date.now());
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || !Number.isFinite(mag)) continue;

    out.push({
      id: String(feat.id ?? `${lng}-${lat}-${timeMs}`),
      mag: Number(mag.toFixed(1)),
      place: String(props.place ?? 'Indonesia'),
      timeMs,
      lng: Number(lng.toFixed(3)),
      lat: Number(lat.toFixed(3)),
      depthKm: Number(Math.max(0, depthKm).toFixed(1)),
      tsunami: Boolean(props.tsunami),
      url: sanitizeExternalUrl(props.url, 'https://earthquake.usgs.gov/earthquakes/map/'),
      alert: typeof props.alert === 'string' ? props.alert : null,
      source: 'usgs',
    });
  }
  return out.sort((a, b) => b.timeMs - a.timeMs);
}

/**
 * Great-circle Haversine distance in kilometers between two [lng, lat] points.
 */
export function haversineKm(lng1: number, lat1: number, lng2: number, lat2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const BMKG_SHAKEMAP_RE = /^[A-Za-z0-9._-]{4,48}\.(jpg|jpeg|png)$/i;

function parseBmkgRecord(raw: unknown, isLatest = false): EarthquakeEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as Record<string, unknown>;
  const coordStr = String(g.Coordinates ?? '').trim();
  const parts = coordStr.split(',').map((s) => Number(s.trim()));
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return null;
  const lat = parts[0];
  const lng = parts[1];
  if (!isInsideIndonesiaBbox(lng, lat)) return null;

  const mag = Number(g.Magnitude);
  if (!Number.isFinite(mag)) return null;
  const depthMatch = String(g.Kedalaman ?? '').match(/[\d.]+/);
  const depthKm = depthMatch ? Number(depthMatch[0]) : 10;
  const dateMs = Date.parse(String(g.DateTime ?? ''));
  const timeMs = Number.isFinite(dateMs) ? dateMs : Date.now();
  const potensi = String(g.Potensi ?? '').trim();
  const dirasakan = String(g.Dirasakan ?? '').trim();
  const wilayah = String(g.Wilayah ?? 'Indonesia').trim();
  const tanggal = String(g.Tanggal ?? '').trim();
  const jam = String(g.Jam ?? '').trim();
  const waktuWib = [tanggal, jam].filter(Boolean).join(' · ') || undefined;
  const tsunami = /berpotensi\s+tsunami/i.test(potensi) && !/tidak\s+berpotensi/i.test(potensi);

  const rawShake = String(g.Shakemap ?? '').trim();
  const shakemapUrl = BMKG_SHAKEMAP_RE.test(rawShake)
    ? `/api/osint/bmkg-shakemap/${encodeURIComponent(rawShake)}`
    : undefined;

  const idSeed = String(g.DateTime ?? `${tanggal}-${jam}-${mag}-${lat}-${lng}`)
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 32);

  return {
    id: `bmkg-${idSeed || `${Math.round(lat * 100)}_${Math.round(lng * 100)}`}`,
    mag: Number(mag.toFixed(1)),
    place: wilayah,
    timeMs,
    lng: Number(lng.toFixed(3)),
    lat: Number(lat.toFixed(3)),
    depthKm: Number(Math.max(0, depthKm).toFixed(1)),
    tsunami,
    url: 'https://warning.bmkg.go.id/',
    alert: tsunami ? 'red' : mag >= 5.5 ? 'orange' : mag >= 5.0 ? 'yellow' : null,
    source: 'bmkg',
    potensi: potensi || undefined,
    dirasakan: dirasakan && dirasakan !== '-' ? dirasakan : undefined,
    shakemapUrl,
    waktuWib,
    lintang: String(g.Lintang ?? '').trim() || undefined,
    bujur: String(g.Bujur ?? '').trim() || undefined,
    isLatestBmkg: isLatest,
  };
}

/**
 * Parses official BMKG `autogempa.json` (latest Indonesian earthquake + Shakemap).
 */
export function parseBmkgAutoGempa(raw: unknown): EarthquakeEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const info = (raw as { Infogempa?: { gempa?: unknown } }).Infogempa;
  if (!info || !info.gempa) return null;
  return parseBmkgRecord(info.gempa, true);
}

/**
 * Parses official BMKG `gempaterkini.json` (M5.0+) or `gempadirasakan.json` (felt MMI).
 */
export function parseBmkgGempaList(raw: unknown): EarthquakeEvent[] {
  if (!raw || typeof raw !== 'object') return [];
  const list = (raw as { Infogempa?: { gempa?: unknown } }).Infogempa?.gempa;
  const arr = Array.isArray(list) ? list : list ? [list] : [];
  const out: EarthquakeEvent[] = [];
  for (const item of arr) {
    const parsed = parseBmkgRecord(item, false);
    if (parsed) out.push(parsed);
  }
  return out;
}

/**
 * Merges official BMKG feeds (AutoGempa, M5.0+, Dirasakan) with USGS Ring of Fire,
 * deduplicating overlapping events while preferring BMKG metadata (Wilayah, MMI, Shakemap).
 */
export function mergeBmkgAndUsgsEarthquakes(
  bmkgItems: EarthquakeEvent[],
  usgsItems: EarthquakeEvent[],
): EarthquakeEvent[] {
  const merged: EarthquakeEvent[] = [];

  // 1. Deduplicate BMKG records among themselves (autogempa often also appears in gempaterkini/gempadirasakan)
  for (const b of bmkgItems) {
    const existing = merged.find(
      (m) =>
        Math.abs(m.timeMs - b.timeMs) < 90_000 &&
        haversineKm(m.lng, m.lat, b.lng, b.lat) < 30,
    );
    if (existing) {
      if (b.isLatestBmkg) existing.isLatestBmkg = true;
      if (b.shakemapUrl && !existing.shakemapUrl) existing.shakemapUrl = b.shakemapUrl;
      if (b.dirasakan && !existing.dirasakan) existing.dirasakan = b.dirasakan;
      if (b.potensi && (!existing.potensi || b.tsunami)) existing.potensi = b.potensi;
      if (b.tsunami) existing.tsunami = true;
    } else {
      merged.push({ ...b, source: 'bmkg' });
    }
  }

  // 2. Append non-duplicate USGS records
  for (const u of usgsItems) {
    const dup = merged.find(
      (m) =>
        Math.abs(m.timeMs - u.timeMs) < 180_000 &&
        haversineKm(m.lng, m.lat, u.lng, u.lat) < 55,
    );
    if (!dup) {
      merged.push({ ...u, source: 'usgs' });
    }
  }

  return merged.sort((a, b) => Number(Boolean(b.isLatestBmkg)) - Number(Boolean(a.isLatestBmkg)) || b.timeMs - a.timeMs);
}

/**
 * Parses Launch Library 2 `/2.2.0/launch/upcoming` payload.
 */
export function parseLaunchLibrary2(raw: unknown): SpaceLaunchEvent[] {
  if (!raw || typeof raw !== 'object') return [];
  const results = (raw as { results?: unknown[] }).results;
  if (!Array.isArray(results)) return [];

  const out: SpaceLaunchEvent[] = [];
  for (const item of results) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const pad = (r.pad && typeof r.pad === 'object' ? r.pad : {}) as Record<string, unknown>;
    const loc = (pad.location && typeof pad.location === 'object' ? pad.location : {}) as Record<string, unknown>;
    const provider = (r.launch_service_provider && typeof r.launch_service_provider === 'object'
      ? r.launch_service_provider
      : {}) as Record<string, unknown>;
    const rocketCfg = (
      r.rocket && typeof r.rocket === 'object' && (r.rocket as Record<string, unknown>).configuration
        ? (r.rocket as Record<string, unknown>).configuration
        : {}
    ) as Record<string, unknown>;
    const mission = (r.mission && typeof r.mission === 'object' ? r.mission : {}) as Record<string, unknown>;
    const orbit = (mission.orbit && typeof mission.orbit === 'object' ? mission.orbit : {}) as Record<string, unknown>;
    const status = (r.status && typeof r.status === 'object' ? r.status : {}) as Record<string, unknown>;

    const lat = Number(pad.latitude ?? 0);
    const lng = Number(pad.longitude ?? 0);

    out.push({
      id: String(r.id ?? Math.random().toString(36).slice(2)),
      name: String(r.name ?? 'Upcoming Launch'),
      provider: String(provider.name ?? 'Space Agency'),
      rocket: String(rocketCfg.full_name ?? rocketCfg.name ?? 'Orbital Vehicle'),
      pad: [pad.name, loc.name].filter(Boolean).join(', ') || 'Launch Complex',
      windowStart: String(r.window_start ?? r.net ?? new Date().toISOString()),
      status: String(status.abbrev ?? status.name ?? 'TBD'),
      mission: String(mission.description ?? 'Misi peluncuran orbital terdaftar di Launch Library 2.').slice(0, 220),
      orbit: String(orbit.abbrev ?? orbit.name ?? 'LEO'),
      lng: Number.isFinite(lng) ? lng : 0,
      lat: Number.isFinite(lat) ? lat : 0,
      url: sanitizeExternalUrl(r.url, 'https://thespacedevs.com/'),
    });
  }
  return out;
}

/**
 * Parses Radio Browser API station rows and assigns Indonesian city coordinates if missing.
 */
const INDONESIAN_CITY_COORDS: [RegExp, [number, number], string][] = [
  [/surabaya|jatim/i, [112.7521, -7.2575], 'Surabaya'],
  [/bandung|jabar/i, [107.6191, -6.9175], 'Bandung'],
  [/jogja|yogya|diy/i, [110.3695, -7.7956], 'Yogyakarta'],
  [/semarang|jateng/i, [110.4167, -6.9667], 'Semarang'],
  [/solo|surakarta/i, [110.829, -7.5714], 'Surakarta'],
  [/bali|denpasar|kuta/i, [115.2126, -8.6705], 'Denpasar'],
  [/medan|sumut/i, [98.6722, 3.5952], 'Medan'],
  [/makassar|sulsel/i, [119.4327, -5.1477], 'Makassar'],
  [/palembang|sumsel/i, [104.7458, -2.9761], 'Palembang'],
  [/balikpapan|samarinda|kaltim/i, [116.8529, -1.2379], 'Balikpapan'],
  [/malang/i, [112.6326, -7.9666], 'Malang'],
  [/bogor/i, [106.806, -6.5971], 'Bogor'],
  [/manado|sulut/i, [124.8421, 1.4748], 'Manado'],
  [/jayapura|papua/i, [140.669, -2.5916], 'Jayapura'],
];

export function parseRadioBrowserStations(raw: unknown): RadioStationNode[] {
  if (!Array.isArray(raw)) return [];
  const out: RadioStationNode[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i] as Record<string, unknown>;
    if (!r || typeof r !== 'object') continue;
    const streamUrl = sanitizeExternalUrl(r.url_resolved ?? r.url);
    if (!streamUrl || !streamUrl.startsWith('https://')) continue;
    const name = String(r.name ?? '').trim();
    if (!name) continue;
    const tags = String(r.tags ?? '').trim();
    const state = String(r.state ?? '').trim();
    const haystack = `${name} ${state} ${tags}`;

    let lng = Number(r.geo_long);
    let lat = Number(r.geo_lat);
    let city = state || 'Jakarta';
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || (lng === 0 && lat === 0)) {
      const matched = INDONESIAN_CITY_COORDS.find(([re]) => re.test(haystack));
      // Deterministic tiny jitter so co-located stations don't stack identically on the map
      const jitterLng = ((i % 7) - 3) * 0.018;
      const jitterLat = ((Math.floor(i / 7) % 5) - 2) * 0.014;
      if (matched) {
        lng = matched[1][0] + jitterLng;
        lat = matched[1][1] + jitterLat;
        city = matched[2];
      } else {
        lng = 106.8272 + jitterLng;
        lat = -6.1754 + jitterLat;
        city = 'Jakarta';
      }
    }

    out.push({
      id: String(r.stationuuid ?? `rad-${i}`),
      name,
      city,
      tags: tags || 'indonesia,radio',
      codec: String(r.codec ?? 'MP3').toUpperCase(),
      bitrate: Number(r.bitrate) || 64,
      url: streamUrl,
      homepage: sanitizeExternalUrl(r.homepage, 'https://www.radio-browser.info/'),
      lng: Number(lng.toFixed(4)),
      lat: Number(lat.toFixed(4)),
      votes: Number(r.votes) || 0,
    });
  }
  return out;
}

/**
 * Parses Overpass API elements for OpenStreetMap ALPR / ANPR / speed cameras.
 */
export function parseOverpassAlpr(raw: unknown): AlprCameraNode[] {
  if (!raw || typeof raw !== 'object') return [];
  const elements = (raw as { elements?: unknown[] }).elements;
  if (!Array.isArray(elements)) return [];

  const out: AlprCameraNode[] = [];
  for (const el of elements) {
    if (!el || typeof el !== 'object') continue;
    const rec = el as {
      type?: string;
      id?: number | string;
      lat?: number;
      lon?: number;
      center?: { lat?: number; lon?: number };
      tags?: Record<string, string>;
    };
    const lat = Number(rec.lat ?? rec.center?.lat);
    const lng = Number(rec.lon ?? rec.center?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const tags = rec.tags || {};
    const name =
      tags.name ||
      tags.description ||
      (tags.highway === 'speed_camera' ? 'Kamera Kecepatan / ETLE OSM' : 'Kamera ALPR / ANPR OSM');
    const maxSpeedNum = Number(String(tags.maxspeed ?? '').replace(/\D+/g, ''));

    out.push({
      id: `osm-${rec.type ?? 'node'}-${rec.id ?? Math.random()}`,
      name,
      city: tags['addr:city'] || tags['is_in:city'] || 'Indonesia (OSM)',
      road: tags['addr:street'] || tags.road || tags.ref || 'Koridor Jalan Raya',
      operator: tags.operator || 'OpenStreetMap Community / Korlantas',
      cameraType:
        tags['surveillance:type'] === 'ALPR' || tags['camera:type'] === 'anpr'
          ? 'ALPR / ANPR'
          : tags.highway === 'speed_camera'
            ? 'Speed Camera / ETLE'
            : 'Surveillance Traffic',
      direction: tags['camera:direction'] || tags.direction || 'Semua arah',
      speedLimitKmh: Number.isFinite(maxSpeedNum) && maxSpeedNum > 0 ? maxSpeedNum : undefined,
      lng: Number(lng.toFixed(5)),
      lat: Number(lat.toFixed(5)),
      osmId: `${rec.type ?? 'node'}/${rec.id ?? ''}`,
    });
  }
  return out;
}

/**
 * Parses GDELT Geo 2.0 GeoJSON or Doc 2.0 ArtList into Indonesia news events.
 */
export function parseGdeltGeoOrDoc(raw: unknown): GdeltNewsEvent[] {
  if (!raw || typeof raw !== 'object') return [];
  const obj = raw as Record<string, unknown>;

  if (Array.isArray(obj.features)) {
    const out: GdeltNewsEvent[] = [];
    for (let i = 0; i < obj.features.length; i++) {
      const f = obj.features[i] as {
        properties?: Record<string, unknown>;
        geometry?: { coordinates?: unknown[] };
      };
      const coords = f.geometry?.coordinates;
      const p = f.properties || {};
      if (!Array.isArray(coords) || coords.length < 2) continue;
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      if (!isInsideIndonesiaBbox(lng, lat)) continue;
      const htmlStr = String(p.html ?? '');
      const hrefMatch = htmlStr.match(/href="([^"]+)"/i);
      const titleMatch = htmlStr.match(/title="([^"]+)"/i) || htmlStr.match(/>([^<]{12,180})<\/a>/i);
      const title = String(titleMatch?.[1] || p.name || 'Peristiwa Berita Indonesia').trim();
      const url = sanitizeExternalUrl(hrefMatch?.[1] ?? p.shareimage, 'https://www.gdeltproject.org/');

      out.push({
        id: `gdelt-geo-${i}`,
        title,
        source: 'GDELT Geo 2.0',
        url,
        seenDate: new Date().toISOString(),
        location: String(p.name ?? 'Indonesia'),
        lng: Number(lng.toFixed(4)),
        lat: Number(lat.toFixed(4)),
        tone: Number(p.count ?? 0),
        category: 'Geopolitik & Berita',
      });
    }
    return out.slice(0, 30);
  }

  if (Array.isArray(obj.articles)) {
    const out: GdeltNewsEvent[] = [];
    for (let i = 0; i < obj.articles.length; i++) {
      const a = obj.articles[i] as Record<string, unknown>;
      const title = String(a.title ?? '').trim();
      const url = sanitizeExternalUrl(a.url);
      if (!title || !url) continue;
      const domain = String(a.domain ?? 'GDELT').trim();
      const matched = INDONESIAN_CITY_COORDS.find(([re]) => re.test(title));
      const jitterLng = ((i % 6) - 2.5) * 0.04;
      const jitterLat = ((Math.floor(i / 6) % 5) - 2) * 0.03;
      const lng = (matched ? matched[1][0] : 106.8456) + jitterLng;
      const lat = (matched ? matched[1][1] : -6.2088) + jitterLat;
      const rawDate = String(a.seendate ?? '');
      const iso = rawDate.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/)
        ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}T${rawDate.slice(9, 11)}:${rawDate.slice(11, 13)}:${rawDate.slice(13, 15)}Z`
        : new Date().toISOString();

      out.push({
        id: `gdelt-doc-${i}`,
        title,
        source: domain,
        url,
        seenDate: iso,
        location: matched ? matched[2] : 'Indonesia',
        lng: Number(lng.toFixed(4)),
        lat: Number(lat.toFixed(4)),
        tone: Number(a.tone ?? 0),
        category: 'Berita Terkini',
      });
    }
    return out.slice(0, 25);
  }
  return [];
}

/**
 * Parses Open-Meteo single-model response (NOAA GFS or ECMWF IFS).
 */
export function parseWeatherModelSnapshot(
  raw: unknown,
  model: 'NOAA GFS' | 'ECMWF IFS',
): WeatherModelSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const cur = obj.current as Record<string, unknown> | undefined;
  const hr = obj.hourly as Record<string, unknown> | undefined;
  if (!cur || typeof cur.temperature_2m !== 'number') return null;

  let next6hPrecipMm = 0;
  let next6hTempC = Number(cur.temperature_2m);
  if (hr && Array.isArray(hr.precipitation)) {
    const slice = hr.precipitation.slice(0, 6).map((x) => Number(x) || 0);
    next6hPrecipMm = Number(slice.reduce((a, b) => a + b, 0).toFixed(1));
  }
  if (hr && Array.isArray(hr.temperature_2m) && hr.temperature_2m.length > 5) {
    const val = Number(hr.temperature_2m[5]);
    if (Number.isFinite(val)) next6hTempC = val;
  }

  return {
    model,
    tempC: Number(Number(cur.temperature_2m).toFixed(1)),
    windKmh: Math.round(Number(cur.wind_speed_10m ?? 0)),
    windDirDeg: Math.round(Number(cur.wind_direction_10m ?? 0)),
    precipMm: Number(Number(cur.precipitation ?? 0).toFixed(1)),
    cloudPct: Math.round(Number(cur.cloud_cover ?? 0)),
    pressureHpa: Math.round(Number(cur.pressure_msl ?? 1010)),
    humidityPct: Math.round(Number(cur.relative_humidity_2m ?? 75)),
    weatherCode: Math.round(Number(cur.weather_code ?? 2)),
    next6hPrecipMm,
    next6hTempC: Number(next6hTempC.toFixed(1)),
  };
}

/**
 * Parses OSRM route v1 response into OsrmRouteResult.
 */
export function parseOsrmRoute(
  raw: unknown,
  profile: OsrmProfile,
  fromLabel: string,
  toLabel: string,
): OsrmRouteResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const routes = (raw as { routes?: unknown[] }).routes;
  if (!Array.isArray(routes) || routes.length === 0) return null;
  const r0 = routes[0] as {
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: [number, number][] };
    legs?: {
      steps?: {
        name?: string;
        distance?: number;
        duration?: number;
        maneuver?: { type?: string; modifier?: string };
      }[];
    }[];
  };
  const coords = r0.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;

  const modMap: Record<string, string> = {
    left: 'kiri',
    right: 'kanan',
    'slight left': 'serong kiri',
    'slight right': 'serong kanan',
    'sharp left': 'tajam ke kiri',
    'sharp right': 'tajam ke kanan',
    straight: 'lurus',
    uturn: 'putar balik',
  };
  const rawSteps = r0.legs?.[0]?.steps || [];
  const steps: OsrmStep[] = rawSteps.slice(0, 20).map((s) => {
    const mType = s.maneuver?.type || 'continue';
    const rawMod = (s.maneuver?.modifier || '').toLowerCase();
    const idMod = modMap[rawMod] || '';
    const roadName = s.name?.trim() || 'Jalan raya';
    const labelMap: Record<string, string> = {
      depart: 'Mulai perjalanan',
      arrive: 'Tiba di tujuan',
      turn: idMod === 'putar balik' ? 'Putar balik' : idMod ? `Belok ${idMod}` : 'Belok',
      merge: idMod ? `Gabung jalur ${idMod}` : 'Masuk jalur',
      fork: idMod ? `Ambil persimpangan ${idMod}` : 'Ambil persimpangan',
      roundabout: 'Masuk bundaran',
      rotary: 'Masuk bundaran',
      'on ramp': 'Masuk jalan tol / ramp',
      'off ramp': 'Keluar jalan tol / ramp',
      continue: 'Lurus terus',
      'new name': 'Lanjutkan ke',
      'end of road': idMod ? `Ujung jalan, belok ${idMod}` : 'Ujung jalan',
    };
    return {
      instruction: labelMap[mType] || (idMod ? `Lanjut ${idMod}` : 'Lurus terus'),
      roadName,
      distanceM: Math.round(Number(s.distance ?? 0)),
      durationSec: Math.round(Number(s.duration ?? 0)),
    };
  });

  return {
    profile,
    sourceMode: 'live',
    fromLabel,
    toLabel,
    distanceM: Math.round(Number(r0.distance ?? 0)),
    durationSec: Math.round(Number(r0.duration ?? 0)),
    coordinates: coords,
    steps,
  };
}

/**
 * Formats launch T-minus countdown relative to now.
 */
export function formatLaunchCountdown(isoDate: string, nowMs = Date.now()): string {
  const target = Date.parse(isoDate);
  if (!Number.isFinite(target)) return 'TBD';
  const diffSec = Math.round((target - nowMs) / 1000);
  const abs = Math.abs(diffSec);
  const d = Math.floor(abs / 86400);
  const h = Math.floor((abs % 86400) / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const prefix = diffSec >= 0 ? 'T-' : 'T+';
  if (d > 0) return `${prefix}${d}h ${h}j ${m}m`;
  if (h > 0) return `${prefix}${h}j ${m}m`;
  return `${prefix}${m} mnt`;
}
