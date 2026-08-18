import { supabase } from './supabase';

export type InventoryMovement={
  id:number;
  product_id:string;
  variant_id:string|null;
  sku:string;
  old_stock:number;
  new_stock:number;
  delta:number;
  source:string;
  created_at:string;
};

export async function bulkSetProductsActive(ids:string[],active:boolean){
  if(!supabase)throw new Error('Supabase no configurado.');
  if(!ids.length)return;
  const{error}=await supabase.from('products').update({active,updated_at:new Date().toISOString()}).in('id',ids);
  if(error)throw error;
}

export async function loadInventoryMovements(productId:string,limit=50):Promise<InventoryMovement[]>{
  if(!supabase)return[];
  const{data,error}=await supabase.from('inventory_movements').select('id,product_id,variant_id,sku,old_stock,new_stock,delta,source,created_at').eq('product_id',productId).order('created_at',{ascending:false}).limit(limit);
  if(error)throw error;
  return(data||[]) as InventoryMovement[];
}
