import { supabase } from './supabase';
import type { Product } from './types';

const bucketMarker='/storage/v1/object/public/product-images/';

function storagePathFromPublicUrl(url:string){
  try{
    const parsed=new URL(url);
    const index=parsed.pathname.indexOf(bucketMarker);
    if(index<0)return null;
    return decodeURIComponent(parsed.pathname.slice(index+bucketMarker.length));
  }catch{return null;}
}

export async function setProductActive(productId:string,active:boolean){
  if(!supabase)throw new Error('Supabase no configurado.');
  const{error}=await supabase.from('products').update({active,updated_at:new Date().toISOString()}).eq('id',productId);
  if(error)throw error;
}

export async function saveProductGallery(product:Product){
  if(!supabase)throw new Error('Supabase no configurado.');
  const images=[...new Set((product.images||[]).filter(Boolean))];
  const primary=images.includes(product.image)?product.image:(images[0]||'');
  const colorImages:Record<string,string[]>={};
  for(const[color,urls]of Object.entries(product.color_images||{})){
    const clean=[...new Set((urls||[]).filter(url=>images.includes(url)))];
    if(clean.length)colorImages[color]=clean;
  }
  const{error}=await supabase.from('products').update({images,image:primary,color_images:colorImages,updated_at:new Date().toISOString()}).eq('id',product.id);
  if(error)throw error;
  return{...product,images,image:primary,color_images:colorImages};
}

export async function deleteProductPhoto(product:Product,url:string){
  if(!supabase)throw new Error('Supabase no configurado.');
  const images=(product.images||[]).filter(item=>item!==url);
  const colorImages:Record<string,string[]>={};
  for(const[color,urls]of Object.entries(product.color_images||{})){
    const clean=(urls||[]).filter(item=>item!==url);
    if(clean.length)colorImages[color]=clean;
  }
  const image=product.image===url?(images[0]||''):product.image;
  const next={...product,images,image,color_images:colorImages};
  const{error}=await supabase.from('products').update({images,image,color_images:colorImages,updated_at:new Date().toISOString()}).eq('id',product.id);
  if(error)throw error;

  const path=storagePathFromPublicUrl(url);
  if(path){
    const{error:storageError}=await supabase.storage.from('product-images').remove([path]);
    if(storageError)console.warn('La referencia se eliminó, pero Storage no pudo borrar el archivo:',storageError.message);
  }
  return next;
}

export async function clearProductPhotos(product:Product){
  if(!supabase)throw new Error('Supabase no configurado.');
  const paths=(product.images||[]).map(storagePathFromPublicUrl).filter((x):x is string=>Boolean(x));
  const{error}=await supabase.from('products').update({images:[],image:'',color_images:{},updated_at:new Date().toISOString()}).eq('id',product.id);
  if(error)throw error;
  if(paths.length){
    const{error:storageError}=await supabase.storage.from('product-images').remove(paths);
    if(storageError)console.warn('Se vació la galería, pero algunos archivos no pudieron borrarse de Storage:',storageError.message);
  }
  return{...product,images:[],image:'',color_images:{}};
}
