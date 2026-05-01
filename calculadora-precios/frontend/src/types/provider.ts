// Proveedor
export interface Provider {
  id: number;
  name: string;
  user_id?: string;
  created_at?: string;
}

// Producto con precios por proveedor
export interface ProductPrice {
  id: number;
  product_id: number;
  provider_id: number;
  cost_usd: number;
  profit_percentage: number;
  exempt_from_vat: boolean;
  photo_url?: string;
  updated_at?: string;
}

// Producto base (sin precio, solo info general)
export interface Product {
  id: number;
  name: string;
  category?: string;
  created_at?: string;
}

// Vista combinada para el comparador
export interface ProductPriceComparison {
  product: Product;
  prices: (ProductPrice & { provider_name: string })[];
}
