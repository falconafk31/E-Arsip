#!/usr/bin/env python3
"""Deploy E-Arsip ke Cloudflare Workers lewat API.

Prasyarat: API token Cloudflare dengan izin Workers Scripts Edit, D1 Edit,
dan Workers R2 Storage Edit. Isi variabel lingkungan berikut:

  CF_API_TOKEN   token API Cloudflare
  CF_ACCOUNT_ID  ID akun Cloudflare
  CF_D1_ID       UUID database D1
  CF_R2_BUCKET   nama bucket R2 (bawaan: e-arsip-files)
  CF_SCRIPT_NAME nama Worker (bawaan: e-arsip)

Pemakaian: python3 deploy.py [--with-r2] [--no-r2]
Skrip ini menjalankan build.py lebih dulu, lalu mengunggah worker.js.
"""
import json, os, sys, urllib.request, urllib.error, uuid as uuidlib

ACC = os.environ.get("CF_ACCOUNT_ID", "")
DB = os.environ.get("CF_D1_ID", "")
TOKEN = os.environ.get("CF_API_TOKEN", "")
SCRIPT = os.environ.get("CF_SCRIPT_NAME", "e-arsip")
BUCKET = os.environ.get("CF_R2_BUCKET", "e-arsip-files")
BASE = "https://api.cloudflare.com/client/v4"


def api_req(method, url, data=None, ctype=None):
    headers = {"Authorization": "Bearer " + TOKEN}
    if ctype:
        headers["Content-Type"] = ctype
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        return json.loads(e.read().decode())


def deploy(with_r2: bool) -> bool:
    code = open(os.path.join(os.path.dirname(__file__), "worker.js"), "rb").read()
    bindings = [{"type": "d1", "name": "DB", "id": DB}]
    if with_r2:
        bindings.append({"type": "r2_bucket", "name": "FILES", "bucket_name": BUCKET})
    metadata = {"main_module": "worker.js", "bindings": bindings, "compatibility_date": "2024-11-01"}
    boundary = "----cfdeploy" + uuidlib.uuid4().hex
    parts = []
    parts.append(("--" + boundary + "\r\n").encode())
    parts.append(b'Content-Disposition: form-data; name="metadata"\r\nContent-Type: application/json\r\n\r\n')
    parts.append(json.dumps(metadata).encode() + b"\r\n")
    parts.append(("--" + boundary + "\r\n").encode())
    parts.append(b'Content-Disposition: form-data; name="worker.js"; filename="worker.js"\r\nContent-Type: application/javascript+module\r\n\r\n')
    parts.append(code + b"\r\n")
    parts.append(("--" + boundary + "--\r\n").encode())
    out = api_req("PUT", f"{BASE}/accounts/{ACC}/workers/scripts/{SCRIPT}",
                  data=b"".join(parts), ctype=f"multipart/form-data; boundary={boundary}")
    ok = out.get("success", False)
    print("deploy", "dengan R2" if with_r2 else "tanpa R2", "->", "OK" if ok else out.get("errors"))
    if ok:
        api_req("PUT", f"{BASE}/accounts/{ACC}/workers/scripts/{SCRIPT}/subdomain",
                data=json.dumps({"enabled": True, "previews_enabled": True}).encode(), ctype="application/json")
    return ok


def main():
    if not (ACC and DB and TOKEN):
        print("CF_API_TOKEN, CF_ACCOUNT_ID, dan CF_D1_ID wajib diisi. Lihat README bagian Instalasi.")
        return 1
    os.system(f"{sys.executable} " + os.path.join(os.path.dirname(__file__), "build.py"))
    with_r2 = "--no-r2" not in sys.argv
    if deploy(with_r2):
        print(f"selesai: https://{SCRIPT}.<subdomain-akun>.workers.dev")
        return 0
    if with_r2:
        print("gagal dengan R2, mencoba tanpa R2...")
        return 0 if deploy(False) else 1
    return 1


if __name__ == "__main__":
    sys.exit(main())
