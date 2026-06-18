const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const dbPath = path.join(__dirname, 'db.json');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function readDb() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function writeDb(data) {
  fs.writeFileSync(dbPath, `${JSON.stringify(data, null, 2)}\n`);
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    ...headers,
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(data));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
    });

    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });

    request.on('error', reject);
  });
}

function nextId(products) {
  return products.reduce((max, product) => Math.max(max, product.id), 0) + 1;
}

function findProductIndex(products, id) {
  return products.findIndex((product) => String(product.id) === String(id));
}

async function handleRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, headers);
    response.end();
    return;
  }

  if (pathname === '/products') {
    if (request.method === 'GET') {
      sendJson(response, 200, readDb());
      return;
    }

    if (request.method === 'POST') {
      const body = await readBody(request);
      const db = readDb();
      const product = {
        id: nextId(db.products),
        name: body.name || 'Producto sin nombre',
        price: Number(body.price) || 0,
        category: body.category || 'General',
        description: body.description || '',
        image: body.image || '',
        shortName: body.shortName || 'NEW'
      };

      db.products.push(product);
      writeDb(db);
      sendJson(response, 201, product);
      return;
    }
  }

  const productMatch = pathname.match(/^\/products\/([^/]+)$/);

  if (productMatch) {
    const id = productMatch[1];
    const db = readDb();
    const index = findProductIndex(db.products, id);

    if (index === -1) {
      sendJson(response, 404, { error: 'Producto no encontrado' });
      return;
    }

    if (request.method === 'GET') {
      sendJson(response, 200, db.products[index]);
      return;
    }

    if (request.method === 'PUT' || request.method === 'PATCH') {
      const body = await readBody(request);
      const updatedProduct = {
        ...db.products[index],
        ...body,
        id: Number(id)
      };

      db.products[index] = updatedProduct;
      writeDb(db);
      sendJson(response, 200, updatedProduct);
      return;
    }

    if (request.method === 'DELETE') {
      const [deletedProduct] = db.products.splice(index, 1);
      writeDb(db);
      sendJson(response, 200, deletedProduct);
      return;
    }
  }

  sendJson(response, 404, { error: 'Ruta no encontrada' });
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error(error);
    sendJson(response, 500, { error: 'Error interno del servidor' });
  });
});

server.listen(PORT, () => {
  console.log(`API REST corriendo en http://localhost:${PORT}`);
  console.log(`Productos disponibles en http://localhost:${PORT}/products`);
});
