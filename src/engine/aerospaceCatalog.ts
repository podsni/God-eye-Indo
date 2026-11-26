import type { AircraftTrack, SatelliteTrack } from './osintTypes';

export type Aircraft3DModelType = 'narrowbody' | 'widebody' | 'turboprop' | 'military' | 'helicopter';
export type Satellite3DModelType = 'geo_comms' | 'space_station' | 'leo_earth_obs';

export type AerospacePhotoKey =
  | 'narrowbody'
  | 'widebody'
  | 'turboprop'
  | 'military'
  | 'helicopter'
  | 'sat_geo'
  | 'sat_leo';

export interface AircraftLivery {
  fuselage: string;
  belly: string;
  tail: string;
  accent: string;
}

export interface AircraftProfile {
  airlineName: string;
  airlineCode: string;
  modelName: string;
  icaoType: string;
  manufacturer: string;
  aircraftClass: string;
  model3dType: Aircraft3DModelType;
  photoKey: AerospacePhotoKey;
  livery: AircraftLivery;
  capacity: string;
  wingspanM: string;
  lengthM: string;
  cruiseSpeedKmh: string;
  maxCeilingFt: string;
  rangeKm: string;
  engines: string;
  flightPhase: string;
  flightLevel: string;
  altitudeFt: number;
  speedKnots: number;
  machEstimate: string;
  summary: string;
}

export interface SatelliteProfile {
  displayName: string;
  operatorFull: string;
  country: string;
  orbitClass: string;
  model3dType: Satellite3DModelType;
  photoKey: AerospacePhotoKey;
  missionRole: string;
  launchYear: string;
  launchVehicle: string;
  launchMassKg: string;
  frequencyBand: string;
  coverageSummary: string;
  accentColor: string;
  orbitalPeriodMin: number;
  orbitsPerDay: number;
  footprintRadiusKm: number;
  signalLatencyMs: number;
  summary: string;
}

interface AirlineEntry {
  name: string;
  defaultType: string;
  livery: AircraftLivery;
}

const AIRLINE_BY_PREFIX: Record<string, AirlineEntry> = {
  GIA: {
    name: 'Garuda Indonesia',
    defaultType: 'B738',
    livery: { fuselage: '#f8fafc', belly: '#0c4a6e', tail: '#0369a1', accent: '#06b6d4' },
  },
  LNI: {
    name: 'Lion Air',
    defaultType: 'B739',
    livery: { fuselage: '#f8fafc', belly: '#e2e8f0', tail: '#dc2626', accent: '#b91c1c' },
  },
  CTV: {
    name: 'Citilink Indonesia',
    defaultType: 'A320',
    livery: { fuselage: '#f8fafc', belly: '#e2e8f0', tail: '#16a34a', accent: '#65a30d' },
  },
  BTK: {
    name: 'Batik Air',
    defaultType: 'A320',
    livery: { fuselage: '#f8fafc', belly: '#312e81', tail: '#7e22ce', accent: '#e11d48' },
  },
  AWQ: {
    name: 'Indonesia AirAsia',
    defaultType: 'A320',
    livery: { fuselage: '#dc2626', belly: '#b91c1c', tail: '#ef4444', accent: '#f8fafc' },
  },
  SJY: {
    name: 'Sriwijaya Air',
    defaultType: 'B738',
    livery: { fuselage: '#f8fafc', belly: '#1e3a8a', tail: '#1d4ed8', accent: '#dc2626' },
  },
  WON: {
    name: 'Wings Air',
    defaultType: 'AT76',
    livery: { fuselage: '#f8fafc', belly: '#cbd5e1', tail: '#b91c1c', accent: '#dc2626' },
  },
  SJV: {
    name: 'Super Air Jet',
    defaultType: 'A320',
    livery: { fuselage: '#f8fafc', belly: '#e2e8f0', tail: '#be123c', accent: '#f59e0b' },
  },
  PAS: {
    name: 'Pelita Air',
    defaultType: 'A320',
    livery: { fuselage: '#f8fafc', belly: '#e2e8f0', tail: '#0284c7', accent: '#dc2626' },
  },
  NAM: {
    name: 'NAM Air',
    defaultType: 'B738',
    livery: { fuselage: '#f8fafc', belly: '#1d4ed8', tail: '#1e40af', accent: '#ef4444' },
  },
  TNU: {
    name: 'TransNusa',
    defaultType: 'A320',
    livery: { fuselage: '#f8fafc', belly: '#1d4ed8', tail: '#0284c7', accent: '#facc15' },
  },
  SIA: {
    name: 'Singapore Airlines',
    defaultType: 'A359',
    livery: { fuselage: '#f8fafc', belly: '#1e293b', tail: '#1e3a8a', accent: '#f59e0b' },
  },
  MAS: {
    name: 'Malaysia Airlines',
    defaultType: 'B738',
    livery: { fuselage: '#f8fafc', belly: '#e2e8f0', tail: '#1d4ed8', accent: '#dc2626' },
  },
  QFA: {
    name: 'Qantas Airways',
    defaultType: 'A333',
    livery: { fuselage: '#f8fafc', belly: '#cbd5e1', tail: '#dc2626', accent: '#991b1b' },
  },
  UAE: {
    name: 'Emirates',
    defaultType: 'B77W',
    livery: { fuselage: '#f8fafc', belly: '#cbd5e1', tail: '#b91c1c', accent: '#d97706' },
  },
  IDAF: {
    name: 'TNI Angkatan Udara',
    defaultType: 'C130J',
    livery: { fuselage: '#64748b', belly: '#475569', tail: '#475569', accent: '#dc2626' },
  },
  TNIAU: {
    name: 'TNI Angkatan Udara',
    defaultType: 'CN295',
    livery: { fuselage: '#64748b', belly: '#475569', tail: '#334155', accent: '#dc2626' },
  },
  BASARNAS: {
    name: 'BASARNAS (SAR Nasional)',
    defaultType: 'AW139',
    livery: { fuselage: '#ea580c', belly: '#f8fafc', tail: '#ea580c', accent: '#f8fafc' },
  },
  POLRI: {
    name: 'Poludara Polri',
    defaultType: 'AW139',
    livery: { fuselage: '#1e3a8a', belly: '#f8fafc', tail: '#1d4ed8', accent: '#f59e0b' },
  },
};

