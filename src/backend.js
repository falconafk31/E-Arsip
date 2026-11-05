// ArsipSurat - Arsip Surat Masuk dan Keluar
// 1 Worker: halaman + API. Data di D1 (env.DB), file scan dan logo kop di R2 (env.FILES, privat).
const SESSION_COOKIE = "arsipsurat_session";
const MAX_FILE = 10 * 1024 * 1024;
const MAX_LOGO = 2 * 1024 * 1024;

// ---------- util ----------
function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...extra } });
}
function err(msg, status = 400) { return json({ error: msg }, status); }
function esc(s) { return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function csvCell(v) { const t = String(v ?? ""); return /[",\n;]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; }
function todayWIB() { return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10); }
const ZONA_OFF = { WIB: 7, WITA: 8, WIT: 9 };
function nowZona(st) { const z = (st && st.zona_waktu) || "WIB"; return { d: new Date(Date.now() + (ZONA_OFF[z] || 7) * 3600 * 1000), z }; }
function tglPanjang(st) { const o = nowZona(st); return o.d.getUTCDate() + " " + BULAN_NAMA[o.d.getUTCMonth()] + " " + o.d.getUTCFullYear(); }
function jamZona(st) { const o = nowZona(st); const p = (n) => String(n).padStart(2, "0"); return p(o.d.getUTCHours()) + "." + p(o.d.getUTCMinutes()) + " " + o.z; }
function barisKotaTgl(st) { const t = tglPanjang(st); return st && st.kota ? esc(st.kota) + ", " + t : t; }
const BLN_PDK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
function tglCtk(iso) { if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(String(iso))) return iso || "-"; const p = String(iso).slice(0, 10).split("-"); return parseInt(p[2], 10) + " " + BLN_PDK[parseInt(p[1], 10) - 1] + " " + p[0]; }
function kakiCetak(st) { return ""; }
function isRahasia(s) { return String(s?.sifat || "").toLowerCase() === "rahasia"; }
function canSeeRahasia(u) { return u && ["admin", "petugas", "pimpinan"].includes(u.role); }
function maskSurat(u, s) {
  if (s && isRahasia(s) && !canSeeRahasia(u)) return { ...s, perihal: "SURAT RAHASIA", ringkasan: "", nomor_surat: "SURAT RAHASIA" };
  return s;
}

// ---------- auth ----------
async function pbkdf2Hex(password, saltHex, iters) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map(b => parseInt(b, 16)));
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: iters, hash: "SHA-256" }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function makeHash(password) {
  const salt = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, "0")).join("");
  return `pbkdf2$100000$${salt}$${await pbkdf2Hex(password, salt, 100000)}`;
}
async function checkHash(password, stored) {
  try {
    const [, iters, salt, hash] = stored.split("$");
    const calc = await pbkdf2Hex(password, salt, parseInt(iters));
    return calc === hash;
  } catch { return false; }
}
function getCookie(req, name) {
  const c = req.headers.get("Cookie") || "";
  for (const part of c.split(";")) { const [k, ...v] = part.trim().split("="); if (k === name) return v.join("="); }
  return null;
}
async function currentUser(req, env) {
  const tok = getCookie(req, SESSION_COOKIE);
  if (!tok) return null;
  const row = await env.DB.prepare(
    "SELECT u.id, u.username, u.nama, u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>datetime('now') AND u.aktif=1"
  ).bind(tok).first();
  return row || null;
}
function needRole(user, roles) { return user && roles.includes(user.role); }
async function audit(env, userId, aksi, entitas, entitasId, detail) {
  try { await env.DB.prepare("INSERT INTO audit_log (user_id, aksi, entitas, entitas_id, detail) VALUES (?,?,?,?,?)").bind(userId, aksi, entitas, entitasId, detail || "").run(); } catch {}
}

// ---------- file ----------
function sniffMime(buf) {
  const b = new Uint8Array(buf.slice(0, 16));
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return "application/pdf";
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return null;
}
function cleanName(n) { return String(n || "file").replace(/[^\w.\-]+/g, "_").slice(0, 80); }

// ---------- settings / kop ----------
async function getSettings(env) {
  const { results } = await env.DB.prepare("SELECT key, value FROM settings").all();
  const o = {}; for (const r of results) o[r.key] = r.value;
  return o;
}
async function kopHtml(env) {
  const st = await getSettings(env);
  const garis = st.kop_gaya_garis === "single" ? "border-bottom:2px solid #111" : st.kop_gaya_garis === "none" ? "" : "border-bottom:4px double #111";
  const size = st.kop_ukuran_logo === "Kecil" ? 48 : st.kop_ukuran_logo === "Besar" ? 84 : 64;
  const logo = st.kop_logo_r2_key ? `<img src="/api/kop/logo" style="height:${size}px;width:auto">` : "";
  const line = (v, style) => v ? `<div style="${style}">${esc(v)}</div>` : "";
  return `<div style="display:flex;gap:16px;align-items:center">${logo}<div style="flex:1;text-align:center;font-family:Arial,Helvetica,sans-serif;line-height:1.4">
    ${line(st.kop_baris1, "font-weight:700;font-size:14pt;text-transform:uppercase")}
    ${line(st.kop_baris2, "font-weight:700;font-size:12pt;text-transform:uppercase")}
    ${line(st.kop_baris3, "font-weight:700;font-size:12pt;text-transform:uppercase")}
    ${line(st.kop_alamat, "font-size:9pt")}
    ${line(st.kop_kontak, "font-size:9pt")}
  </div></div><div style="${garis};margin-top:12px"></div>`;
}

// ---------- API: surat ----------
async function listSurat(req, env, user) {
  const u = new URL(req.url);
  const jenis = u.searchParams.get("jenis");
  const q = (u.searchParams.get("q") || "").trim();
  const bulan = u.searchParams.get("bulan"); // YYYY-MM
  const tahun = u.searchParams.get("tahun");
  const klasifikasi = u.searchParams.get("klasifikasi");
  const sifat = u.searchParams.get("sifat");
  const status = u.searchParams.get("status");
  const sampah = u.searchParams.get("sampah") === "1";
  const page = Math.max(1, parseInt(u.searchParams.get("page") || "1"));
  const per = 25;
  const SORT_SURAT = { tanggal: "s.tanggal_agenda", agenda: "s.nomor_agenda", nomor: "s.nomor_surat", perihal: "s.perihal", klasifikasi: "s.klasifikasi", sifat: "s.sifat", status: "s.status_disposisi", hapus: "s.terhapus_pada" };
  const sortCol = SORT_SURAT[u.searchParams.get("sort")] || "s.tanggal_agenda";
  const sortDir = u.searchParams.get("dir") === "desc" ? "DESC" : "ASC";
  let where = sampah ? "s.terhapus_pada IS NOT NULL" : "s.terhapus_pada IS NULL";
  const binds = [];
  if (jenis) { where += " AND s.jenis=?"; binds.push(jenis); }
  if (q) { where += " AND (s.nomor_surat LIKE ? OR s.nomor_agenda LIKE ? OR s.perihal LIKE ? OR s.ringkasan LIKE ? OR s.asal LIKE ? OR s.tujuan LIKE ?)"; const p = `%${q}%`; binds.push(p, p, p, p, p, p); }
  if (bulan) { where += " AND substr(s.tanggal_agenda,1,7)=?"; binds.push(bulan); }
  if (tahun) { where += " AND substr(s.tanggal_agenda,1,4)=?"; binds.push(tahun); }
  if (klasifikasi) { where += " AND s.klasifikasi=?"; binds.push(klasifikasi); }
  if (sifat) { where += " AND s.sifat=?"; binds.push(sifat); }
  if (status) { where += " AND COALESCE(s.status_disposisi,'Belum')=?"; binds.push(status); }
  if (u.searchParams.get("tanpa_scan") === "1" || u.searchParams.get("tanpa_berkas") === "1") { where += " AND NOT EXISTS (SELECT 1 FROM lampiran l WHERE l.surat_id=s.id AND l.jenis_berkas='berkas_surat')"; }
  const totalRow = await env.DB.prepare(`SELECT COUNT(*) c FROM surat s WHERE ${where}`).bind(...binds).first();
  const { results } = await env.DB.prepare(
    `SELECT s.*, (SELECT COUNT(*) FROM lampiran l WHERE l.surat_id=s.id AND l.jenis_berkas='berkas_surat') file_count, (SELECT COUNT(*) FROM lampiran l WHERE l.surat_id=s.id AND l.jenis_berkas='lampiran_pendukung') pendukung_count, (SELECT MIN(d.batas_waktu) FROM disposisi d WHERE d.surat_id=s.id AND d.status!='Selesai' AND d.batas_waktu IS NOT NULL) tenggat FROM surat s WHERE ${where} ORDER BY ${sortCol} ${sortDir}, s.id ${sortDir} LIMIT ? OFFSET ?`
  ).bind(...binds, per, (page - 1) * per).all();
  return json({ total: totalRow.c, page, per, items: results.map(r => maskSurat(user, r)) });
}

async function buatAgenda(env, jenis, tanggalAgenda) {
  const tahun = parseInt(String(tanggalAgenda).slice(0, 4)) || new Date().getFullYear();
  const row = await env.DB.prepare(
    "INSERT INTO nomor_counter (tahun, jenis, terakhir) VALUES (?, ?, 1) ON CONFLICT(tahun, jenis) DO UPDATE SET terakhir=terakhir+1 RETURNING terakhir"
  ).bind(tahun, jenis).first();
  return String(row.terakhir).padStart(3, "0");
}

