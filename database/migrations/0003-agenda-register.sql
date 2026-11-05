-- Migrasi 0003 (rilis 1.3.0): melepas UNIQUE lama pada surat.nomor_agenda agar nomor urut
-- register bisa sama antar jenis (masuk 001 dan keluar 001), lalu menjaga keunikan per
-- register lewat indeks gabungan (jenis, tahun tanggal agenda, nomor agenda).
-- Tabel dibangun ulang karena batas UNIQUE menempel pada definisi kolom; tabel anak
-- (lampiran, disposisi, surat_guru) ikut dibangun ulang agar kunci asingnya menunjuk
-- tabel surat yang baru. Jalankan sebagai satu berkas utuh.

ALTER TABLE surat RENAME TO surat_lama;
DROP INDEX idx_surat_jenis_tanggal;
DROP INDEX idx_surat_terhapus;
CREATE TABLE surat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jenis TEXT NOT NULL,
  nomor_agenda TEXT,
  nomor_surat TEXT NOT NULL,
  tanggal_surat TEXT NOT NULL,
  tanggal_agenda TEXT NOT NULL,
  asal TEXT,
  tujuan TEXT,
  perihal TEXT NOT NULL,
  ringkasan TEXT,
  klasifikasi TEXT,
  sifat TEXT NOT NULL DEFAULT 'Biasa',
  jumlah_lampiran INTEGER DEFAULT 0,
  keterangan TEXT,
  lokasi_fisik TEXT,
  penandatangan TEXT,
  status_disposisi TEXT,
  dibuat_oleh INTEGER REFERENCES users(id),
  dibuat_pada TEXT NOT NULL DEFAULT (datetime('now')),
  diubah_pada TEXT,
  terhapus_pada TEXT
, induk_id INTEGER REFERENCES surat(id), jenis_penugasan TEXT);
INSERT INTO surat SELECT * FROM surat_lama;
CREATE INDEX idx_surat_jenis_tanggal ON surat(jenis, tanggal_agenda);
CREATE INDEX idx_surat_terhapus ON surat(terhapus_pada);
CREATE UNIQUE INDEX idx_surat_agenda_register ON surat(jenis, substr(tanggal_agenda,1,4), nomor_agenda) WHERE nomor_agenda IS NOT NULL;
ALTER TABLE lampiran RENAME TO lampiran_lama;
CREATE TABLE lampiran (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  surat_id INTEGER NOT NULL REFERENCES surat(id),
  r2_key TEXT UNIQUE NOT NULL,
  nama_asli TEXT NOT NULL,
  mime TEXT NOT NULL,
  ukuran INTEGER NOT NULL,
  diupload_oleh INTEGER REFERENCES users(id),
  diupload_pada TEXT NOT NULL DEFAULT (datetime('now'))
, jenis_berkas TEXT NOT NULL DEFAULT 'berkas_surat', keterangan TEXT);
INSERT INTO lampiran SELECT * FROM lampiran_lama;
DROP TABLE lampiran_lama;
ALTER TABLE disposisi RENAME TO disposisi_lama;
CREATE TABLE disposisi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  surat_id INTEGER NOT NULL REFERENCES surat(id),
  dari_user_id INTEGER REFERENCES users(id),
  kepada TEXT NOT NULL,
  instruksi TEXT NOT NULL,
  batas_waktu TEXT,
  status TEXT NOT NULL DEFAULT 'Baru',
  dibuat_pada TEXT NOT NULL DEFAULT (datetime('now')),
  selesai_pada TEXT
);
INSERT INTO disposisi SELECT * FROM disposisi_lama;
DROP TABLE disposisi_lama;
ALTER TABLE surat_guru RENAME TO surat_guru_lama;
DROP INDEX idx_surat_guru_surat;
CREATE TABLE surat_guru (
  id INTEGER PRIMARY KEY AUTOINCREMENT, surat_id INTEGER NOT NULL REFERENCES surat(id),
  guru_id INTEGER REFERENCES guru(id), nama TEXT NOT NULL, nip TEXT,
  urutan INTEGER NOT NULL DEFAULT 0);
INSERT INTO surat_guru SELECT * FROM surat_guru_lama;
CREATE INDEX idx_surat_guru_surat ON surat_guru(surat_id);
DROP TABLE surat_guru_lama;
DROP TABLE surat_lama;