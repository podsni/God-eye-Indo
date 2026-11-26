export type FeedSourceMode = 'live' | 'bundled' | 'hybrid';

export interface OsintLayerState {
  aircraft: boolean;
  earthquakes: boolean;
  satellites: boolean;
  cctv: boolean;
  alpr: boolean;
  gbfs: boolean;
  radio: boolean;
  launches: boolean;
  gdelt: boolean;
  transitFeeds: boolean;
  weatherNodes: boolean;
}

export const DEFAULT_OSINT_LAYERS: OsintLayerState = {
  aircraft: true,
  earthquakes: true,
  satellites: true,
  cctv: false,
  alpr: false,
  gbfs: false,
  radio: false,
  launches: false,
  gdelt: false,
  transitFeeds: false,
  weatherNodes: false,
};

export interface AircraftTrack {
  icao24: string;
  callsign: string;
  originCountry: string;
  lng: number;
  lat: number;
  altitudeM: number;
  velocityKmh: number;
  heading: number;
  verticalRate: number;
  onGround: boolean;
  source: 'opensky' | 'adsb.lol';
  category: 'civil' | 'military' | 'gov';
  squawk?: string;
  aircraftType?: string;
  routeHint?: string;
}

export interface EarthquakeEvent {
  id: string;
  mag: number;
  place: string;
  timeMs: number;
  lng: number;
  lat: number;
  depthKm: number;
  tsunami: boolean;
  url: string;
  alert?: string | null;
  source?: 'bmkg' | 'usgs';
  potensi?: string;
  dirasakan?: string;
  shakemapUrl?: string;
  waktuWib?: string;
  lintang?: string;
  bujur?: string;
  isLatestBmkg?: boolean;
}

export interface CelesTrakGpRecord {
  OBJECT_NAME: string;
  NORAD_CAT_ID: number;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  GEO_LNG?: number;
  GROUP?: string;
  OWNER?: string;
}

export interface SatelliteTrack {
  noradId: number;
  name: string;
  group: string;
  owner: string;
  lng: number;
  lat: number;
  altitudeKm: number;
  velocityKms: number;
  inclinationDeg: number;
  isGeo: boolean;
  overIndonesia: boolean;
  groundTrack: [number, number][];
}

export interface CityCctvNode {
  id: string;
  name: string;
  city: string;
  province: string;
  operator: string;
  road: string;
  lng: number;
  lat: number;
  status: 'online' | 'maintenance';
  corridor: string;
  streamPageUrl: string;
}

export interface AlprCameraNode {
  id: string;
  name: string;
  city: string;
  road: string;
  operator: string;
  cameraType: string;
  direction: string;
  speedLimitKmh?: number;
  lng: number;
  lat: number;
  osmId: string;
}

export interface GbfsStationNode {
  id: string;
  name: string;
  network: string;
  city: string;
  lng: number;
  lat: number;
  bikesAvailable: number;
  docksAvailable: number;
  ebikesAvailable: number;
  isRenting: boolean;
}

export interface RadioStationNode {
  id: string;
  name: string;
  city: string;
  tags: string;
  codec: string;
  bitrate: number;
  url: string;
  homepage: string;
  lng: number;
  lat: number;
  votes: number;
}

export interface SpaceLaunchEvent {
  id: string;
  name: string;
  provider: string;
  rocket: string;
  pad: string;
  windowStart: string;
  status: string;
  mission: string;
  orbit: string;
  lng: number;
  lat: number;
  url: string;
}

export interface GdeltNewsEvent {
  id: string;
  title: string;
  source: string;
  url: string;
  seenDate: string;
  location: string;
  lng: number;
  lat: number;
  tone: number;
  category: string;
}

export interface TransitFeedEntry {
  id: string;
  name: string;
  operator: string;
  region: string;
  mode: string;
  format: string;
  routesCount: number;
  status: 'active' | 'beta';
  center: [number, number];
  corridor: [number, number][];
}

export interface WeatherModelSnapshot {
  model: 'NOAA GFS' | 'ECMWF IFS';
  tempC: number;
  windKmh: number;
  windDirDeg: number;
  precipMm: number;
  cloudPct: number;
  pressureHpa: number;
  humidityPct: number;
  weatherCode: number;
  next6hPrecipMm: number;
  next6hTempC: number;
}

export interface DualWeatherComparison {
  city: string;
  lat: number;
  lng: number;
  updatedAt: string;
  sourceMode: FeedSourceMode;
  noaa: WeatherModelSnapshot;
  ecmwf: WeatherModelSnapshot;
}

export type OsrmProfile = 'driving' | 'bike' | 'foot';

export interface OsrmStep {
  instruction: string;
  roadName: string;
  distanceM: number;
  durationSec: number;
}

export interface OsrmRouteResult {
  profile: OsrmProfile;
  sourceMode: FeedSourceMode;
  fromLabel: string;
  toLabel: string;
  distanceM: number;
  durationSec: number;
  coordinates: [number, number][];
  steps: OsrmStep[];
}

export interface BundledDatasetMeta {
  id: string;
  title: string;
  category: string;
  url: string;
  format: string;
  coverage: string;
  license: string;
  records: number;
  layerKey?: keyof OsintLayerState | 'jpl' | 'rail';
}

export interface OsintFeedEnvelope<T> {
  sourceMode: FeedSourceMode;
  provider: string;
  updatedAt: string;
  items: T[];
  note?: string;
}

export type OsintEntitySelection =
  | { type: 'aircraft'; item: AircraftTrack }
  | { type: 'earthquake'; item: EarthquakeEvent }
  | { type: 'satellite'; item: SatelliteTrack }
  | { type: 'cctv'; item: CityCctvNode }
  | { type: 'alpr'; item: AlprCameraNode }
  | { type: 'gbfs'; item: GbfsStationNode }
  | { type: 'radio'; item: RadioStationNode }
  | { type: 'launch'; item: SpaceLaunchEvent }
  | { type: 'gdelt'; item: GdeltNewsEvent }
  | { type: 'transit'; item: TransitFeedEntry };