async function createSurat(req, env, user) {
  if (!needRole(user, ["admin", "petugas"])) return err("Peran Anda tidak boleh menambah surat", 403);
  const b = await req.json();
  const jenis = b.jenis === "keluar" ? "keluar" : "masuk";
  if (!b.nomor_surat || !b.perihal || !b.tanggal_surat || !b.tanggal_agenda) return err("Nomor surat, perihal, tanggal surat, dan tanggal agenda wajib diisi");
  const pihak = jenis === "masuk" ? (b.asal || "") : (b.tujuan || "");
  const dup = await env.DB.prepare(
    "SELECT id, nomor_agenda FROM surat WHERE terhapus_pada IS NULL AND jenis=? AND nomor_surat=? AND COALESCE(asal,tujuan,'')=? LIMIT 1"
  ).bind(jenis, b.nomor_surat, pihak).first();
  let agenda = null;
  agenda = await buatAgenda(env, jenis, b.tanggal_agenda);
  let indukId = null, jenisPenugasan = null;
  if (jenis === "keluar") {
    if (b.induk_id) { const ind = await env.DB.prepare("SELECT id FROM surat WHERE id=? AND jenis='masuk'").bind(parseInt(b.induk_id)).first(); if (ind) indukId = ind.id; }
    if (["Surat Tugas", "SPPD"].includes(b.jenis_penugasan)) jenisPenugasan = b.jenis_penugasan;
  }
  const res = await env.DB.prepare(
    `INSERT INTO surat (jenis, nomor_agenda, nomor_surat, tanggal_surat, tanggal_agenda, asal, tujuan, perihal, ringkasan, klasifikasi, sifat, lokasi_fisik, penandatangan, keterangan, status_disposisi, dibuat_oleh, induk_id, jenis_penugasan)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    jenis, agenda, b.nomor_surat, b.tanggal_surat, b.tanggal_agenda,
    jenis === "masuk" ? (b.asal || null) : null,
    jenis === "keluar" ? (b.tujuan || null) : null,
    b.perihal, b.ringkasan || null, b.klasifikasi || null, b.sifat || "Biasa",
    b.lokasi_fisik || null, jenis === "keluar" ? (b.penandatangan || null) : null,
    b.keterangan || null, jenis === "masuk" ? "Belum" : null, user.id, indukId, jenisPenugasan
  ).run();
  const id = res.meta.last_row_id;
  if (jenis === "keluar" && Array.isArray(b.guru_ids)) await simpanGuruSurat(env, id, b.guru_ids);
  await audit(env, user.id, "buat", "surat", id, `${jenis} ${b.nomor_surat}`);
  return json({ id, nomor_agenda: agenda, peringatan_ganda: dup ? `Nomor dan pengirim/tujuan ini sudah tercatat pada surat ID ${dup.id}${dup.nomor_agenda ? " (" + dup.nomor_agenda + ")" : ""}. Surat tetap disimpan, periksa bila ini bukan surat berbeda.` : null });
}

async function updateSurat(req, env, user, id) {
  if (!needRole(user, ["admin", "petugas"])) return err("Peran Anda tidak boleh mengubah surat", 403);
  const old = await env.DB.prepare("SELECT * FROM surat WHERE id=? AND terhapus_pada IS NULL").bind(id).first();
  if (!old) return err("Surat tidak ditemukan", 404);
  const b = await req.json();
  await env.DB.prepare(
    `UPDATE surat SET nomor_surat=?, tanggal_surat=?, tanggal_agenda=?, asal=?, tujuan=?, perihal=?, ringkasan=?, klasifikasi=?, sifat=?, lokasi_fisik=?, penandatangan=?, keterangan=?, diubah_pada=datetime('now') WHERE id=?`
  ).bind(
    b.nomor_surat ?? old.nomor_surat, b.tanggal_surat ?? old.tanggal_surat, b.tanggal_agenda ?? old.tanggal_agenda,
    old.jenis === "masuk" ? (b.asal ?? old.asal) : old.asal,
    old.jenis === "keluar" ? (b.tujuan ?? old.tujuan) : old.tujuan,
    b.perihal ?? old.perihal, b.ringkasan ?? old.ringkasan, b.klasifikasi ?? old.klasifikasi, b.sifat ?? old.sifat,
    b.lokasi_fisik ?? old.lokasi_fisik, b.penandatangan ?? old.penandatangan, b.keterangan ?? old.keterangan, id
  ).run();
  if (old.jenis === "keluar") {
    if ("induk_id" in b) {
      let indBaru = null;
      if (b.induk_id) { const ind = await env.DB.prepare("SELECT id FROM surat WHERE id=? AND jenis='masuk'").bind(parseInt(b.induk_id)).first(); if (ind) indBaru = ind.id; }
      await env.DB.prepare("UPDATE surat SET induk_id=? WHERE id=?").bind(indBaru, id).run();
    }
    if ("jenis_penugasan" in b) await env.DB.prepare("UPDATE surat SET jenis_penugasan=? WHERE id=?").bind(["Surat Tugas", "SPPD"].includes(b.jenis_penugasan) ? b.jenis_penugasan : null, id).run();
    if (Array.isArray(b.guru_ids)) await simpanGuruSurat(env, id, b.guru_ids);
  }
  await audit(env, user.id, "ubah", "surat", id, old.nomor_surat);
  return json({ ok: true });
}

async function detailSurat(env, user, id) {
  const s = await env.DB.prepare("SELECT * FROM surat WHERE id=?").bind(id).first();
  if (!s) return err("Surat tidak ditemukan", 404);
  const { results: lampiran } = await env.DB.prepare("SELECT id, nama_asli, mime, ukuran, diupload_pada, jenis_berkas, keterangan FROM lampiran WHERE surat_id=? ORDER BY id").bind(id).all();
  const { results: disposisi } = await env.DB.prepare("SELECT * FROM disposisi WHERE surat_id=? ORDER BY id DESC").bind(id).all();
  const { results: guruDitugaskan } = await env.DB.prepare("SELECT id, guru_id, nama, nip FROM surat_guru WHERE surat_id=? ORDER BY urutan, id").bind(id).all();
  let induk = null;
  if (s.induk_id) { const ind = await env.DB.prepare("SELECT id, nomor_surat, nomor_agenda, perihal, asal, tanggal_surat, sifat FROM surat WHERE id=?").bind(s.induk_id).first(); if (ind) induk = maskSurat(user, ind); }
  let turunan = [];
  if (s.jenis === "masuk") { const tr = await env.DB.prepare("SELECT id, nomor_surat, perihal, jenis_penugasan, tanggal_agenda, sifat FROM surat WHERE induk_id=? AND terhapus_pada IS NULL ORDER BY id").bind(id).all(); turunan = tr.results.map(r => maskSurat(user, r)); }
  const masked = maskSurat(user, s);
  return json({ surat: masked, lampiran: isRahasia(s) && !canSeeRahasia(user) ? [] : lampiran, disposisi, guru_ditugaskan: guruDitugaskan, induk, turunan });
}

// ---------- API: guru / staff ----------
const KATEGORI_GURU = ["Guru", "Staff"];
const STATUS_PEGAWAI = ["PNS", "PPPK", "Honorer"];
function normalGuru(b) {
  const kat = String(b.kategori || "").toLowerCase();
  const st = String(b.status_kepegawaian || "").toUpperCase();
  return {
    nama: String(b.nama || "").trim(),
    nip: String(b.nip || "").trim() || null,
    pangkat_golongan: String(b.pangkat_golongan || "").trim() || null,
    jabatan: String(b.jabatan || "").trim() || null,
    kategori: kat.includes("staf") || kat.includes("staff") ? "Staff" : "Guru",
    status_kepegawaian: st.includes("PPPK") ? "PPPK" : st.includes("PNS") ? "PNS" : st.includes("HONOR") ? "Honorer" : (String(b.status_kepegawaian || "").trim() || null),
  };
}
async function cekNipGuru(env, nip, kecualiId) {
  if (!nip) return null;
  const q = kecualiId ? "SELECT id, nama FROM guru WHERE nip=? AND id!=?" : "SELECT id, nama FROM guru WHERE nip=?";
  const binds = kecualiId ? [nip, kecualiId] : [nip];
  return env.DB.prepare(q).bind(...binds).first();
}
async function simpanGuruSurat(env, suratId, guruIds) {
  await env.DB.prepare("DELETE FROM surat_guru WHERE surat_id=?").bind(suratId).run();
  let urut = 0;
  for (const gid of guruIds) {
    const g = await env.DB.prepare("SELECT id, nama, nip FROM guru WHERE id=?").bind(parseInt(gid)).first();
    if (!g) continue;
    await env.DB.prepare("INSERT INTO surat_guru (surat_id, guru_id, nama, nip, urutan) VALUES (?,?,?,?,?)").bind(suratId, g.id, g.nama, g.nip, urut++).run();
  }
}

// --- xlsx minimal: tulis template (zip stored) + baca impor (stored/deflate) ---
const CRC_T = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
function crc32(bytes) { let c = -1; for (let i = 0; i < bytes.length; i++) c = (c >>> 8) ^ CRC_T[(c ^ bytes[i]) & 0xFF]; return (c ^ -1) >>> 0; }
function zipStore(files) {
  const enc = new TextEncoder(); const chunks = []; const central = []; let offset = 0;
  for (const [name, content] of files) {
    const data = typeof content === "string" ? enc.encode(content) : content;
    const nm = enc.encode(name); const crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, nm.length, true);
    chunks.push(new Uint8Array(lh.buffer), nm, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
    ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
    ch.setUint16(28, nm.length, true); ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), nm);
    offset += 30 + nm.length + data.length;
  }
  const cdSize = central.reduce((a, c) => a + c.length, 0);
  const eo = new DataView(new ArrayBuffer(22));
  eo.setUint32(0, 0x06054b50, true); eo.setUint16(8, files.length, true); eo.setUint16(10, files.length, true);
  eo.setUint32(12, cdSize, true); eo.setUint32(16, offset, true);
  chunks.push(...central, new Uint8Array(eo.buffer));
  const total = chunks.reduce((a, c) => a + c.length, 0); const out = new Uint8Array(total); let p = 0;
  for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}
function templateGuruXlsx() {
  const baris = (cells) => "<row>" + cells.map((c, i) => '<c r="' + "ABCDEFGH"[i] + '1" t="inlineStr"><is><t>' + esc(c) + "</t></is></c>").join("") + "</row>";
  const barisN = (cells, n) => "<row>" + cells.map((c, i) => '<c r="' + "ABCDEFGH"[i] + n + '" t="inlineStr"><is><t>' + esc(c) + "</t></is></c>").join("") + "</row>";
  const sheet1 = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
    + baris(["Nama", "NIP", "Pangkat/Golongan", "Jabatan", "Kategori", "Status Kepegawaian"]) + "</sheetData></worksheet>";
  const petunjuk = [
    "PETUNJUK PENGISIAN TEMPLATE DATA GURU / STAFF",
    "Isi data pada lembar Data Guru, mulai baris kedua. Jangan mengubah baris judul.",
    "Nama: wajib diisi.",
    "NIP: boleh kosong (misalnya guru honorer yang belum punya NIP). NIP yang sama tidak boleh dipakai dua orang.",
    "Pangkat/Golongan: contoh Penata III/c, Pembina IV/a. Boleh kosong untuk honorer.",
    "Jabatan: contoh Guru Kelas, Guru Pendidikan Agama Islam, Kepala Madrasah, Staff Tata Usaha.",
    "Kategori: isi Guru atau Staff.",
    "Status Kepegawaian: isi PNS, PPPK, atau Honorer.",
    "Contoh baris: Ahmad Hidayat | 198503152010011001 | Penata III/c | Guru Kelas | Guru | PNS",
    "Contoh baris: Siti Rahmawati | (kosong) | (kosong) | Staff Tata Usaha | Staff | Honorer",
  ];
  const sheet2 = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
    + petunjuk.map((t, i) => barisN([t], i + 1)).join("") + "</sheetData></worksheet>";
  const ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';
  const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  const wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Data Guru" sheetId="1" r:id="rId1"/><sheet name="Petunjuk" sheetId="2" r:id="rId2"/></sheets></workbook>';
  const wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>';
  return zipStore([["[Content_Types].xml", ct], ["_rels/.rels", rels], ["xl/workbook.xml", wb], ["xl/_rels/workbook.xml.rels", wbRels], ["xl/worksheets/sheet1.xml", sheet1], ["xl/worksheets/sheet2.xml", sheet2]]);
}
async function unzipEntries(buf) {
  const dv = new DataView(buf); const u8 = new Uint8Array(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 22 - 65536); i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
  if (eocd < 0) throw new Error("Berkas bukan xlsx yang valid");
  const total = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
  const out = new Map();
  for (let n = 0; n < total; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true); const compSize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), comLen = dv.getUint16(p + 32, true);
    const lho = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.slice(p + 46, p + 46 + nameLen));
    const lName = dv.getUint16(lho + 26, true), lExtra = dv.getUint16(lho + 28, true);
    const start = lho + 30 + lName + lExtra;
    const comp = u8.slice(start, start + compSize);
    if (method === 0) out.set(name, comp);
    else if (method === 8) {
      const stream = new Blob([comp]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      out.set(name, new Uint8Array(await new Response(stream).arrayBuffer()));
    }
    p += 46 + nameLen + extraLen + comLen;
  }
  return out;
}
function xmlText(t) { return String(t || "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&"); }
async function parseXlsxRows(buf) {
  const entries = await unzipEntries(buf);
  let shared = [];
  if (entries.has("xl/sharedStrings.xml")) {
    const sx = new TextDecoder().decode(entries.get("xl/sharedStrings.xml"));
    shared = [...sx.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => xmlText(x[1])).join(""));
  }
  let sheetKey = [...entries.keys()].find(k => k === "xl/worksheets/sheet1.xml") || [...entries.keys()].find(k => k.startsWith("xl/worksheets/") && k.endsWith(".xml"));
  if (!sheetKey) throw new Error("Lembar data tidak ditemukan di berkas xlsx");
  const xml = new TextDecoder().decode(entries.get(sheetKey));
  const rows = [];
  for (const rm of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const row = [];
    for (const cm of rm[1].matchAll(/<c\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1], isi = cm[2] || "";
      const refM = attrs.match(/r="([A-Z]+)\d+"/); const col = refM ? refM[1].split("").reduce((a, ch) => a * 26 + (ch.charCodeAt(0) - 64), 0) - 1 : row.length;
      const tM = attrs.match(/t="([^"]+)"/); const tipe = tM ? tM[1] : "";
      let val = "";
      if (tipe === "s") { const vm = isi.match(/<v>([\s\S]*?)<\/v>/); if (vm) val = shared[parseInt(vm[1])] || ""; }
      else if (tipe === "inlineStr") { val = [...isi.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(x => xmlText(x[1])).join(""); }
      else { const vm = isi.match(/<v>([\s\S]*?)<\/v>/); if (vm) val = xmlText(vm[1]); }
      row[col] = String(val).trim();
    }
    rows.push(row.map(x => x || ""));
  }
  return rows;
}
function parseCsvRows(text) {
  let bersih = String(text || "");
  if (bersih.charCodeAt(0) === 0xFEFF) bersih = bersih.slice(1);
  const barisPertama = bersih.split("\n")[0] || "";
  const delim = (barisPertama.match(/;/g) || []).length > (barisPertama.match(/,/g) || []).length ? ";" : ",";
  const rows = []; let cur = [""], inQ = false;
  const src = bersih.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQ) { if (ch === '"') { if (src[i + 1] === '"') { cur[cur.length - 1] += '"'; i++; } else inQ = false; } else cur[cur.length - 1] += ch; }
    else if (ch === '"') inQ = true;
    else if (ch === delim) cur.push("");
    else if (ch === "\n") { rows.push(cur); cur = [""]; }
    else cur[cur.length - 1] += ch;
  }
  if (cur.length > 1 || cur[0] !== "") rows.push(cur);
  return rows.map(r => r.map(x => String(x).trim()));
}
function barisKeGuru(rows) {
  const norm = (h) => String(h || "").toLowerCase().replace(/[^a-z]/g, "");
  let headIdx = -1, colMap = null;
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const hs = rows[i].map(norm);
    if (hs.includes("nama")) {
      colMap = {};
      hs.forEach((h, idx) => {
        if (h === "nama") colMap.nama = idx;
        else if (h === "nip") colMap.nip = idx;
        else if (h.startsWith("pangkat")) colMap.pangkat_golongan = idx;
        else if (h === "jabatan") colMap.jabatan = idx;
        else if (h === "kategori" || h === "jeniskepegawaian") colMap.kategori = idx;
        else if (h.startsWith("status")) colMap.status_kepegawaian = idx;
      });
      headIdx = i; break;
    }
  }
  if (!colMap) throw new Error("Baris judul tidak ditemukan. Gunakan template resmi (kolom pertama harus Nama).");
  const out = [];
  for (let i = headIdx + 1; i < rows.length; i++) {
    const r = rows[i]; const g = (k) => (colMap[k] !== undefined ? (r[colMap[k]] || "") : "");
    const raw = { nama: g("nama"), nip: g("nip"), pangkat_golongan: g("pangkat_golongan"), jabatan: g("jabatan"), kategori: g("kategori"), status_kepegawaian: g("status_kepegawaian") };
    if (!Object.values(raw).some(v => String(v).trim())) continue;
    out.push({ baris: i + 1, ...normalGuru(raw) });
  }
  return out;
}
async function validasiImporGuru(env, daftar) {
  const { results: ada } = await env.DB.prepare("SELECT nip, nama FROM guru WHERE nip IS NOT NULL AND TRIM(nip)!=''").all();
  const nipDb = new Map(ada.map(r => [String(r.nip).trim(), r.nama]));
  const nipFile = new Map();
  return daftar.map(d => {
    if (!d.nama) return { ...d, status: "gagal", pesan: "Nama kosong" };
    if (d.nip) {
      if (nipDb.has(d.nip)) return { ...d, status: "duplikat", pesan: "NIP sudah terdaftar atas nama " + nipDb.get(d.nip) };
      if (nipFile.has(d.nip)) return { ...d, status: "duplikat", pesan: "NIP sama dengan baris " + nipFile.get(d.nip) + " di berkas ini" };
      nipFile.set(d.nip, d.baris);
    }
    return { ...d, status: "siap", pesan: "" };
  });
}

// ---------- API: lampiran / R2 ----------
async function uploadLampiran(req, env, user, suratId) {
  if (!env.FILES) return err("Penyimpanan file R2 belum aktif di Worker ini. Upload data surat tetap bisa, file menyusul setelah R2 aktif.", 503);
  if (!needRole(user, ["admin", "petugas"])) return err("Peran Anda tidak boleh mengunggah file", 403);
  const s = await env.DB.prepare("SELECT * FROM surat WHERE id=? AND terhapus_pada IS NULL").bind(suratId).first();
  if (!s) return err("Surat tidak ditemukan", 404);
  const form = await req.formData();
  const file = form.get("file");
  if (!file || typeof file === "string") return err("File tidak ada");
  const jenisBerkas = String(form.get("jenis_berkas") || "") === "lampiran_pendukung" ? "lampiran_pendukung" : "berkas_surat";
  const keteranganFile = String(form.get("keterangan") || "").trim() || null;
  const cntB = await env.DB.prepare("SELECT COUNT(*) c FROM lampiran WHERE surat_id=? AND jenis_berkas='berkas_surat'").bind(suratId).first();
  const cntT = await env.DB.prepare("SELECT COUNT(*) c FROM lampiran WHERE surat_id=?").bind(suratId).first();
  if (jenisBerkas === "berkas_surat" && cntB.c >= 5) return err("Maksimal 5 Berkas Surat per surat");
  if (cntT.c >= 10) return err("Maksimal 10 berkas per surat");
  if (file.size > MAX_FILE) return err("Ukuran file lewat 10 MB");
  const buf = await file.arrayBuffer();
  const mime = sniffMime(buf);
  if (!mime) return err("Tipe file tidak didukung. Hanya PDF, JPG, PNG, WEBP dari isi file yang terbaca.");
  const ext = mime === "application/pdf" ? "pdf" : mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const d = String(s.tanggal_agenda || todayWIB());
  const key = `${s.jenis}/${d.slice(0, 4)}/${d.slice(5, 7)}/${crypto.randomUUID()}-${cleanName(file.name || "scan")}.${ext}`;
  await env.FILES.put(key, buf, { httpMetadata: { contentType: mime } });
  const res = await env.DB.prepare("INSERT INTO lampiran (surat_id, r2_key, nama_asli, mime, ukuran, diupload_oleh, jenis_berkas, keterangan) VALUES (?,?,?,?,?,?,?,?)")
    .bind(suratId, key, file.name || key, mime, file.size, user.id, jenisBerkas, keteranganFile).run();
  await env.DB.prepare("UPDATE surat SET jumlah_lampiran=(SELECT COUNT(*) FROM lampiran WHERE surat_id=?) WHERE id=?").bind(suratId, suratId).run();
  await audit(env, user.id, "unggah", "lampiran", res.meta.last_row_id, file.name);
  return json({ id: res.meta.last_row_id, nama_asli: file.name, mime, ukuran: file.size, jenis_berkas: jenisBerkas });
}

async function serveLampiran(env, user, id, download) {
  if (!env.FILES) return err("Penyimpanan file R2 belum aktif", 503);
  const l = await env.DB.prepare("SELECT l.*, s.sifat FROM lampiran l JOIN surat s ON s.id=l.surat_id WHERE l.id=?").bind(id).first();
  if (!l) return err("Lampiran tidak ditemukan", 404);
  if (isRahasia(l) && !canSeeRahasia(user)) return err("File surat rahasia tidak boleh dibuka peran Anda", 403);
  const obj = await env.FILES.get(l.r2_key);
  if (!obj) return err("File tidak ditemukan di R2", 404);
  await audit(env, user.id, download ? "unduh" : "lihat", "lampiran", id, l.nama_asli);
  return new Response(obj.body, { headers: {
    "Content-Type": l.mime,
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${cleanName(l.nama_asli)}"`,
    "Cache-Control": "private, no-store",
  }});
}

