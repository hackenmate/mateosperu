import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, Facebook, Instagram, Menu, MessageCircle, Search, Share2, ShieldCheck, X } from 'lucide-react';
import { loadPublicProducts } from './publicCatalog';
import { loadStoreSettings, trackEvent, type StoreSettings } from './storefrontExtras';
import AdminPanel from './AdminPanel';
import type { Product } from './types';

const WHATSAPP_NUMBER='51945961792';
const categories=['Todos','Mujer','Hombre','Niños'] as const;
const money=(n:number)=>`S/ ${Number(n||0).toFixed(2)}`;
const emptySocial:StoreSettings={instagram_url:'',tiktok_url:'',facebook_url:''};
const totalStock=(p:Product)=>(p.variants||[]).filter(v=>v.active).reduce((s,v)=>s+Number(v.stock||0),0);
const discountPct=(p:Product)=>p.old_price&&p.old_price>p.price?Math.round((1-p.price/p.old_price)*100):0;

function Brand(){return <div className="flex items-center gap-3"><div className="grid h-9 w-9 grid-cols-3 items-end gap-1"><span className="h-4 skew-x-[-12deg] bg-black"/><span className="h-6 skew-x-[-12deg] bg-black"/><span className="h-8 skew-x-[-12deg] bg-black"/></div><span className="font-display text-2xl tracking-[.12em] sm:text-3xl">MATEO’S</span></div>}
function setMeta(selector:string,attrs:Record<string,string>){let el=document.head.querySelector(selector) as HTMLMetaElement|null;if(!el){el=document.createElement('meta');for(const[k,v]of Object.entries(attrs)){if(k!=='content')el.setAttribute(k,v)}document.head.appendChild(el)}el.setAttribute('content',attrs.content||'')}

