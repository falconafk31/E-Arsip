# Changelog

Semua perubahan penting E-Arsip dicatat di berkas ini. Format mengikuti Keep a Changelog, versi mengikuti Semantic Versioning.

## [1.2.0] - 2026-11-05

### Ditambahkan

- Footer aplikasi berisi nama aplikasi dan keterangan versi.
- Kolom Kota di Pengaturan Pejabat: tercetak di atas tanda tangan pimpinan pada Buku Agenda dan Rekap, diikuti tanggal hari pencetakan. Semua hasil cetak (agenda, rekap, lembar disposisi) berfooter tanggal dan jam cetak mengikuti zona waktu, dan tanggal cetak tampil dalam format panjang Bahasa Indonesia.
- Konfirmasi untuk aksi Keluar, Hapus Logo Kop, dan Nonaktifkan Pengguna.
- Integrasi Cloudflare Workers Builds: push ke branch main otomatis men-deploy Worker (build `node build.mjs`, deploy `npx wrangler deploy`, konfigurasi di `wrangler.toml`).

### Diperbaiki

- Header pada tampilan mobile: nama instansi tidak lagi membuat breadcrumb turun dua baris; header menjadi satu baris berisi tombol menu, judul halaman, dan avatar.
- Daftar berkas pada halaman detail surat di layar HP: nama berkas tampil penuh selebar baris dan tombol aksi menumpuk rapi di bawahnya; sebelumnya nama berkas terjepit sempit dan tombol menimpa teks.
- Tabel Disposisi pada layar HP berupa tabel yang dapat digeser ke samping seperti daftar surat, sesuai keputusan pengguna bahwa kartu bertumpuk terlalu besar.
- Teks panjang pada tabel dan daftar (perihal, instruksi, kepada, asal/tujuan surat, rincian audit) dipotong menjadi 4 kata diikuti "..." khusus pada layar HP, dan sel tabel tampil satu baris; nomor surat dan nomor agenda tidak pernah dipotong. Teks lengkap tetap tampil di halaman detail dan di layar desktop.

## [1.0.0] - 2026-11-05

Rilis publik pertama.

### Ditambahkan

- Data Guru/Staff sebagai data induk: nama, NIP opsional dan unik, pangkat/golongan, jabatan, kategori Guru/Staff, status kepegawaian (PNS/PPPK/Honorer), dan status aktif.
- Impor guru dari Excel dan CSV: template resmi dua lembar (Data Guru dan Petunjuk), pratinjau per baris berstatus siap/duplikat/gagal, maksimal 500 baris sekali impor.
- Berkas dua jenis: Berkas Surat (patokan kelengkapan, maks 5 per surat) dan Lampiran Pendukung untuk bukti kegiatan surat keluar (total maks 10 per surat); jenis berkas bisa dipindah dari halaman detail.
- Penugasan ringan pada surat keluar: jenis penugasan Surat Tugas atau SPPD, tautan ke surat masuk induk, dan daftar guru yang ditugaskan (tersimpan sebagai snapshot nama dan NIP). Kartu Surat Keluar Terkait pada detail surat masuk.
- Saran nama penerima disposisi dari daftar guru aktif (tetap bisa teks bebas).
- Kelola pengguna penuh untuk admin: tambah pengguna, ubah nama/peran/status aktif, atur ulang kata sandi, dengan pengaman admin tidak bisa menonaktifkan atau menurunkan peran akunnya sendiri.
- Halaman Audit khusus admin dengan filter aksi, pencarian, pagination, dan label aksi Bahasa Indonesia.
- Sortir klik kepala kolom di semua tabel (daftar surat, sampah, disposisi, audit, buku agenda) dengan ikon panah SVG.
- Zona waktu tampilan WIB/WITA/WIT yang bisa dipilih di Pengaturan.
- Kolom Tanggal Agenda tersendiri di daftar surat.
- Fitur bantu operator: tombol unggah cepat untuk surat tanpa berkas, tombol Batalkan sesudah memindah surat ke sampah, teks bantu formulir dengan penanda wajib, chip filter aktif, pencarian gabungan, dan penanda tenggat disposisi.
- Migrasi database berurutan di `database/migrations/` dan contoh konfigurasi Wrangler.

### Diubah

- Alur berkas resmi menjadi catat dulu, berkas menyusul. Semua istilah "scan" diganti satu istilah tunggal: Berkas Surat.
- Nama tampilan aplikasi menjadi E-Arsip.
- Status surat keluar di daftar dan detail tampil sebagai Terkirim; status disposisi tidak lagi berlaku untuk surat keluar.
- Font kop surat mengikuti ketentuan Kemenag: Arial, baris 1 sebesar 14pt kapital, baris 2 dan 3 sebesar 12pt kapital, alamat dan kontak 9pt.
- Urutan bawaan semua daftar menjadi menaik (ascending); pengecualian disengaja pada panel Perlu Perhatian dan Surat Terbaru.
- Semua tabel data mendapat kolom nomor urut yang berlanjut antar halaman.

### Diperbaiki

- Pagination Tempat Sampah yang sebelumnya tidak konsisten.
- Pagination halaman Audit.
- Tombol menu pada tampilan mobile agar selalu terlihat dan mudah ditekan.

## [0.1.0] - 2026-11-05

Rilis internal pertama.

### Ditambahkan

- Pencatatan surat masuk (nomor agenda otomatis per tahun) dan surat keluar (nomor manual dengan peringatan ganda).
- Unggah berkas PDF/JPG/PNG/WEBP ke R2 privat dengan pemeriksaan magic bytes, pratinjau di aplikasi.
- Disposisi berjenjang (Baru, Diproses, Selesai) dengan batas waktu dan lembar disposisi cetak.
- Buku Agenda dan Rekap Tahunan (PDF ringkasan, PDF agenda, tiga berkas CSV).
- Kop surat dari formulir Pengaturan termasuk unggah logo, tanda tangan nama dan NIP kepala untuk hasil cetak.
- Login sesi cookie, empat peran pengguna, penyamaran surat Rahasia untuk Viewer.
- Tempat Sampah dengan pulihkan dan hapus permanen.
- Beranda berisi kartu ringkasan, grafik aktivitas enam bulan, panel Perlu Perhatian, dan daftar surat terbaru.
