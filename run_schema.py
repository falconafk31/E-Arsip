#!/usr/bin/env python3
"""Terapkan database/schema.sql ke D1 dan buat akun admin awal bila belum ada.

Variabel lingkungan: CF_API_TOKEN, CF_ACCOUNT_ID, CF_D1_ID.
Password admin awal dari ADMIN_PW (bawaan: admin123) - GANTI segera sesudah login.
"""
import hashlib, json, os, sys, urllib.request, urllib.error

ACC = os.environ.get("CF_ACCOUNT_ID", "")
DB = os.environ.get("CF_D1_ID", "")
TOKEN = os.environ.get("CF_API_TOKEN", "")
BASE = "https://api.cloudflare.com/client/v4"


def query(sql, params=None):
    body = {"sql": sql}
    if params is not None:
        body["params"] = params
    req = urllib.request.Request(
        f"{BASE}/accounts/{ACC}/d1/database/{DB}/query",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + TOKEN},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raise RuntimeError("D1 HTTP error: " + e.read().decode()[:300])
    if not data.get("success"):
        raise RuntimeError(f"D1 error untuk: {sql[:60]} -> {data.get('errors')}")
    return data


def main():
    if not (ACC and DB and TOKEN):
        print("CF_API_TOKEN, CF_ACCOUNT_ID, dan CF_D1_ID wajib diisi.")
        return 1
    sql_text = open(os.path.join(os.path.dirname(__file__), "database", "schema.sql")).read()
    stmts = [x.strip() for x in sql_text.split(";") if x.strip()]
    for st in stmts:
        query(st)
    print(f"schema OK: {len(stmts)} statement")

    admin_pw = os.environ.get("ADMIN_PW", "admin123")
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", admin_pw.encode(), salt, 100000)
    pw_hash = f"pbkdf2$100000${salt.hex()}${dk.hex()}"
    res = query("SELECT id FROM users WHERE username='admin'")
    if res["result"][0]["results"]:
        print("admin sudah ada, seed dilewati")
    else:
        query("INSERT INTO users (username, password_hash, nama, role) VALUES ('admin', ?, 'Administrator', 'admin')", [pw_hash])
        print("admin dibuat - username: admin, password dari ADMIN_PW (bawaan admin123). GANTI segera.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