interface AircraftTypeSpec {
  modelName: string;
  icaoType: string;
  manufacturer: string;
  aircraftClass: string;
  model3dType: Aircraft3DModelType;
  photoKey: AerospacePhotoKey;
  capacity: string;
  wingspanM: string;
  lengthM: string;
  cruiseSpeedKmh: string;
  maxCeilingFt: string;
  rangeKm: string;
  engines: string;
  summary: string;
}

const AIRCRAFT_SPECS: Record<string, AircraftTypeSpec> = {
  B738: {
    modelName: 'Boeing 737-800 Next Generation',
    icaoType: 'B738',
    manufacturer: 'Boeing Commercial Airplanes',
    aircraftClass: 'Jet Lorong Tunggal (Narrow-body)',
    model3dType: 'narrowbody',
    photoKey: 'narrowbody',
    capacity: '162–189 penumpang',
    wingspanM: '35,8 m',
    lengthM: '39,5 m',
    cruiseSpeedKmh: '842 km/j',
    maxCeilingFt: '41.000 ft',
    rangeKm: '5.436 km',
    engines: '2× CFM56-7B26 Turbofan',
    summary:
      'Armada jet lorong tunggal andalan koridor domestik utama Nusantara (CGK–SUB–DPS–UPG–DJJ) dengan winglet efisiensi bahan bakar.',
  },
  B739: {
    modelName: 'Boeing 737-900ER',
    icaoType: 'B739',
    manufacturer: 'Boeing Commercial Airplanes',
    aircraftClass: 'Jet Lorong Tunggal (Narrow-body)',
    model3dType: 'narrowbody',
    photoKey: 'narrowbody',
    capacity: '215 penumpang',
    wingspanM: '35,8 m',
    lengthM: '42,1 m',
    cruiseSpeedKmh: '842 km/j',
    maxCeilingFt: '41.000 ft',
    rangeKm: '5.460 km',
    engines: '2× CFM56-7B27E Turbofan',
    summary:
      'Varian berbadan panjang dari keluarga Boeing 737 NG dengan kapasitas kursi tinggi untuk rute padat antar-pulau di Indonesia.',
  },
  B38M: {
    modelName: 'Boeing 737 MAX 8',
    icaoType: 'B38M',
    manufacturer: 'Boeing Commercial Airplanes',
    aircraftClass: 'Jet Lorong Tunggal (Narrow-body)',
    model3dType: 'narrowbody',
    photoKey: 'narrowbody',
    capacity: '178–189 penumpang',
    wingspanM: '35,9 m',
    lengthM: '39,5 m',
    cruiseSpeedKmh: '839 km/j',
    maxCeilingFt: '41.000 ft',
    rangeKm: '6.570 km',
    engines: '2× CFM LEAP-1B Turbofan',
    summary:
      'Generasi terbaru seri 737 dengan mesin high-bypass LEAP-1B dan split-scimitar winglet untuk jarak jelajah lebih jauh.',
  },
  A320: {
    modelName: 'Airbus A320-200 / A320neo',
    icaoType: 'A320',
    manufacturer: 'Airbus SAS',
    aircraftClass: 'Jet Lorong Tunggal (Narrow-body)',
    model3dType: 'narrowbody',
    photoKey: 'narrowbody',
    capacity: '156–180 penumpang',
    wingspanM: '35,8 m',
    lengthM: '37,6 m',
    cruiseSpeedKmh: '828 km/j',
    maxCeilingFt: '39.800 ft',
    rangeKm: '6.100 km',
    engines: '2× CFM56-5B / PW1100G Turbofan',
    summary:
      'Pesawat jet fly-by-wire terpopuler di ruang udara Indonesia, melayani rute jarak pendek hingga menengah dengan kabin lapang.',
  },
  A20N: {
    modelName: 'Airbus A320neo',
    icaoType: 'A20N',
    manufacturer: 'Airbus SAS',
    aircraftClass: 'Jet Lorong Tunggal (Narrow-body)',
    model3dType: 'narrowbody',
    photoKey: 'narrowbody',
    capacity: '180 penumpang',
    wingspanM: '35,8 m',
    lengthM: '37,6 m',
    cruiseSpeedKmh: '833 km/j',
    maxCeilingFt: '39.800 ft',
    rangeKm: '6.300 km',
    engines: '2× CFM LEAP-1A / PW1100G',
    summary:
      'Versi mesin baru (New Engine Option) dengan sharklet sayap untuk penghematan bahan bakar hingga 15–20%.',
  },
  A321: {
    modelName: 'Airbus A321-200 / A321neo',
    icaoType: 'A321',
    manufacturer: 'Airbus SAS',
    aircraftClass: 'Jet Lorong Tunggal (Narrow-body)',
    model3dType: 'narrowbody',
    photoKey: 'narrowbody',
    capacity: '220–236 penumpang',
    wingspanM: '35,8 m',
    lengthM: '44,5 m',
    cruiseSpeedKmh: '833 km/j',
    maxCeilingFt: '39.800 ft',
    rangeKm: '7.400 km',
    engines: '2× CFM LEAP-1A Turbofan',
    summary:
      'Varian terbesar keluarga Airbus A320 untuk rute trunk berpermintaan tinggi dan penerbangan regional Asia Tenggara.',
  },
  A333: {
    modelName: 'Airbus A330-300 / A330neo',
    icaoType: 'A333',
    manufacturer: 'Airbus SAS',
    aircraftClass: 'Jet Badan Lebar (Wide-body)',
    model3dType: 'widebody',
    photoKey: 'widebody',
    capacity: '287–360 penumpang',
    wingspanM: '60,3 m',
    lengthM: '63,7 m',
    cruiseSpeedKmh: '871 km/j',
    maxCeilingFt: '41.450 ft',
    rangeKm: '11.750 km',
    engines: '2× Rolls-Royce Trent 700 / 7000',
    summary:
      'Pesawat berbadan lebar lorong ganda untuk rute internasional Asia-Pasifik, Timur Tengah, dan koridor padat Jakarta–Denpasar.',
  },
  B77W: {
    modelName: 'Boeing 777-300ER',
    icaoType: 'B77W',
    manufacturer: 'Boeing Commercial Airplanes',
    aircraftClass: 'Jet Badan Lebar (Wide-body)',
    model3dType: 'widebody',
    photoKey: 'widebody',
    capacity: '314–393 penumpang',
    wingspanM: '64,8 m',
    lengthM: '73,9 m',
    cruiseSpeedKmh: '905 km/j',
    maxCeilingFt: '43.100 ft',
    rangeKm: '13.650 km',
    engines: '2× General Electric GE90-115B',
    summary:
      'Pesawat bermesin ganda jarak sangat jauh bertenaga GE90 untuk penerbangan lintas benua dari dan menuju Indonesia.',
  },
  A359: {
    modelName: 'Airbus A350-900 XWB',
    icaoType: 'A359',
    manufacturer: 'Airbus SAS',
    aircraftClass: 'Jet Badan Lebar (Wide-body)',
    model3dType: 'widebody',
    photoKey: 'widebody',
    capacity: '300–325 penumpang',
    wingspanM: '64,8 m',
    lengthM: '66,8 m',
    cruiseSpeedKmh: '903 km/j',
    maxCeilingFt: '43.100 ft',
    rangeKm: '15.000 km',
    engines: '2× Rolls-Royce Trent XWB-84',
    summary:
      'Jet komposit serat karbon jarak ultra-jauh generasi mutakhir yang rutin melintasi koridor udara FIR Jakarta dan Ujung Pandang.',
  },
  B789: {
    modelName: 'Boeing 787-9 Dreamliner',
    icaoType: 'B789',
    manufacturer: 'Boeing Commercial Airplanes',
    aircraftClass: 'Jet Badan Lebar (Wide-body)',
    model3dType: 'widebody',
    photoKey: 'widebody',
    capacity: '290 penumpang',
    wingspanM: '60,1 m',
    lengthM: '62,8 m',
    cruiseSpeedKmh: '903 km/j',
    maxCeilingFt: '43.000 ft',
    rangeKm: '14.010 km',
    engines: '2× GEnx-1B / Rolls-Royce Trent 1000',
    summary:
      'Pesawat badan lebar berbahan komposit dengan sayap lentur aerodinamis untuk penerbangan jarak jauh lintas samudra.',
  },
  AT76: {
    modelName: 'ATR 72-600',
    icaoType: 'AT76',
    manufacturer: 'ATR (Airbus / Leonardo)',
    aircraftClass: 'Turboprop Regional',
    model3dType: 'turboprop',
    photoKey: 'turboprop',
    capacity: '72 penumpang',
    wingspanM: '27,1 m',
    lengthM: '27,2 m',
    cruiseSpeedKmh: '510 km/j',
    maxCeilingFt: '25.000 ft',
    rangeKm: '1.528 km',
    engines: '2× Pratt & Whitney PW127M Turboprop',
    summary:
      'Pesawat baling-baling regional bersayap tinggi yang mampu mendarat di landasan pendek bandara kepulauan di seluruh Indonesia.',
  },
  CN295: {
    modelName: 'Airbus / PTDI CN-295M',
    icaoType: 'CN295',
    manufacturer: 'Airbus Defence / PT Dirgantara Indonesia',
    aircraftClass: 'Angkut Taktis & Patroli Maritim',
    model3dType: 'turboprop',
    photoKey: 'turboprop',
    capacity: '71 personel / 9,2 ton kargo',
    wingspanM: '25,8 m',
    lengthM: '24,5 m',
    cruiseSpeedKmh: '480 km/j',
    maxCeilingFt: '25.000 ft',
    rangeKm: '4.600 km',
    engines: '2× Pratt & Whitney PW127G Turboprop',
    summary:
      'Pesawat angkut taktis menengah & patroli maritim hasil kolaborasi dengan PTDI Bandung untuk dukungan logistik dan pengawasan perairan.',
  },
  C130J: {
    modelName: 'Lockheed Martin C-130J-30 Super Hercules',
    icaoType: 'C130J',
    manufacturer: 'Lockheed Martin Aeronautics',
    aircraftClass: 'Angkut Berat Taktis Militer',
    model3dType: 'military',
    photoKey: 'military',
    capacity: '128 personel / 20 ton muatan',
    wingspanM: '40,4 m',
    lengthM: '34,4 m',
    cruiseSpeedKmh: '643 km/j',
    maxCeilingFt: '28.000 ft',
    rangeKm: '4.425 km',
    engines: '4× Rolls-Royce AE 2100D3 (baling-baling 6 bilah)',
    summary:
      'Armada angkut berat strategis TNI AU bermesin 4 turboprop modern untuk operasi mobilitas udara, logistik nasional, dan misi kemanusiaan.',
  },
  A400: {
    modelName: 'Airbus A400M Atlas',
    icaoType: 'A400',
    manufacturer: 'Airbus Defence and Space',
    aircraftClass: 'Angkut Berat Strategis Militer',
    model3dType: 'military',
    photoKey: 'military',
    capacity: '116 personel / 37 ton muatan',
    wingspanM: '42,4 m',
    lengthM: '45,1 m',
    cruiseSpeedKmh: '780 km/j',
    maxCeilingFt: '40.000 ft',
    rangeKm: '8.900 km',
    engines: '4× Europrop TP400-D6 Turboprop',
    summary:
      'Pesawat angkut strategis dan tanker udara jarak jauh berkapasitas muatan berat dengan kemampuan landasan pendek.',
  },
  AW139: {
    modelName: 'Leonardo AW139 SAR',
    icaoType: 'AW139',
    manufacturer: 'Leonardo Helicopters',
    aircraftClass: 'Helikopter SAR & Utilitas',
    model3dType: 'helicopter',
    photoKey: 'helicopter',
    capacity: '15 penumpang / 4 tandu evakuasi',
    wingspanM: '13,8 m (diameter rotor)',
    lengthM: '16,7 m',
    cruiseSpeedKmh: '306 km/j',
    maxCeilingFt: '20.000 ft',
    rangeKm: '1.061 km',
    engines: '2× Pratt & Whitney PT6C-67C Turboshaft',
    summary:
      'Helikopter bermesin ganda andalan BASARNAS untuk operasi pencarian & pertolongan (SAR) maritim, evakuasi medis, dan patroli pesisir.',
  },
};

