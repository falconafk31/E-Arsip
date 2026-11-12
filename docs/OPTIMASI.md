# Saran Optimasi E-Arsip

Dokumen ini mencatat saran optimasi dari GitHub Copilot (12 Nov 2026), penilaian Pax
berdasarkan kode dan data sebenarnya, serta keputusan Hades. Saran yang belum
dikerjakan TIDAK berarti ditolak selamanya; dikerjakan bila ada kebutuhan terukur.

Keadaan saat keputusan diambil: 42 surat, sekitar 40 lampiran, 4 disposisi.
Tidak ada lingkungan development terpisah; pengujian dilakukan terhadap live
dengan hati-hati (hanya baca) dan pratinjau lokal.

## Dikerjakan (1.5.2, 12 Nov 2026)

### Paralelkan query yang tidak saling bergantung

Dashboard (12 query) dan rekap (9 query) yang tadinya berurutan kini berjalan
sejajar lewat `Promise.all()`. Hasil respons tidak berubah; hitungan sebelum dan
sesudah diverifikasi sama persis.

### Filter tanggal ramah indeks

Filter `substr(tanggal_agenda, 1, 4)=?` dan `substr(tanggal_agenda, 1, 7)=?`
diganti rentang ISO `tanggal_agenda >= ? AND tanggal_agenda < ?` di daftar
surat, cetak agenda (bulan/tahun/triwulan), menu Agenda, rekap, unduh CSV
rekap, dan dashboard. Helper `rentangBulan()` dan `rentangTahun()` di
`src/backend.js`. Pengelompokan per bulan (`GROUP BY` bulan) dipertahankan
karena memang butuh ekstraksi bulan. Hitungan sebelum dan sesudah diverifikasi
sama persis.

## Ditunda (kerjakan bila ada kebutuhan terukur)

### Kurangi query D1 berulang (simpanGuruSurat, impor guru)

Loop-nya memang ada (SELECT + INSERT per guru; cek NIP + INSERT per baris
impor, maks 500 baris). Tapi penugasan guru biasanya 1-5 orang per surat dan
impor guru jarang dipicu admin. Batch D1 (`env.DB.batch`) baru layak bila impor
mulai terasa lambat; saat itu perhatikan duplikat NIP di dalam satu batch yang
sama.

### Tambah indeks

Data masih 42 surat; indeks tambahan tidak memberi hasil terukur dan hanya
menambah biaya tulis + satu migrasi D1 manual. Kandidat Copilot
(`lampiran(surat_id, jenis_berkas)`, `surat(terhapus_pada, jenis,
tanggal_agenda)`, `disposisi(surat_id, status)`) ditinjau lagi bila data di
atas 1.000 surat atau ada query yang terbukti lambat. Perubahan indeks lewat
migrasi baru, bukan hanya mengubah skema instalasi baru.

## Tidak dikerjakan

### Pencarian teks (FTS)

Pencarian `%kata%` di 42 baris tidak akan terasa lambat. Pertahankan
implementasi sekarang; evaluasi FTS bila pencarian menjadi lambat pada data
besar.

### Pecah backend menjadi modul

JANGAN sekarang. Bertentangan dengan perintah Hades 5 Nov 2026 ("jangan
redesign backend"). Selain itu pipeline build di sini rapuh (push 1.5.0 sempat
gagal karena batas argumen Linux) sehingga mengubah `build.py` dan `build.mjs`
untuk merakit modul berisiko. Struktur folder yang disarankan Copilot juga
tidak cocok dengan repo ini (`worker.js` hasil rakitan ada di `app/`, bukan
di `src/`). Ditinjau lagi bila backend sudah sulit dirawat atau ada pengembang
kedua.

## Catatan

- Migrasi D1 tidak otomatis; perubahan skema selalu langkah manual terpisah
  sebelum deploy kode yang mengandalkannya.
- Jangan mengubah skema atau migrasi langsung di database produksi tanpa
  cadangan dan rencana pemulihan.
