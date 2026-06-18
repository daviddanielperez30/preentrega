const API_BASE_URL = 'http://localhost:3001';

const fallbackProducts = [
  {
    id: 1,
    name: 'Micro SD 64GB',
    price: 25000,
    category: 'Accesorio',
    description: 'Memoria micro SD de 64GB para guardar tus grabaciones con rapidez y seguridad.',
    image: 'imagenes/microsd.png',
    shortName: 'SD'
  },
  {
    id: 2,
    name: 'TAPO C100',
    price: 85000,
    category: 'Cámara',
    description: 'Cámara compacta con visión clara para monitorear espacios pequeños.',
    image: '',
    shortName: 'C100'
  },
  {
    id: 3,
    name: 'TAPO C200',
    price: 95000,
    category: 'Cámara',
    description: 'Control remoto y seguimiento de movimiento para mayor tranquilidad.',
    image: 'imagenes/tapoc200.png',
    shortName: 'C200'
  },
  {
    id: 4,
    name: 'TAPO C210',
    price: 120000,
    category: 'Cámara',
    description: 'Video nítido y funciones inteligentes para cuidar tu hogar todos los días.',
    image: 'imagenes/tapoc210.png',
    shortName: 'C210'
  }
];

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Error ${response.status} al consumir ${url}`);
  }

  return response.json();
}

function normalizeProduct(product) {
  return {
    id: product.id,
    name: product.name,
    price: Number(product.price),
    category: product.category,
    description: product.description,
    image: product.image || '',
    shortName: product.shortName || product.name.slice(0, 4).toUpperCase()
  };
}

export async function fetchProducts() {
  try {
    const products = await fetchJson(`${API_BASE_URL}/products`);
    return products.map(normalizeProduct);
  } catch (error) {
    console.warn('No se pudo conectar con la API REST. Usando datos locales.', error);
    return fallbackProducts;
  }
}

export { fallbackProducts };