// ---------- API: disposisi ----------
async function syncStatusDisposisi(env, suratId) {
  const { results } = await env.DB.prepare("SELECT status FROM disposisi WHERE surat_id=?").bind(suratId).all();
  let status = "Belum";
  if (results.length) status = results.every(r => r.status === "Selesai") ? "Selesai" : "Diproses";
  await env.DB.prepare("UPDATE surat SET status_disposisi=? WHERE id=? AND jenis='masuk'").bind(status, suratId).run();
}

// ---------- API: rekap ----------
async function rekapData(env, tahun) {
  const perBulan = await env.DB.prepare(
    `SELECT substr(tanggal_agenda,6,2) bln,
       SUM(CASE WHEN jenis='masuk' THEN 1 ELSE 0 END) masuk,
       SUM(CASE WHEN jenis='keluar' THEN 1 ELSE 0 END) keluar, COUNT(*) total
     FROM surat WHERE terhapus_pada IS NULL AND substr(tanggal_agenda,1,4)=? GROUP BY bln ORDER BY bln`).bind(tahun).all();
  const perKlas = await env.DB.prepare(
    `SELECT COALESCE(klasifikasi,'Tanpa klasifikasi') nama,
       SUM(CASE WHEN jenis='masuk' THEN 1 ELSE 0 END) masuk,
       SUM(CASE WHEN jenis='keluar' THEN 1 ELSE 0 END) keluar, COUNT(*) total
     FROM surat WHERE terhapus_pada IS NULL AND substr(tanggal_agenda,1,4)=? GROUP BY nama ORDER BY total DESC`).bind(tahun).all();
  const perSifat = await env.DB.prepare(
    `SELECT sifat nama,
       SUM(CASE WHEN jenis='masuk' THEN 1 ELSE 0 END) masuk,
       SUM(CASE WHEN jenis='keluar' THEN 1 ELSE 0 END) keluar, COUNT(*) total
     FROM surat WHERE terhapus_pada IS NULL AND substr(tanggal_agenda,1,4)=? GROUP BY nama ORDER BY total DESC`).bind(tahun).all();
  const totals = await env.DB.prepare(
    `SELECT SUM(CASE WHEN jenis='masuk' THEN 1 ELSE 0 END) masuk, SUM(CASE WHEN jenis='keluar' THEN 1 ELSE 0 END) keluar, COUNT(*) total,
       SUM(CASE WHEN sifat='Rahasia' THEN 1 ELSE 0 END) rahasia,
       SUM(CASE WHEN jenis='masuk' AND COALESCE(status_disposisi,'Belum')!='Selesai' THEN 1 ELSE 0 END) disposisi_belum
     FROM surat WHERE terhapus_pada IS NULL AND substr(tanggal_agenda,1,4)=?`).bind(tahun).first();
  const tanpaScan = await env.DB.prepare(
    `SELECT COUNT(*) c FROM surat s WHERE s.terhapus_pada IS NULL AND substr(s.tanggal_agenda,1,4)=? AND NOT EXISTS (SELECT 1 FROM lampiran l WHERE l.surat_id=s.id AND l.jenis_berkas='berkas_surat')`).bind(tahun).first();
  const tanpaLokasi = await env.DB.prepare(
    `SELECT COUNT(*) c FROM surat WHERE terhapus_pada IS NULL AND substr(tanggal_agenda,1,4)=? AND (lokasi_fisik IS NULL OR lokasi_fisik='')`).bind(tahun).first();
  const disp = await env.DB.prepare(
    `SELECT d.status, COUNT(*) c FROM disposisi d JOIN surat s ON s.id=d.surat_id WHERE s.terhapus_pada IS NULL AND substr(s.tanggal_agenda,1,4)=? GROUP BY d.status`).bind(tahun).all();
  const terlambat = await env.DB.prepare(
    `SELECT COUNT(*) c FROM disposisi d JOIN surat s ON s.id=d.surat_id WHERE s.terhapus_pada IS NULL AND substr(s.tanggal_agenda,1,4)=? AND d.status!='Selesai' AND d.batas_waktu IS NOT NULL AND d.batas_waktu < ?`).bind(tahun, todayWIB()).first();
  const agT = await env.DB.prepare("SELECT jenis, terakhir FROM nomor_counter WHERE tahun=?").bind(parseInt(tahun, 10)).all(); const agendaTerakhir = { masuk: 0, keluar: 0 }; for (const r of agT.results) agendaTerakhir[r.jenis] = r.terakhir;
  return { tahun, totals, agenda_terakhir: agendaTerakhir, tanpa_scan: tanpaScan.c, tanpa_lokasi: tanpaLokasi.c, per_bulan: perBulan.results, per_klasifikasi: perKlas.results, per_sifat: perSifat.results, disposisi_status: disp.results, disposisi_terlambat: terlambat.c };
}
function rekapCsv(kind, data, rows) {
  if (kind === "ringkasan") {
    const out = ["tahun,jenis_ringkasan,kelompok,masuk,keluar,total"];
    out.push([data.tahun, "total_tahunan", "Semua surat", data.totals.masuk || 0, data.totals.keluar || 0, data.totals.total || 0].join(","));
    for (const r of data.per_bulan) out.push([data.tahun, "per_bulan", "Bulan " + r.bln, r.masuk, r.keluar, r.total].join(","));
    for (const r of data.per_klasifikasi) out.push([data.tahun, "per_klasifikasi", csvCell(r.nama), r.masuk, r.keluar, r.total].join(","));
    for (const r of data.per_sifat) out.push([data.tahun, "per_sifat", csvCell(r.nama), r.masuk, r.keluar, r.total].join(","));
    for (const r of data.disposisi_status) out.push([data.tahun, "status_disposisi", csvCell(r.status), r.c, "", r.c].join(","));
    out.push([data.tahun, "kelengkapan_arsip", "Berkas surat belum diunggah", "", "", data.tanpa_scan].join(","));
    out.push([data.tahun, "kelengkapan_arsip", "Lokasi fisik belum diisi", "", "", data.tanpa_lokasi].join(","));
    return out.join("\n");
  }
  if (kind === "masuk") {
    const head = "no,nomor_agenda,tanggal_diterima,tanggal_surat,nomor_surat,pengirim,perihal,ringkasan_isi,klasifikasi,sifat,kepada_disposisi,instruksi_disposisi,batas_waktu_disposisi,status_disposisi,ada_scan,lokasi_arsip_fisik,dibuat_pada";
    return [head, ...rows.map((r, i) => [i + 1, r.nomor_agenda, r.tanggal_agenda, r.tanggal_surat, r.nomor_surat, r.asal, r.perihal, r.ringkasan, r.klasifikasi, r.sifat, r.kepada, r.instruksi, r.bw, r.sts || r.status_disposisi, r.ada_scan, r.lokasi_fisik, r.dibuat_pada].map(csvCell).join(","))].join("\n");
  }
  const head = "no,tanggal_surat,nomor_surat,tujuan,perihal,ringkasan_isi,klasifikasi,sifat,penandatangan,ada_scan,lokasi_arsip_fisik,dibuat_pada";
  return [head, ...rows.map((r, i) => [i + 1, r.tanggal_surat, r.nomor_surat, r.tujuan, r.perihal, r.ringkasan, r.klasifikasi, r.sifat, r.penandatangan, r.ada_scan, r.lokasi_fisik, r.dibuat_pada].map(csvCell).join(","))].join("\n");
}

