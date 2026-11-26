# God Eye Indo — Peta Intelijen Geospasial, Dirgantara 3D, Seismik BMKG & Kereta Api Indonesia

**God Eye Indo** adalah platform peta geospasial dan intelijen terbuka (OSINT) real-time untuk seluruh wilayah Indonesia. Aplikasi ini menggabungkan pelacakan jaringan perkeretaapian GAPEKA 2026 & komuter Pulau Jawa (dengan simulasi rangkaian kereta 3D) bersama 14 umpan data terbuka Indonesia dan global: lalu lintas udara (OpenSky anon & adsb.lol) lengkap dengan **Model 3D & Foto Pesawat**, orbit satelit (CelesTrak GP) lengkap dengan **Model 3D & Foto Satelit**, deteksi gempa resmi **BMKG Indonesia (InaTEWS + Shakemap)** & USGS, komparasi cuaca numerik **NOAA GFS vs ECMWF IFS**, City CCTV (ATCS & Tol), Radio Browser Indonesia, OpenStreetMap ALPR/ETLE, GBFS mikromobilitas, jadwal peluncuran roket Launch Library 2, berita geospasial GDELT, perutean jalan **OSRM**, serta katalog dataset terbundel.

Aplikasi dirancang responsif untuk desktop maupun perangkat seluler, mendukung **6 mode peta dasar**, **tema terang/gelap**, serta sinkronisasi **Lokasi GPS Saat Ini** di seluruh modul radar.

