"""Petit serveur de développement : python tools/serve.py [port]
Sert le dossier du projet avec les bons types MIME (modules JS, webp, manifest)."""
import http.server, os, sys, functools

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.html': 'text/html',
        '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
        '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json',
    }
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

if __name__ == '__main__':
    host = os.environ.get('HOST', '127.0.0.1')
    print(f'Lune & Ciel : http://{host}:{PORT}/', flush=True)
    http.server.ThreadingHTTPServer((host, PORT), functools.partial(Handler, directory=ROOT)).serve_forever()
