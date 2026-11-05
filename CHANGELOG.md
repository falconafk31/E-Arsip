# Changelog

Semua perubahan penting E-Arsip dicatat di berkas ini. Format mengikuti Keep a Changelog, versi mengikuti Semantic Versioning.

## [1.3.2] - 2026-11-05

### Diubah

- Seluruh teks cetakan PDF (Buku Agenda, Rekap Tahunan, dan Lembar Disposisi) kini memakai huruf Arial, termasuk judul dan baris keterangan periode yang sebelumnya masih memakai Georgia bawaan badan halaman cetak.

## [1.3.1] - 2026-11-05

### Diubah

- Cetakan Buku Agenda kini memakai kertas A4 landscape agar seluruh kolom muat lega; cetakan lain (Rekap, Lembar Disposisi) tidak berubah.
- Huruf tabel agenda seragam 11 pt di semua sel, dengan lebar kolom tetap yang disesuaikan untuk landscape (Nomor Agenda 6%, Tanggal Surat 8.5%, Tanggal Agenda 8.5%, Nomor Surat 17%, Tujuan/Asal Surat 18.5%, Perihal 14.5%, Klasifikasi 10%, Sifat 7%, Penanda Tangan/Status Disposisi 10%).
- Baris kepala tabel agenda kini berulang otomatis di setiap halaman lanjutan.

## [1.3.0] - 2026-11-05

### Diubah

- Buku Agenda menjadi satu menu dengan dua tab register: Surat Masuk dan Surat Keluar. Masing-masing tab memiliki tabel dengan kolom sesuai registernya (masuk: Tanggal Diterima dan Tanggal Surat, asal, status disposisi; keluar: Tanggal Surat dan Tanggal Agenda, tujuan, penandatangan) dan tombol Cetak mengikuti tab aktif.
- Penomoran register diganti: awalan huruf dan tahun dihapus. Nomor register kini bernama Nomor Agenda berupa nomor urut polos 001, 002, 003, dan seterusnya, dengan urutan sendiri-sendiri per register dan per tahun.
- Surat keluar sekarang juga menerima Nomor Agenda saat dicatat, sama seperti surat masuk. Nomor lama A-2026-0001 pada data yang sudah ada diubah menjadi 001, dan surat keluar yang sudah ada diberi nomor 001 pada registernya.
- Cetakan Buku Agenda per register memuat dua tanggal (tanggal surat dan tanggal diterima/agenda) dengan judul Buku Agenda Surat Masuk atau Buku Agenda Surat Keluar.
- Label nomor pada tampilan campuran (Beranda) kini lengkap: "Agenda Masuk 001" atau "Agenda Keluar 001"; daftar Disposisi menampilkan nomor agenda di bawah perihal.

### Ditambahkan

- Ringkasan Rekap Tahunan menampilkan Nomor Agenda terakhir per register (masuk dan keluar).

## [1.2.4] - 2026-11-05

### Diubah

- Posisi blok tanda tangan cetakan Buku Agenda dan Rekap ditukar mengikuti contoh dokumen resmi madrasah: Kepala Madrasah (dengan "Mengetahui,") kini di sebelah kiri, Petugas Tata Usaha beserta baris kota dan tanggal di sebelah kanan.

### Diperbaiki

- Menyegarkan (refresh) halaman kini tidak lagi kembali ke Beranda. Setiap menu tercatat pada alamat halaman (misalnya #/agenda, #/guru, #/detail/4), dan saat halaman dimuat ulang aplikasi membuka kembali menu yang tercatat itu.

## [1.2.3] - 2026-11-05

### Diperbaiki

- Garis bawah pada blok tanda tangan cetakan kini hanya pada nama penanda tangan; baris NIP di bawahnya tidak lagi ikut tergaris, meniru format dokumen resmi.

## [1.2.2] - 2026-11-05

### Ditambahkan

- Pengaturan Pejabat: kolom Nama Petugas Tata Usaha dan NIP Petugas Tata Usaha. Nama petugas pada blok tanda tangan cetakan kini diambil dari pengaturan ini (bila kosong, memakai nama pengguna yang mencetak).

### Diubah

- Buku Agenda di layar dan pada cetakan menampilkan Nomor Agenda dan Nomor Surat sebagai dua kolom terpisah, sehingga nomor asli surat dari pengirim selalu terlihat di samping nomor agenda register.
- Judul cetakan Buku Agenda mengikuti filter jenis: Buku Agenda Surat Masuk atau Buku Agenda Surat Keluar; kolom Jenis pada tabel cetakan disembunyikan bila isinya sudah satu jenis.
- Blok tanda tangan cetakan Buku Agenda dan Rekap: sisi kanan menjadi "Mengetahui, Kepala Madrasah" tanpa baris tanggal; tanggal hanya tampil satu kali di sisi Petugas Tata Usaha.
- Nama penanda tangan pada cetakan digarisbawahi tanpa garis tanda tangan di atasnya, menyisakan ruang kosong untuk tanda tangan basah.
- Footer "Dicetak pada ..." dihilangkan dari semua hasil cetak.

## [1.2.1] - 2026-11-05

### Diperbaiki

- Filter Buku Agenda: kolom bulan langsung terisi bulan berjalan saat halaman dibuka, sehingga pilihan "Per Bulan Ini" langsung menyaring dengan benar (sebelumnya kolom kosong membuat semua surat tampil).
- Format tanggal pada tabel cetakan Buku Agenda dan Lembar Disposisi menjadi format Indonesia (contoh 25 Jul 2026); label periode agenda memakai nama bulan.
- Blok tanda tangan pada cetakan Buku Agenda dan Rekap simetris: sisi Petugas Tata Usaha kini juga memakai baris kota dan tanggal seperti sisi pimpinan.
- Ganti Password mewajibkan kata sandi lama dan konfirmasi kata sandi baru, dan tercatat di Audit.
- Grafik "Aktivitas Surat 6 Bulan Terakhir" di Beranda menampilkan enam bulan secara utuh, termasuk bulan tanpa surat (nilai 0).
- Pratinjau berkas pada detail surat dilengkapi bilah nama berkas dengan tombol Buka dan Unduh tepat di atas pratinjau, sehingga berkas tetap mudah diakses bila pratinjau bawaan peramban tidak menggambar PDF (misalnya Chrome di Android).

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
