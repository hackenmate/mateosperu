export type Product = {
  id: string;
  sku: string;
  name: string;
  category: 'Mujer' | 'Hombre' | 'Niños';
  collection: string;
  price: number;
  old_price?: number | null;
  description: string;
  sizes: string[];
  colors: string[];
  stock: number;
  badge?: string | null;
  image: string;
  images: string[];
  active: boolean;
  sort_order: number;
};

export type CartItem = Product & { size: string; color: string; quantity: number };
export type CheckoutForm = { name: string; phone: string; department: string; province: string; district: string; shipping: string; agency: string; notes: string };
export type OrderRow = { id: string; code: string; customer_name: string; phone: string; destination: string; shipping_method: string; agency: string | null; total: number; status: string; created_at: string };