> **Penafian:** God Eye Indo adalah proyek visualisasi data terbuka (OSINT) independen untuk edukasi dan eksplorasi geospasial. Aplikasi ini tidak berafiliasi secara resmi dengan BMKG, PT Kereta Api Indonesia (Persero), KAI Commuter, MRT Jakarta, LRT, KCIC, TNI AU, BASARNAS, Korlantas Polri, maupun operator maskapai dan satelit yang ditampilkan.

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
  - [1. Radar Ruang Udara, Model 3D & Foto Pesawat](#1-radar-ruang-udara-model-3d--foto-pesawat)
  - [2. Pelacakan Orbit Satelit, Model 3D & Foto Satelit](#2-pelacakan-orbit-satelit-model-3d--foto-satelit)
  - [3. Deteksi Gempa BMKG Indonesia (InaTEWS) & USGS](#3-deteksi-gempa-bmkg-indonesia-inatews--usgs)
  - [4. Komparasi Cuaca Numerik NOAA GFS & ECMWF IFS](#4-komparasi-cuaca-numerik-noaa-gfs--ecmwf-ifs)
  - [5. Infrastruktur Kota, Media, Berita & Peluncuran Antariksa](#5-infrastruktur-kota-media-berita--peluncuran-antariksa)
  - [6. Peta Kereta Api Indonesia Live, 3D & 4.700+ JPL](#6-peta-kereta-api-indonesia-live-3d--4700-jpl)
  - [7. Perencana Rute Multimoda (CSA) & Rute Jalan OSRM](#7-perencana-rute-multimoda-csa--rute-jalan-osrm)
  - [8. 6 Mode Peta Dasar, Radar Lokasi Saat Ini & Deep-Link](#8-6-mode-peta-dasar-radar-lokasi-saat-ini--deep-link)
- [Arsitektur & Teknologi](#arsitektur--teknologi)
- [Endpoint Backend Proxy (`/api/osint/*`)](#endpoint-backend-proxy-apiosint)
- [Struktur Proyek](#struktur-proyek)
- [Sumber Data & Dataset Terbundel](#sumber-data--dataset-terbundel)
- [Memulai (Instalasi & Pengembangan)](#memulai-instalasi--pengembangan)
- [Pengujian Otomatis](#pengujian-otomatis)
- [Format Tautan Deep-Link](#format-tautan-deep-link)
- [Catatan Keamanan & Kinerja WebGL](#catatan-keamanan--kinerja-webgl)
- [Lisensi & Atribusi](#lisensi--atribusi)

---

## Fitur Utama

### 1. Radar Ruang Udara, Model 3D & Foto Pesawat

- **Sumber ganda ruang udara FIR Indonesia:** Menggabungkan **OpenSky Network (anonim)** untuk lalu lintas penerbangan sipil dan **adsb.lol v2** untuk pemantauan penerbangan militer/pemerintah, lengkap dengan deduplikasi otomatis berbasis `ICAO24`.
- **Ikon pesawat terarah di peta:** Marker pesawat berputar dinamis mengikuti arah haluan (`heading`), dibedakan antara sipil, militer/pertahanan (TNI AU), dan pemerintah/SAR (BASARNAS/Polri).
- **Penampil Model 3D Interaktif (Three.js):** Klik pesawat mana saja dari peta atau tab **Intel → Udara** untuk memutar model 3D pesawat 360° dengan preset sudut kamera (`3/4`, `Samping`, `Atas`, `Depan`) serta tombol **Perbesar** ke layar penuh. Model 3D disesuaikan otomatis menurut kelas dan corak maskapai:
  - **Jet Lorong Tunggal (Narrow-body):** Boeing 737-800NG / 737-900ER / MAX 8, Airbus A320 / A320neo / A321 (Garuda Indonesia, Lion Air, Citilink, Batik Air, AirAsia, Super Air Jet, Pelita Air, Sriwijaya Air).
  - **Jet Badan Lebar (Wide-body):** Airbus A330 / A350, Boeing 777-300ER / 787 Dreamliner.
  - **Turboprop Regional:** ATR 72-600 (Wings Air) & Airbus/PTDI CN-295M (baling-baling ganda sayap tinggi).
  - **Angkut Taktis Militer:** Lockheed Martin C-130J Super Hercules & Airbus A400M Atlas (4 mesin turboprop, warna taktis slate-grey + bendera Merah Putih di ekor).
  - **Helikopter SAR & Utilitas:** Leonardo AW139 SAR BASARNAS (rotor utama 5 bilah, rotor ekor, kamera FLIR, corak oranye-putih penyelamatan).
- **Tab Foto Pesawat & Katalog Spesifikasi Lengkap:** Menampilkan foto visual resolusi tinggi per kelas pesawat serta spesifikasi teknis lengkap: maskapai/operator, model & kode ICAO, pabrikan, kelas pesawat, jenis mesin, kapasitas penumpang/kargo, rentang sayap, panjang, kecepatan jelajah, plafon maksimum, jarak tempuh, **fase terbang langsung** (`Menanjak`, `Jelajah`, `Turun`, `Patroli`, `Di Darat`), **Flight Level (FL)**, kecepatan dalam `km/j`, `knot`, dan **estimasi Mach**, serta jarak dari lokasi pengguna.

### 2. Pelacakan Orbit Satelit, Model 3D & Foto Satelit

- **Propagasi orbit CelesTrak GP:** Memantau satelit geostasioner (GEO) dan orbit bumi rendah (LEO/SSO) dengan jejak lintasan permukaan (*ground track*) dan penanda cakupan wilayah Indonesia:
  - **Satelit Nasional Indonesia:** SATRIA-1 (PSN/Komdigi 146° BT), Telkom-4 Merah Putih (108° BT), BRIsat (150,5° BT), Nusantara Satu / PSN-6 (146° BT), LAPAN-A2 / ORARI (BRIN), dan LAPAN-A3 / IPB (BRIN).
  - **Satelit Cuaca & Stasiun Antariksa:** Himawari-9 (JMA / umpan cuaca BMKG 140,7° BT), NOAA-20 (JPSS-1), ISS (Zarya), dan CSS Tiangong (Modul Tianhe).
- **Penampil Model 3D Satelit Interaktif (Three.js):** Model 3D prosedural dengan latar bintang dan lengkung atmosfer Bumi biru, mendukung 3 arsitektur wahana:
  - **Satelit Komunikasi GEO:** Bus heksagonal berlapis foil termal emas MLI (*bump-mapped*), dua antena parabola Ka/C-Band, dan sayap panel surya fotovoltaik biru bergrid.
  - **Stasiun Luar Angkasa Modular (ISS / CSS):** Rangka truss aluminium utama, modul bertekanan, cincin docking, kubah cupola, radiator termal, dan 4 pasang sayap surya tembaga-emas.
  - **Satelit Penginderaan Bumi / Cuaca LEO:** Bus satelit dengan teleskop optik multispektral nadir, lensa safir, antena S/X-Band & AIS maritim, dan sayap surya ganda.
- **Tab Foto Satelit & Telemetri Orbit Lengkap:** Menampilkan foto visual orbital Indonesia/LEO, ketinggian orbit (km), kecepatan orbital (`km/s` & `km/j`), **periode orbit** (dihitung via Hukum III Kepler), jumlah lintasan/hari, **radius tapak cakupan (*footprint*)** geometris, estimasi latensi RF bolak-balik (RTT ms), inklinasi, pita frekuensi/sensor, tahun peluncuran, roket peluncur, massa wahana, dan peran misi.

### 3. Deteksi Gempa BMKG Indonesia (InaTEWS) & USGS

- **Integrasi resmi BMKG Indonesia:** Menarik langsung tiga umpan publik BMKG (`autogempa.json`, `gempaterkini.json` M5.0+, dan `gempadirasakan.json` skala MMI) serta menggabungkannya dengan **USGS Earthquake Hazards** kawasan *Ring of Fire* Indonesia melalui deduplikasi ruang-waktu otomatis.
- **Kartu Sorotan BMKG AutoGempa Terbaru:** Menampilkan gempa terkini di bagian atas tab **Intel → Bumi** beserta magnitudo, kedalaman, wilayah, waktu WIB, jarak dari lokasi pengguna, indikator **potensi tsunami**, serta daftar wilayah dirasakan (MMI).
- **Peta Guncangan Resmi (Shakemap BMKG):** Menampilkan gambar Shakemap resmi BMKG melalui proxy server aman (`/api/osint/bmkg-shakemap/:file`) yang memvalidasi nama berkas secara ketat terhadap *path traversal*.
- **Filter Sumber Seismik:** Filter cepat untuk `Semua`, `BMKG RI`, `Dirasakan (MMI)`, dan `USGS`, dengan lingkaran magnitudo proporsional di peta.

### 4. Komparasi Cuaca Numerik NOAA GFS & ECMWF IFS

- **Perbandingan dua model atmosfer global berdampingan:** Mengambil prakiraan real-time **NOAA GFS** dan **ECMWF IFS** (melalui Open-Meteo tanpa kunci API) untuk 10 kota utama Indonesia maupun **koordinat GPS pengguna saat ini / pusat peta**.
- **Metrik lengkap & selisih model:** Menampilkan suhu udara (°C), kondisi WMO berbahasa Indonesia, kecepatan & arah angin kompas, curah hujan 6 jam ke depan (mm), tekanan permukaan laut (hPa), tutupan awan (%), kelembapan relatif (%), serta kalkulasi selisih suhu dan curah hujan antar kedua model.

### 5. Infrastruktur Kota, Media, Berita & Peluncuran Antariksa

- **City CCTV Indonesia (ATCS & Jalan Tol):** Direktori titik kamera pemantau lalu lintas kota & ruas tol di Jakarta, Bandung, Semarang, Yogyakarta, Surabaya, Denpasar, Medan, Balikpapan/IKN, Makassar, dan Jayapura, diurutkan dari jarak terdekat dengan lokasi pengguna beserta tautan portal resmi ATCS/Dishub.
- **Radio Browser Indonesia:** Daftar stasiun radio siaran langsung Indonesia dengan pemutar audio terintegrasi (*play/pause*, *mute*, bitrate & codec) serta lapisan pemancar di peta.
- **OpenStreetMap ALPR / ETLE Mapping:** Pemetaan titik kamera pengenal plat nomor (ALPR/ANPR) dan kamera tilang elektronik (ETLE / *speed camera*) dari Overpass API OSM & katalog Indonesia, lengkap dengan batas kecepatan dan tautan node OSM.
- **GBFS Micromobility:** Titik hub sepeda & e-bike berbagi pakai beserta ketersediaan sepeda, e-bike, dan dock kosong.
- **Launch Library 2:** Jadwal peluncuran roket antariksa mendatang lengkap dengan hitung mundur `T-minus`, wahana peluncur, orbit target, dan lokasi landasan (termasuk situs Biak).
- **GDELT News Events:** Pemantauan peristiwa berita geospasial Indonesia yang dapat dicari dengan kata kunci kustom, lengkap dengan indikator sentimen (*tone*) dan titik peta.
- **Transit Feeds & Bundled Datasets:** Daftar koridor transit perkotaan (TransJakarta, Trans Jogja, Suroboyo Bus, Trans Metro Dewata, Teman Bus) dan katalog seluruh dataset terbuka yang dibundel di aplikasi.

### 6. Peta Kereta Api Indonesia Live, 3D & 4.700+ JPL

- **Pelacakan kereta berbasis jadwal GAPEKA 2026 & Live GPS:** Simulasi fisika trapesium di sepanjang rel OpenStreetMap untuk KRL Commuter Line, MRT Jakarta, LRT Jakarta & Jabodebek, KA Bandara (Soetta, YIA, BIAS), Skytrain, Kereta Cepat Whoosh & Feeder, KA Antarkota KAI, dan 114 perjalanan KA Barang.
- **Mode 3D Rangkaian Kereta (Three.js + MapLibre Custom Layer):** Rangkaian 3D artikulasi (lokomotif CC 206/CC 201, KRL, MRT, LRT, Whoosh CR400AF, Kereta Panoramic, Suite Class) dengan pencahayaan atmosfer otomatis sesuai jam WIB (fajar, siang, senja, malam) dan 6 preset kamera.
- **Detail Stasiun & Analisis Perkeretaapian:** Cuaca stasiun (Open-Meteo), filter aksesibilitas kursi roda & papan FIDS LED, panduan hub transit antarmoda, diagram Marey (Grafik GAPEKA), deteksi silang/susul KA, ETA antarpemberhentian, serta peta **4.700+ perlintasan sebidang (JPL)** dan 105 terowongan.
- **Mesin Waktu Simulasi:** Kendali putar/jeda, penggeser 24 jam, pemilih tanggal (hari kerja, akhir pekan, hari libur 2026), kecepatan putar `1×` hingga `300×`, dan lompatan jam sibuk.

### 7. Perencana Rute Multimoda (CSA) & Rute Jalan OSRM

- **Rute Kereta & Transit Multimoda (CSA):** Connection Scan Algorithm mencari rute tercepat, hemat, atau minim transit antarsistem rel beserta estimasi tarif.
- **Perutean Jalan Raya OSRM:** Mendukung profil **Mobil**, **Sepeda**, dan **Jalan Kaki** menggunakan OSRM Routing Engine dengan fitur **"Gunakan Lokasiku (GPS)"**, garis rute langsung di peta, jarak tempuh, estimasi durasi, dan panduan belokan (*turn-by-turn*) berbahasa Indonesia.

### 8. 6 Mode Peta Dasar, Radar Lokasi Saat Ini & Deep-Link

- **6 Mode Peta Dasar (Basemap):**
  1. **Terang** — OpenFreeMap Positron
  2. **Gelap** — Carto Dark Matter
  3. **Satelit** — Esri World Imagery
  4. **Hibrida** — Citra Satelit + Label Jalan & Wilayah
  5. **Topografi** — OpenTopoMap (kontur elevasi & gunung api)
  6. **Taktis / Radar** — Peta gelap kontras tinggi untuk analisis OSINT malam
- **Sinkronisasi Lokasi Saat Ini (GPS):** Satu klik tombol **Lokasiku / GPS Saya** menampilkan penanda lokasi pengguna di peta, otomatis mengurutkan jarak terdekat untuk pesawat, gempa BMKG, CCTV, ALPR, kereta, stasiun, dan JPL, serta menjadi titik awal otomatis untuk cuaca NOAA/ECMWF dan rute OSRM.
- **Pintasan Wilayah Nusantara:** Melompat cepat ke Seluruh Indonesia, Jabodetabek, Bandung & Whoosh, Yogyakarta–Solo, Surabaya–Malang, Bali & Lombok, Sumatra, Kalimantan & IKN, Sulawesi, Papua & Maluku, serta Seluruh Jalur Jawa.

---

## Arsitektur & Teknologi

God Eye Indo menggunakan arsitektur **Full-Stack TypeScript** dengan Express sebagai backend proxy aman (menghindari CORS, menerapkan cache TTL, pembatasan timeout, validasi input, dan *graceful fallback* ke dataset terbundel saat API publik sedang tidak terjangkau) serta Vite + React 19 di sisi klien.

| Lapisan | Teknologi |
| :--- | :--- |
| **Antarmuka (Frontend)** | React 19, TypeScript, Vite 8 |
| **Gaya & Ikon** | Tailwind CSS v4, Lucide React, Motion |
| **Tipografi** | Plus Jakarta Sans, JetBrains Mono (`tabular-nums`) |
| **Peta & Grafis 3D** | MapLibre GL JS v6, Three.js (`OrbitControls`, `RoomEnvironment` PBR) |
| **Server & Proxy OSINT** | Node.js (>=20), Express 4, `tsx` |
| **Pengujian** | Node.js built-in test runner (`node:test`) melalui `tsx` |

---

## Endpoint Backend Proxy (`/api/osint/*`)

Seluruh permintaan ke sumber OSINT eksternal diproses melalui `server.ts` dengan cache memori ber-TTL dan fallback otomatis ke `/public/data/indo_osint_bundle.json`:

| Endpoint | Sumber Data Utama | Keterangan |
| :--- | :--- | :--- |
| `GET /api/osint/aircraft` | OpenSky Network anon + adsb.lol v2 | Lalu lintas udara sipil & militer wilayah FIR Indonesia |
| `GET /api/osint/earthquakes` | BMKG InaTEWS (`autogempa`, `gempaterkini`, `gempadirasakan`) + USGS | Gempa terkini Indonesia, skala MMI, potensi tsunami & USGS Ring of Fire |
| `GET /api/osint/bmkg-shakemap/:file` | BMKG Shakemap (`data.bmkg.go.id`) | Proxy gambar peta guncangan resmi BMKG dengan validasi regex ketat |
| `GET /api/osint/satellites` | CelesTrak GP (`stations`, `active`, `weather`) | Propagasi posisi & *ground track* satelit Indonesia, cuaca & stasiun antariksa |
| `GET /api/osint/weather-models` | Open-Meteo (NOAA GFS & ECMWF IFS) | Komparasi dua model cuaca numerik berdasarkan koordinat `lat`, `lng`, `city` |
| `GET /api/osint/osrm` | OSRM Public Routing API | Perutean `driving`, `bike`, `foot` + panduan belokan berbahasa Indonesia |
| `GET /api/osint/cctv` | Direktori ATCS / Dishub / Tol Indonesia | Daftar titik CCTV jalan raya & tol Nusantara |
| `GET /api/osint/alpr` | Overpass API OSM + Bundled ETLE Indonesia | Kamera pengenal plat nomor (ALPR/ANPR) & *speed camera* |
| `GET /api/osint/radio` | Radio Browser API | Stasiun radio streaming Indonesia (hanya stream HTTPS tervalidasi) |
| `GET /api/osint/gbfs` | Feed GBFS Mikromobilitas Indonesia | Ketersediaan sepeda, e-bike, dan dock kosong |
| `GET /api/osint/launches` | Launch Library 2 (The Space Devs) | Jadwal peluncuran roket antariksa mendatang |
| `GET /api/osint/gdelt` | GDELT 2.0 Doc / Geo API | Peristiwa berita geospasial Indonesia (mendukung parameter `?q=`) |
| `GET /api/osint/transit-feeds` | Katalog Transit Feeds Indonesia | Koridor BRT & angkutan perkotaan Nusantara |
| `GET /api/osint/datasets` | Katalog Bundled Datasets | Metadata seluruh dataset lokal yang tersedia di `/public/data/` |

---

## Struktur Proyek

```text
.
├── server.ts                         # Express server, 14 endpoint proxy /api/osint/*, cache TTL & Vite middleware
├── index.html                        # HTML utama, metadata SEO/OpenGraph God Eye Indo
├── metadata.json                     # Metadata applet & izin geolokasi
├── package.json                      # Skrip dev, start, build, lint, test
├── vite.config.ts                    # Konfigurasi Vite 8 + Tailwind CSS v4
├── tsconfig.json                     # Konfigurasi TypeScript ketat
├── README.md                         # Dokumentasi proyek ini
├── CHANGELOG.md                      # Riwayat perubahan versi aplikasi
├── ATTRIBUTION.md                    # Atribusi sumber data terbuka & foto armada
├── public/
│   ├── maplibre-gl-worker.mjs        # Web worker MapLibre GL
│   ├── data/
│   │   ├── indo_osint_bundle.json    # Dataset cadangan & terkurasi OSINT Indonesia
│   │   ├── network.json              # Jaringan rel OSM, 483 stasiun, 8 sistem, 105 terowongan
│   │   ├── trips.json                # Jadwal komuter (KRL, MRT, LRT, Bandara, Whoosh)
│   │   ├── kai.json                  # Jadwal KA antarkota & lokal GAPEKA 2026
│   │   ├── freight.json              # Jadwal 114 perjalanan KA barang
│   │   ├── jpl.json                  # 4.700+ perlintasan sebidang (JPL) Pulau Jawa
│   │   ├── stations_x.json           # Foto Wikimedia, Daop & KM stasiun
│   │   ├── terminals.json            # 94 terminal peti kemas & depo BBM
│   │   └── fleet.json                # Referensi ilustrasi armada kereta
│   └── img/fleet/                    # Ilustrasi armada kereta (WebP)
└── src/
    ├── main.tsx                      # Titik masuk React 19
    ├── App.tsx                       # State global, feed OSINT, GPS anchor, basemap & tata letak responsif
    ├── index.css                     # Tema Tailwind CSS v4 & tipografi
    ├── assets/images/                # Foto visualisasi pesawat (5 kelas) & satelit (GEO/LEO) terbundel lokal
    ├── engine/                       # Logika murni, fisika, propagasi orbit & parser (unit-testable)
    │   ├── aerospaceCatalog.ts       # Katalog maskapai, jenis pesawat, fase terbang, Mach & spesifikasi satelit
    │   ├── orbit.ts                  # Propagasi orbit CelesTrak GP, GMST & ground track
    │   ├── osintParsers.ts           # Parser OpenSky, adsb.lol, BMKG, USGS, GDELT, OSRM, ALPR, Radio, Cuaca
    │   ├── osintClient.ts            # Klien fetch frontend untuk seluruh endpoint /api/osint/*
    │   ├── osintSprites.ts           # Generator sprite ikon peta (pesawat terarah, satelit, CCTV, ALPR, dll.)
    │   ├── osintTypes.ts             # Definisi tipe TypeScript seluruh entitas OSINT
    │   ├── sched.ts                  # Mesin jadwal GAPEKA, fisika trapesium, rute CSA & prediksi JPL
    │   ├── analytics.ts              # Pencarian terpadu + alias lokasi Indonesia
    │   ├── constants.ts              # 6 gaya basemap, pintasan wilayah Nusantara & konfigurasi JPL
    │   ├── deeplink.ts               # Serializer & parser hash URL deep-link
    │   ├── eta.ts                    # ETA antarpemberhentian & pose 3D rangkaian kereta
    │   ├── gps.ts                    # Proyeksi GPS ke jalur rel & selisih jadwal
    │   ├── javaInsights.ts           # Aksesibilitas kursi roda, Marey, silang/susul & atmosfer 3D WIB
    │   ├── nearby.ts                 # Radar kereta & stasiun terdekat
    │   ├── stock.ts                  # Dimensi sarana perkeretaapian
    │   ├── train3dLayer.ts           # Custom WebGL Layer Three.js untuk rangkaian kereta 3D
    │   ├── weather.ts                # Cuaca stasiun Open-Meteo & pemetaan WMO Indonesia
    │   ├── types.ts                  # Tipe inti perkeretaapian
    │   ├── engine.test.ts            # Unit test mesin perkeretaapian (9 suite)
    │   └── osint.test.ts             # Unit test OSINT, BMKG, orbit, basemap & katalog dirgantara (7 suite)
    └── components/
        ├── Aerospace3DViewer.tsx     # Penampil 3D Three.js interaktif (5 kelas pesawat + 3 kelas satelit)
        ├── aerospacePhotos.ts        # Pemetaan impor statis foto pesawat & satelit lokal
        ├── IntelHubPanel.tsx         # Panel pusat OSINT (sub-tab Udara, Bumi, Kota, Berita)
        ├── OsintDetailPanel.tsx      # Detail entitas OSINT (3D/Foto pesawat & satelit, Shakemap BMKG, dll.)
        ├── MapCanvas.tsx             # Kanvas peta MapLibre GL + semua lapisan kereta & OSINT
        ├── MapRightRail.tsx          # Kontrol 3D, mode peta, JPL, terowongan, tema, GPS & bagikan
        ├── LayersPopover.tsx         # Pemilih 6 mode basemap & toggle lapisan peta
        ├── RoutePlannerPanel.tsx     # Perencana rute rel CSA + rute jalan raya OSRM
        ├── HomePanel.tsx             # Beranda: radar kereta terdekat, radar JPL & favorit
        ├── StationDetailPanel.tsx    # Detail stasiun, cuaca, aksesibilitas kursi roda & FIDS
        ├── TrainDetailPanel.tsx      # Detail KA, ETA, Live GPS, stamformasi & silang/susul
        ├── LineDetailPanel.tsx       # Detail jalur & grafik GAPEKA (diagram Marey)
        ├── JplDetailPanel.tsx        # Detail perlintasan sebidang JPL
        ├── JplFloatingCard.tsx       # Kartu ringkas JPL di peta
        ├── JplLegendCard.tsx         # Legenda kategori JPL
        ├── TimeMachineDock.tsx       # Kontrol mesin waktu simulasi 24 jam
        ├── TopMapControls.tsx        # Filter sistem rel & pintasan wilayah Nusantara
        ├── Train3DHud.tsx            # HUD kamera 3D rangkaian kereta
        ├── SearchResultsPanel.tsx    # Hasil pencarian terpadu
        ├── StationsListPanel.tsx     # Daftar stasiun
        ├── LinesListPanel.tsx        # Daftar jalur
        ├── ShareButton.tsx           # Salin tautan deep-link
        └── AboutModal.tsx            # Informasi proyek, cakupan & atribusi data
```

---

## Sumber Data & Dataset Terbundel

Rincian lengkap lisensi dan kredit foto tersedia di [`ATTRIBUTION.md`](./ATTRIBUTION.md).

| Domain | Sumber Data | Keterangan |
| :--- | :--- | :--- |
| **Lalu Lintas Udara** | OpenSky Network (anon) & adsb.lol v2 | Ruang udara FIR Jakarta & Ujung Pandang |
| **Gempa Bumi RI** | BMKG Indonesia (InaTEWS) & USGS | `autogempa`, `gempaterkini`, `gempadirasakan`, Shakemap & USGS Ring of Fire |
| **Orbit Satelit** | CelesTrak GP | SATRIA-1, Telkom-4, BRIsat, Nusantara Satu, LAPAN-A2/A3, Himawari-9, ISS, CSS, NOAA-20 |
| **Cuaca Numerik** | Open-Meteo (NOAA GFS & ECMWF IFS) | Komparasi model global & cuaca stasiun WIB tanpa kunci API |
| **Rute Jalan Raya** | Project OSRM | Rute mobil, sepeda & pejalan kaki Indonesia |
| **Pemetaan ALPR/ETLE** | OpenStreetMap (Overpass API) | Kamera plat nomor & *speed camera* |
| **Berita & Antariksa** | GDELT 2.0 & Launch Library 2 | Berita geospasial & jadwal peluncuran roket |
| **Radio & Mikromobilitas** | Radio Browser API & GBFS | Stream radio HTTPS Indonesia & hub sepeda |
| **Perkeretaapian & JPL** | GAPEKA 2026, Open-KRL, OpenStreetMap (ODbL 1.0) | 483 stasiun, 4.700+ JPL, 105 terowongan, 94 terminal |
| **Peta Dasar** | OpenFreeMap, Carto Dark Matter, Esri World Imagery, OpenTopoMap | 6 pilihan gaya peta dasar |

---

## Memulai (Instalasi & Pengembangan)

### Prasyarat

- **Node.js** versi `20.0.0` atau lebih baru
- **npm** (atau **bun**)

### Langkah Instalasi

1. **Kloning repositori dan masuk ke direktori proyek:**

   ```bash
   git clone <url-repositori>
   cd god-eye-indo
   ```

2. **Pasang seluruh dependensi:**

   ```bash
   npm install
   ```

3. **Jalankan server pengembangan (Express + Vite pada port 3000):**

   ```bash
   npm run dev
   ```

   Buka [http://localhost:3000](http://localhost:3000) di peramban.

### Perintah Tersedia

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run dev` | Menjalankan server full-stack Express + Vite dev middleware di port `3000` |
| `npm run build` | Membangun bundel produksi klien ke folder `dist/` |
| `npm start` | Menjalankan server produksi (`node server.ts`) yang menyajikan `dist/` dan `/api/osint/*` |
| `npm run lint` | Pemeriksaan tipe TypeScript penuh (`tsc --noEmit`) |
| `npm test` | Menjalankan seluruh 16 suite unit test (`engine.test.ts` + `osint.test.ts`) |
| `npm run clean` | Membersihkan artefak build (`dist/` dan `server.js`) |

> **Variabel Lingkungan:** Aplikasi tidak memerlukan kunci API berbayar untuk berjalan. Seluruh feed OSINT terbuka, BMKG, Open-Meteo, CelesTrak, dan OSRM bekerja langsung melalui proxy backend dengan fallback otomatis ke dataset terbundel.

---

## Pengujian Otomatis

Jalankan seluruh rangkaian unit test (16 suite) menggunakan:

```bash
npm test
```

Cakupan pengujian meliputi:
- **Mesin Perkeretaapian (`src/engine/engine.test.ts`):** utilitas waktu WIB, fisika kecepatan trapesium, pemuatan dataset Jawa, deep-link, proyeksi GPS ke rel, ETA & artikulasi 3D kereta, radar terdekat, diagram Marey, aksesibilitas kursi roda, serta cuaca stasiun Open-Meteo.
- **Mesin OSINT & Dirgantara (`src/engine/osint.test.ts`):** propagasi orbit CelesTrak (SATRIA-1 GEO, ISS LEO, LAPAN-A2), sanitasi URL/XSS, parser OpenSky & adsb.lol + deduplikasi, parser BMKG AutoGempa/List + validasi Shakemap + deduplikasi dengan USGS, parser Launch Library 2, Radio Browser, Overpass ALPR, GDELT, NOAA/ECMWF, OSRM, 6 mode peta dasar, serta resolusi katalog maskapai, jenis pesawat, fase terbang, Mach, periode orbit Kepler, dan radius tapak satelit.

---

## Format Tautan Deep-Link

God Eye Indo menyinkronkan tampilan aktif ke hash URL untuk kemudahan berbagi:

| Tujuan | Contoh Hash URL |
| :--- | :--- |
| Detail stasiun | `#station=YK` atau `#station=MRI&sys=krl` |
| Detail kereta | `#train=KA%20105&td=2026-11-21` |
| Detail jalur | `#line=krl-b` |
| Perencana rute | `#from=BOO&to=THB&td=2026-10-12&t=27000` |
| Perlintasan sebidang (JPL) | `#jplIdx=42&jpl=1` |
| Posisi kamera peta | `#@-6.20880,106.84560,11.5` |

---

## Catatan Keamanan & Kinerja WebGL

- **Sanitasi tautan & HTML:** Semua tautan eksternal disaring dengan `sanitizeExternalUrl()` (hanya `http://` dan `https://`; memblokir `javascript:` dan `data:`), dan seluruh teks popup peta disanitasi melalui `escapeHtml()`.
- **Proteksi Proxy Shakemap BMKG:** Parameter `:file` pada `/api/osint/bmkg-shakemap/:file` divalidasi dengan pola ketat `^[A-Za-z0-9._-]{4,48}\.(jpg|jpeg|png)$` untuk mencegah *path traversal* maupun SSRF.
- **Dukungan Software WebGL:** Penampil 3D (`Aerospace3DViewer`) mendeteksi lingkungan software WebGL (seperti SwiftShader/llvmpipe) secara otomatis, menerapkan `RoomEnvironment` PBR agar material logam tetap cerah, menggunakan *on-demand rendering* + sinkronisasi `fenceSync` pada software WebGL, serta melepas seluruh geometri, tekstur, dan konteks WebGL secara bersih saat komponen ditutup.

---

## Lisensi & Atribusi

Proyek ini dibangun di atas fondasi proyek sumber terbuka **sepur-live** (MIT © 2026 Hendra Bangun Dwi R) dan diperluas menjadi platform intelijen geospasial **God Eye Indo**. Data peta © kontributor OpenStreetMap (ODbL 1.0). Data gempa resmi bersumber dari data terbuka BMKG Indonesia dan USGS. Lihat [`ATTRIBUTION.md`](./ATTRIBUTION.md) untuk daftar lengkap atribusi berkas dan sumber data.
