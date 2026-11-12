# Changelog

Semua perubahan penting E-Arsip dicatat di berkas ini. Format mengikuti Keep a Changelog, versi mengikuti Semantic Versioning.

## [1.5.2] - 2026-11-12

### Diubah

- Optimasi saran Copilot butir 2 dan 3 (disetujui Hades, hasil tidak berubah): query independen di dashboard (12 query) dan rekap (9 query) kini berjalan sejajar lewat `Promise.all`; filter tanggal `substr()` diganti rentang ISO `tanggal_agenda >= ? AND tanggal_agenda < ?` di daftar surat, cetak agenda (bulan/tahun/triwulan), menu Agenda, rekap, unduh CSV rekap, dan dashboard. Hitungan sebelum dan sesudah diverifikasi sama persis (dashboard 16/25, rekap 17/25/42). Pengelompokan per bulan (`GROUP BY` bulan) dipertahankan karena memang butuh ekstraksi bulan.
- Hitungan bulan di dashboard kini memakai parameter terikat (sebelumnya nilai bulan disisipkan langsung ke SQL).

## [1.5.1] - 2026-11-12

### Diperbaiki

- Riwayat di halaman Detail menampilkan tanggal selesai disposisi sebagai teks ISO mentah (mis. `2026-11-05T02:56:56.910Z`). Akar masalah: pembaruan status disposisi menulis `selesai_pada` sebagai ISO, sementara `fmtJam` selalu menempel `Z` sehingga hasilnya tanggal tak valid. Backend kini menulis `selesai_pada` format SQLite seperti kolom waktu lain, dan `fmtJam` mentolerir ISO (dengan/tanpa `Z`) supaya baris lama tetap tampil benar.

## [1.5.0] - 2026-11-12

### Ditambahkan

- P10: halaman Detail surat disusun ulang satu kolom dengan 4 seksi bernomor (1. Informasi, 2. Berkas, 3. Disposisi, 4. Riwayat); Penugasan dan Surat Keluar Terkait menjadi sub-blok seksi Informasi. Seksi Riwayat menampilkan garis waktu dari data detail yang sudah ada (dicatat, disposisi dibuat/diselesaikan, berkas diunggah) tanpa endpoint baru. Kepala detail mendapat tombol Tambah Disposisi (gulir ke formulir disposisi dan fokus ke kolom Kepada).
- P11: flyout pada rel ikon tablet (lebar 721-1024px) untuk Surat Masuk dan Surat Keluar (Daftar, Tambah, Berkas Belum Lengkap), dengan panah, judul, aria-expanded/controls, dan penutup lewat Esc, klik luar, atau pindah halaman. Menu lain tetap navigasi langsung.

### Diubah

- P7 (versi kecil): formulir tambah/ubah surat mendapat legenda "Tanda * wajib diisi", tanda wajib diseragamkan menjadi asterisk merah, dan seksi baru Keterangan (kolom Catatan) yang tersimpan ke data surat. Penomoran ulang seksi tidak dilakukan (susunan formulir yang ada dipertahankan).

### Tidak dikerjakan

- P12 (Pengaturan satu halaman) dilewati atas keputusan Hades; Pengaturan tetap memakai tab.

## [1.4.9] - 2026-11-12

### Diubah

- P9 minimal (keputusan Hades, bukan rombak beranda): pil status tiap baris Perlu Perhatian kini menyertakan tanggal batas waktu ("Terlambat · 10 Nov", "Belum · 14 Nov"); batas item Perlu Perhatian dari 6 menjadi 5. Layout beranda tidak berubah.

## [1.4.8] - 2026-11-12

### Diperbaiki

- Tombol aksi pada toast ("Lihat Sampah" sesudah hapus massal, "Batalkan" sesudah hapus tunggal) kini bisa diketuk. Sebelumnya `.ts` memakai `pointer-events: none` dan `.ts.show` tidak mengembalikannya, sehingga ketukan pada tombol toast menembus ke daftar di bawahnya.

## [1.4.7] - 2026-11-12

### Diperbaiki

