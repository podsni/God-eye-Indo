# Changelog — God Eye Indo

Seluruh perubahan penting pada proyek **God Eye Indo** (sebelumnya *Sepur Live*) didokumentasikan dalam berkas ini dengan mengikuti konvensi [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/) dan [Semantic Versioning](https://semver.org/).

---

## [2.2.0] — 2026-11-26

### Ditambahkan
- **Penampil Model 3D Interaktif Pesawat & Satelit (`Aerospace3DViewer` / Three.js):**
  - Model 3D prosedural multi-komponen untuk **5 kelas pesawat**: Jet Lorong Tunggal (*narrow-body* B737/A320), Jet Badan Lebar (*wide-body* A330/B777/A350), Turboprop Regional (ATR 72 / CN-295), Angkut Taktis Militer 4 mesin (C-130J Super Hercules / A400M dengan bendera Merah Putih di ekor), dan Helikopter SAR (AW139 BASARNAS dengan rotor utama 5 bilah, rotor ekor & kamera FLIR).
  - Model 3D prosedural multi-komponen untuk **3 kelas satelit**: Satelit Komunikasi GEO (bus heksagonal foil emas MLI *bump-mapped*, dua parabola Ka/C-Band, dan sayap surya biru bergrid), Stasiun Antariksa Modular (ISS / CSS Tiangong dengan truss utama, modul bertekanan, cupola & 4 pasang sayap surya), dan Satelit Penginderaan Bumi / Cuaca LEO (LAPAN-A2/A3, NOAA-20 dengan teleskop optik nadir & lensa safir).
  - Kontrol interaktif putar 360° (`OrbitControls`), 4 preset sudut kamera (`3/4`, `Samping`, `Atas`, `Depan`), tombol reset kamera, serta tombol **Perbesar** untuk membuka modal inspeksi 3D layar penuh (dirender melalui React Portal ke `document.body`).
  - Dukungan penuh pencahayaan studio PBR (`RoomEnvironment`) dan proteksi *software WebGL* (deteksi SwiftShader/llvmpipe, *on-demand rendering*, `fenceSync`, dan pembersihan memori WebGL saat unmount).
- **Tab Foto Pesawat & Foto Satelit Lokal:**
  - 7 aset foto dirgantara dan antariksa berkualitas tinggi yang dibundel lokal di `src/assets/images/` dan dipetakan lewat `src/components/aerospacePhotos.ts` (tanpa hotlink eksternal).
  - Sakelar tab instan **Model 3D | Foto Pesawat** dan **Model 3D | Foto Satelit** di `OsintDetailPanel`.
- **Katalog Spesifikasi Dirgantara & Satelit Indonesia (`src/engine/aerospaceCatalog.ts`):**
  - Resolusi otomatis 19+ maskapai & instansi Indonesia/regional (`GIA`, `LNI`, `CTV`, `BTK`, `AWQ`, `SJY`, `WON`, `SJV`, `PAS`, `IDAF`, `TNIAU`, `BASARNAS`, `POLRI`, `SIA`, `MAS`, `QFA`, dll.) lengkap dengan skema warna corak (*livery*) 3D.
  - Spesifikasi teknis 15+ jenis pesawat (`B738`, `B739`, `B38M`, `A320`, `A20N`, `A321`, `A333`, `B77W`, `A359`, `B789`, `AT76`, `CN295`, `C130J`, `A400`, `AW139`) mencakup pabrikan, kelas, mesin, kapasitas, rentang sayap, panjang, kecepatan jelajah, plafon maksimum, dan jarak tempuh.
  - Kalkulasi telemetri dinamis: fase terbang (`Menanjak`, `Jelajah`, `Turun`, `Patroli`, `Di Darat`), `Flight Level (FL)`, kecepatan `knot`, dan estimasi bilangan **Mach** berbasis atmosfer standar ISA.
  - Profil satelit terperinci (SATRIA-1, Telkom-4 Merah Putih, BRIsat, Nusantara Satu, LAPAN-A2/A3, Himawari-9, ISS, CSS Tiangong, NOAA-20) dengan kalkulasi fisika **periode orbit Kepler**, lintasan per hari, **radius tapak cakupan (*footprint*)**, dan estimasi latensi sinyal RF (RTT ms).
- **Pengujian Unit Baru:** Suite unit test katalog dirgantara & satelit di `src/engine/osint.test.ts` (total 16/16 test lulus).

### Diperbaiki & Disempurnakan
- **Daftar Intel → Udara (`IntelHubPanel`):** Setiap baris pesawat kini langsung menampilkan kode tipe ICAO, nama maskapai, model pesawat, dan Flight Level; setiap baris satelit menampilkan badge orbit (`GEO`/`LEO`) dan peran misinya.
- **Pemetaan UV Fuselage 3D:** Menyelaraskan tekstur jendela kabin, cheatline corak maskapai, warna perut pesawat, dan kaca kokpit secara presisi pada koordinat UV `LatheGeometry`.
- **Modal 3D Layar Penuh:** Memindahkan modal `Perbesar` ke `createPortal(..., document.body)` agar tidak terpotong oleh kontainer sidebar, serta menambahkan *auto-scroll* ke atas saat memilih entitas baru di panel detail.
- **Penghapusan Peringatan Three.js:** Mengganti `THREE.Clock` yang usang pada Three.js r187 dengan perhitungan delta berbasis `performance.now()`.

---

## [2.1.0] — 2026-11-25

### Ditambahkan
- **Deteksi Gempa Resmi BMKG Indonesia (InaTEWS):**
  - Integrasi server proxy untuk `autogempa.json` (gempa terbaru), `gempaterkini.json` (M5.0+), dan `gempadirasakan.json` (skala MMI) yang digabung dan dideduplikasi otomatis dengan umpan USGS *Ring of Fire*.
  - Endpoint proxy gambar peta guncangan resmi `/api/osint/bmkg-shakemap/:file` dengan validasi regex ketat terhadap *path traversal*.
  - Kartu sorotan **BMKG AutoGempa Terbaru** di tab **Intel → Bumi**, filter sumber (`Semua`, `BMKG RI`, `Dirasakan`, `USGS`), peringatan tsunami aktif, dan penampil gambar Shakemap di panel detail gempa.
- **6 Mode Peta Dasar (Basemap):**
  - Menambahkan mode **Topografi** (OpenTopoMap) dan **Taktis / Radar** (peta gelap kontras tinggi) melengkapi mode **Terang**, **Gelap**, **Satelit**, dan **Hibrida**.
  - Pengalihan cepat mode peta dari `LayersPopover` dan tombol rel kanan peta.
- **Visualisasi Ikon Pesawat & Satelit di Peta (`src/engine/osintSprites.ts`):**
  - Sprite pesawat kustom yang berputar dinamis mengikuti arah haluan (`heading`) dan kode warna kategori (sipil, militer, pemerintah/SAR), serta ikon satelit GEO/LEO beserta garis lintasan orbit (*ground track*).
- **Integrasi Lokasi Saat Ini (GPS) Menyeluruh:**
  - Bilah jangkar lokasi (*Anchor GPS / Pusat Peta*) di `IntelHubPanel` untuk mengurutkan jarak terdekat seluruh objek OSINT (pesawat, gempa BMKG, CCTV, ALPR).
  - Tombol **"Lokasi Saya"** pada komparasi cuaca NOAA/ECMWF dan **"Gunakan Lokasiku (GPS)"** sebagai titik asal rute jalan OSRM.

### Diperbaiki
- Menambahkan pengujian unit BMKG (`parseBmkgAutoGempa`, `parseBmkgGempaList`, `mergeBmkgAndUsgsEarthquakes`, validasi Shakemap, `haversineKm`) serta pengujian 6 mode peta dasar di `src/engine/osint.test.ts`.

---

## [2.0.0] — 2026-11-25

### Ditambahkan
- **Transformasi Merek & Cakupan Nusantara — God Eye Indo:**
  - Mengubah identitas aplikasi dari *Sepur Live* menjadi **God Eye Indo** dengan cakupan seluruh wilayah Indonesia dan pintasan wilayah dari Sumatra hingga Papua & Maluku.
- **Arsitektur Full-Stack Express + 14 Umpan OSINT (`server.ts`):**
  - **OpenSky Network (anonim)** & **adsb.lol v2** (`/api/osint/aircraft`)
  - **USGS Earthquake Hazards** (`/api/osint/earthquakes`)
  - **CelesTrak GP & Propagator Orbit** (`/api/osint/satellites`, `src/engine/orbit.ts`)
  - **City CCTV Indonesia (ATCS & Tol)** (`/api/osint/cctv`)
  - **Radio Browser Indonesia** + pemutar streaming audio langsung (`/api/osint/radio`)
  - **GBFS Mikromobilitas** (`/api/osint/gbfs`)
  - **Launch Library 2** (`/api/osint/launches`)
  - **OpenStreetMap ALPR / ETLE Mapping** via Overpass API (`/api/osint/alpr`)
  - **GDELT News Events** dengan pencarian kata kunci (`/api/osint/gdelt`)
  - **Transit Feeds Indonesia** (`/api/osint/transit-feeds`)
  - **Cuaca Numerik NOAA GFS & ECMWF IFS** (`/api/osint/weather-models`)
  - **Perutean Jalan Raya OSRM** mobil/sepeda/jalan kaki (`/api/osint/osrm`)
  - **Bundled Datasets Indonesia** (`/api/osint/datasets` & `/public/data/indo_osint_bundle.json`)
- **Antarmuka Intel Hub & Panel Detail OSINT:**
  - Tab baru **Intel** (`IntelHubPanel.tsx`) dengan 4 sub-kategori (`Udara`, `Bumi`, `Kota`, `Berita`), sakelar lapisan peta per sumber, dan panel inspeksi entitas (`OsintDetailPanel.tsx`).
  - Dukungan lapisan peta MapLibre GL untuk seluruh entitas OSINT beserta popup hover tersanitasi XSS (`escapeHtml`) dan validasi URL eksternal (`sanitizeExternalUrl`).

---

## [1.0.0] — 2026-11-20

### Ditambahkan (Fondasi Awal — Sepur Live)
- Peta langsung jaringan kereta api Pulau Jawa (KRL Commuter Line, MRT Jakarta, LRT Jakarta & Jabodebek, KA Bandara, Skytrain, Kereta Cepat Whoosh & Feeder, KA Antarkota KAI, dan KA Barang) berbasis jadwal GAPEKA 2026 & rel OpenStreetMap.
- Mode rangkaian kereta 3D artikulasi berbasis Three.js + lapisan kustom MapLibre GL dengan pencahayaan atmosfer otomatis mengikuti jam WIB dan 6 preset kamera.
- Peta **4.700+ perlintasan sebidang (JPL)** dengan klasterisasi, klasifikasi keamanan, dan radar JPL terdekat.
- Detail stasiun lengkap dengan cuaca real-time Open-Meteo, filter aksesibilitas kursi roda, papan layar keberangkatan LED (FIDS), panduan hub transit antarmoda, dan foto Wikimedia Commons.
- Grafik GAPEKA (diagram Marey), deteksi persilangan & penyusulan kereta, perencana rute multimoda berbasis Connection Scan Algorithm (CSA), Live GPS snap-to-track, Mesin Waktu simulasi (`1×`–`300×`), dan tautan *deep-link*.