function normalizeTypeCode(raw?: string): string {
  const code = (raw || '').trim().toUpperCase();
  if (!code) return '';
  if (code.startsWith('B738') || code === 'B737') return 'B738';
  if (code.startsWith('B739')) return 'B739';
  if (code.startsWith('B38M') || code.startsWith('B39M')) return 'B38M';
  if (code.startsWith('A20N')) return 'A20N';
  if (code.startsWith('A320') || code.startsWith('A319')) return 'A320';
  if (code.startsWith('A321') || code.startsWith('A21N')) return 'A321';
  if (code.startsWith('A33')) return 'A333';
  if (code.startsWith('A35')) return 'A359';
  if (code.startsWith('B77')) return 'B77W';
  if (code.startsWith('B78')) return 'B789';
  if (code.startsWith('AT7') || code.startsWith('AT4') || code.startsWith('DH8')) return 'AT76';
  if (code.includes('295') || code.includes('235')) return 'CN295';
  if (code.startsWith('C130') || code.startsWith('C30J')) return 'C130J';
  if (code.startsWith('A400')) return 'A400';
  if (code.startsWith('AW139') || code.startsWith('EC72') || code.startsWith('H225') || code.startsWith('B412')) {
    return 'AW139';
  }
  return code;
}

function matchAirline(callsign: string, category: AircraftTrack['category'], originCountry: string): { code: string; entry: AirlineEntry } {
  const clean = callsign.trim().toUpperCase();
  for (const key of Object.keys(AIRLINE_BY_PREFIX).sort((a, b) => b.length - a.length)) {
    if (clean.startsWith(key)) {
      return { code: key, entry: AIRLINE_BY_PREFIX[key] };
    }
  }
  if (category === 'military') {
    return {
      code: clean.slice(0, 4) || 'MIL',
      entry: {
        name: originCountry === 'Indonesia' ? 'TNI Angkatan Udara' : `Penerbangan Militer (${originCountry})`,
        defaultType: 'C130J',
        livery: { fuselage: '#64748b', belly: '#475569', tail: '#334155', accent: '#dc2626' },
      },
    };
  }
  if (category === 'gov') {
    return {
      code: clean.slice(0, 4) || 'GOV',
      entry: {
        name: originCountry === 'Indonesia' ? 'Instansi Pemerintah / SAR RI' : `Pemerintah (${originCountry})`,
        defaultType: 'AW139',
        livery: { fuselage: '#ea580c', belly: '#f8fafc', tail: '#ea580c', accent: '#f8fafc' },
      },
    };
  }
  return {
    code: clean.slice(0, 3) || 'CIV',
    entry: {
      name: originCountry && originCountry !== 'Unknown' ? `Maskapai Sipil (${originCountry})` : 'Penerbangan Sipil Komersial',
      defaultType: 'A320',
      livery: { fuselage: '#f8fafc', belly: '#0f172a', tail: '#0284c7', accent: '#38bdf8' },
    },
  };
}

