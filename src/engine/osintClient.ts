import type {
  AircraftTrack,
  AlprCameraNode,
  BundledDatasetMeta,
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
} from './osintTypes';

async function getApiJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const resp = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

export const osintClient = {
  fetchAircraft: (refresh = false, signal?: AbortSignal) =>
    getApiJson<OsintFeedEnvelope<AircraftTrack>>(
      `/api/osint/aircraft${refresh ? '?refresh=1' : ''}`,
      signal,
    ),
  fetchEarthquakes: (refresh = false, signal?: AbortSignal) =>
    getApiJson<OsintFeedEnvelope<EarthquakeEvent>>(
      `/api/osint/earthquakes${refresh ? '?refresh=1' : ''}`,
      signal,
    ),
  fetchSatellites: (refresh = false, signal?: AbortSignal) =>
    getApiJson<OsintFeedEnvelope<SatelliteTrack>>(
      `/api/osint/satellites${refresh ? '?refresh=1' : ''}`,
      signal,
    ),
  fetchCctv: (signal?: AbortSignal) =>
    getApiJson<OsintFeedEnvelope<CityCctvNode>>('/api/osint/cctv', signal),
  fetchRadio: (refresh = false, signal?: AbortSignal) =>
    getApiJson<OsintFeedEnvelope<RadioStationNode>>(
      `/api/osint/radio${refresh ? '?refresh=1' : ''}`,
      signal,
    ),
  fetchGbfs: (signal?: AbortSignal) =>
    getApiJson<OsintFeedEnvelope<GbfsStationNode>>('/api/osint/gbfs', signal),
  fetchLaunches: (refresh = false, signal?: AbortSignal) =>
    getApiJson<OsintFeedEnvelope<SpaceLaunchEvent>>(
      `/api/osint/launches${refresh ? '?refresh=1' : ''}`,
      signal,
    ),
  fetchAlpr: (refresh = false, signal?: AbortSignal) =>
    getApiJson<OsintFeedEnvelope<AlprCameraNode>>(
      `/api/osint/alpr${refresh ? '?refresh=1' : ''}`,
      signal,
    ),
  fetchGdelt: (q = '', refresh = false, signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (refresh) params.set('refresh', '1');
    const qs = params.toString();
    return getApiJson<OsintFeedEnvelope<GdeltNewsEvent>>(
      `/api/osint/gdelt${qs ? `?${qs}` : ''}`,
      signal,
    );
  },
  fetchTransitFeeds: (signal?: AbortSignal) =>
    getApiJson<OsintFeedEnvelope<TransitFeedEntry>>('/api/osint/transit-feeds', signal),
  fetchWeatherModels: (
    lat: number,
    lng: number,
    city: string,
    refresh = false,
    signal?: AbortSignal,
  ) => {
    const params = new URLSearchParams({
      lat: lat.toFixed(4),
      lng: lng.toFixed(4),
      city,
    });
    if (refresh) params.set('refresh', '1');
    return getApiJson<DualWeatherComparison>(`/api/osint/weather-models?${params.toString()}`, signal);
  },
  fetchOsrmRoute: (
    from: { lng: number; lat: number; label: string },
    to: { lng: number; lat: number; label: string },
    profile: OsrmProfile,
    signal?: AbortSignal,
  ) => {
    const params = new URLSearchParams({
      fromLng: from.lng.toFixed(5),
      fromLat: from.lat.toFixed(5),
      toLng: to.lng.toFixed(5),
      toLat: to.lat.toFixed(5),
      fromLabel: from.label,
      toLabel: to.label,
      profile,
    });
    return getApiJson<OsrmRouteResult>(`/api/osint/osrm?${params.toString()}`, signal);
  },
  fetchDatasets: (signal?: AbortSignal) =>
    getApiJson<OsintFeedEnvelope<BundledDatasetMeta>>('/api/osint/datasets', signal),
};