function printShell(title, kop, body, kaki) {
  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>${esc(title)}</title>
<style>body{font-family:Arial,Helvetica,sans-serif;color:#111;max-width:900px;margin:24px auto;padding:0 20px}table{width:100%;border-collapse:collapse;font-size:12px;font-family:Arial,sans-serif;margin-top:14px}th,td{border:1px solid #666;padding:6px 7px;text-align:left;vertical-align:top}th{background:#eee}h1{font-size:17px;text-align:center;margin:18px 0 2px}.sub{text-align:center;font-size:12px;color:#444}.ttd{display:flex;justify-content:space-between;margin-top:36px;font-family:Arial,sans-serif;font-size:12px}.ttd div{width:220px;text-align:center}.ttd .nm{margin-top:64px;font-weight:700;text-decoration:underline}.cetak-info{margin-top:30px;text-align:right;font-family:Arial,sans-serif;font-size:10px;color:#555}thead{display:table-header-group}tr{page-break-inside:avoid}table.agenda{table-layout:fixed;font-size:11px}table.agenda td{word-break:break-word}table.agenda th{vertical-align:middle;overflow:hidden;font-size:11px}@media print{body{margin:0}}</style></head>
<body>${kop}<h1>${esc(title)}</h1>${body}${kaki || ""}<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>`;
}
async function cetakAgenda(req, env, user) {
  const u = new URL(req.url);
  const bulan = u.searchParams.get("bulan"), tahun = u.searchParams.get("tahun"), jenis = u.searchParams.get("jenis");
  let where = "terhapus_pada IS NULL"; const binds = [];
  if (bulan) { where += " AND substr(tanggal_agenda,1,7)=?"; binds.push(bulan); }
  if (tahun) { where += " AND substr(tanggal_agenda,1,4)=?"; binds.push(tahun); }
  if (jenis) { where += " AND jenis=?"; binds.push(jenis); }
  const stA = await getSettings(env);
  const { results } = await env.DB.prepare(`SELECT * FROM surat WHERE ${where} ORDER BY tanggal_agenda, id`).bind(...binds).all();
  const periode = bulan ? `Periode ${BULAN_NAMA[parseInt(bulan.slice(5, 7), 10) - 1]} ${bulan.slice(0, 4)}` : tahun ? `Periode Tahun ${tahun}` : "Semua Periode";
  const judul = jenis === "masuk" ? "Buku Agenda Surat Masuk" : jenis === "keluar" ? "Buku Agenda Surat Keluar" : "Buku Agenda Surat";
  const rows = results.map((r, i) => { const m = maskSurat(user, r); if (jenis === "masuk") return `<tr><td>${esc(m.nomor_agenda || "-")}</td><td>${esc(tglCtk(r.tanggal_agenda))}</td><td>${esc(tglCtk(r.tanggal_surat))}</td><td>${esc(m.nomor_surat)}</td><td>${esc(r.asal || "-")}</td><td>${esc(m.perihal)}</td><td>${esc(r.klasifikasi || "-")}</td><td>${esc(r.sifat)}</td><td>${esc(r.status_disposisi || "-")}</td></tr>`; if (jenis === "keluar") return `<tr><td>${esc(m.nomor_agenda || "-")}</td><td>${esc(tglCtk(r.tanggal_surat))}</td><td>${esc(tglCtk(r.tanggal_agenda))}</td><td>${esc(m.nomor_surat)}</td><td>${esc(r.tujuan || "-")}</td><td>${esc(m.perihal)}</td><td>${esc(r.klasifikasi || "-")}</td><td>${esc(r.sifat)}</td><td>${esc(r.penandatangan || "-")}</td></tr>`; return `<tr><td>${i + 1}</td><td>${esc(tglCtk(r.tanggal_agenda))}</td><td>${r.jenis === "masuk" ? "Masuk" : "Keluar"}</td><td>${esc(m.nomor_agenda || "-")}</td><td>${esc(m.nomor_surat)}</td><td>${esc(r.asal || r.tujuan || "-")}</td><td>${esc(m.perihal)}</td></tr>`; }).join("");
  const body = `<style>@page{size:A4 landscape;margin:10mm}@media print{body{max-width:none;padding:0}}</style><div class="sub">${esc(judul.toUpperCase())} - ${esc(periode)} - dicetak oleh ${esc(user.nama)} pada ${esc(tglPanjang(stA))}</div>
  <table class="agenda"><colgroup>${jenis ? '<col style="width:6%"><col style="width:8.5%"><col style="width:8.5%"><col style="width:17%"><col style="width:18.5%"><col style="width:14.5%"><col style="width:10%"><col style="width:7%"><col style="width:10%">' : '<col style="width:4%"><col style="width:10%"><col style="width:8%"><col style="width:8%"><col style="width:26%"><col style="width:24%"><col style="width:20%">'}</colgroup><thead><tr>${jenis === "masuk" ? "<th>Nomor Agenda</th><th>Tanggal Diterima</th><th>Tanggal Surat</th><th>Nomor Surat</th><th>Asal Surat</th><th>Perihal</th><th>Klasifikasi</th><th>Sifat</th><th>Status Disposisi</th>" : jenis === "keluar" ? "<th>Nomor Agenda</th><th>Tanggal Surat</th><th>Tanggal Agenda</th><th>Nomor Surat</th><th>Tujuan Surat</th><th>Perihal</th><th>Klasifikasi</th><th>Sifat</th><th>Penanda Tangan</th>" : "<th>No</th><th>Tanggal</th><th>Jenis</th><th>Nomor Agenda</th><th>Nomor Surat</th><th>Asal / Tujuan</th><th>Perihal</th>"}</tr></thead><tbody>${rows || `<tr><td colspan="${jenis ? 9 : 7}">Tidak ada data</td></tr>`}</tbody></table>
  <div class="ttd"><div>Mengetahui,<br>Kepala Madrasah<div class="nm">${stA.nama_kepala ? esc(stA.nama_kepala) : "( nama pimpinan )"}</div>${stA.nip_kepala ? `<div style="font-size:11px">NIP. ${esc(stA.nip_kepala)}</div>` : ""}</div><div>${barisKotaTgl(stA)}<br>Petugas Tata Usaha<div class="nm">${esc(stA.nama_petugas || user.nama)}</div>${stA.nip_petugas ? `<div>NIP. ${esc(stA.nip_petugas)}</div>` : ""}</div></div>`;
  return new Response(printShell(judul, await kopHtml(env), body, kakiCetak(stA)), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
async function cetakRekap(req, env, user) {
  const u = new URL(req.url);
  const tahun = u.searchParams.get("tahun") || String(new Date().getFullYear());
  const d = await rekapData(env, tahun);
  const stK = await getSettings(env); d.kepala = { nama: stK.nama_kepala || "", nip: stK.nip_kepala || "" };
  const bulanRows = BULAN_NAMA.map((nm, i) => {
    const r = d.per_bulan.find(x => parseInt(x.bln) === i + 1);
    return `<tr><td>${nm}</td><td>${r ? r.masuk : 0}</td><td>${r ? r.keluar : 0}</td><td>${r ? r.total : 0}</td></tr>`;
  }).join("");
  const klasRows = d.per_klasifikasi.map(r => `<tr><td>${esc(r.nama)}</td><td>${r.masuk}</td><td>${r.keluar}</td><td>${r.total}</td></tr>`).join("");
  const sifatRows = d.per_sifat.map(r => `<tr><td>${esc(r.nama)}</td><td>${r.masuk}</td><td>${r.keluar}</td><td>${r.total}</td></tr>`).join("");
  const dispRows = d.disposisi_status.map(r => `<tr><td>${esc(r.status)}</td><td>${r.c}</td></tr>`).join("");
  const body = `<div class="sub">Periode 1 Januari ${esc(tahun)} sampai 31 Desember ${esc(tahun)} - dicetak oleh ${esc(user.nama)} pada ${esc(tglPanjang(stK))}</div>
  <table><tbody>
  <tr><td>Total surat masuk</td><td><b>${d.totals.masuk || 0}</b></td><td>Total surat keluar</td><td><b>${d.totals.keluar || 0}</b></td></tr>
  <tr><td>Total arsip aktif</td><td><b>${d.totals.total || 0}</b></td><td>Surat rahasia</td><td><b>${d.totals.rahasia || 0}</b></td></tr>
  <tr><td>Disposisi belum selesai</td><td><b>${d.totals.disposisi_belum || 0}</b></td><td>Disposisi terlambat</td><td><b>${d.disposisi_terlambat}</b></td></tr>
  <tr><td>Berkas belum diunggah</td><td><b>${d.tanpa_scan}</b></td><td>Lokasi fisik belum diisi</td><td><b>${d.tanpa_lokasi}</b></td></tr>
  </tbody></table>
  <h1 style="text-align:left;font-size:14px">Rekap Per Bulan</h1><table><thead><tr><th>Bulan</th><th>Masuk</th><th>Keluar</th><th>Total</th></tr></thead><tbody>${bulanRows}</tbody></table>
  <h1 style="text-align:left;font-size:14px">Rekap Per Klasifikasi</h1><table><thead><tr><th>Klasifikasi</th><th>Masuk</th><th>Keluar</th><th>Total</th></tr></thead><tbody>${klasRows}</tbody></table>
  <h1 style="text-align:left;font-size:14px">Rekap Per Sifat Surat</h1><table><thead><tr><th>Sifat</th><th>Masuk</th><th>Keluar</th><th>Total</th></tr></thead><tbody>${sifatRows}</tbody></table>
  <h1 style="text-align:left;font-size:14px">Ringkasan Disposisi</h1><table><thead><tr><th>Status</th><th>Jumlah</th></tr></thead><tbody>${dispRows || '<tr><td colspan="2">Tidak ada disposisi</td></tr>'}</tbody></table>
  <div class="ttd"><div>Mengetahui,<br>Kepala Madrasah<div class="nm">${d.kepala.nama ? esc(d.kepala.nama) : "( nama pimpinan )"}</div>${d.kepala.nip ? `<div style="font-size:11px">NIP. ${esc(d.kepala.nip)}</div>` : ""}</div><div>${barisKotaTgl(stK)}<br>Petugas Tata Usaha<div class="nm">${esc(stK.nama_petugas || user.nama)}</div>${stK.nip_petugas ? `<div>NIP. ${esc(stK.nip_petugas)}</div>` : ""}</div></div>`;
  return new Response(printShell(`Rekap Arsip Surat Tahun ${tahun}`, await kopHtml(env), body, kakiCetak(stK)), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
const BULAN_NAMA = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
async function cetakDisposisi(env, user, id) {
  const s = await env.DB.prepare("SELECT * FROM surat WHERE id=?").bind(id).first();
  if (!s) return err("Surat tidak ditemukan", 404);
  const { results: disp } = await env.DB.prepare("SELECT * FROM disposisi WHERE surat_id=? ORDER BY id").bind(id).all();
  const stD = await getSettings(env);
  const rows = disp.map(d => `<tr><td>${esc(d.kepada)}</td><td>${esc(d.instruksi)}</td><td>${esc(tglCtk(d.batas_waktu))}</td><td>${esc(d.status)}</td></tr>`).join("");
  const m = maskSurat(user, s);
  const body = `<div class="sub">LEMBAR DISPOSISI - dicetak oleh ${esc(user.nama)} pada ${esc(tglPanjang(stD))}</div>
  <table><tbody>
  <tr><td style="width:170px">Nomor Agenda</td><td>${esc(m.nomor_agenda || "-")}</td></tr>
  <tr><td>Nomor Surat</td><td>${esc(m.nomor_surat)}</td></tr>
  <tr><td>Tanggal Surat / Diterima</td><td>${esc(tglCtk(s.tanggal_surat))} / ${esc(tglCtk(s.tanggal_agenda))}</td></tr>
  <tr><td>Pengirim</td><td>${esc(s.asal || "-")}</td></tr>
  <tr><td>Perihal</td><td>${esc(m.perihal)}</td></tr>
  <tr><td>Sifat Surat</td><td>${esc(s.sifat)}</td></tr></tbody></table>
  <h1 style="text-align:left;font-size:14px">Disposisi</h1>
  <table><thead><tr><th>Kepada</th><th>Instruksi</th><th>Batas Waktu</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Belum ada disposisi</td></tr>'}</tbody></table>`;
  return new Response(printShell("Lembar Disposisi", await kopHtml(env), body, kakiCetak(stD)), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// ---------- ROUTER ----------
// ---------- FRONTEND (berkas terpisah: src/frontend.html, dirakit build.py) ----------
const FRONTEND_B64 = "__FRONTEND_B64__";
function serveFrontend() {
  const bytes = Uint8Array.from(atob(FRONTEND_B64), (c) => c.charCodeAt(0));
  return new Response(new TextDecoder().decode(bytes), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    const path = u.pathname;
    try {
      if (path === "/" || path === "/index.html") {
        return serveFrontend();
      }
      if (path === "/api/login" && req.method === "POST") {
        const b = await req.json();
        const usr = await env.DB.prepare("SELECT * FROM users WHERE username=? AND aktif=1").bind(String(b.username || "").trim()).first();
        if (!usr || !(await checkHash(String(b.password || ""), usr.password_hash))) return err("Username atau password salah", 401);
        const tok = crypto.randomUUID() + crypto.randomUUID();
        await env.DB.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now','+7 days'))").bind(tok, usr.id).run();
        await audit(env, usr.id, "login", "users", usr.id, "");
        return json({ ok: true, user: { id: usr.id, username: usr.username, nama: usr.nama, role: usr.role } }, 200, { "Set-Cookie": `${SESSION_COOKIE}=${tok}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800` });
      }
      // semua rute di bawah wajib login
      const user = await currentUser(req, env);
      if (!user) {
        if (path.startsWith("/api/")) return err("Belum login", 401);
        return serveFrontend();
      }
      if (path === "/api/logout" && req.method === "POST") {
        const tok = getCookie(req, SESSION_COOKIE);
        if (tok) await env.DB.prepare("DELETE FROM sessions WHERE token=?").bind(tok).run();
        return json({ ok: true }, 200, { "Set-Cookie": `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` });
      }
      if (path === "/api/me" && req.method === "GET") return json({ user, r2_aktif: !!env.FILES });
      if (path === "/api/me/password" && req.method === "PUT") {
        const b = await req.json();
        const usr = await env.DB.prepare("SELECT * FROM users WHERE id=?").bind(user.id).first();
        if (!usr || !(await checkHash(String(b.lama || ""), usr.password_hash))) return err("Kata sandi lama salah");
        if (!b.password || String(b.password).length < 8) return err("Password baru minimal 8 karakter");
        await env.DB.prepare("UPDATE users SET password_hash=? WHERE id=?").bind(await makeHash(String(b.password)), user.id).run();
        await audit(env, user.id, "ganti-password", "user", user.id, "");
        return json({ ok: true });
      }
      if (path === "/api/dashboard") {
        const ym = todayWIB().slice(0, 7);
        const t = async sql => (await env.DB.prepare(sql).first()).c;
        const perBulan = await env.DB.prepare("SELECT substr(tanggal_agenda,6,2) bln, COUNT(*) total FROM surat WHERE terhapus_pada IS NULL AND tanggal_agenda >= date('now','-5 months','start of month') GROUP BY substr(tanggal_agenda,1,7) ORDER BY substr(tanggal_agenda,1,7)").all();
        const terbaru = await env.DB.prepare("SELECT s.*, (SELECT COUNT(*) FROM lampiran l WHERE l.surat_id=s.id AND l.jenis_berkas='berkas_surat') file_count FROM surat s WHERE s.terhapus_pada IS NULL ORDER BY s.id DESC LIMIT 8").all();
        const perhatian = await env.DB.prepare("SELECT s.perihal, s.nomor_agenda, d.kepada, d.batas_waktu, d.status sts FROM disposisi d JOIN surat s ON s.id=d.surat_id WHERE s.terhapus_pada IS NULL AND d.status!='Selesai' ORDER BY (d.batas_waktu IS NULL), d.batas_waktu LIMIT 6").all();
        return json({
          masuk_bulan_ini: await t(`SELECT COUNT(*) c FROM surat WHERE terhapus_pada IS NULL AND jenis='masuk' AND substr(tanggal_agenda,1,7)='${ym}'`),
          keluar_bulan_ini: await t(`SELECT COUNT(*) c FROM surat WHERE terhapus_pada IS NULL AND jenis='keluar' AND substr(tanggal_agenda,1,7)='${ym}'`),
          total_masuk: await t("SELECT COUNT(*) c FROM surat WHERE terhapus_pada IS NULL AND jenis='masuk'"),
          total_keluar: await t("SELECT COUNT(*) c FROM surat WHERE terhapus_pada IS NULL AND jenis='keluar'"),
          disposisi_terbuka: await t("SELECT COUNT(*) c FROM disposisi d JOIN surat s ON s.id=d.surat_id WHERE s.terhapus_pada IS NULL AND d.status!='Selesai'"),
          disposisi_terlambat: await env.DB.prepare("SELECT COUNT(*) c FROM disposisi d JOIN surat s ON s.id=d.surat_id WHERE s.terhapus_pada IS NULL AND d.status!='Selesai' AND d.batas_waktu IS NOT NULL AND d.batas_waktu < ?").bind(todayWIB()).first().then(r => r.c),
          tanpa_scan: await t("SELECT COUNT(*) c FROM surat s WHERE s.terhapus_pada IS NULL AND NOT EXISTS (SELECT 1 FROM lampiran l WHERE l.surat_id=s.id AND l.jenis_berkas='berkas_surat')"),
          per_bulan: perBulan.results, terbaru: terbaru.results.map(r => maskSurat(user, r)), perhatian: perhatian.results,
        });
      }
      if (path === "/api/surat" && req.method === "GET") return listSurat(req, env, user);
      if (path === "/api/surat" && req.method === "POST") return createSurat(req, env, user);
      const mSurat = path.match(/^\/api\/surat\/(\d+)$/);
      if (mSurat && req.method === "GET") return detailSurat(env, user, parseInt(mSurat[1]));
      if (mSurat && req.method === "PUT") return updateSurat(req, env, user, parseInt(mSurat[1]));
      if (mSurat && req.method === "DELETE") {
        if (!needRole(user, ["admin", "petugas"])) return err("Peran Anda tidak boleh menghapus surat", 403);
        await env.DB.prepare("UPDATE surat SET terhapus_pada=datetime('now') WHERE id=?").bind(parseInt(mSurat[1])).run();
        await audit(env, user.id, "hapus-ke-sampah", "surat", parseInt(mSurat[1]), "");
        return json({ ok: true });
      }
      const mPulih = path.match(/^\/api\/surat\/(\d+)\/pulih$/);
      if (mPulih && req.method === "POST") {
        if (!isAdminRole(user)) return err("Hanya Admin yang bisa memulihkan", 403);
        await env.DB.prepare("UPDATE surat SET terhapus_pada=NULL WHERE id=?").bind(parseInt(mPulih[1])).run();
        return json({ ok: true });
      }
      const mPerm = path.match(/^\/api\/surat\/(\d+)\/permanen$/);
      if (mPerm && req.method === "DELETE") {
        if (!isAdminRole(user)) return err("Hanya Admin yang bisa menghapus permanen", 403);
        const id = parseInt(mPerm[1]);
        if (env.FILES) {
          const { results } = await env.DB.prepare("SELECT r2_key FROM lampiran WHERE surat_id=?").bind(id).all();
          for (const r of results) { try { await env.FILES.delete(r.r2_key); } catch {} }
        }
        await env.DB.prepare("DELETE FROM lampiran WHERE surat_id=?").bind(id).run();
        await env.DB.prepare("DELETE FROM disposisi WHERE surat_id=?").bind(id).run();
        await env.DB.prepare("DELETE FROM surat_guru WHERE surat_id=?").bind(id).run();
        await env.DB.prepare("UPDATE surat SET induk_id=NULL WHERE induk_id=?").bind(id).run();
        await env.DB.prepare("DELETE FROM surat WHERE id=?").bind(id).run();
        await audit(env, user.id, "hapus-permanen", "surat", id, "");
        return json({ ok: true });
      }
      const mLamp = path.match(/^\/api\/surat\/(\d+)\/lampiran$/);
      if (mLamp && req.method === "POST") return uploadLampiran(req, env, user, parseInt(mLamp[1]));
      const mLampId = path.match(/^\/api\/lampiran\/(\d+)\/file$/);
      if (mLampId && req.method === "GET") return serveLampiran(env, user, parseInt(mLampId[1]), u.searchParams.get("dl") === "1");
      const mLampDel = path.match(/^\/api\/lampiran\/(\d+)$/);
      if (mLampDel && req.method === "DELETE") {
        if (!needRole(user, ["admin", "petugas"])) return err("Peran Anda tidak boleh menghapus lampiran", 403);
        const l = await env.DB.prepare("SELECT * FROM lampiran WHERE id=?").bind(parseInt(mLampDel[1])).first();
        if (l) {
          if (env.FILES) { try { await env.FILES.delete(l.r2_key); } catch {} }
          await env.DB.prepare("DELETE FROM lampiran WHERE id=?").bind(l.id).run();
          await env.DB.prepare("UPDATE surat SET jumlah_lampiran=(SELECT COUNT(*) FROM lampiran WHERE surat_id=?) WHERE id=?").bind(l.surat_id, l.surat_id).run();
          await audit(env, user.id, "hapus", "lampiran", l.id, l.nama_asli);
        }
        return json({ ok: true });
      }
      const mDisp = path.match(/^\/api\/surat\/(\d+)\/disposisi$/);
      if (mDisp && req.method === "POST") {
        if (!needRole(user, ["admin", "petugas", "pimpinan"])) return err("Peran Anda tidak boleh membuat disposisi", 403);
        const b = await req.json();
        if (!b.kepada || !b.instruksi) return err("Kepada dan instruksi wajib diisi");
        const sid = parseInt(mDisp[1]);
        const res = await env.DB.prepare("INSERT INTO disposisi (surat_id, dari_user_id, kepada, instruksi, batas_waktu, status) VALUES (?,?,?,?,?,'Baru')").bind(sid, user.id, b.kepada, b.instruksi, b.batas_waktu || null).run();
        await syncStatusDisposisi(env, sid);
        await audit(env, user.id, "disposisi-buat", "disposisi", res.meta.last_row_id, b.kepada);
        return json({ id: res.meta.last_row_id });
      }
      if (path === "/api/disposisi" && req.method === "GET") {
        const SORT_DP = { dibuat: "d.id", batas: "d.batas_waktu", kepada: "d.kepada", status: "d.status", perihal: "s.perihal" };
        const colDP = SORT_DP[u.searchParams.get("sort")] || "d.id";
        const dirDP = u.searchParams.get("dir") === "desc" ? "DESC" : "ASC";
        const { results } = await env.DB.prepare(`SELECT d.*, s.perihal, s.nomor_agenda, s.id surat_id FROM disposisi d JOIN surat s ON s.id=d.surat_id WHERE s.terhapus_pada IS NULL ORDER BY ${colDP} ${dirDP}, d.id ${dirDP} LIMIT 100`).all();
        return json({ items: results });
      }
      const mDispId = path.match(/^\/api\/disposisi\/(\d+)$/);
      if (mDispId && req.method === "PUT") {
        const b = await req.json();
        const d0 = await env.DB.prepare("SELECT * FROM disposisi WHERE id=?").bind(parseInt(mDispId[1])).first();
        if (!d0) return err("Disposisi tidak ditemukan", 404);
        const st = b.status || d0.status;
        await env.DB.prepare("UPDATE disposisi SET status=?, selesai_pada=? WHERE id=?").bind(st, st === "Selesai" ? new Date().toISOString() : d0.selesai_pada, d0.id).run();
        await syncStatusDisposisi(env, d0.surat_id);
        await audit(env, user.id, "disposisi-" + st.toLowerCase(), "disposisi", d0.id, "");
        return json({ ok: true });
      }
      if (path === "/api/agenda" && req.method === "GET") {
        const bulan = u.searchParams.get("bulan"), jenis = u.searchParams.get("jenis");
        let where = "terhapus_pada IS NULL"; const binds = [];
        if (bulan) { where += " AND substr(tanggal_agenda,1,7)=?"; binds.push(bulan); }
        if (jenis) { where += " AND jenis=?"; binds.push(jenis); }
        const SORT_AG = { tanggal: "tanggal_agenda", agenda: "nomor_agenda", nomor: "nomor_surat", perihal: "perihal", jenis: "jenis", klasifikasi: "klasifikasi", sifat: "sifat", status: "status_disposisi" };
        const colAG = SORT_AG[u.searchParams.get("sort")] || "tanggal_agenda";
        const dirAG = u.searchParams.get("dir") === "desc" ? "DESC" : "ASC";
        const { results } = await env.DB.prepare(`SELECT * FROM surat WHERE ${where} ORDER BY ${colAG} ${dirAG}, id ${dirAG} LIMIT 500`).bind(...binds).all();
        return json({ items: results.map(r => maskSurat(user, r)) });
      }
      if (path === "/api/rekap" && req.method === "GET") {
        return json(await rekapData(env, u.searchParams.get("tahun") || String(new Date().getFullYear())));
      }
      const mCsv = path.match(/^\/api\/rekap\/csv\/(ringkasan|masuk|keluar)$/);
      if (mCsv && req.method === "GET") {
        const tahun = u.searchParams.get("tahun") || String(new Date().getFullYear());
        const kind = mCsv[1];
        let csv;
        if (kind === "ringkasan") csv = rekapCsv("ringkasan", await rekapData(env, tahun), null);
        else {
          const q = kind === "masuk"
            ? "SELECT s.*, d.kepada, d.instruksi, d.batas_waktu bw, d.status sts, EXISTS(SELECT 1 FROM lampiran l WHERE l.surat_id=s.id AND l.jenis_berkas='berkas_surat') ada_scan FROM surat s LEFT JOIN disposisi d ON d.id=(SELECT MAX(id) FROM disposisi WHERE surat_id=s.id) WHERE s.terhapus_pada IS NULL AND s.jenis='masuk' AND substr(s.tanggal_agenda,1,4)=? ORDER BY s.tanggal_agenda, s.id"
            : "SELECT s.*, EXISTS(SELECT 1 FROM lampiran l WHERE l.surat_id=s.id AND l.jenis_berkas='berkas_surat') ada_scan FROM surat s WHERE s.terhapus_pada IS NULL AND s.jenis='keluar' AND substr(s.tanggal_agenda,1,4)=? ORDER BY s.tanggal_agenda, s.id";
          const { results } = await env.DB.prepare(q).bind(tahun).all();
          const rows = results.map(r => { const m = maskSurat(user, r); return { ...r, perihal: m.perihal, ringkasan: m.ringkasan, nomor_surat: m.nomor_surat, ada_scan: r.ada_scan ? "ya" : "tidak" }; });
          csv = rekapCsv(kind, null, rows);
        }
        const fname = kind === "ringkasan" ? `rekap-tahunan-${tahun}-ringkasan.csv` : `buku-agenda-surat-${kind}-${tahun}.csv`;
        return new Response("\ufeff" + csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${fname}"` } });
      }
      if (path === "/api/guru" && req.method === "GET") {
        const q = (u.searchParams.get("q") || "").trim();
        const kat = u.searchParams.get("kategori") || "";
        let wG = "1=1"; const bG = [];
        if (q) { wG += " AND (nama LIKE ? OR COALESCE(nip,'') LIKE ? OR COALESCE(jabatan,'') LIKE ?)"; const pq = `%${q}%`; bG.push(pq, pq, pq); }
        if (kat) { wG += " AND kategori=?"; bG.push(kat); }
        if (u.searchParams.get("aktif") === "1") wG += " AND aktif=1";
        const { results } = await env.DB.prepare(`SELECT * FROM guru WHERE ${wG} ORDER BY kategori, nama LIMIT 500`).bind(...bG).all();
        return json({ items: results });
      }
      if (path === "/api/guru" && req.method === "POST") {
        if (!needRole(user, ["admin", "petugas"])) return err("Peran Anda tidak boleh menambah data guru", 403);
        const d = normalGuru(await req.json());
        if (!d.nama) return err("Nama wajib diisi");
        const dup = await cekNipGuru(env, d.nip, null);
        if (dup) return err("NIP sudah terdaftar atas nama " + dup.nama);
        const res = await env.DB.prepare("INSERT INTO guru (nama, nip, pangkat_golongan, jabatan, kategori, status_kepegawaian) VALUES (?,?,?,?,?,?)").bind(d.nama, d.nip, d.pangkat_golongan, d.jabatan, d.kategori, d.status_kepegawaian).run();
        await audit(env, user.id, "buat-guru", "guru", res.meta.last_row_id, d.nama);
        return json({ id: res.meta.last_row_id });
      }
      const mGuru = path.match(/^\/api\/guru\/(\d+)$/);
      if (mGuru && req.method === "PUT") {
        if (!needRole(user, ["admin", "petugas"])) return err("Peran Anda tidak boleh mengubah data guru", 403);
        const gid = parseInt(mGuru[1]);
        const lama = await env.DB.prepare("SELECT * FROM guru WHERE id=?").bind(gid).first();
        if (!lama) return err("Data guru tidak ditemukan", 404);
        const b = await req.json();
        const d = normalGuru({ ...lama, ...b });
        if (!d.nama) return err("Nama wajib diisi");
        const dup = await cekNipGuru(env, d.nip, gid);
        if (dup) return err("NIP sudah terdaftar atas nama " + dup.nama);
        const aktifBaru = b.aktif === undefined ? lama.aktif : (b.aktif ? 1 : 0);
        await env.DB.prepare("UPDATE guru SET nama=?, nip=?, pangkat_golongan=?, jabatan=?, kategori=?, status_kepegawaian=?, aktif=?, diubah_pada=datetime('now') WHERE id=?").bind(d.nama, d.nip, d.pangkat_golongan, d.jabatan, d.kategori, d.status_kepegawaian, aktifBaru, gid).run();
        await audit(env, user.id, "ubah-guru", "guru", gid, d.nama + (aktifBaru ? "" : " (nonaktif)"));
        return json({ ok: true });
      }
      if (path === "/api/guru/template" && req.method === "GET") {
        return new Response(templateGuruXlsx(), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="template-data-guru.xlsx"' } });
      }
      if (path === "/api/guru/impor" && req.method === "POST") {
        if (!needRole(user, ["admin", "petugas"])) return err("Peran Anda tidak boleh mengimpor data guru", 403);
        const form = await req.formData(); const file = form.get("file");
        if (!file || typeof file === "string") return err("Berkas tidak ada");
        if (file.size > 5 * 1024 * 1024) return err("Berkas impor maksimal 5 MB");
        const buf = await file.arrayBuffer();
        const namaFile = String(file.name || "").toLowerCase();
        let rows;
        if (namaFile.endsWith(".csv") || file.type === "text/csv") rows = parseCsvRows(new TextDecoder().decode(buf));
        else rows = await parseXlsxRows(buf);
        const daftar = barisKeGuru(rows);
        if (!daftar.length) return err("Tidak ada baris data yang terbaca. Pastikan data mulai baris kedua di bawah judul template.");
        if (daftar.length > 500) return err("Sekali impor maksimal 500 baris");
        return json({ items: await validasiImporGuru(env, daftar) });
      }
      if (path === "/api/guru/impor/simpan" && req.method === "POST") {
        if (!needRole(user, ["admin", "petugas"])) return err("Peran Anda tidak boleh mengimpor data guru", 403);
        const b = await req.json();
        if (!Array.isArray(b.rows) || !b.rows.length) return err("Tidak ada baris untuk disimpan");
        let masuk = 0, dilewati = 0;
        for (const r of b.rows) {
          const d = normalGuru(r);
          if (!d.nama) { dilewati++; continue; }
          if (await cekNipGuru(env, d.nip, null)) { dilewati++; continue; }
          await env.DB.prepare("INSERT INTO guru (nama, nip, pangkat_golongan, jabatan, kategori, status_kepegawaian) VALUES (?,?,?,?,?,?)").bind(d.nama, d.nip, d.pangkat_golongan, d.jabatan, d.kategori, d.status_kepegawaian).run();
          masuk++;
        }
        await audit(env, user.id, "impor-guru", "guru", null, masuk + " masuk, " + dilewati + " dilewati");
        return json({ masuk, dilewati });
      }
      const mLampPut = path.match(/^\/api\/lampiran\/(\d+)$/);
      if (mLampPut && req.method === "PUT") {
        if (!needRole(user, ["admin", "petugas"])) return err("Peran Anda tidak boleh mengubah berkas", 403);
        const b = await req.json();
        const jenisBaru = b.jenis_berkas === "lampiran_pendukung" ? "lampiran_pendukung" : b.jenis_berkas === "berkas_surat" ? "berkas_surat" : null;
        if (!jenisBaru) return err("Jenis berkas tidak dikenal");
        const l0 = await env.DB.prepare("SELECT * FROM lampiran WHERE id=?").bind(parseInt(mLampPut[1])).first();
        if (!l0) return err("Berkas tidak ditemukan", 404);
        if (jenisBaru === "berkas_surat") { const cb = await env.DB.prepare("SELECT COUNT(*) c FROM lampiran WHERE surat_id=? AND jenis_berkas='berkas_surat'").bind(l0.surat_id).first(); if (cb.c >= 5) return err("Berkas Surat sudah 5, batas maksimal"); }
        await env.DB.prepare("UPDATE lampiran SET jenis_berkas=? WHERE id=?").bind(jenisBaru, l0.id).run();
        await env.DB.prepare("UPDATE surat SET jumlah_lampiran=(SELECT COUNT(*) FROM lampiran WHERE surat_id=?) WHERE id=?").bind(l0.surat_id, l0.surat_id).run();
        await audit(env, user.id, "ubah", "lampiran", l0.id, l0.nama_asli + " -> " + jenisBaru);
        return json({ ok: true });
      }
      if (path === "/api/klasifikasi" && req.method === "GET") {
        const { results } = await env.DB.prepare("SELECT * FROM klasifikasi ORDER BY nama").all();
        return json({ items: results });
      }
      if (path === "/api/klasifikasi" && req.method === "POST") {
        if (!needRole(user, ["admin", "petugas"])) return err("Tidak boleh menambah klasifikasi", 403);
        const b = await req.json();
        if (!b.nama) return err("Nama klasifikasi wajib diisi");
        await env.DB.prepare("INSERT OR IGNORE INTO klasifikasi (kode, nama) VALUES (?,?)").bind(b.kode || null, b.nama).run();
        return json({ ok: true });
      }
      if (path === "/api/settings" && req.method === "GET") return json({ settings: await getSettings(env) });
      if (path === "/api/settings" && req.method === "PUT") {
        if (!isAdminRole(user)) return err("Hanya Admin yang bisa mengubah pengaturan dan kop surat", 403);
        const b = await req.json();
        const allowed = ["kop_baris1", "kop_baris2", "kop_baris3", "kop_alamat", "kop_kontak", "kop_gaya_garis", "kop_ukuran_logo", "format_agenda_masuk", "nama_instansi", "nama_kepala", "nip_kepala", "nama_petugas", "nip_petugas", "zona_waktu", "kota"];
        for (const k of allowed) { if (!(k in b)) continue; if (k === "zona_waktu" && !["WIB", "WITA", "WIT"].includes(b[k])) continue; await env.DB.prepare("INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(k, String(b[k] ?? "")).run(); }
        await audit(env, user.id, "ubah", "settings", null, "pengaturan/kop");
        return json({ ok: true });
      }
      if (path === "/api/kop/logo" && req.method === "GET") {
        const st = await getSettings(env);
        if (!st.kop_logo_r2_key || !env.FILES) return err("Logo belum diatur", 404);
        const obj = await env.FILES.get(st.kop_logo_r2_key);
        if (!obj) return err("Logo tidak ditemukan di R2", 404);
        return new Response(obj.body, { headers: { "Content-Type": obj.httpMetadata?.contentType || "image/png", "Cache-Control": "private, max-age=3600" } });
      }
      if (path === "/api/kop/logo" && req.method === "POST") {
        if (!isAdminRole(user)) return err("Hanya Admin yang bisa mengganti logo kop", 403);
        if (!env.FILES) return err("Penyimpanan file R2 belum aktif, logo belum bisa diunggah", 503);
        const form = await req.formData(); const file = form.get("file");
        if (!file || typeof file === "string") return err("File logo tidak ada");
        if (file.size > MAX_LOGO) return err("Logo maksimal 2 MB");
        const buf = await file.arrayBuffer(); const mime = sniffMime(buf);
        if (!mime || mime === "application/pdf") return err("Logo harus gambar PNG, JPG, atau WEBP");
        const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
        const st = await getSettings(env);
        const key = `kop/logo-${crypto.randomUUID()}.${ext}`;
        await env.FILES.put(key, buf, { httpMetadata: { contentType: mime } });
        if (st.kop_logo_r2_key) { try { await env.FILES.delete(st.kop_logo_r2_key); } catch {} }
        await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('kop_logo_r2_key',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(key).run();
        await audit(env, user.id, "unggah", "kop-logo", null, file.name);
        return json({ ok: true, key });
      }
      if (path === "/api/kop/logo" && req.method === "DELETE") {
        if (!isAdminRole(user)) return err("Hanya Admin yang bisa menghapus logo kop", 403);
        const st = await getSettings(env);
        if (st.kop_logo_r2_key && env.FILES) { try { await env.FILES.delete(st.kop_logo_r2_key); } catch {} }
        await env.DB.prepare("DELETE FROM settings WHERE key='kop_logo_r2_key'").run();
        return json({ ok: true });
      }
      if (path === "/api/users" && req.method === "GET") {
        if (!isAdminRole(user)) return err("Hanya Admin", 403);
        const { results } = await env.DB.prepare("SELECT id, username, nama, role, aktif, created_at FROM users ORDER BY id").all();
        return json({ items: results });
      }
      if (path === "/api/audit" && req.method === "GET") {
        if (!isAdminRole(user)) return err("Hanya Admin", 403);
        const qa = (u.searchParams.get("q") || "").trim();
        const aksiF = (u.searchParams.get("aksi") || "").trim();
        const pageA = Math.max(1, parseInt(u.searchParams.get("page") || "1"));
        const perA = 25;
        let wA = "1=1"; const bA = [];
        if (aksiF) { wA += " AND a.aksi=?"; bA.push(aksiF); }
        if (qa) { wA += " AND (a.aksi LIKE ? OR a.entitas LIKE ? OR a.detail LIKE ? OR us.nama LIKE ? OR us.username LIKE ?)"; const pq = `%${qa}%`; bA.push(pq, pq, pq, pq, pq); }
        const totA = await env.DB.prepare(`SELECT COUNT(*) c FROM audit_log a LEFT JOIN users us ON us.id=a.user_id WHERE ${wA}`).bind(...bA).first();
        const SORT_AU = { id: "a.id", waktu: "a.dibuat_pada", aksi: "a.aksi", entitas: "a.entitas", pengguna: "us.nama" };
        const colAU = SORT_AU[u.searchParams.get("sort")] || "a.id";
        const dirAU = u.searchParams.get("dir") === "desc" ? "DESC" : "ASC";
        const { results: itemsA } = await env.DB.prepare(`SELECT a.id, a.aksi, a.entitas, a.entitas_id, a.detail, a.dibuat_pada, us.nama user_nama, us.username FROM audit_log a LEFT JOIN users us ON us.id=a.user_id WHERE ${wA} ORDER BY ${colAU} ${dirAU}, a.id ${dirAU} LIMIT ? OFFSET ?`).bind(...bA, perA, (pageA - 1) * perA).all();
        const { results: aksiList } = await env.DB.prepare("SELECT DISTINCT aksi FROM audit_log ORDER BY aksi").all();
        return json({ total: totA.c, page: pageA, per: perA, items: itemsA, aksi_list: aksiList.map(r => r.aksi) });
      }
      if (path === "/api/users" && req.method === "POST") {
        if (!isAdminRole(user)) return err("Hanya Admin", 403);
        const b = await req.json();
        if (!b.username || !b.nama || !b.password || String(b.password).length < 8) return err("Username, nama, dan password minimal 8 karakter wajib diisi");
        const role = ["admin", "petugas", "pimpinan", "viewer"].includes(b.role) ? b.role : "petugas";
        try {
          const res = await env.DB.prepare("INSERT INTO users (username, password_hash, nama, role) VALUES (?,?,?,?)").bind(String(b.username).trim(), await makeHash(String(b.password)), b.nama, role).run();
          return json({ id: res.meta.last_row_id });
        } catch { return err("Username sudah dipakai"); }
      }
      const mUserId = path.match(/^\/api\/users\/(\d+)$/);
      if (mUserId && req.method === "PUT") {
        if (!isAdminRole(user)) return err("Hanya Admin", 403);
        const targetId = parseInt(mUserId[1]);
        const b = await req.json();
        const target = await env.DB.prepare("SELECT id, username, nama, role, aktif FROM users WHERE id=?").bind(targetId).first();
        if (!target) return err("Pengguna tidak ditemukan", 404);
        if (b.password !== undefined && b.password !== "") {
          if (String(b.password).length < 8) return err("Password baru minimal 8 karakter");
          await env.DB.prepare("UPDATE users SET password_hash=? WHERE id=?").bind(await makeHash(String(b.password)), targetId).run();
          await audit(env, user.id, "reset-password", "users", targetId, target.username);
          return json({ ok: true, reset: true });
        }
        const namaBaru = b.nama ? String(b.nama).trim() : target.nama;
        const roleBaru = ["admin", "petugas", "pimpinan", "viewer"].includes(b.role) ? b.role : target.role;
        const aktifBaru = b.aktif === undefined ? target.aktif : (b.aktif ? 1 : 0);
        if (targetId === user.id && !aktifBaru) return err("Akun sendiri tidak bisa dinonaktifkan");
        if (targetId === user.id && roleBaru !== "admin") return err("Peran akun sendiri tidak bisa diturunkan");
        await env.DB.prepare("UPDATE users SET nama=?, role=?, aktif=? WHERE id=?").bind(namaBaru, roleBaru, aktifBaru, targetId).run();
        await audit(env, user.id, "ubah-pengguna", "users", targetId, target.username + " aktif=" + aktifBaru + " peran=" + roleBaru);
        return json({ ok: true });
      }
      if (path === "/cetak/agenda") return cetakAgenda(req, env, user);
      if (path === "/cetak/rekap") return cetakRekap(req, env, user);
      const mCetakDisp = path.match(/^\/cetak\/disposisi\/(\d+)$/);
      if (mCetakDisp) return cetakDisposisi(env, user, parseInt(mCetakDisp[1]));
      return err("Rute tidak ditemukan", 404);
    } catch (e) {
      return err("Kesalahan server: " + (e && e.message ? e.message : String(e)), 500);
    }
  }
};
function isAdminRole(user) { return user && user.role === "admin"; }