export function computeFlightPhase(track: AircraftTrack): string {
  if (track.onGround || (track.altitudeM < 80 && track.velocityKmh < 120)) return 'Di Darat (Ground)';
  if (track.altitudeM < 2500 && track.velocityKmh < 320 && Math.abs(track.verticalRate) < 2) {
    return 'Terbang Rendah / Patroli';
  }
  if (track.verticalRate >= 2.2) return 'Menanjak (Climb)';
  if (track.verticalRate <= -2.2) return 'Pendekatan / Turun (Descent)';
  if (track.altitudeM >= 6000) return 'Jelajah (Cruise)';
  return 'Transisi Jalur Udara';
}

export function computeMachEstimate(velocityKmh: number, altitudeM: number, onGround: boolean): string {
  if (onGround || velocityKmh < 260) return 'Subsonik Rendah';
  // ISA standard troposphere temperature lapse rate (K)
  const tempK = Math.max(216.65, 288.15 - 0.0065 * Math.min(altitudeM, 11000));
  const speedOfSoundKmh = Math.sqrt(1.4 * 287.05 * tempK) * 3.6;
  const mach = velocityKmh / speedOfSoundKmh;
  return `Mach ${mach.toFixed(2)}`;
}

export function resolveAircraftProfile(track: AircraftTrack): AircraftProfile {
  const { code: airlineCode, entry: airline } = matchAirline(track.callsign, track.category, track.originCountry);
  let typeCode = normalizeTypeCode(track.aircraftType);

  if (!typeCode || !AIRCRAFT_SPECS[typeCode]) {
    if (track.category === 'gov' && track.velocityKmh < 330 && track.altitudeM < 3500) {
      typeCode = 'AW139';
    } else if (track.category === 'military') {
      typeCode = track.velocityKmh > 560 ? 'CN295' : 'C130J';
    } else if (track.altitudeM > 11300 && track.velocityKmh > 880) {
      typeCode = 'A333';
    } else if (track.altitudeM > 2000 && track.altitudeM < 6500 && track.velocityKmh > 330 && track.velocityKmh < 530) {
      typeCode = 'AT76';
    } else {
      typeCode = airline.defaultType;
    }
  }

  const spec = AIRCRAFT_SPECS[typeCode] ?? AIRCRAFT_SPECS.B738;
  const altitudeFt = Math.round(track.altitudeM * 3.28084);
  const speedKnots = Math.round(track.velocityKmh / 1.852);
  const flightLevel = track.onGround
    ? 'GND'
    : altitudeFt >= 10000
      ? `FL${Math.round(altitudeFt / 100)}`
      : `${altitudeFt.toLocaleString('id-ID')} ft`;

  return {
    airlineName: airline.name,
    airlineCode,
    modelName: spec.modelName,
    icaoType: spec.icaoType,
    manufacturer: spec.manufacturer,
    aircraftClass: spec.aircraftClass,
    model3dType: spec.model3dType,
    photoKey: spec.photoKey,
    livery: airline.livery,
    capacity: spec.capacity,
    wingspanM: spec.wingspanM,
    lengthM: spec.lengthM,
    cruiseSpeedKmh: spec.cruiseSpeedKmh,
    maxCeilingFt: spec.maxCeilingFt,
    rangeKm: spec.rangeKm,
    engines: spec.engines,
    flightPhase: computeFlightPhase(track),
    flightLevel,
    altitudeFt,
    speedKnots,
    machEstimate: computeMachEstimate(track.velocityKmh, track.altitudeM, track.onGround),
    summary: spec.summary,
  };
}

