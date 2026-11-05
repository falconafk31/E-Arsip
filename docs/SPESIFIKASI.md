# Spesifikasi Teknis E-Arsip

## Arsitektur

Satu Cloudflare Worker melayani tiga hal sekaligus: halaman aplikasi (HTML satu berkas yang tertanam sebagai base64), API JSON di jalur `/api/*`, dan halaman cetak di jalur `/cetak/*`. Metadata surat disimpan di Cloudflare D1 (SQLite), isi berkas disimpan di bucket R2 privat. Tidak ada proses latar dan tidak ada server terpisah.

```
Peramban -> Worker -> D1 (metadata: surat, lampiran, disposisi, guru, pengguna, audit, pengaturan)
                  -> R2 (isi berkas PDF/gambar, kop logo)
```

Binding Worker: `DB` untuk D1 dan `FILES` untuk R2. Compatibility date `2024-11-01`.

Sumber di `src/` dirakit oleh `build.py` menjadi satu `worker.js`: CSS (`terra.css`) dan sprite ikon SVG disisipkan ke `frontend.html`, hasilnya di-base64, lalu dimasukkan ke `backend.js`. Sunting sumbernya, jangan `worker.js`.

## Model data (D1)

| Tabel | Isi |
|---|---|
| `users` | Pengguna: username unik, hash kata sandi PBKDF2, nama, peran, status aktif |
| `sessions` | Token sesi acak yang terhubung ke pengguna, dengan waktu kedaluwarsa |
| `settings` | Pasangan kunci-nilai: kop surat, logo, nama dan NIP kepala, zona waktu |
| `klasifikasi` | Daftar klasifikasi surat (kode dan nama) |
| `surat` | Inti data: jenis masuk/keluar, nomor surat, nomor agenda, tanggal surat dan agenda, asal/tujuan, perihal, ringkasan, klasifikasi, sifat, status disposisi, lokasi fisik, penandatangan, `induk_id` (surat masuk yang ditindaklanjuti), `jenis_penugasan` (Surat Tugas/SPPD), penanda sampah |
| `lampiran` | Metadata berkas: kunci R2, nama asli, mime, ukuran, `jenis_berkas` (`berkas_surat` atau `lampiran_pendukung`), keterangan |
| `disposisi` | Disposisi per surat masuk: instruksi, kepada, batas waktu, status, catatan penyelesaian |
| `nomor_counter` | Penghitung nomor agenda per tahun dan jenis |
| `guru` | Data induk guru/staff: nama, NIP unik bila terisi, pangkat/golongan, jabatan, kategori, status kepegawaian, aktif |
| `surat_guru` | Guru yang ditugaskan pada surat keluar; nama dan NIP disimpan sebagai snapshot |
| `audit` | Jejak aktivitas: pengguna, aksi, entitas, detail, waktu (UTC) |

Skema lengkap ada di `database/schema.sql`; pembaruan berurutan ada di `database/migrations/`.

## Aturan bisnis penting

- Nomor agenda masuk terbit otomatis dengan format `A-{tahun}-{urut 4 digit}`, dihitung per tahun dan kembali ke 0001 tiap tahun baru. Nomor surat keluar diisi manual; nomor yang sama memunculkan peringatan tetapi tidak memblokir.
- Alur berkas: catat dulu, berkas menyusul. Surat tanpa Berkas Surat ditandai "Berkas belum diunggah" di daftar, beranda, dan rekap.
- Kelengkapan hanya dihitung dari lampiran berjenis `berkas_surat`. Batas: Berkas Surat maks 5 per surat, total semua berkas maks 10 per surat, 10 MB per berkas, logo kop maks 2 MB. Format diterima: PDF, JPG, PNG, WEBP, diperiksa dari magic bytes, bukan dari ekstensi.
- Status disposisi surat masuk tersinkron otomatis: tanpa disposisi berarti Belum, ada disposisi terbuka berarti Diproses, semua disposisi selesai berarti Selesai. Surat keluar tidak didisposisi; status tampilnya Terkirim.
- Penugasan: surat keluar boleh menunjuk satu surat masuk sebagai induk dan wajib memilih jenis penugasan Surat Tugas atau SPPD bila menunjuk induk atau daftar guru. Guru yang dipilih disimpan sebagai snapshot agar perubahan data induk tidak mengubah catatan lama.
- NIP guru unik di antara NIP yang terisi; NIP kosong diperbolehkan berkali-kali. Guru nonaktif tidak bisa dipilih untuk penugasan baru tetapi tetap tampil di catatan lama.
- Hapus permanen surat ikut menghapus berkas R2, relasi guru, dan melepaskan tautan induk surat turunannya.

