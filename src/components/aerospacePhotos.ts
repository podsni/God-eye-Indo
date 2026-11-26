import narrowbodyImg from '../assets/images/aircraft_narrowbody_indo_1795661077285.jpg';
import widebodyImg from '../assets/images/aircraft_widebody_indo_1795661079167.jpg';
import turbopropImg from '../assets/images/aircraft_turboprop_indo_1795661080822.jpg';
import militaryImg from '../assets/images/aircraft_military_indo_1795661081801.jpg';
import helicopterImg from '../assets/images/aircraft_helicopter_sar_1795661082407.jpg';
import satGeoImg from '../assets/images/satellite_geo_indo_1795661084445.jpg';
import satLeoImg from '../assets/images/satellite_leo_orbit_1795661085481.jpg';
import type { AerospacePhotoKey } from '../engine/aerospaceCatalog';

export const AEROSPACE_PHOTOS: Record<AerospacePhotoKey, { src: string; caption: string }> = {
  narrowbody: {
    src: narrowbodyImg,
    caption: 'Visualisasi Jet Lorong Tunggal (B737 / A320) di Ruang Udara Nusantara',
  },
  widebody: {
    src: widebodyImg,
    caption: 'Visualisasi Jet Badan Lebar (A330 / B777) Jelajah Tinggi di Atas Jawa',
  },
  turboprop: {
    src: turbopropImg,
    caption: 'Visualisasi Turboprop Regional (ATR 72 / CN-295) Koridor Kepulauan RI',
  },
  military: {
    src: militaryImg,
    caption: 'Visualisasi Pesawat Angkut Taktis Militer (C-130J / A400M) Nusantara',
  },
  helicopter: {
    src: helicopterImg,
    caption: 'Visualisasi Helikopter SAR & Patroli Maritim (AW139) Perairan RI',
  },
  sat_geo: {
    src: satGeoImg,
    caption: 'Visualisasi Satelit Geostasioner (35.786 km) di Atas Kepulauan Indonesia',
  },
  sat_leo: {
    src: satLeoImg,
    caption: 'Visualisasi Wahana Orbit Bumi Rendah (ISS / LEO) Melintasi Asia Tenggara',
  },
};
