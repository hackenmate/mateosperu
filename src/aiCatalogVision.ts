import type { Product } from './types';

export type VisionLabel={label:string;score:number};
export type VisionPhoto={
  id:string;
  file:File;
  url:string;
  embedding:number[];
  type:VisionLabel;
  color:VisionLabel;
  audience:VisionLabel;
  confidence:number;
};
export type VisionGroup={
  id:string;
  photos:VisionPhoto[];
  type:string;
  color:string;
  audience:'Mujer'|'Hombre'|'Niños';
  confidence:number;
  proposedName:string;
  proposedSku:string;
};

let zeroShotPromise:Promise<any>|null=null;
let embedPromise:Promise<any>|null=null;

async function getPipelines(onStatus?:(text:string)=>void){
  if(!zeroShotPromise||!embedPromise){
    onStatus?.('Descargando/cargando modelo visual IA…');
    const {pipeline,env}=await import('@huggingface/transformers');
    env.allowLocalModels=false;
    zeroShotPromise=zeroShotPromise||pipeline('zero-shot-image-classification','Xenova/clip-vit-base-patch32',{device:'wasm'} as any);
    embedPromise=embedPromise||pipeline('image-feature-extraction','Xenova/clip-vit-base-patch32',{device:'wasm'} as any);
  }
  return Promise.all([zeroShotPromise,embedPromise]);
}

const TYPE_LABELS=['leggings','jogger pants','sports top','t-shirt','polo shirt','shorts','sports bra','hoodie','sweatshirt','jacket','tracksuit set','dress','skirt','other clothing'];
const COLOR_LABELS=['black','white','gray','beige','brown','mocha brown','blue','navy blue','green','olive green','red','burgundy','pink','purple','yellow','orange','multicolor'];
const AUDIENCE_LABELS=["women's apparel","men's apparel","children's apparel"];

const typeEs:Record<string,string>={
  'leggings':'Legging','jogger pants':'Jogger','sports top':'Top deportivo','t-shirt':'Polo','polo shirt':'Polo deportivo','shorts':'Short','sports bra':'Top deportivo','hoodie':'Polera','sweatshirt':'Sudadera','jacket':'Casaca','tracksuit set':'Conjunto','dress':'Vestido','skirt':'Falda','other clothing':'Prenda'
};
const colorEs:Record<string,string>={black:'Negro',white:'Blanco',gray:'Gris',beige:'Beige',brown:'Marrón','mocha brown':'Mocha',blue:'Azul','navy blue':'Azul marino',green:'Verde','olive green':'Verde olivo',red:'Rojo',burgundy:'Vino',pink:'Rosado',purple:'Morado',yellow:'Amarillo',orange:'Naranja',multicolor:'Multicolor'};
const audienceEs:Record<string,'Mujer'|'Hombre'|'Niños'>={"women's apparel":'Mujer',"men's apparel":'Hombre',"children's apparel":'Niños'};

const top=(x:any):VisionLabel=>{
  const row=Array.isArray(x)?x[0]:x;
  return {label:String(row?.label||'unknown'),score:Number(row?.score||0)};
};
const norm=(v:number[])=>{const d=Math.sqrt(v.reduce((s,x)=>s+x*x,0))||1;return v.map(x=>x/d)};
const cosine=(a:number[],b:number[])=>a.reduce((s,x,i)=>s+x*(b[i]||0),0);
const meanEmbedding=(photos:VisionPhoto[])=>{
  if(!photos.length)return[];
  const out=new Array(photos[0].embedding.length).fill(0);
  for(const p of photos)p.embedding.forEach((v,i)=>out[i]+=v);
  return norm(out.map(v=>v/photos.length));
};

export async function analyzeCatalogFiles(files:File[],onProgress?:(done:number,total:number,status:string)=>void):Promise<VisionPhoto[]>{
  const imgs=files.filter(f=>f.type.startsWith('image/'));
  const [classifier,extractor]=await getPipelines(text=>onProgress?.(0,imgs.length,text));
  const results:VisionPhoto[]=[];
  for(let i=0;i<imgs.length;i++){
    const file=imgs[i];
    const url=URL.createObjectURL(file);
    onProgress?.(i,imgs.length,`Analizando ${file.name}`);
    try{
      const [typeRaw,colorRaw,audienceRaw,features]=await Promise.all([
        classifier(url,TYPE_LABELS),
        classifier(url,COLOR_LABELS),
        classifier(url,AUDIENCE_LABELS),
        extractor(url)
      ]);
      const type=top(typeRaw),color=top(colorRaw),audience=top(audienceRaw);
      const embedding=norm(Array.from(features.data||[]) as number[]);
      results.push({id:crypto.randomUUID(),file,url,embedding,type,color,audience,confidence:(type.score+color.score+audience.score)/3});
    }catch(e){
      URL.revokeObjectURL(url);
      throw e;
    }
    onProgress?.(i+1,imgs.length,`${i+1}/${imgs.length} analizadas`);
  }
  return results;
}

export function groupCatalogPhotos(photos:VisionPhoto[],similarityThreshold=.86):VisionGroup[]{
  const groups:{photos:VisionPhoto[];center:number[]}[]=[];
  const sorted=[...photos].sort((a,b)=>b.confidence-a.confidence);
  for(const photo of sorted){
    let best=-1,bestScore=-1;
    groups.forEach((g,i)=>{
      const sim=cosine(photo.embedding,g.center);
      const sameType=photo.type.label===g.photos[0].type.label;
      const sameColor=photo.color.label===g.photos[0].color.label;
      const adjusted=sim+(sameType?.035:-.03)+(sameColor?.025:-.025);
      if(adjusted>bestScore){bestScore=adjusted;best=i;}
    });
    if(best>=0&&bestScore>=similarityThreshold){
      groups[best].photos.push(photo);
      groups[best].center=meanEmbedding(groups[best].photos);
    }else groups.push({photos:[photo],center:photo.embedding});
  }
  return groups.map((g,index)=>{
    const anchor=[...g.photos].sort((a,b)=>b.confidence-a.confidence)[0];
    const type=typeEs[anchor.type.label]||'Prenda';
    const color=colorEs[anchor.color.label]||anchor.color.label;
    const audience=audienceEs[anchor.audience.label]||'Mujer';
    const prefix=type.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ]/g,'').slice(0,3).toUpperCase()||'PRE';
    return {id:crypto.randomUUID(),photos:g.photos,type,color,audience,confidence:g.photos.reduce((s,p)=>s+p.confidence,0)/g.photos.length,proposedName:`${type} ${color}`,proposedSku:`AI-${prefix}-${String(index+1).padStart(4,'0')}`};
  });
}

export function visionGroupToDraft(group:VisionGroup):Product{
  const id=crypto.randomUUID();
  const variantId=crypto.randomUUID();
  return {
    id,sku:group.proposedSku,name:group.proposedName,category:group.audience,collection:'Catálogo IA',price:0,old_price:null,
    description:`${group.type} color ${group.color}. Clasificación inicial generada automáticamente; revisar antes de publicar.`,
    sizes:['Única'],colors:[group.color],stock:0,badge:'Borrador IA',image:'',images:[],color_images:{},active:false,sort_order:999,
    variants:[{id:variantId,product_id:id,sku:`${group.proposedSku}-UNICA`,size:'Única',color:group.color,stock:0,active:true}]
  };
}