- Hapus massal kini memberi umpan balik seketika: sesudah konfirmasi, tombol berubah menjadi "Menghapus..." yang nonaktif dan muncul toast "Menghapus N surat..." (sebelumnya 25 hapus berurutan tanpa indikator apa pun selama belasan detik, sehingga tampak seperti tidak terjadi apa-apa padahal surat sudah pindah ke Tempat Sampah). Penghapusan kini berjalan paralel berkelompok 5 sehingga jauh lebih cepat, ketuk ganda tidak bisa memulai penghapusan kedua, dan hasilnya tampil sebagai toast aksi "Lihat Sampah" selama 9 detik yang membuka menu Tempat Sampah.
- Chip saringan tetap tampil bila filter menghasilkan 0 surat (sebelumnya halaman kosong tanpa chip, sehingga filter aktif tidak bisa dibatalkan dari chip).

## [1.4.6] - 2026-11-12

### Diubah

- Saringan daftar surat dikelompokkan (P4 dari audit Terra, mengikuti mockup saringan yang disetujui): baris utama kini hanya berisi hitungan, pencarian, dan tombol Filter; saringan lanjutan (bulan, sifat/klasifikasi, status, "Berkas belum diunggah", "Atur Ulang") pindah ke panel yang dibuka lewat tombol Filter dan bisa digeser horisontal di HP. Tombol Filter berubah hijau dengan lencana jumlah filter aktif bila ada filter yang dipakai; chip tetap hanya muncul sesudah filter dipakai dan masing-masing bisa dihapus.
- Pemilih bulan di saringan daftar dan di Buku Agenda diganti dari kolom `type="month"` (yang tampil sebagai garis putus-putus "----------" saat kosong) menjadi dua pilihan yang selalu terbaca: nama bulan (Januari sampai Desember) dan tahun (dua tahun sebelum sampai satu tahun sesudah tahun berjalan). Memilih bulan tanpa tahun memakai tahun berjalan; pilihan tahun nonaktif sampai bulan dipilih; di Buku Agenda pemilih bulan nonaktif bila mode bukan "Per Bulan Ini".
- Tombol batal pada chip saringan diganti modern: chip kini pil hijau tint dengan tombol bulat 18px berisi ikon X SVG (sebelumnya chip tidak punya gaya sama sekali dan tombolnya kotak default browser berisi karakter "×").

## [1.4.5] - 2026-11-12

### Diubah