interface SatelliteCatalogEntry {
  match: RegExp;
  displayName: string;
  operatorFull: string;
  country: string;
  model3dType: Satellite3DModelType;
  photoKey: AerospacePhotoKey;
  missionRole: string;
  launchYear: string;
  launchVehicle: string;
  launchMassKg: string;
  frequencyBand: string;
  coverageSummary: string;
  accentColor: string;
  summary: string;
}

const SATELLITE_CATALOG: SatelliteCatalogEntry[] = [
  {
    match: /SATRIA/i,
    displayName: 'SATRIA-1 (Satelit Republik Indonesia)',
    operatorFull: 'PT Satelit Nusantara Tiga (PSN) · BAKTI Komdigi',
    country: 'Indonesia',
    model3dType: 'geo_comms',
    photoKey: 'sat_geo',
    missionRole: 'Broadband Internet 150 Gbps Wilayah 3T',
    launchYear: '2023 (19 Juni 2023)',
    launchVehicle: 'SpaceX Falcon 9 Block 5',
    launchMassKg: '4.580 kg (Spacebus NEO)',
    frequencyBand: 'Ka-Band High-Throughput (116 Spot Beam)',
    coverageSummary: 'Seluruh Nusantara (146° BT · 150.000 layanan publik)',
    accentColor: '#38bdf8',
    summary:
      'Satelit multifungsi berkapasitas sangat tinggi (VHTS) terbesar di Asia milik Indonesia untuk menghubungkan sekolah, puskesmas, dan kantor desa wilayah 3T.',
  },
  {
    match: /TELKOM|MERAH\s*PUTIH/i,
    displayName: 'Telkom-4 (Satelit Merah Putih)',
    operatorFull: 'PT Telkom Satelit Indonesia (Telkomsat)',
    country: 'Indonesia',
    model3dType: 'geo_comms',
    photoKey: 'sat_geo',
    missionRole: 'Telekomunikasi Nasional & Backhaul Seluler',
    launchYear: '2018 (7 Agustus 2018)',
    launchVehicle: 'SpaceX Falcon 9 Block 5',
    launchMassKg: '5.800 kg (SSL-1300)',
    frequencyBand: 'C-Band & Extended C-Band (60 Transponder)',
    coverageSummary: 'Indonesia, Asia Tenggara & India (108° BT)',
    accentColor: '#ef4444',
    summary:
      'Satelit komunikasi geostasioner tulang punggung jaringan telekomunikasi, perbankan, penyiaran TV, dan backhaul 4G/5G di Indonesia.',
  },
  {
    match: /BRISAT/i,
    displayName: 'BRIsat (Bank Rakyat Indonesia)',
    operatorFull: 'PT Bank Rakyat Indonesia (Persero) Tbk',
    country: 'Indonesia',
    model3dType: 'geo_comms',
    photoKey: 'sat_geo',
    missionRole: 'Jaringan Perbankan & Keuangan Mikro Nasional',
    launchYear: '2016 (19 Juni 2016)',
    launchVehicle: 'Ariane 5 ECA (Kourou)',
    launchMassKg: '3.540 kg (SSL-1300)',
    frequencyBand: 'C-Band (36) & Ku-Band (9 Transponder)',
    coverageSummary: 'Indonesia, ASEAN & Asia Timur (150,5° BT)',
    accentColor: '#2563eb',
    summary:
      'Satelit pertama di dunia yang dimiliki dan dioperasikan penuh oleh bank untuk menghubungkan ribuan kantor cabang, ATM, dan agen BRILink hingga pelosok.',
  },
  {
    match: /NUSANTARA\s*SATU|PSN-?6/i,
    displayName: 'Nusantara Satu (PSN-6)',
    operatorFull: 'PT Pasifik Satelit Nusantara (PSN)',
    country: 'Indonesia',
    model3dType: 'geo_comms',
    photoKey: 'sat_geo',
    missionRole: 'Broadband Nasional & Konektivitas Maritim',
    launchYear: '2019 (22 Februari 2019)',
    launchVehicle: 'SpaceX Falcon 9 Block 5',
    launchMassKg: '4.100 kg (SSL-1300)',
    frequencyBand: 'C-Band, Ext C-Band & Ku-Band HTS',
    coverageSummary: 'Seluruh Indonesia & Perairan ASEAN (146° BT)',
    accentColor: '#06b6d4',
    summary:
      'Satelit broadband HTS pertama di Indonesia berkapasitas 15 Gbps yang memperkuat konektivitas internet desa, maritim, dan korporasi.',
  },
  {
    match: /LAPAN-?A2|ORARI/i,
    displayName: 'LAPAN-A2 / LAPAN-ORARI',
    operatorFull: 'BRIN (Organisasi Riset Penerbangan & Antariksa)',
    country: 'Indonesia',
    model3dType: 'leo_earth_obs',
    photoKey: 'sat_leo',
    missionRole: 'Pemantauan Maritim AIS, Kamera Bumi & Radio Amatir',
    launchYear: '2015 (28 September 2015)',
    launchVehicle: 'ISRO PSLV-XL (Sriharikota)',
    launchMassKg: '76 kg (Mikrosatelit Ekuatorial)',
    frequencyBand: 'S-Band, UHF/VHF & AIS Maritim',
    coverageSummary: 'Orbit Ekuatorial 6° — melintasi Indonesia 14×/hari',
    accentColor: '#10b981',
    summary:
      'Satelit buatan putra-putri Indonesia dengan orbit ekuatorial unik yang melintasi kepulauan Nusantara setiap ~100 menit untuk pelacakan kapal AIS dan komunikasi darurat ORARI.',
  },
  {
    match: /LAPAN-?A3|IPB/i,
    displayName: 'LAPAN-A3 / LAPAN-IPB',
    operatorFull: 'BRIN & Institut Pertanian Bogor (IPB)',
    country: 'Indonesia',
    model3dType: 'leo_earth_obs',
    photoKey: 'sat_leo',
    missionRole: 'Penginderaan Jauh Multispektral & Pemantauan Lahan',
    launchYear: '2016 (22 Juni 2016)',
    launchVehicle: 'ISRO PSLV-C34',
    launchMassKg: '115 kg (Mikrosatelit Polar SSO)',
    frequencyBand: 'X-Band Citra & AIS Maritim',
    coverageSummary: 'Orbit Sinkron Matahari (SSO 97,5°) Global',
    accentColor: '#22c55e',
    summary:
      'Satelit penginderaan jauh eksperimental Indonesia untuk pemetaan tutupan lahan pertanian, kehutanan, serta pemantauan lalu lintas kapal samudra.',
  },
  {
    match: /HIMAWARI/i,
    displayName: 'Himawari-9 (Meteorologi Asia-Pasifik)',
    operatorFull: 'JMA Jepang · Umpan Cuaca Resmi BMKG RI',
    country: 'Jepang (Cakupan Penuh RI)',
    model3dType: 'geo_comms',
    photoKey: 'sat_geo',
    missionRole: 'Pemantauan Awan, Siklon Tropis & Abu Vulkanik',
    launchYear: '2016 (2 November 2016)',
    launchVehicle: 'H-IIA 202 (Tanegashima)',
    launchMassKg: '3.500 kg (DS2000)',
    frequencyBand: '16 Kanal Imager AHI (Visibel & Inframerah)',
    coverageSummary: 'Asia Timur, Indonesia & Australia (140,7° BT)',
    accentColor: '#0ea5e9',
    summary:
      'Satelit cuaca geostasioner utama yang citra multispektralnya digunakan BMKG setiap 10 menit untuk memantau hujan lebat, bibit siklon, dan letusan gunung api Indonesia.',
  },
  {
    match: /ISS|ZARYA/i,
    displayName: 'ISS — Stasiun Luar Angkasa Internasional',
    operatorFull: 'NASA · Roscosmos · ESA · JAXA · CSA',
    country: 'Internasional',
    model3dType: 'space_station',
    photoKey: 'sat_leo',
    missionRole: 'Laboratorium Riset Berawak Orbit Bumi Rendah',
    launchYear: '1998 (Modul Zarya)',
    launchVehicle: 'Proton-K / Space Shuttle / Falcon 9',
    launchMassKg: '420.000 kg (Bentang 109 m)',
    frequencyBand: 'S-Band, Ku-Band, Ka-Band & Amatir VHF',
    coverageSummary: 'Lintasan Global 51,6° — melintasi Indonesia berkala',
    accentColor: '#f59e0b',
    summary:
      'Struktur buatan manusia terbesar di orbit Bumi pada ketinggian ~420 km, bergerak 27.600 km/jam dan dapat diamati dengan mata telanjang saat melintas fajar/senja.',
  },
  {
    match: /CSS|TIANHE|TIANGONG/i,
    displayName: 'CSS Tiangong (Modul Inti Tianhe)',
    operatorFull: 'CMSA / CNSA Tiongkok',
    country: 'Tiongkok',
    model3dType: 'space_station',
    photoKey: 'sat_leo',
    missionRole: 'Stasiun Luar Angkasa Modular Berawak',
    launchYear: '2021 (29 April 2021)',
    launchVehicle: 'Long March 5B',
    launchMassKg: '66.000–100.000 kg',
    frequencyBand: 'S-Band & Ku-Band Relay Tianlian',
    coverageSummary: 'Lintasan 41,5° — melintasi kepulauan Nusantara',
    accentColor: '#fb923c',
    summary:
      'Stasiun luar angkasa modular generasi baru dengan tiga modul utama (Tianhe, Wentian, Mengtian) di orbit ~390 km.',
  },
  {
    match: /NOAA-?20|JPSS/i,
    displayName: 'NOAA-20 (JPSS-1 Weather Polar)',
    operatorFull: 'NOAA / NASA Amerika Serikat',
    country: 'Amerika Serikat',
    model3dType: 'leo_earth_obs',
    photoKey: 'sat_leo',
    missionRole: 'Penginderaan Atmosfer, Titik Panas & Cuaca Polar',
    launchYear: '2017 (18 November 2017)',
    launchVehicle: 'Delta II 7920',
    launchMassKg: '2.540 kg',
    frequencyBand: 'X-Band Direct Broadcast & Sensor VIIRS/CrIS',
    coverageSummary: 'Orbit Polar SSO 98,7° (Data GFS & Hotspot)',
    accentColor: '#38bdf8',
    summary:
      'Satelit cuaca orbit polar beresolusi tinggi yang memasok data sensor VIIRS untuk pemantauan titik panas (hotspot) karhutla dan input model cuaca NOAA GFS.',
  },
];

