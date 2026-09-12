"""Servidor local con las mismas URLs limpias que Vercel (`cleanUrls: true`).

`python3 -m http.server` no sabe que /nosotros es nosotros.html ni que
/index.html debe ser /, así que en local se veían URLs que en producción
nunca aparecen. Este servidor imita a Vercel: resuelve /x → x.html, /x →
x/index.html, quita la barra final (`trailingSlash: false`) y redirige de
forma permanente cualquier .html a su URL limpia.
Solo para desarrollo; en producción manda vercel.json.
"""

import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Limpio(SimpleHTTPRequestHandler):
    def do_GET(self):
        ruta, _, query = self.path.partition("?")
        if ruta.endswith("/index.html") or ruta == "/index.html":
            return self._redirigir(ruta[: -len("index.html")] or "/", query)
        if ruta.endswith(".html"):
            return self._redirigir(ruta[: -len(".html")], query)
        if len(ruta) > 1 and ruta.endswith("/"):
            return self._redirigir(ruta.rstrip("/"), query)
        local = ruta.lstrip("/")
        if local and os.path.isfile(os.path.join(local, "index.html")):
            self.path = "/" + local + "/index.html" + ("?" + query if query else "")
        elif local and not os.path.exists(local):
            if os.path.isfile(local + ".html"):
                self.path = "/" + local + ".html" + ("?" + query if query else "")
        return super().do_GET()

    def _redirigir(self, destino, query):
        self.send_response(308)
        self.send_header("Location", destino + ("?" + query if query else ""))
        self.end_headers()


if __name__ == "__main__":
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 3002
    print(f"evetev.com en local → http://localhost:{puerto}")
    ThreadingHTTPServer(("", puerto), Limpio).serve_forever()
