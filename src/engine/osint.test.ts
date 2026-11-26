import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSatelliteTrack, gmstDegrees, isOverIndonesiaRegion, normalizeLng, propagateGpAtTime } from './orbit';
import {
  escapeHtml,
  formatLaunchCountdown,
  haversineKm,
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
  sanitizeExternalUrl,
} from './osintParsers';
import { BASEMAP_OPTIONS, buildMapStyle, isDarkBasemap } from './constants';
import {
  computeFootprintRadiusKm,
  computeMachEstimate,
  computeOrbitalPeriodMin,
  resolveAircraftProfile,
  resolveSatelliteProfile,
} from './aerospaceCatalog';

test('orbital propagator places Indonesian GEO satellite SATRIA-1 near 146E and ISS in LEO', () => {
  const now = new Date('2026-11-25T12:00:00Z');
  const satria = buildSatelliteTrack(
    {
      OBJECT_NAME: 'SATRIA-1',
      NORAD_CAT_ID: 56993,
      EPOCH: '2026-11-25T12:00:00.000000',
      MEAN_MOTION: 1.0027,
      ECCENTRICITY: 0.00015,
      INCLINATION: 0.05,
      RA_OF_ASC_NODE: 146.0,
      ARG_OF_PERICENTER: 0,
      MEAN_ANOMALY: 0,
      GEO_LNG: 146.0,
      GROUP: 'indonesia',
      OWNER: 'IDN',
    },
    now,
  );
  assert.equal(satria.isGeo, true);
  assert.equal(satria.overIndonesia, true);
  assert.ok(satria.altitudeKm > 35000 && satria.altitudeKm < 36500);
  assert.ok(Math.abs(satria.lng - 146.0) < 0.2);

  const iss = buildSatelliteTrack(
    {
      OBJECT_NAME: 'ISS (ZARYA)',
      NORAD_CAT_ID: 25544,
      EPOCH: '2026-11-25T12:00:00.000000',
      MEAN_MOTION: 15.5,
      ECCENTRICITY: 0.0004,
      INCLINATION: 51.64,
      RA_OF_ASC_NODE: 142.5,
      ARG_OF_PERICENTER: 45,
      MEAN_ANOMALY: 120,
    },
    now,
  );
  assert.equal(iss.isGeo, false);
  assert.ok(iss.altitudeKm > 380 && iss.altitudeKm < 460);
  assert.ok(iss.groundTrack.length >= 5);
  assert.ok(gmstDegrees(now) >= 0 && gmstDegrees(now) < 360);
  assert.equal(normalizeLng(190), -170);
  assert.equal(isOverIndonesiaRegion(106.8, -6.2), true);
  assert.equal(isOverIndonesiaRegion(-74.0, 40.7), false);

  const pos = propagateGpAtTime(
    {
      OBJECT_NAME: 'LAPAN-A2',
      NORAD_CAT_ID: 40931,
      EPOCH: '2026-11-25T12:00:00.000000',
      MEAN_MOTION: 14.75,
      ECCENTRICITY: 0.001,
      INCLINATION: 6.0,
      RA_OF_ASC_NODE: 98.4,
      ARG_OF_PERICENTER: 12.0,
      MEAN_ANOMALY: 15.0,
    },
    now,
  );
  assert.ok(Math.abs(pos.lat) <= 6.2);
});

test('sanitizeExternalUrl and escapeHtml block XSS and unsafe schemes', () => {
  assert.equal(sanitizeExternalUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeExternalUrl('data:text/html,<script>alert(1)</script>'), '');
  assert.equal(sanitizeExternalUrl('https://earthquake.usgs.gov/test'), 'https://earthquake.usgs.gov/test');
  assert.equal(escapeHtml('<script>"test" & \'x\'</script>'), '&lt;script&gt;&quot;test&quot; &amp; &#39;x&#39;&lt;/script&gt;');
});