## Peran dan izin

| Kemampuan | Admin | Petugas | Pimpinan | Viewer |
|---|---|---|---|---|
| Melihat surat dan berkas | ya | ya | ya | ya (Rahasia disamarkan) |
| Membuat dan mengubah surat, unggah berkas, pindah ke sampah | ya | ya | tidak | tidak |
| Membuat disposisi dan mengubah statusnya | ya | ya | ya | tidak |
| Mengelola data guru | ya | ya | tidak | tidak |
| Pulihkan dan hapus permanen dari sampah | ya | tidak | tidak | tidak |
| Kelola pengguna dan pengaturan | ya | tidak | tidak | tidak |
| Melihat audit | ya | tidak | tidak | tidak |

## Endpoint API utama

Semua endpoint di bawah `/api/` dan membutuhkan sesi login kecuali `/api/login`.

- Sesi: `POST /api/login`, `POST /api/logout`, `GET /api/me`, `PUT /api/me/password`
- Surat: `GET/POST /api/surat`, `GET/PUT/DELETE /api/surat/:id`, `POST /api/surat/:id/pulih`, `DELETE /api/surat/:id/permanen`
- Berkas: `POST /api/surat/:id/lampiran`, `PUT /api/lampiran/:id` (pindah jenis berkas), `DELETE /api/lampiran/:id`, `GET /api/lampiran/:id/unduh`, `GET /api/lampiran/:id/lihat`
- Disposisi: `GET/POST /api/disposisi`, `PUT /api/disposisi/:id`
- Guru: `GET/POST /api/guru`, `PUT /api/guru/:id`, `GET /api/guru/template`, `POST /api/guru/impor`, `POST /api/guru/impor/simpan`
- Laporan: `GET /api/agenda`, `GET /api/rekap`, `GET /api/dashboard`
- Administrasi: `GET/POST /api/users`, `PUT /api/users/:id`, `GET /api/audit`, `GET/PUT /api/settings`, `POST /api/settings/logo`
- Cetak (HTML siap print): `/cetak/disposisi/:surat_id`, `/cetak/agenda`, `/cetak/rekap`

Daftar surat memakai pagination sisi server (25 per halaman) dengan parameter pencarian, filter, dan sortir berkunci daftar putih kolom per endpoint.

## Impor Excel

Template dan parser xlsx dibuat di dalam Worker tanpa pustaka luar: berkas xlsx dibaca sebagai zip (stored dan deflate mentah) beserta shared strings; CSV diterima dengan pemisah koma atau titik koma. Impor berjalan dua tahap: unggah untuk pratinjau (tiap baris berstatus siap, duplikat, atau gagal), lalu simpan hanya baris yang siap. Maksimal 500 baris dan 5 MB per berkas impor.

## Keamanan

- Kata sandi di-hash PBKDF2-HMAC-SHA256 dengan garam acak 16 byte dan 100.000 iterasi.
- Cookie sesi HttpOnly, SameSite=Lax, Secure, berlaku 7 hari; token sesi acak 24 byte.
- Bucket R2 privat; berkas tidak punya URL publik dan selalu dilayani Worker sesudah pemeriksaan sesi dan peran.
- Semua kueri memakai parameter terikat (prepared statement); sortir memakai daftar putih kolom.
- Aktivitas penting dicatat ke tabel audit: login, buat/ubah/hapus surat, unggah dan unduh berkas, disposisi, kelola pengguna dan guru, impor, dan perubahan pengaturan.

## Batasan yang diketahui

- Satu instansi per pemasangan (kop dan data tidak multi-tenant).
- Belum ada generator dokumen Surat Tugas/SPPD; naskah surat dibuat di aplikasi dokumen biasa lalu diarsipkan di sini.
- Rekap tersedia per tahun; tidak ada ekspor CSV per bulan.
- Kuota gratis Cloudflare cukup untuk pemakaian madrasah pada umumnya (D1 5 GB, R2 10 GB); pantau pertumbuhan berkas hasil pindai Anda.
