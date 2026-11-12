# Ringkasan Perubahan UI/UX E-Arsip

Branch: `arena/26357db2-e-arsip` (dibranched dari `main` @ `80bf6d01`, status `pr_open`)
Stack yang tidak diubah: backend, API, D1, R2, skema, autentikasi. Hanya `src/terra.css` dan `src/frontend.html` (dirakit kembali oleh `build.py` ke `worker.js`, yang tidak diedit secara langsung dan ada di `.gitignore`).

## Dasar acuan
- `docs/SPESIFIKASI.md` (sistem desain EMISGTK yang dikunci, fondasi komponen 1.4.5, standar 2026).
- `docs/OPTIMASI.md` (konteks produksi live: MIN Blora, 42 surat, tidak ada env development terpisah).
- Referensi desain SaaS modern 2024–2026 (Eleken, UICreative, Design Studio UI/UX, Aufait UX, 925 Studios, SaaSFrame, DesignPixil, SaaSFactor, DesiIsle, F1 Studioz, Codefronts).

## Apa yang diubah

### 1. Beranda — kembali ke Opsi B (grafik 6 bulan tetap tampil)
Grafik batang 6 bulan ("Aktivitas Surat 6 Bulan Terakhir") **dipulihkan** di beranda, berdampingan dengan panel "Perlu Perhatian". Tabel "Surat Terbaru" tetap di bawah selebar penuh. 3 kartu register (Surat Masuk, Surat Keluar, Disposisi Belum Selesai) dengan satu angka utama per kartu dipertahankan di atasnya.

Alasan: grafik memberi konteks tren volume surat per bulan, memperkaya 5-second rule tanpa memberatkan layar. Grafik ini juga tetap tersaji di Rekap Tahunan → Per Bulan.

### 2. Label kartu beranda
"Disposisi" → "Disposisi Belum Selesai" — setiap label harus spesifik.

### 3. Empty state lebih instruktif dengan CTA
`kosong()` sekarang menerima parameter ke-4 `cta` (HTML tombol aksi). Empty state di layar di mana pengguna punya izin (admin/petugas) menampilkan satu CTA spesifik:
- Beranda kosong → "Tambah Surat Pertama"
- Guru kosong → "Tambah Guru Pertama"
- Disposisi kosong (semua selesai) → "Tambah Disposisi"

Pengumat (viewer) **tidak** melihat tombol tambah (dikeluarkan oleh `canEditNow()`). Empty state karena filter tidak cocok (daftar surat) tetap menampilkan saran "Coba longgarkan kata kunci atau filter." tanpa tombol tambah.

### 4. Header tabel konsisten
- "No" → "No." di semua tabel (beranda, daftar surat, guru, rekap 4 tab, sampah, audit, pencarian)
- "File" → "Jumlah Berkas" di tabel Surat Terbaru beranda

### 5. Label tombol spesifik (verb + objek)
- "Simpan" → "Simpan Surat" (formulir), "Simpan Pengaturan" (zona waktu), "Simpan Klasifikasi", "Simpan Data Guru"
- "Ubah" → "Ubah Surat" (detail), "Ubah Data Guru" (daftar guru), "Ubah Klasifikasi"
- "Hapus" → "Hapus Lampiran", "Hapus Klasifikasi", "Hapus Permanen" (sudah spesifik)

Yang sudah spesifik tidak diubah.

### 6. Target sentuh 44px di HP
`@media(max-width:720px)`: `.btn` min-height/min-width 44px, input/select/textarea 44px, `.nv` 44px, hamburger 44px, dropzone berkas 60px. Desktop tetap 36px sesuai fondasi 1.4.5.

### 7. Jarak grup formulir 20px
`.fl margin-bottom` 14px → 20px.

### 8. Modal ditutup dengan Esc
Tombol Esc menutup modal (`modalRoot`) secara global, selain menu akun dan flyout tablet yang sudah ada.

### 9. Aria-label tombol hanya-ikon
Semua tombol icon-only punya `aria-label`: "Tampilkan kata sandi", "Hapus lampiran", "Hapus berkas".

### 10. Subjudul halaman
Semua `headPage(judul, sub, ...)` sudah memiliki subjudul spesifik per layar (mis. "Surat yang diterima instansi", "Antrian tindak lanjut surat masuk", "Ringkasan arsip satu tahun untuk laporan dan tanda tangan pimpinan"). Tidak ada deskripsi generik yang tersisa.

### 11. Placeholder dan petunjuk input
Semua input formulir sudah memiliki placeholder atau petunjuk spesifik dalam label (contoh: "Contoh: 421.2/118/Kk.12/2025", "Instansi pengirim", "Tulis pokok isi surat, bukan seluruh isi surat", "Nama lengkap beserta gelar").

## Sengaja TIDAK diubah

| Item | Alasan |
|------|--------|
| **(A) Konsolidasi varian tombol** | Varian `.btn`, `.sec`, `.dg`, `.dgo`, `.sm`, `.lk`, `.icn` adalah ukuran dan keadaan, bukan duplikat. Fondasi tombol versi 1.4.5 sudah dikunci dan disetujui. |
| **(H) Loading/disabled di semua tombol aksi** | Menyentuh logika JS di banyak handler dan berisiko tombol macet nonaktif. Pola loading/disabled yang sudah ada di hapus massal sudah cukup. |
| **(C, D, E) Hierarki primer, posisi tombol, bedakan navigasi vs aksi** | Soal selera visual dan mengubah tampilan yang sudah disetujui. Ditujukan sebagai usulan dengan mockup, bukan langsung kode. |
| Label terkunci | Status disposisi (`Belum`, `Diproses`, `Selesai`, `Terlambat`), status surat keluar (`Terkirim`), jenis penugasan (`Surat Tugas`, `SPPD`), peran (`Administrator`, `Petugas TU`, `Pimpinan`, `Pengamat`), nama menu utama, `Berkas belum diunggah`, format penomoran agenda, format tanda tangan cetak, kop surat. |
| Palet EMISGTK, font sistem | Tidak ada font web, tidak ada Inter, cetakan PDF Arial / pratinjau Georgia. |
| Backend, API, database, skema, autentikasi | `src/backend.js` tidak disentuh. `worker.js` (hasil rakitan) tidak diedit langsung. |

## Pratinjau (mockup mandiri)
Tidak ada browser headless di lingkungan ini, dan live app memerlukan binding Cloudflare (D1/R2), sehingga tangkapan layar disajikan sebagai **berkas HTML mandiri** yang memakai CSS asli aplikasi (tidak perlu jaringan):

- `docs/preview/beranda-desktop.html` — Opsi B (grafik 6 bulan + panel perhatian + terbaru)
- `docs/preview/beranda-mobile.html` — Opsi B, layar HP (viewport 375px)
- `docs/preview/surat-masuk-desktop.html` / `...-mobile.html`
- `docs/preview/detail-surat-desktop.html` / `...-mobile.html`
- `docs/preview/formulir-desktop.html` / `...-mobile.html`

Buka berkas di peramban. Varian HP pakai `viewport width=375` agar media query HP aktif.

## Verifikasi
- `python3 build.py` → build OK
- `node --check worker.js` → lulus (worker.js tidak diubah secara langsung)
