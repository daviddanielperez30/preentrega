import json
import os
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

PORT = 3001
DB_PATH = os.path.join(os.path.dirname(__file__), 'db.json')

CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
}


def load_db():
    with open(DB_PATH, 'r', encoding='utf-8') as file:
        return json.load(file)


def save_db(data):
    with open(DB_PATH, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
        file.write('\n')


def next_id(products):
    return max((product['id'] for product in products), default=0) + 1


def find_product(products, product_id):
    for index, product in enumerate(products):
        if str(product['id']) == str(product_id):
            return index, product
    return -1, None


class ApiHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status_code)

        for key, value in CORS_HEADERS.items():
            self.send_header(key, value)

        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()

        if self.command != 'HEAD':
            self.wfile.write(body)

    def _send_empty(self, status_code):
        self.send_response(status_code)

        for key, value in CORS_HEADERS.items():
            self.send_header(key, value)

        self.send_header('Content-Length', '0')
        self.end_headers()

    def _read_json(self):
        length = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(length) if length else b'{}'
        return json.loads(body.decode('utf-8') or '{}')

    def _handle_products_collection(self):
        db = load_db()

        if self.command == 'GET':
            self._send_json(200, db)
            return

        if self.command == 'POST':
            body = self._read_json()
            product = {
                'id': next_id(db['products']),
                'name': body.get('name', 'Producto sin nombre'),
                'price': float(body.get('price', 0)),
                'category': body.get('category', 'General'),
                'description': body.get('description', ''),
                'image': body.get('image', ''),
                'shortName': body.get('shortName', 'NEW')
            }
            db['products'].append(product)
            save_db(db)
            self._send_json(201, product)
            return

        self._send_json(405, {'error': 'Método no permitido'})

    def _handle_product_detail(self, product_id):
        db = load_db()
        index, product = find_product(db['products'], product_id)

        if index == -1:
            self._send_json(404, {'error': 'Producto no encontrado'})
            return

        if self.command == 'GET':
            self._send_json(200, product)
            return

        if self.command in ('PUT', 'PATCH'):
            body = self._read_json()
            updated_product = {**product, **body, 'id': int(product_id)}
            db['products'][index] = updated_product
            save_db(db)
            self._send_json(200, updated_product)
            return

        if self.command == 'DELETE':
            deleted_product = db['products'].pop(index)
            save_db(db)
            self._send_json(200, deleted_product)
            return

        self._send_json(405, {'error': 'Método no permitido'})

    def do_OPTIONS(self):
        self._send_empty(204)

    def do_GET(self):
        self._handle_request()

    def do_POST(self):
        self._handle_request()

    def do_PUT(self):
        self._handle_request()

    def do_PATCH(self):
        self._handle_request()

    def do_DELETE(self):
        self._handle_request()

    def _handle_request(self):
        path = unquote(urlparse(self.path).path)

        if path == '/products':
            self._handle_products_collection()
            return

        product_match = re.fullmatch(r'/products/([^/]+)', path)

        if product_match:
            self._handle_product_detail(product_match.group(1))
            return

        self._send_json(404, {'error': 'Ruta no encontrada'})

    def log_message(self, format, *args):
        print(f'{self.address_string()} - {format % args}')


if __name__ == '__main__':
    server = ThreadingHTTPServer(('0.0.0.0', PORT), ApiHandler)
    print(f'API REST corriendo en http://localhost:{PORT}')
    print(f'Productos disponibles en http://localhost:{PORT}/products')
    server.serve_forever()
