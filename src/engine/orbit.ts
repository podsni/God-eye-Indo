import type { CelesTrakGpRecord, SatelliteTrack } from './osintTypes';

const EARTH_RADIUS_KM = 6371.0;
const EARTH_MU_KM3_S2 = 398600.4418;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const SEC_PER_DAY = 86400;

/**
 * Greenwich Mean Sidereal Time (degrees) for a given Date.
 */
export function gmstDegrees(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525.0;
  let gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;
  gmst = ((gmst % 360) + 360) % 360;
  return gmst;
}

export function normalizeLng(lng: number): number {
  let x = ((lng + 180) % 360 + 360) % 360 - 180;
  if (x === -180) x = 180;
  return x;
}

/**
 * Solve Kepler's equation M = E - e sin(E) via Newton-Raphson.
 */
export function solveKepler(meanAnomalyRad: number, ecc: number): number {
  let E = meanAnomalyRad;
  const e = Math.max(0, Math.min(0.85, ecc));
  for (let i = 0; i < 6; i++) {
    const f = E - e * Math.sin(E) - meanAnomalyRad;
    const fp = 1 - e * Math.cos(E);
    E -= f / (fp || 1);
  }
  return E;
}

/**
 * Computes sub-satellite point (lng, lat, altitudeKm, velocityKms) at a given timestamp
 * directly from CelesTrak GP JSON orbital elements.
 */
export function propagateGpAtTime(
  gp: CelesTrakGpRecord,
  atDate: Date,
): { lng: number; lat: number; altitudeKm: number; velocityKms: number; isGeo: boolean } {
  const nRevPerDay = Number.isFinite(gp.MEAN_MOTION) && gp.MEAN_MOTION > 0.1 ? gp.MEAN_MOTION : 15.5;
  const isGeo = nRevPerDay >= 0.95 && nRevPerDay <= 1.05 && gp.INCLINATION < 5;

  // Semi-major axis a = (mu / n^2)^(1/3)
  const nRadPerSec = (nRevPerDay * 2 * Math.PI) / SEC_PER_DAY;
  const aKm = Math.cbrt(EARTH_MU_KM3_S2 / (nRadPerSec * nRadPerSec));
  const altitudeKm = Math.max(160, Math.round(aKm - EARTH_RADIUS_KM));
  const velocityKms = Number((Math.sqrt(EARTH_MU_KM3_S2 / aKm)).toFixed(2));

  if (isGeo && typeof gp.GEO_LNG === 'number' && Number.isFinite(gp.GEO_LNG)) {
    const phase = (atDate.getTime() / 86400000) * 2 * Math.PI;
    const lat = Number((Math.sin(phase) * Math.max(0.03, gp.INCLINATION)).toFixed(3));
    const lng = Number(normalizeLng(gp.GEO_LNG + Math.cos(phase) * 0.04).toFixed(3));
    return { lng, lat, altitudeKm, velocityKms, isGeo: true };
  }

  const epochMs = Date.parse(gp.EPOCH.endsWith('Z') ? gp.EPOCH : `${gp.EPOCH}Z`);
  const dtDays = Number.isFinite(epochMs) ? (atDate.getTime() - epochMs) / 86400000 : 0;

  const Mdeg = (gp.MEAN_ANOMALY + nRevPerDay * 360 * dtDays) % 360;
  const Mrad = (((Mdeg % 360) + 360) % 360) * DEG2RAD;
  const E = solveKepler(Mrad, gp.ECCENTRICITY || 0);
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const e = gp.ECCENTRICITY || 0;
  const nu = Math.atan2(Math.sqrt(1 - e * e) * sinE, cosE - e);

  const u = nu + (gp.ARG_OF_PERICENTER || 0) * DEG2RAD;
  const inc = (gp.INCLINATION || 0) * DEG2RAD;
  const raan = (gp.RA_OF_ASC_NODE || 0) * DEG2RAD;

  // ECI unit position vector
  const xEci = Math.cos(raan) * Math.cos(u) - Math.sin(raan) * Math.sin(u) * Math.cos(inc);
  const yEci = Math.sin(raan) * Math.cos(u) + Math.cos(raan) * Math.sin(u) * Math.cos(inc);
  const zEci = Math.sin(u) * Math.sin(inc);

  const lat = Math.asin(Math.max(-1, Math.min(1, zEci))) * RAD2DEG;
  const raDeg = Math.atan2(yEci, xEci) * RAD2DEG;
  const lng = normalizeLng(raDeg - gmstDegrees(atDate));

  return {
    lng: Number(lng.toFixed(3)),
    lat: Number(lat.toFixed(3)),
    altitudeKm,
    velocityKms,
    isGeo,
  };
}

export function isOverIndonesiaRegion(lng: number, lat: number): boolean {
  return lng >= 90 && lng <= 152 && lat >= -14 && lat <= 10;
}

/**
 * Propagates a satellite's current position plus an orbital ground track
 * (+/- 45 minutes in 3-minute steps, splitting safely at antimeridian jumps).
 */
export function buildSatelliteTrack(gp: CelesTrakGpRecord, now = new Date()): SatelliteTrack {
  const cur = propagateGpAtTime(gp, now);
  const track: [number, number][] = [];

  if (!cur.isGeo) {
    for (let min = -24; min <= 48; min += 3) {
      const sample = propagateGpAtTime(gp, new Date(now.getTime() + min * 60_000));
      if (track.length > 0 && Math.abs(sample.lng - track[track.length - 1][0]) > 180) {
        // Keep only the continuous pass closest to current time to avoid wraparound line artifacts
        if (min <= 0) {
          track.length = 0;
        } else {
          break;
        }
      }
      track.push([sample.lng, sample.lat]);
    }
  } else {
    track.push([cur.lng, cur.lat]);
  }

  return {
    noradId: gp.NORAD_CAT_ID,
    name: gp.OBJECT_NAME,
    group: gp.GROUP || (cur.isGeo ? 'geo' : 'leo'),
    owner: gp.OWNER || 'CelesTrak GP',
    lng: cur.lng,
    lat: cur.lat,
    altitudeKm: cur.altitudeKm,
    velocityKms: cur.velocityKms,
    inclinationDeg: Number((gp.INCLINATION || 0).toFixed(2)),
    isGeo: cur.isGeo,
    overIndonesia: isOverIndonesiaRegion(cur.lng, cur.lat),
    groundTrack: track,
  };
}
