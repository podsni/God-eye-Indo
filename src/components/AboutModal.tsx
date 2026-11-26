import { X } from 'lucide-react';

interface AboutModalProps {
  onClose: () => void;
}

export function AboutModal({ onClose }: AboutModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Tentang God Eye Indo"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto sepur-scroll bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tentang God Eye Indo</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Peta geospasial, transportasi, dan intelijen publik (OSINT) langsung untuk seluruh Indonesia.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela tentang"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
          <p>
            <strong>God Eye Indo</strong> menggabungkan pelacakan kereta api Indonesia (GAPEKA 2026, Open-KRL, ShioriLabs &amp; 4.700+ JPL) dengan jaringan data terbuka real-time: ruang udara Indonesia, orbit satelit, seismik Ring of Fire, cuaca numerik dual-model, CCTV kota, kamera ALPR/ETLE, radio siaran, rute OSRM, hingga pemantauan berita nasional.
          </p>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 font-semibold">Lapisan / Modul</th>
                <th className="px-3 py-2 font-semibold">Sumber Data</th>
                <th className="px-3 py-2 font-semibold">Cakupan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              <tr>
                <td className="px-3 py-2 font-medium">Kereta &amp; Transit Feeds</td>
                <td className="px-3 py-2">GAPEKA 2026, Open-KRL, ShioriLabs, GTFS Bus &amp; ASDP</td>
                <td className="px-3 py-2">Pulau Jawa &amp; Nusantara</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">Ruang Udara ADS-B</td>
                <td className="px-3 py-2">OpenSky Network (anon) &amp; adsb.lol v2</td>
                <td className="px-3 py-2">FIR Jakarta &amp; Ujung Pandang</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">Satelit &amp; Peluncuran</td>
                <td className="px-3 py-2">CelesTrak GP &amp; Launch Library 2</td>
                <td className="px-3 py-2">Satria-1, Merah Putih, ISS, LL2</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">Gempa &amp; Cuaca Dual-Model</td>
                <td className="px-3 py-2">BMKG Indonesia (InaTEWS &amp; Shakemap), USGS, NOAA GFS &amp; ECMWF IFS</td>
                <td className="px-3 py-2">Seluruh Indonesia &amp; Ring of Fire</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">Kota, Kamera &amp; Media</td>
                <td className="px-3 py-2">ATCS City CCTV, OSM ALPR/ETLE, GBFS, Radio Browser</td>
                <td className="px-3 py-2">Jakarta, Bandung, SBY, Jogja, Bali, Medan, IKN, Makassar</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium">Rute &amp; Berita</td>
                <td className="px-3 py-2">OSRM Routing, GDELT 2.0 News Events &amp; Bundled Datasets</td>
                <td className="px-3 py-2">Seluruh Indonesia</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
          Data peta © kontributor OpenStreetMap (ODbL). Seluruh sumber data publik digunakan sesuai lisensi terbuka masing-masing dan dilengkapi bundel lokal Indonesia sebagai cadangan saat batas kuota API tercapai.
        </p>
      </div>
    </div>
  );
}