- Fondasi komponen bersama (P3, P5, P6, P8, P13 dari audit Terra, dibangun berdasarkan mockup fondasi Terra yang disetujui Hades): tombol distandarkan menjadi tinggi 36px, radius 5px, tebal (primer hijau, sekunder putih bergaris, tautan teks biru #2A6DA6 untuk Atur Ulang dan Detail, merah hanya destruktif, nonaktif memakai latar tint dan kursor tidak-diizinkan, focus outline biru 2px); radius pil 999px dari revisi EMISGTK diganti 5px mengikuti mockup yang disetujui, warna primer tetap hijau-teal.
- Tabel: kepala tanpa huruf kapital dan tanpa spasi huruf, padding 11px 12px; sel 13px 12px; baris berubah warna saat disorot (#E4F2EE, bukan zebra); centang 16px aksen primer; petunjuk "Geser ke kanan untuk kolom lainnya" tampil di HP sesudah tabel daftar utama (Surat Masuk/Keluar, Data Guru, Tempat Sampah, Audit, Disposisi, Surat Terbaru Beranda).
- Lencana: Selesai dan Terkirim memakai tint hijau #E6F4EC dengan teks #047857; Belum memakai tint amber #FDF3E0 dengan teks #B7791F; Terlambat dan "Berkas belum diunggah" menjadi pil outline merah (latar putih, border merah); Sifat surat tidak lagi memakai pil warna, tampil sebagai teks tenang abu-hijau; "Diproses" tetap biru.
- Modal konfirmasi bahaya memakai struktur Terra (tanda seru dalam lingkaran merah, judul tindakan, teks data terdampak, footer aksi berlatar tint dengan Batal dan tombol merah); toast pindah ke kanan atas di desktop dan bawah di HP, berlatar putih dengan garis kiri berwarna (hijau sukses, merah gagal).
- Toolbar daftar kini memuat hitungan data ("50 surat", "N guru", "N catatan") dan lebih rapat; daftar surat mendapat aksi massal: centang per baris dan pilih semua, tombol "Hapus (N)" aktif hanya bila ada yang dipilih, konfirmasi lalu memindahkan surat terpilih ke Tempat Sampah satu per satu (tanpa endpoint backend baru, memakai DELETE yang sudah ada). Toolbar Sampah tidak ditambah (hitungannya sudah di baris halaman) dan Disposisi tetap tanpa toolbar.

## [1.4.4] - 2026-11-12

### Diubah

- Variasi hirarki warna dengan basis EMISGTK tetap dipertahankan (disetujui Hades lewat mockup, menggantikan usulan Terra P1/P2 yang ditolak): permukaan tint (baris saringan, kepala tabel, sel ringkasan, zona unggah) menjadi #EAF3ED, garis dan border menjadi #CFDED4, teks utama #0F241B dan teks sekunder #4E6359 (sedikit lebih dalam, tetap hijau tua). Teks pudar, primer, emas token, merah semantik, dan gradasi bilah sisi teal-biru tidak berubah.
- Angka terlambat di kartu Disposisi Beranda kini berwarna emas #C9A227 (kelas .gold2, hanya bila ada yang terlambat), dan kepala kartu "Perlu Perhatian" kini memakai tautan teks biru "Lihat semua" #2A6DA6 (diambil dari gradasi bilah sisi, kelas .lk2) yang membuka menu Disposisi; tombol "Lihat Semua Disposisi" di bawah kartu dihapus mengikuti mockup yang disetujui. Lencana merah "N terlambat" di kepala kartu tetap seperti semula.

## [1.4.3] - 2026-11-12

### Diubah

- Bilah sisi dipadatkan supaya muat satu layar laptop: tombol menu 44px menjadi 38px tanpa sela antar tombol, label kelompok lebih rapat, kepala merek dan kartu pengguna lebih kecil, padding bilah sisi dikurangi. Isi bilah sisi admin kini sekitar 606px (dari sekitar 756px) sehingga seluruh menu termasuk Audit dan nomor versi terlihat tanpa menggulir bilah sisi pada viewport 660px ke atas.

## [1.4.2] - 2026-11-06

### Diubah

- Kartu statistik Beranda didesain ulang (arah Opsi 1 dari diskusi Terra, pewarnaan Skema Segar Tailwind, dipilih Hades): kotak ikon pastel diganti ikon kecil polos di samping label ringkas ("Surat Masuk", "Surat Keluar", "Disposisi"), angka utama diperbesar, dan keterangan dipisah menjadi baris kecil "Bulan ini - total N".
- Notifikasi berkas belum diunggah di Beranda pindah ke dalam kartu statistik registernya sebagai baris status selebar kartu di dasar kartu (latar tint emerald untuk masuk, sky untuk keluar), masing-masing membuka daftar register tersebut dengan saringan "Berkas belum diunggah" aktif. Baris status hanya tampil bila hitungannya di atas nol.
- Dua kartu berkas per register yang ditambahkan pada 1.4.1 dihapus kembali atas penilaian ulang Hades di hari yang sama: Beranda cukup memuat notifikasinya di kartu yang sudah ada, tanpa kartu tambahan.

## [1.4.1] - 2026-11-06

### Diubah

- Beranda: kartu statistik gabungan "Surat Aktif Berkas Belum Diunggah" diganti dua kartu per register, "Surat Masuk - Berkas Belum Diunggah" dan "Surat Keluar - Berkas Belum Diunggah", masing-masing dengan hitungannya sendiri. Keduanya dapat diklik dan membuka daftar register tersebut dengan saringan "Berkas belum diunggah" aktif. Angka gabungan sebelumnya dinilai rancu karena tidak jelas berkas surat apa saja yang belum diunggah. Tiga kartu statistik lain kini sebaris sendiri di atas kedua kartu ini. (Opsi yang dipilih Hades; opsi kartu khusus berisi daftar surat terlama ditolak karena membuat Beranda ramai.)

## [1.4.0] - 2026-11-06

### Ditambahkan

- Menu akun pada avatar di kanan atas bilah atas: kepala berisi nama, username, dan peran; jalan pintas Ganti Password yang membuka tab kata sandi di Pengaturan; dan tombol Keluar. Menu menutup saat diklik di luar, ditekan Esc, atau sesudah memilih isinya.
- Lencana angka pada menu Disposisi di bilah sisi: jumlah disposisi yang belum selesai, berwarna kuning, dan berubah merah bila ada yang lewat batas waktu. Di HP, tombol hamburger juga mendapat titik merah penanda selama masih ada disposisi yang belum selesai. Angka diperbarui saat aplikasi dibuka, setiap berpindah menu, dan sesudah setiap perubahan data, melalui endpoint baru GET /api/lencana.

### Diubah

- Susunan menu bilah sisi dirapikan: kelompok DATA INDUK yang hanya berisi satu menu dihapus, Data Guru pindah ke kelompok ADMINISTRASI (Data Guru, Tempat Sampah, Pengaturan, Audit).
- Di desktop, kartu pengguna dan tombol Keluar di bawah bilah sisi disembunyikan karena fungsinya pindah ke menu akun avatar; di HP keduanya tetap tampil di dalam laci menu, mengingat komputer madrasah dipakai bersama dan petugas perlu melihat sedang masuk sebagai siapa.
- Teks versi aplikasi pindah dari kaki halaman konten ke dasar bilah sisi.

### Diperbaiki

- Mengganti tab di Pengaturan tidak lagi menggambar ulang seluruh halaman: layar tidak meloncat ke atas dan tab yang aktif selalu tergulir ke dalam pandangan pada bilah tab HP. Sebelumnya tab aktif yang letaknya di kanan (Klasifikasi, Umum, Password, Pengguna) terdorong keluar layar.

### Catatan

- Rancangan bilah navigasi bawah khusus HP dan kisi dua kolom untuk tab Pengaturan sempat dimockup, lalu ditolak Hades dan tidak diterapkan.

## [1.3.6] - 2026-11-06

### Ditambahkan

- Klasifikasi surat kini bisa diubah namanya dan dihapus dari Pengaturan. Pengubahan nama berlaku surut ke semua surat yang memakai klasifikasi tersebut; klasifikasi yang masih dipakai surat tidak bisa dihapus dan aplikasi menjelaskan jumlah pemakainya. Keduanya tercatat di Audit.
- Kotak "Ingat saya di perangkat ini (30 hari)" pada halaman masuk, kini tidak tercentang sebagai bawaan. Bila dicentang, sesi berlaku 30 hari; bila tidak, sesi berakhir saat peramban ditutup.

### Diubah

- Ringkasan di bawah Rekap Tahunan (disposisi belum selesai, terlambat, berkas belum diunggah, lokasi fisik, nomor agenda terakhir) kini tampil sebagai sel-sel terpisah berkotak, menggantikan satu baris teks panjang.

### Diperbaiki

- Halaman detail surat keluar tidak lagi menampilkan baris "Status Disposisi" yang kosong; sebagai gantinya tampil baris "Status: Terkirim", selaras dengan daftar surat keluar.

## [1.3.5] - 2026-11-05

### Dihapus

- Kartu "Buku Agenda PDF" (cetakan agenda gabungan masuk dan keluar) di menu Rekap Tahunan, atas keputusan Hades: sejak agenda resmi dipisah menjadi dua register, cetakan gabungan menimbulkan nomor agenda ganda dalam satu dokumen. Cetakan agenda per register tetap tersedia di menu Buku Agenda.

## [1.3.4] - 2026-11-05

### Diperbaiki

- Tombol Cetak PDF di Buku Agenda kini selalu mengikuti mode periode yang sedang tampil di layar (Per Bulan Ini, Triwulan Ini, Tahun Ini, Semua) dan tab register aktif. Sebelumnya, mengganti mode periode tidak memperbarui alamat cetak sehingga hasil cetak bisa kosong atau tidak sesuai tampilan.
- Cetakan agenda menerima parameter rentang bulan (dari/sampai) untuk mode Triwulan, dengan label periode "Bulan sampai Bulan Tahun".

## [1.3.3] - 2026-11-05

### Diubah

- Navigasi jauh lebih ringan: data hasil pengambilan (GET) kini diingat sementara di sisi aplikasi sehingga menu yang sudah pernah dibuka tampil seketika tanpa menunggu server; ingatan otomatis dibersihkan setiap ada penambahan, perubahan, atau penghapusan data. Pengambilan awal aplikasi dan mode Triwulan Buku Agenda kini berjalan sejajar, bukan berurutan.
- Animasi interaksi: efek tekan pada tombol, menu, dan tab; transisi masuk setiap halaman; kotak dialog muncul dengan animasi; dan kerangka berkilau (skeleton) saat memuat data menggantikan teks "Memuat data...".

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
