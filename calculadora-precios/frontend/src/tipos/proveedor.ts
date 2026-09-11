// ---------------------------------------------------------------------------
// Estos tipos describen filas de Supabase tal como llegan de la consulta.
// Sus campos van en inglés a propósito (name, user_id, cost_usd...): son los
// nombres reales de las columnas y renombrarlos rompería las consultas.
// ---------------------------------------------------------------------------

// Proveedor
export interface Proveedor {
  id: number;
  name: string;
  user_id?: string;
  created_at?: string;
}

// Producto con precios por proveedor
export interface PrecioProducto {
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
export interface ProductoBase {
  id: number;
  name: string;
  category?: string;
  created_at?: string;
}

// Vista combinada para el comparador
export interface ComparacionPrecios {
  producto: ProductoBase;
  precios: (PrecioProducto & { provider_name: string })[];
}