test('OpenSky and adsb.lol parsers normalize and deduplicate aircraft feeds', () => {
  const os = parseOpenSkyStates({
    states: [
      ['8a0142', 'GIA404 ', 'Indonesia', 0, 0, 107.62, -6.81, 10000, false, 230, 108, 0.5, null, null, '2142'],
      ['8a0f02', 'IDAF01 ', 'Indonesia', 0, 0, 106.9, -6.27, 3200, false, 140, 85, 1.0],
    ],
  });
  assert.equal(os.length, 2);
  assert.equal(os[0].callsign, 'GIA404');
  assert.equal(os[0].velocityKmh, 828);
  assert.equal(os[1].category, 'military');

  const adsb = parseAdsbLolAircraft(
    {
      ac: [
        { hex: '8a0f02', flight: 'IDAF01 ', lat: -6.27, lon: 106.91, alt_baro: 10500, gs: 265, track: 88, dbFlags: 1, t: 'C130J' },
        { hex: '8a0999', flight: 'TNIAU24', lat: -7.39, lon: 112.78, alt_baro: 18000, gs: 330, track: 112, dbFlags: 1, t: 'CN295' },
      ],
    },
    true,
  );
  const merged = mergeAircraftFeeds(os, adsb);
  assert.equal(merged.length, 3);
  assert.equal(merged[0].category, 'military');
  assert.equal(merged.find((a) => a.icao24 === '8a0f02')?.aircraftType, 'C130J');
});

test('USGS, Launch Library 2, Radio Browser, Overpass ALPR, GDELT, Weather, and OSRM parsers work cleanly', () => {
  const eq = parseUsgsEarthquakes({
    features: [
      {
        id: 'us70001',
        properties: { mag: 5.3, place: '80 km SW of Sukabumi, Indonesia', time: 1795551000000, tsunami: 0, url: 'https://earthquake.usgs.gov/e/1' },
        geometry: { coordinates: [106.48, -7.52, 28.4] },
      },
    ],
  });
  assert.equal(eq.length, 1);
  assert.equal(eq[0].mag, 5.3);
  assert.equal(eq[0].depthKm, 28.4);

  const launches = parseLaunchLibrary2({
    results: [
      {
        id: 'l1',
        name: 'Falcon 9 | Nusantara',
        window_start: '2026-11-28T04:15:00Z',
        status: { abbrev: 'Go' },
        launch_service_provider: { name: 'SpaceX' },
        rocket: { configuration: { full_name: 'Falcon 9 Block 5' } },
        mission: { description: 'Satelit komunikasi', orbit: { abbrev: 'GTO' } },
        pad: { name: 'SLC-40', latitude: 28.56, longitude: -80.57, location: { name: 'Cape Canaveral' } },
        url: 'https://thespacedevs.com/launch/1',
      },
    ],
  });
  assert.equal(launches.length, 1);
  assert.equal(launches[0].provider, 'SpaceX');
  assert.equal(formatLaunchCountdown('2026-11-28T04:15:00Z', Date.parse('2026-11-27T04:15:00Z')), 'T-1h 0j 0m');

  const radios = parseRadioBrowserStations([
    { stationuuid: 'r1', name: 'Elshinta Bandung', url_resolved: 'https://stream.example.com/live', codec: 'MP3', bitrate: 64, state: 'West Java' },
    { stationuuid: 'r2', name: 'Insecure HTTP', url_resolved: 'http://insecure.example.com/live' },
  ]);
  assert.equal(radios.length, 1);
  assert.equal(radios[0].city, 'Bandung');

  const alpr = parseOverpassAlpr({
    elements: [
      { type: 'node', id: 12345, lat: -6.19, lon: 106.82, tags: { 'surveillance:type': 'ALPR', name: 'ETLE Thamrin', maxspeed: '60' } },
    ],
  });
  assert.equal(alpr.length, 1);
  assert.equal(alpr[0].speedLimitKmh, 60);

  const gdelt = parseGdeltGeoOrDoc({
    articles: [
      { title: 'KAI Surabaya tambah jadwal baru', url: 'https://kompas.com/a1', domain: 'kompas.com', seendate: '20261125T100000Z', tone: 2.1 },
    ],
  });
  assert.equal(gdelt.length, 1);
  assert.equal(gdelt[0].location, 'Surabaya');

  const weather = parseWeatherModelSnapshot(
    {
      current: { temperature_2m: 30.4, wind_speed_10m: 14, wind_direction_10m: 120, precipitation: 0.2, cloud_cover: 65, pressure_msl: 1009, relative_humidity_2m: 78, weather_code: 2 },
      hourly: { precipitation: [0.2, 0.5, 1.0, 0, 0, 0], temperature_2m: [30, 30, 29, 29, 28, 27.5] },
    },
    'ECMWF IFS',
  );
  assert.ok(weather);
  assert.equal(weather.next6hPrecipMm, 1.7);
  assert.equal(weather.next6hTempC, 27.5);

  const route = parseOsrmRoute(
    {
      routes: [
        {
          distance: 148200,
          duration: 8400,
          geometry: { coordinates: [[106.83, -6.17], [107.60, -6.91]] },
          legs: [{ steps: [{ name: 'Tol Cipularang', distance: 45000, duration: 2400, maneuver: { type: 'depart' } }] }],
        },
      ],
    },
    'driving',
    'Jakarta',
    'Bandung',
  );
  assert.ok(route);
  assert.equal(route.distanceM, 148200);
  assert.equal(route.steps[0].roadName, 'Tol Cipularang');
});

