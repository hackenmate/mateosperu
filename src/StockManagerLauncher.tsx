import { useEffect, useMemo, useState } from 'react';
import { Boxes, Save, X } from 'lucide-react';
import { isCurrentUserAdmin, loadAdminProducts, onAuthChange, saveProduct } from './store';
import type { Product } from './types';

export default function StockManagerLauncher(){
  const[isAdmin,setIsAdmin]=useState(false);
  const[open,setOpen]=useState(false);
  const[products,setProducts]=useState<Product[]>([]);
  const[query,setQuery]=useState('');
  const[busyId,setBusyId]=useState('');
  const[msg,setMsg]=useState('');

  const check=async()=>setIsAdmin(await isCurrentUserAdmin());
  const refresh=async()=>setProducts(await loadAdminProducts());

  useEffect(()=>{
    void check();
    const unsub=onAuthChange(()=>void check());
    return unsub;
  },[]);

  useEffect(()=>{if(open)void refresh()},[open]);

  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return products.filter(p=>!q||`${p.name} ${p.category}`.toLowerCase().includes(q));
  },[products,query]);

  const setVariantStock=(productId:string,variantId:string,value:number)=>{
    setProducts(current=>current.map(p=>p.id!==productId?p:{
      ...p,
      variants:(p.variants||[]).map(v=>v.id===variantId?{...v,stock:Math.max(0,value||0)}:v)
    }));
  };

  const save=async(product:Product)=>{
    setBusyId(product.id);setMsg('');
    try{
      await saveProduct(product);
      await refresh();
      setMsg(`Stock de “${product.name}” actualizado.`);
    }catch(e:any){setMsg(e?.message||'No se pudo guardar el stock.');}
    finally{setBusyId('')}
  };

  if(!isAdmin)return null;
  return <>
    <button onClick={()=>setOpen(true)} className="fixed bottom-20 left-5 z-[75] flex items-center gap-2 rounded-full bg-[#c9ff36] px-5 py-3 text-sm font-black uppercase text-black shadow-xl"><Boxes size={18}/> Stock</button>
    {open&&<div className="fixed inset-0 z-[130] overflow-y-auto bg-black/75 p-4">
      <div className="mx-auto my-8 max-w-5xl bg-[#f4f2ed] p-5 lg:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-black/40">Administración</p><h2 className="font-display text-4xl">EDITAR STOCK</h2><p className="mt-1 text-sm text-black/55">Escribe la cantidad real por talla y color y guarda.</p></div><button onClick={()=>setOpen(false)}><X/></button></div>
        {msg&&<div className="mt-4 bg-white p-3 text-sm font-bold">{msg}</div>}
        <input className="field mt-5" placeholder="Buscar producto" value={query} onChange={e=>setQuery(e.target.value)}/>
        <div className="mt-5 space-y-4">{filtered.map(product=><section key={product.id} className="bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><b className="text-lg">{product.name}</b><p className="text-xs text-black/50">{product.category} · {product.active?'Publicado':'Borrador'}</p></div><strong>Stock total: {(product.variants||[]).filter(v=>v.active).reduce((s,v)=>s+Number(v.stock||0),0)}</strong></div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">{(product.variants||[]).map(v=><label key={v.id} className="grid grid-cols-[1fr_120px] items-center gap-3 border p-3"><span><b>{v.size}</b> · {v.color}</span><input className="field" type="number" min="0" inputMode="numeric" value={v.stock} onChange={e=>setVariantStock(product.id,v.id,Number(e.target.value))}/></label>)}</div>
          {!(product.variants||[]).length&&<p className="mt-3 text-sm text-red-700">Este producto no tiene talla/color configurado. Ábrelo desde Administrar tienda y agrega una opción.</p>}
          <button disabled={busyId===product.id||!(product.variants||[]).length} onClick={()=>save(product)} className="mt-4 flex items-center gap-2 bg-black px-4 py-3 text-sm font-black uppercase text-white disabled:opacity-40"><Save size={17}/>{busyId===product.id?'Guardando...':'Guardar stock'}</button>
        </section>)}{!filtered.length&&<div className="bg-white p-8 text-center text-black/50">No hay productos.</div>}</div>
      </div>
    </div>}
  </>;
}