const EARTH_RADIUS_KM = 6371;
const EARTH_MU_KM3_S2 = 398600.4418;

export function computeOrbitalPeriodMin(altitudeKm: number): number {
  const a = EARTH_RADIUS_KM + Math.max(150, altitudeKm);
  const periodSec = 2 * Math.PI * Math.sqrt((a * a * a) / EARTH_MU_KM3_S2);
  return Number((periodSec / 60).toFixed(1));
}

export function computeFootprintRadiusKm(altitudeKm: number): number {
  const h = Math.max(150, altitudeKm);
  const centralAngleRad = Math.acos(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + h));
  return Math.round(EARTH_RADIUS_KM * centralAngleRad);
}

export function resolveSatelliteProfile(sat: SatelliteTrack): SatelliteProfile {
  const matched = SATELLITE_CATALOG.find((entry) => entry.match.test(sat.name));
  const orbitalPeriodMin = computeOrbitalPeriodMin(sat.altitudeKm);
  const orbitsPerDay = Number((1440 / orbitalPeriodMin).toFixed(2));
  const footprintRadiusKm = computeFootprintRadiusKm(sat.altitudeKm);
  const signalLatencyMs = Number(((2 * sat.altitudeKm) / 299.792).toFixed(1));

  const orbitClass = sat.isGeo
    ? 'GEO (Geostasioner 35.786 km)'
    : sat.inclinationDeg >= 95 && sat.inclinationDeg <= 102
      ? 'SSO (Orbit Sinkron Matahari)'
      : 'LEO (Orbit Bumi Rendah)';

  if (matched) {
    return {
      displayName: matched.displayName,
      operatorFull: matched.operatorFull,
      country: matched.country,
      orbitClass,
      model3dType: matched.model3dType,
      photoKey: matched.photoKey,
      missionRole: matched.missionRole,
      launchYear: matched.launchYear,
      launchVehicle: matched.launchVehicle,
      launchMassKg: matched.launchMassKg,
      frequencyBand: matched.frequencyBand,
      coverageSummary: matched.coverageSummary,
      accentColor: matched.accentColor,
      orbitalPeriodMin,
      orbitsPerDay,
      footprintRadiusKm,
      signalLatencyMs,
      summary: matched.summary,
    };
  }

  const isStation = /station|iss|css|tiangong/i.test(`${sat.name} ${sat.group}`);
  const model3dType: Satellite3DModelType = sat.isGeo
    ? 'geo_comms'
    : isStation
      ? 'space_station'
      : 'leo_earth_obs';

  return {
    displayName: sat.name,
    operatorFull: sat.owner || 'Operator Satelit Internasional',
    country: /IDN/i.test(sat.owner) ? 'Indonesia' : sat.owner || 'Global',
    orbitClass,
    model3dType,
    photoKey: sat.isGeo ? 'sat_geo' : 'sat_leo',
    missionRole: sat.isGeo ? 'Telekomunikasi / Pengamatan Geostasioner' : 'Penginderaan Bumi / Relai LEO',
    launchYear: 'Terdata di Katalog CelesTrak',
    launchVehicle: 'Wahana Peluncur Orbital',
    launchMassKg: sat.isGeo ? '~3.500–5.000 kg' : '~150–2.500 kg',
    frequencyBand: sat.isGeo ? 'C / Ku / Ka-Band' : 'S / X-Band',
    coverageSummary: sat.overIndonesia ? 'Aktif memantau / melintasi Indonesia' : 'Lintasan orbit global',
    accentColor: sat.isGeo ? '#38bdf8' : '#a78bfa',
    orbitalPeriodMin,
    orbitsPerDay,
    footprintRadiusKm,
    signalLatencyMs,
    summary: `Wahana antariksa aktif terdaftar di NORAD #${sat.noradId} dengan propagasi lintasan CelesTrak GP.`,
  };
}