test('BMKG AutoGempa & list parsers sanitize shakemap URLs, detect tsunami potential, and merge with USGS', () => {
  const auto = parseBmkgAutoGempa({
    Infogempa: {
      gempa: {
        Tanggal: '25 Nov 2026',
        Jam: '20:28:30 WIB',
        DateTime: '2026-11-25T13:28:30+00:00',
        Coordinates: '-8.36,120.52',
        Lintang: '8.36 LS',
        Bujur: '120.52 BT',
        Magnitude: '5.4',
        Kedalaman: '12 km',
        Wilayah: '29 km Utara Ruteng, Manggarai',
        Potensi: 'Tidak berpotensi TSUNAMI',
        Dirasakan: 'III - IV Manggarai',
        Shakemap: '20261125202830.mmi.jpg',
      },
    },
  });
  assert.ok(auto);
  assert.equal(auto.source, 'bmkg');
  assert.equal(auto.isLatestBmkg, true);
  assert.equal(auto.tsunami, false);
  assert.equal(auto.shakemapUrl, '/api/osint/bmkg-shakemap/20261125202830.mmi.jpg');
  assert.equal(auto.dirasakan, 'III - IV Manggarai');

  // Reject path traversal or invalid shakemap filenames
  const badShakemap = parseBmkgAutoGempa({
    Infogempa: {
      gempa: {
        DateTime: '2026-11-25T14:00:00+00:00',
        Coordinates: '-7.50,106.40',
        Magnitude: '6.8',
        Kedalaman: '10 km',
        Wilayah: 'Selatan Sukabumi',
        Potensi: 'Berpotensi TSUNAMI untuk wilayah pesisir selatan Jawa',
        Shakemap: '../../etc/passwd',
      },
    },
  });
  assert.ok(badShakemap);
  assert.equal(badShakemap.tsunami, true);
  assert.equal(badShakemap.shakemapUrl, undefined);

  const list = parseBmkgGempaList({
    Infogempa: {
      gempa: [
        {
          DateTime: '2026-11-25T13:28:30+00:00',
          Coordinates: '-8.36,120.52',
          Magnitude: '5.4',
          Kedalaman: '12 km',
          Wilayah: '29 km Utara Ruteng',
          Potensi: 'Tidak berpotensi tsunami',
        },
        {
          DateTime: '2026-11-25T11:00:00+00:00',
          Coordinates: '-6.80,105.40',
          Magnitude: '4.6',
          Kedalaman: '20 km',
          Wilayah: 'Selat Sunda',
        },
      ],
    },
  });
  assert.equal(list.length, 2);

  // Deduplicate matching USGS event within 55 km & 3 min while keeping distinct USGS event
  const usgs = parseUsgsEarthquakes({
    features: [
      {
        id: 'usgs-dup',
        properties: { mag: 5.3, place: 'Ruteng dup', time: Date.parse('2026-11-25T13:29:00Z'), tsunami: 0 },
        geometry: { coordinates: [120.55, -8.35, 14] },
      },
      {
        id: 'usgs-unique',
        properties: { mag: 5.1, place: 'Molucca Sea', time: Date.parse('2026-11-25T10:00:00Z'), tsunami: 0 },
        geometry: { coordinates: [126.2, 1.4, 35] },
      },
    ],
  });
  const merged = mergeBmkgAndUsgsEarthquakes([auto, ...list], usgs);
  assert.equal(merged.length, 3);
  assert.equal(merged[0].isLatestBmkg, true);
  assert.ok(merged.some((e) => e.id === 'usgs-unique'));
  assert.ok(!merged.some((e) => e.id === 'usgs-dup'));

  // Haversine distance Jakarta -> Bandung ~115-125 km
  const km = haversineKm(106.8456, -6.2088, 107.6191, -6.9175);
  assert.ok(km > 110 && km < 130);
});

