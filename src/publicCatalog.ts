import { fallbackCatalog } from './fallbackCatalog';
import { supabase, supabaseConfigured } from './supabase';
import type { Product, ProductVariant } from './types';

const normalizeVariant=(row:any):ProductVariant=>({
  id:String(row.id),
  product_id:String(row.product_id),
  sku:String(row.sku||''),
  size:String(row.size||'Única'),
  color:String(row.color||'Único'),
  stock:Number(row.stock||0),
  active:row.active!==false
});

const normalize=(row:any):Product=>({
  id:String(row.id),
  sku:String(row.sku||row.id),
  name:String(row.name||''),
  category:row.category,
  collection:String(row.collection||'General'),
  price:Number(row.price||0),
  old_price:row.old_price==null?null:Number(row.old_price),
  description:String(row.description||''),
  sizes:Array.isArray(row.sizes)?row.sizes:[],
  colors:Array.isArray(row.colors)?row.colors:[],
  stock:Number(row.stock||0),
  badge:row.badge||null,
  image:String(row.image||row.images?.[0]||''),
  images:Array.isArray(row.images)?row.images:[],
  color_images:row.color_images&&typeof row.color_images==='object'?row.color_images:{},
  active:row.active!==false,
  sort_order:Number(row.sort_order||0),
  variants:Array.isArray(row.product_variants)?row.product_variants.map(normalizeVariant):[]
});

export async function loadPublicProducts():Promise<Product[]>{
  if(!supabaseConfigured||!supabase)return fallbackCatalog;
  const{data,error}=await supabase
    .from('products')
    .select('*,product_variants(*)')
    .eq('active',true)
    .gt('price',0)
    .order('sort_order',{ascending:true});
  if(error)throw error;
  return(data||[]).map(normalize);
}
