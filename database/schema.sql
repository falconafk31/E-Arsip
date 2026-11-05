CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nama TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'petugas',
  aktif INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS klasifikasi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode TEXT UNIQUE,
  nama TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS surat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jenis TEXT NOT NULL,
  nomor_agenda TEXT, -- nomor urut register (001, 002, ...) per jenis dan tahun; keunikan dijaga indeks idx_surat_agenda_register
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
);
CREATE INDEX IF NOT EXISTS idx_surat_jenis_tanggal ON surat(jenis, tanggal_agenda);
CREATE INDEX IF NOT EXISTS idx_surat_terhapus ON surat(terhapus_pada);
CREATE UNIQUE INDEX IF NOT EXISTS idx_surat_agenda_register ON surat(jenis, substr(tanggal_agenda,1,4), nomor_agenda) WHERE nomor_agenda IS NOT NULL;
CREATE TABLE IF NOT EXISTS lampiran (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  surat_id INTEGER NOT NULL REFERENCES surat(id),
  r2_key TEXT UNIQUE NOT NULL,
  nama_asli TEXT NOT NULL,
  mime TEXT NOT NULL,
  ukuran INTEGER NOT NULL,
  diupload_oleh INTEGER REFERENCES users(id),
  diupload_pada TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS disposisi (
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
CREATE TABLE IF NOT EXISTS nomor_counter (
  tahun INTEGER NOT NULL,
  jenis TEXT NOT NULL,
  terakhir INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tahun, jenis)
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  aksi TEXT NOT NULL,
  entitas TEXT NOT NULL,
  entitas_id INTEGER,
  detail TEXT,
  dibuat_pada TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
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
INSERT OR IGNORE INTO klasifikasi (kode, nama) VALUES ('UM','Umum');
INSERT OR IGNORE INTO klasifikasi (kode, nama) VALUES ('KUR','Kurikulum');
INSERT OR IGNORE INTO klasifikasi (kode, nama) VALUES ('KPG','Kepegawaian');
INSERT OR IGNORE INTO klasifikasi (kode, nama) VALUES ('KEU','Keuangan');
INSERT OR IGNORE INTO klasifikasi (kode, nama) VALUES ('SAR','Sarana dan Prasarana');
INSERT OR IGNORE INTO settings (key, value) VALUES ('format_agenda_masuk','A-{TAHUN}-{URUT}');