test('all 6 basemap modes build valid MapLibre styles and dark-mode flags', () => {
  assert.equal(BASEMAP_OPTIONS.length, 6);
  assert.equal(isDarkBasemap('tactical'), true);
  assert.equal(isDarkBasemap('terrain'), false);
  const topo = buildMapStyle('terrain');
  assert.equal(typeof topo, 'object');
  const radar = buildMapStyle('tactical');
  assert.equal(typeof radar, 'object');
});

test('aerospace catalog resolves Indonesian aircraft types, airlines, flight phases, and satellite orbital specs', () => {
  const gia = resolveAircraftProfile({
    icao24: '8a0142',
    callsign: 'GIA404',
    originCountry: 'Indonesia',
    lng: 107.624,
    lat: -6.812,
    altitudeM: 10058,
    velocityKmh: 842,
    heading: 108,
    verticalRate: 0.4,
    onGround: false,
    source: 'opensky',
    category: 'civil',
    aircraftType: 'B738',
  });
  assert.equal(gia.airlineName, 'Garuda Indonesia');
  assert.equal(gia.model3dType, 'narrowbody');
  assert.equal(gia.photoKey, 'narrowbody');
  assert.equal(gia.flightLevel, 'FL330');
  assert.equal(gia.flightPhase, 'Jelajah (Cruise)');
  assert.ok(gia.machEstimate.startsWith('Mach 0.'));

  const mil = resolveAircraftProfile({
    icao24: '8a0f02',
    callsign: 'IDAF01',
    originCountry: 'Indonesia',
    lng: 106.9,
    lat: -6.27,
    altitudeM: 3200,
    velocityKmh: 495,
    heading: 85,
    verticalRate: 2.8,
    onGround: false,
    source: 'adsb.lol',
    category: 'military',
    aircraftType: 'C130J',
  });
  assert.equal(mil.airlineName, 'TNI Angkatan Udara');
  assert.equal(mil.model3dType, 'military');
  assert.equal(mil.flightPhase, 'Menanjak (Climb)');

  const sar = resolveAircraftProfile({
    icao24: '8a0e77',
    callsign: 'BASARNAS2',
    originCountry: 'Indonesia',
    lng: 108.91,
    lat: -6.68,
    altitudeM: 1650,
    velocityKmh: 255,
    heading: 282,
    verticalRate: -0.5,
    onGround: false,
    source: 'adsb.lol',
    category: 'gov',
    aircraftType: 'AW139',
  });
  assert.equal(sar.model3dType, 'helicopter');
  assert.equal(sar.photoKey, 'helicopter');
  assert.equal(computeMachEstimate(100, 50, true), 'Subsonik Rendah');

  const satria = resolveSatelliteProfile({
    noradId: 56993,
    name: 'SATRIA-1 (INDONESIA)',
    group: 'indonesia',
    owner: 'IDN (PSN / Komdigi)',
    lng: 146.0,
    lat: 0.01,
    altitudeKm: 35786,
    velocityKms: 3.07,
    inclinationDeg: 0.05,
    isGeo: true,
    overIndonesia: true,
    groundTrack: [[146, 0]],
  });
  assert.equal(satria.model3dType, 'geo_comms');
  assert.equal(satria.photoKey, 'sat_geo');
  assert.ok(satria.orbitalPeriodMin > 1420 && satria.orbitalPeriodMin < 1450);
  assert.ok(satria.footprintRadiusKm > 8000 && satria.footprintRadiusKm < 9500);

  const iss = resolveSatelliteProfile({
    noradId: 25544,
    name: 'ISS (ZARYA)',
    group: 'stations',
    owner: 'INTL',
    lng: 108.2,
    lat: -5.4,
    altitudeKm: 420,
    velocityKms: 7.66,
    inclinationDeg: 51.64,
    isGeo: false,
    overIndonesia: true,
    groundTrack: [[108.2, -5.4]],
  });
  assert.equal(iss.model3dType, 'space_station');
  assert.equal(iss.photoKey, 'sat_leo');
  assert.ok(computeOrbitalPeriodMin(420) > 90 && computeOrbitalPeriodMin(420) < 96);
  assert.ok(computeFootprintRadiusKm(420) > 2100 && computeFootprintRadiusKm(420) < 2400);
});