export default function App(){
  const[products,setProducts]=useState<Product[]>([]),[loading,setLoading]=useState(true);
  const[category,setCategory]=useState<(typeof categories)[number]>('Todos'),[query,setQuery]=useState('');
  const[selected,setSelected]=useState<Product|null>(null),[size,setSize]=useState(''),[requestedColor,setRequestedColor]=useState(''),[photoIndex,setPhotoIndex]=useState(0);
  const[admin,setAdmin]=useState(false),[menu,setMenu]=useState(false),[notice,setNotice]=useState(''),[social,setSocial]=useState<StoreSettings>(emptySocial);

  const reloadCatalog=()=>loadPublicProducts().then(setProducts).catch(()=>setNotice('No se pudo actualizar el catálogo.'));
  useEffect(()=>{Promise.all([reloadCatalog(),loadStoreSettings().then(setSocial)]).finally(()=>setLoading(false))},[]);
  useEffect(()=>{if(!products.length||selected)return;const id=new URLSearchParams(location.search).get('product');const product=products.find(p=>p.id===id);if(product)openProduct(product,false)},[products]);
  useEffect(()=>{
    const overlayOpen=Boolean(selected||admin||menu);
    document.body.classList.toggle('mateos-shop-overlay-open',overlayOpen);
    return()=>document.body.classList.remove('mateos-shop-overlay-open');
  },[selected,admin,menu]);

  const filtered=useMemo(()=>products.filter(p=>(category==='Todos'||p.category===category)&&(!query.trim()||`${p.name} ${p.category} ${p.collection}`.toLowerCase().includes(query.toLowerCase()))),[products,category,query]);
  const availableVariants=useMemo(()=>selected?.variants?.filter(v=>v.active&&v.stock>0)||[],[selected]);
  const sizeOptions=useMemo(()=>{
    const fromVariants=[...new Set(availableVariants.map(v=>v.size).filter(Boolean))];
    return fromVariants.length?fromVariants:(selected?.sizes||[]);
  },[availableVariants,selected]);
  const colorSuggestions=useMemo(()=>[...new Set((selected?.variants||[]).filter(v=>v.active).map(v=>v.color).filter(Boolean))],[selected]);
  const selectedImages=useMemo(()=>{if(!selected)return[];const base=selected.images?.length?selected.images:selected.image?[selected.image]:[];return[...new Set(base.filter(Boolean))]},[selected]);
  const sizeStock=useMemo(()=>availableVariants.filter(v=>v.size===size).reduce((sum,v)=>sum+Number(v.stock||0),0),[availableVariants,size]);

  const openProduct=(p:Product,track=true)=>{
    setSelected(p);
    const first=(p.variants||[]).find(v=>v.active&&v.stock>0);
    setSize(first?.size||p.sizes[0]||'Única');
    setRequestedColor('');
    setPhotoIndex(0);
    const url=new URL(location.href);url.searchParams.set('product',p.id);history.replaceState({},'',url);
    if(track)void trackEvent('product_view',p.id,{name:p.name});
  };
  const closeProduct=()=>{setSelected(null);const url=new URL(location.href);url.searchParams.delete('product');history.replaceState({},'',url)};

  useEffect(()=>{const title=selected?`${selected.name} | Mateo’s Perú`:'Mateo’s Perú | Moda deportiva y urbana';const description=selected?(selected.description||`${selected.name} en Mateo’s Perú`):'Moda deportiva, workout, urbana y confort con pedidos por WhatsApp y envíos desde Arequipa a todo el Perú.';const image=selected?(selectedImages[0]||selected.image):'';document.title=title;setMeta('meta[name="description"]',{name:'description',content:description});setMeta('meta[property="og:title"]',{property:'og:title',content:title});setMeta('meta[property="og:description"]',{property:'og:description',content:description});setMeta('meta[property="og:type"]',{property:'og:type',content:selected?'product':'website'});setMeta('meta[property="og:url"]',{property:'og:url',content:location.href});if(image)setMeta('meta[property="og:image"]',{property:'og:image',content:image})},[selected,selectedImages]);

  const productWhatsApp=()=>{
    if(!selected)return;
    if(!size.trim()){setNotice('Selecciona una talla.');return;}
    if(!requestedColor.trim()){setNotice('Escribe el color que deseas.');return;}
    const msg=[
      'Hola Mateo’s, quiero pedir este producto:',
      '',
      `Producto: ${selected.name}`,
      `Talla: ${size}`,
      `Color solicitado: ${requestedColor.trim()}`,
      `Precio publicado: ${money(selected.price)}`,
      `Enlace: ${location.href}`,
      '',
      '¿Me confirman disponibilidad del color y coordinamos el envío?'
    ].join('\n');
    void trackEvent('product_whatsapp',selected.id,{size,color_requested:requestedColor.trim(),price:selected.price});
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`,'_blank','noopener,noreferrer');
  };

  const shareProduct=async()=>{if(!selected)return;const data={title:selected.name,text:`Mira ${selected.name} en Mateo’s Perú`,url:location.href};try{if(navigator.share)await navigator.share(data);else{await navigator.clipboard.writeText(location.href);setNotice('Enlace del producto copiado.')}}catch{}};
  const generalWhatsApp=()=>window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola Mateo’s, quisiera información sobre sus productos.')}`,'_blank','noopener,noreferrer');

  return <div className="min-h-screen bg-[#f4f2ed] pb-20 text-[#101010] sm:pb-0">
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f4f2ed]/95 backdrop-blur"><div className="bg-black px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[.12em] text-white sm:text-[11px] sm:tracking-[.16em]">Envíos desde Arequipa a todo el Perú · Pedidos por WhatsApp</div><div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-4 lg:px-10"><button className="lg:hidden" onClick={()=>setMenu(true)}><Menu/></button><Brand/><nav className="hidden gap-8 lg:flex">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className="text-sm font-bold uppercase tracking-wider">{c}</button>)}</nav><button onClick={generalWhatsApp} className="flex items-center gap-2 p-2 text-xs font-black uppercase"><MessageCircle size={20}/><span className="hidden sm:inline">WhatsApp</span></button></div></header>

    {menu&&<div className="fixed inset-0 z-50 bg-black p-6 text-white"><button className="float-right" onClick={()=>setMenu(false)}><X/></button><div className="pt-20">{categories.map(c=><button key={c} onClick={()=>{setCategory(c);setMenu(false)}} className="block w-full border-b border-white/20 py-5 text-left font-display text-5xl">{c}</button>)}</div></div>}

    <main><section className="relative min-h-[62vh] overflow-hidden bg-black text-white sm:min-h-[72vh]"><img src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1800&q=88" className="absolute inset-0 h-full w-full object-cover opacity-60"/><div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent"/><div className="relative mx-auto flex min-h-[62vh] max-w-[1440px] items-end px-5 pb-12 sm:min-h-[72vh] sm:pb-16 lg:px-10"><div><p className="mb-4 text-xs font-bold uppercase tracking-[.3em] text-[#c9ff36]">Nueva temporada</p><h1 className="font-display text-[18vw] leading-[.78] sm:text-8xl lg:text-[10rem]">MUÉVETE<br/>A TU MANERA.</h1><p className="mt-5 max-w-xl text-sm text-white/75 sm:text-base">Elige tu prenda, talla y color. Confirmamos disponibilidad y envío directamente por WhatsApp.</p><button onClick={()=>document.getElementById('catalogo')?.scrollIntoView({behavior:'smooth'})} className="mt-6 flex items-center gap-3 bg-white px-6 py-4 text-sm font-black uppercase text-black">Ver colección <ArrowUpRight size={18}/></button></div></div></section>

    <section id="catalogo" className="mx-auto max-w-[1440px] px-4 py-12 sm:px-5 sm:py-16 lg:px-10"><div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.28em] text-black/45">Colección Mateo’s</p><h2 className="font-display text-5xl sm:text-6xl">ENCUENTRA TU FIT.</h2></div><label className="flex w-full items-center gap-3 border-b-2 border-black bg-white/50 px-4 py-3 lg:w-[340px]"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar producto" className="w-full bg-transparent outline-none"/></label></div><div className="mb-8 flex gap-2 overflow-x-auto pb-1">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={`shrink-0 rounded-full px-5 py-2.5 text-xs font-black uppercase ${category===c?'bg-black text-white':'border border-black/20'}`}>{c}</button>)}</div>{loading?<p>Cargando catálogo...</p>:filtered.length===0?<div className="py-16 text-center text-black/50"><p className="font-display text-4xl">PRONTO NUEVAS PRENDAS</p></div>:<div className="grid grid-cols-2 gap-x-3 gap-y-9 md:grid-cols-3 lg:grid-cols-4">{filtered.map(p=>{const stock=totalStock(p),discount=discountPct(p);return <article key={p.id}><button className="relative aspect-[3/4] w-full overflow-hidden bg-[#ddd9d0]" onClick={()=>openProduct(p)}><img src={p.image||p.images[0]} alt={p.name} loading="lazy" className={`h-full w-full object-cover transition duration-500 hover:scale-105 ${stock<=0?'grayscale opacity-60':''}`}/>{stock<=0&&<span className="absolute inset-x-0 bottom-0 bg-black/85 px-3 py-2 text-xs font-black uppercase text-white">Consultar disponibilidad</span>}{discount>0&&<span className="absolute left-2 top-2 bg-[#c9ff36] px-2 py-1 text-[10px] font-black">-{discount}%</span>}</button><div className="pt-3"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-black/45">{p.category} · {p.collection}</p><button onClick={()=>openProduct(p)} className="mt-1 text-left text-sm font-bold sm:text-base">{p.name}</button><div className="mt-2 flex flex-wrap items-center gap-2"><b>{money(p.price)}</b>{p.old_price&&p.old_price>p.price&&<span className="text-xs text-black/40 line-through">{money(p.old_price)}</span>}</div></div></article>})}</div>}</section></main>

    <footer className="bg-[#c9ff36] px-5 py-10 lg:px-10"><div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-7 md:flex-row"><div><Brand/><p className="mt-4 max-w-md text-sm">Pedidos y coordinación de envío directamente por WhatsApp.</p></div><div className="space-y-3"><button onClick={generalWhatsApp} className="block font-bold">+51 945 961 792</button><div className="flex gap-3">{social.instagram_url&&<a href={social.instagram_url} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram/></a>}{social.facebook_url&&<a href={social.facebook_url} target="_blank" rel="noreferrer" aria-label="Facebook"><Facebook/></a>}{social.tiktok_url&&<a href={social.tiktok_url} target="_blank" rel="noreferrer" aria-label="TikTok" className="font-black">TikTok</a>}</div><button onClick={()=>setAdmin(true)} className="flex items-center gap-2 text-sm font-bold"><ShieldCheck size={18}/> Administrar tienda</button></div></div></footer>

    {selected&&<div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 p-2 sm:grid sm:place-items-center sm:p-4"><div className="my-2 grid w-full max-w-5xl bg-[#f4f2ed] md:grid-cols-2"><div className="p-3 sm:p-4"><div className="aspect-[3/4] overflow-hidden bg-[#ddd9d0]"><img src={selectedImages[photoIndex]||selected.image||selected.images[0]} alt={selected.name} className="h-full w-full object-cover"/></div>{selectedImages.length>1&&<div className="mt-2 grid grid-cols-5 gap-2">{selectedImages.map((url,index)=><button key={`${url}-${index}`} onClick={()=>setPhotoIndex(index)} className={`aspect-square overflow-hidden border-2 ${photoIndex===index?'border-black':'border-transparent'}`}><img src={url} alt="" className="h-full w-full object-cover"/></button>)}</div>}</div><div className="relative p-5 sm:p-7"><button className="absolute right-4 top-4" onClick={closeProduct}><X/></button><p className="pr-10 text-xs font-bold uppercase text-black/45">{selected.category} · {selected.collection}</p><h3 className="mt-2 pr-8 font-display text-4xl sm:text-5xl">{selected.name}</h3><div className="mt-3 flex items-center gap-3"><p className="text-2xl font-black">{money(selected.price)}</p>{selected.old_price&&selected.old_price>selected.price&&<><p className="text-sm text-black/40 line-through">{money(selected.old_price)}</p><span className="bg-[#c9ff36] px-2 py-1 text-xs font-black">-{discountPct(selected)}%</span></>}</div><p className="mt-4 text-sm text-black/60">{selected.description}</p>

      <div className="mt-6"><p className="text-xs font-black uppercase">1. Elige tu talla</p><div className="mt-2 flex flex-wrap gap-2">{sizeOptions.map(s=><button key={s} onClick={()=>setSize(s)} className={`min-w-12 rounded-full border px-4 py-2 text-sm font-bold ${size===s?'border-black bg-black text-white':'border-black/30 bg-white'}`}>{s}</button>)}</div>{sizeStock>0&&<p className="mt-2 text-xs text-black/45">Stock registrado para talla {size}: {sizeStock} unidad(es) entre los colores disponibles.</p>}</div>

      <div className="mt-5"><label className="text-xs font-black uppercase" htmlFor="requested-color">2. Escribe el color que quieres</label><input id="requested-color" className="field mt-2" placeholder="Ej. Borgoña, negro, azul marino..." value={requestedColor} onChange={e=>setRequestedColor(e.target.value)}/>{colorSuggestions.length>0&&<div className="mt-2"><p className="text-[10px] font-bold uppercase text-black/40">Colores registrados como referencia</p><div className="mt-1 flex flex-wrap gap-1.5">{colorSuggestions.map(c=><button key={c} onClick={()=>setRequestedColor(c)} className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs">{c}</button>)}</div></div>}</div>

      <div className="mt-5 bg-white p-4 text-sm"><p className="font-black">Tu solicitud</p><p className="mt-1">{selected.name}</p><p>Talla: <b>{size||'Por elegir'}</b></p><p>Color: <b>{requestedColor.trim()||'Por escribir'}</b></p></div>

      <div className="mt-5 grid gap-2"><button onClick={productWhatsApp} className="flex w-full items-center justify-center gap-2 bg-[#25D366] px-5 py-4 font-black uppercase"><MessageCircle size={19}/> Pedir por WhatsApp</button><button onClick={shareProduct} className="flex w-full items-center justify-center gap-2 border border-black px-3 py-3 text-xs font-black uppercase"><Share2 size={17}/> Compartir producto</button></div><p className="mt-3 text-center text-xs text-black/45">La disponibilidad final del color se confirma directamente por WhatsApp.</p></div></div></div>}

    {notice&&<div className="fixed bottom-20 left-1/2 z-[160] flex max-w-[92vw] -translate-x-1/2 items-center gap-3 bg-black px-5 py-4 text-sm font-bold text-white sm:bottom-5"><Check className="shrink-0 text-[#c9ff36]" size={18}/>{notice}<button onClick={()=>setNotice('')}><X size={16}/></button></div>}
    <AdminPanel open={admin} onClose={()=>setAdmin(false)} onCatalogChanged={reloadCatalog}/>
  </div>;
}
