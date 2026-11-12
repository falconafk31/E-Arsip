# Ringkasan Perubahan UI/UX E-Arsip

Branch: `arena/26357db2-e-arsip` (dibranched dari `main` @ `80bf6d01`)
Stack yang tidak diubah: backend, API, D1, R2, skema, autentikasi. Hanya `src/terra.css` dan `src/frontend.html` (dirakit kembali oleh `build.py` ke `worker.js`, yang tidak diedit secara langsung dan ada di `.gitignore`).

## Dasar acuan
- `docs/SPESIFIKASI.md` (sistem desain EMISGTK yang dikunci, fondasi komponen 1.4.5, standar 2026).
- `docs/OPTIMASI.md` (konteks produksi live: MIN Blora, 42 surat, tidak ada env development terpisah).
- `STATUS.md` tidak tersedia di repo; keputusan didasarkan pada SPESIFIKASI.md dan kondisi kode saat ini.

## Apa yang diubah

| Area | Perubahan | Alasan |
|------|-----------|--------|
| **Beranda** | Disingkat: dihapus grafik batang 6 bulan; tersisa 3 kartu register (Surat Masuk, Surat Keluar, Disposisi Belum Selesai) dengan **satu angka utama per kartu**, panel **Perlu Perhatian** (disposisi yang perlu tindakan, sorot terlambat), dan tabel **Surat Terbaru** ringkas. | Standar 2026: beranda tidak boleh ramai; satu angka utama per kartu; jangan menumpuk banyak kartu dan grafik dalam satu layar. Grafik per bulan tetap ada di Rekap Tahunan → Per Bulan. |
| **Label kartu beranda** | "Disposisi" → "Disposisi Belum Selesai" | Setiap label harus spesifik. |
| **Target sentuh HP** | `min-height/min-width 44px` untuk `.btn`, input 44px, item navigasi sidebar `.nv` 44px, hamburger 44px, dropzone berkas 60px pada `@media(max-width:720px)`. Desktop tetap 36px sesuai fondasi 1.4.5. | Standar 2026: target sentuh minimal 44px di HP; input formulir 40-44px. |
| **Jarak grup formulir** | `.fl margin-bottom` 14px → 20px | Standar 2026: jarak antar-grup formulir 20-24px. |
| **Modal** | Tombol Esc menutup modal (modalRoot) secara global, selain menu akun dan flyout tablet yang sudah ada. | WCAG AA: modal bisa ditutup dengan Esc. |
| **Aksesibilitas ikon** | `aria-label` pada tombol hanya-ikon: "Hapus lampiran", "Ubah jenis berkas", "Hapus berkas". | WCAG AA: semua tombol ikon punya aria-label. |
| **Empty state** | Ikon spesifik per layar: sampah=trash, disposisi=disposition, agenda=agenda, audit=report, pencarian=search, guru=users (sebelumnya semuanya inbox). | Label/ikons spesifik, tidak generik. |

## Opsi desain yang dipertimbangkan (beranda)

- **Opsi A (direkomendasikan, diterapkan):** tidak ada grafik di beranda; fokus pada disposisi yang perlu tindakan dan surat terbaru. Cocok untuk tugas harian petugas TU (penyusulan disposisi terlambat).
- **Opsi B (diajukan, tidak dipilih):** satu kartu total + grafik batang 6 bulan tetap ditampilkan di beranda, lalu panel perhatian dan terbaru. Dilihat di `docs/preview/beranda-optionb-desktop.html`.

Rekomendasi: **Opsi A** — grafik aktivitas tetap tersaji di Rekap Tahunan (Per Bulan), jadi tidak menghilangkan informasi, hanya memindahkannya ke layar laporan tempatnya lebih tepat.

## Sengaja TIDAK diubah
- Palet EMISGTK (sidebar gradient `#1EA38D`→`#2A6DA6`, primer `#2E7D68`, `--sf2`, `--bd`, `--tx`, `--tm`, emas hanya angka terlambat), font system-ui (tidak ada font web), cetakan PDF Arial / pratinjau Georgia.
- Struktur shell: sidebar penuh desktop (≥1025px), rel ikon 72px + flyout tablet (721-1024px), laci geser HP (≤720px), tanpa navigasi bawah HP.
- Tabel tetap tabel di HP dengan geser horizontal + petunjuk "Geser ke kanan untuk kolom lainnya"; tidak diubah menjadi kartu.
- Tombol tinggi 36px radius 5px (desktop), kop surat melalui Pengaturan, ikon hanya dari `src/sprite.svg.txt`, perilaku backend/skema/autentikasi/penomoran agenda, `src/backend.js` (tidak disentuh), `worker.js` (hasil rakitan, tidak diedit).

## Pratinjau (mockup mandiri)
Tidak ada browser headless di lingkungan ini, dan live app memerlukan binding Cloudflare (D1/R2), sehingga tangkapan layar disajikan sebagai **berkas HTML mandiri** yang memakai CSS asli aplikasi (tidak perlu jaringan), sesuai alur build.py ("mockup atau tangkapan pratinjau HTML mandiri"):

- `docs/preview/beranda-desktop.html` — Opsi A (direkomendasikan)
- `docs/preview/beranda-optionb-desktop.html` — Opsi B (perbandingan)
- `docs/preview/beranda-mobile.html` — Opsi A, layar HP
- `docs/preview/surat-masuk-desktop.html` / `...-mobile.html`
- `docs/preview/detail-surat-desktop.html` / `...-mobile.html`
- `docs/preview/formulir-desktop.html` / `...-mobile.html`

Buka berkas di peramban. Varian HP pakai `viewport width=375` agar media query HP aktif dan tampil seperti layar telepon.

## Verifikasi
- `python3 build.py` → build OK
- `node --check worker.js` → lulus (worker.js tidak diubah secara langsung)
