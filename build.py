#!/usr/bin/env python3
"""Rakit worker.js dari sumber terpisah:
- src/backend.js  : logika server (API, D1, R2, cetak) dengan placeholder __FRONTEND_B64__
- src/frontend.html: tampilan (placeholder /*__APP_CSS__*/ dan <!--__SPRITE__-->)
- src/terra.css   : CSS desain Terra palet EMISGTK
- src/sprite.svg.txt: sprite ikon SVG
Frontend digabung sebagai base64 agar aman dari karakter template apa pun.
"""
import base64
import pathlib
import sys

BASE = pathlib.Path(__file__).parent
SRC = BASE / "src"


def main() -> None:
    frontend = (SRC / "frontend.html").read_text(encoding="utf-8")
    css = (SRC / "terra.css").read_text(encoding="utf-8")
    sprite = (SRC / "sprite.svg.txt").read_text(encoding="utf-8")
    assert "/*__APP_CSS__*/" in frontend and "<!--__SPRITE__-->" in frontend
    frontend = frontend.replace("/*__APP_CSS__*/", css).replace("<!--__SPRITE__-->", sprite)
    b64 = base64.b64encode(frontend.encode("utf-8")).decode("ascii")
    backend = (SRC / "backend.js").read_text(encoding="utf-8")
    assert "__FRONTEND_B64__" in backend
    worker = backend.replace("__FRONTEND_B64__", b64)
    (BASE / "worker.js").write_text(worker, encoding="utf-8")
    print(f"build OK: frontend {len(frontend)} byte -> worker.js {len(worker)} byte")


if __name__ == "__main__":
    sys.exit(main())
