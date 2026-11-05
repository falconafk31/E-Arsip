-- Migrasi 0002: Data Guru/Staff, Berkas Surat vs Lampiran Pendukung, Penugasan.
-- Terapkan sesudah 0001 pada database yang sudah berjalan.

CREATE TABLE IF NOT EXISTS guru (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL,
  nip TEXT,
  pangkat_golongan TEXT,
  jabatan TEXT,
  kategori TEXT NOT NULL DEFAULT 'Guru',
  status_kepegawaian TEXT,
  aktif INTEGER NOT NULL DEFAULT 1,
  dibuat_pada TEXT NOT NULL DEFAULT (datetime('now')),
  diubah_pada TEXT
);
CREATE TABLE IF NOT EXISTS surat_guru (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  surat_id INTEGER NOT NULL REFERENCES surat(id),
  guru_id INTEGER REFERENCES guru(id),
  nama TEXT NOT NULL,
  nip TEXT,
  urutan INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_surat_guru_surat ON surat_guru(surat_id);
ALTER TABLE lampiran ADD COLUMN jenis_berkas TEXT NOT NULL DEFAULT 'berkas_surat';
ALTER TABLE lampiran ADD COLUMN keterangan TEXT;
ALTER TABLE surat ADD COLUMN induk_id INTEGER REFERENCES surat(id);
ALTER TABLE surat ADD COLUMN jenis_penugasan TEXT;
