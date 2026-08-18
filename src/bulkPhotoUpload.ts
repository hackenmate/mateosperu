import { supabase } from './supabase';
import type { Product } from './types';

export type FolderPhotoRow={
  file:File;
  relativePath:string;
  productId:string|null;
  productSku:string|null;
  productName:string|null;
  color:string|null;
  matchedBy:'folder-sku'|'variant-sku'|'filename-sku'|null;
  status:'matched'|'unmatched';
};

const norm=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const stripExt=(value:string)=>value.replace(/\.[^.]+$/,'');
const canonicalColor=(value:string,product:Product)=>{
  const key=norm(value);
  const hit=(product.colors||[]).find(c=>norm(c)===key);
  return hit||value.trim();
};

export function previewFolderPhotos(products:Product[],files:File[]):FolderPhotoRow[]{
  const productBySku=new Map<string,Product>();
  const variantSku=new Map<string,Product>();
  for(const p of products){
    productBySku.set(norm(p.sku),p);
    for(const v of p.variants||[])variantSku.set(norm(v.sku),p);
  }

  return files.filter(f=>f.type.startsWith('image/')).map(file=>{
    const relative=(file as any).webkitRelativePath||file.name;
    const parts=relative.split('/').filter(Boolean);
    const withoutRoot=parts.length>1?parts.slice(1):parts;
    const skuFolder=withoutRoot[0]||'';
    const colorFolder=withoutRoot.length>=3?withoutRoot[1]:null;
    let product=productBySku.get(norm(skuFolder))||variantSku.get(norm(skuFolder))||null;
    let matchedBy:FolderPhotoRow['matchedBy']=product?(productBySku.has(norm(skuFolder))?'folder-sku':'variant-sku'):null;

    if(!product){
      const base=norm(stripExt(file.name));
      const candidates=[...productBySku.entries(),...variantSku.entries()].sort((a,b)=>b[0].length-a[0].length);
      const hit=candidates.find(([sku])=>base===sku||base.startsWith(`${sku}-`));
      if(hit){product=hit[1];matchedBy='filename-sku';}
    }

    return{
      file,
      relativePath:relative,
      productId:product?.id||null,
      productSku:product?.sku||null,
      productName:product?.name||null,
      color:product&&colorFolder?canonicalColor(colorFolder,product):null,
      matchedBy,
      status:product?'matched':'unmatched'
    };
  });
}

async function compressImage(file:File):Promise<Blob>{
  const bitmap=await createImageBitmap(file);
  const max=1800;
  const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('No se pudo comprimir la imagen.')),'image/webp',0.84));
  bitmap.close();
  return blob;
}

export async function uploadFolderPhotos(products:Product[],files:File[],onProgress?:(done:number,total:number,path:string)=>void){
  if(!supabase)throw new Error('Supabase no configurado.');
  const preview=previewFolderPhotos(products,files);
  const matched=preview.filter(x=>x.productId);
  const unmatched=preview.filter(x=>!x.productId).map(x=>x.relativePath);
  if(!matched.length)return{uploaded:0,productsUpdated:0,unmatched,failed:[] as string[]};
  if(matched.length>1000)throw new Error('Máximo 1000 imágenes por lote. Divide la carpeta en dos cargas.');

  const grouped=new Map<string,{all:string[];colors:Record<string,string[]>}>();
  const failed:string[]=[];
  let done=0;
  for(const row of matched){
    try{
      const blob=await compressImage(row.file);
      const safeColor=norm(row.color||'GENERAL')||'GENERAL';
      const safeName=norm(stripExt(row.file.name)).slice(0,90)||'FOTO';
      const path=`${row.productId}/bulk/${safeColor}/${Date.now()}-${safeName}-${crypto.randomUUID()}.webp`;
      const {error}=await supabase.storage.from('product-images').upload(path,blob,{contentType:'image/webp',cacheControl:'31536000',upsert:false});
      if(error)throw error;
      const {data}=supabase.storage.from('product-images').getPublicUrl(path);
      const bucket=grouped.get(row.productId!)||{all:[],colors:{}};
      bucket.all.push(data.publicUrl);
      if(row.color){bucket.colors[row.color]=[...(bucket.colors[row.color]||[]),data.publicUrl];}
      grouped.set(row.productId!,bucket);
    }catch{failed.push(row.relativePath)}
    finally{done++;onProgress?.(done,matched.length,row.relativePath)}
  }

  let productsUpdated=0;
  for(const [productId,pack] of grouped){
    const product=products.find(p=>p.id===productId);if(!product)continue;
    const images=[...new Set([...(product.images||[]),...pack.all])];
    const colorImages:{[key:string]:string[]}={...(product.color_images||{})};
    for(const [color,urls] of Object.entries(pack.colors))colorImages[color]=[...new Set([...(colorImages[color]||[]),...urls])];
    const image=product.image||images[0]||'';
    const {error}=await supabase.from('products').update({images,image,color_images:colorImages,updated_at:new Date().toISOString()}).eq('id',productId);
    if(error)throw error;
    productsUpdated++;
  }
  return{uploaded:[...grouped.values()].reduce((n,x)=>n+x.all.length,0),productsUpdated,unmatched,failed};
}
