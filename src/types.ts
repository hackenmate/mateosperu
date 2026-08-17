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

export type CheckoutForm = {
  name: string;
  email: string;
  phone: string;
  department: string;
  province: string;
  district: string;
  shipping: string;
  agency: string;
  notes: string;
  coupon: string;
};

export type CheckoutResult = {
  id: string;
  code: string;
  checkoutToken: string;
  subtotal: number;
  discount: number;
  total: number;
};

export type Profile = {
  user_id: string;
  full_name: string;
  phone: string;
  document_number?: string | null;
  marketing_opt_in?: boolean;
};

export type OrderRow = {
  id: string;
  code: string;
  customer_name: string;
  email?: string | null;
  phone: string;
  destination: string;
  shipping_method: string;
  agency: string | null;
  subtotal?: number;
  discount?: number;
  total: number;
  status: string;
  payment_method?: string;
  payment_status?: string;
  payment_provider?: string | null;
  payment_id?: string | null;
  created_at: string;
};
