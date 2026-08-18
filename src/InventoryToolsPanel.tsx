import { useEffect, useMemo, useState } from 'react';
import { Archive, Boxes, CheckSquare, RefreshCw, RotateCcw, WandSparkles, X } from 'lucide-react';
import { bulkSetProductsActive, loadInventoryMovements, type InventoryMovement } from './adminInventory';
import { loadAdminProducts, saveProduct } from './store';
import type { Product, ProductVariant } from './types';

const normSku=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const code=(value:string,fallback:string)=>{const n=normSku(value);return (n||fallback).slice(0,8)};

export default function InventoryToolsPanel({open,onClose,onChanged}:{open:boolean;onClose:()=>void;onChanged:()=>Promise<void>|void}){
 const [products,setProducts]=useState<Product[]>([]);
 const [selected,setSelected]=useState<string[]>([]);
 const [stockFilter,setStockFilter]=useState<'Todos'|'Bajo'|'Sin stock'>('Todos');
 const [query,setQuery]=useState('');
 const [working,setWorking]=useState(false);
 const [msg,setMsg]=useState('');
 const [editing,setEditing]=useState<Product|null>(null);
 const [sizes,setSizes]=useState('S,M,L,XL');
 const [colors,setColors]=useState('Negro,Blanco');
 const [initialStock,setInitialStock]=useState(0);
 const [movements,setMovements]=useState<InventoryMovement[]>([]);

 const refresh=async()=>{const data=await loadAdminProducts();setProducts(data)};
 useEffect(()=>{if(open)void refresh()},[open]);
 const visible=useMemo(()=>products.filter(p=>{
  const q=!query.trim()||`${p.name} ${p.sku} ${p.collection}`.toLowerCase().includes(query.toLowerCase());
  const s=stockFilter==='Todos'||(stockFilter==='Sin stock'?p.stock===0:p.stock>0&&p.stock<=5);
  return q&&s;
 }),[products,query,stockFilter]);
 const lowCount=products.filter(p=>p.stock>0&&p.stock<=5).length;
 const zeroCount=products.filter(p=>p.stock===0).length;
 if(!open)return null;

 const toggle=(id:string)=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
 const allVisibleSelected=visible.length>0&&visible.every(p=>selected.includes(p.id));
 const toggleAll=()=>setSelected(s=>allVisibleSelected?s.filter(id=>!visible.some(p=>p.id===id)):[...new Set([...s,...visible.map(p=>p.id)])]);
 const bulk=async(active:boolean)=>{if(!selected.length)return;setWorking(true);try{await bulkSetProductsActive(selected,active);setMsg(`${selected.length} productos ${active?'publicados':'archivados'}.`);setSelected([]);await refresh();await onChanged()}catch(e:any){setMsg(e.message)}finally{setWorking(false)}};
 const openGenerator=async(p:Product)=>{setEditing(p);setSizes((p.sizes?.length?p.sizes:['S','M','L','XL']).join(','));setColors((p.colors?.length?p.colors:['Negro']).join(','));setInitialStock(0);try{setMovements(await loadInventoryMovements(p.id))}catch{setMovements([])}};
 const generate=async()=>{
  if(!editing)return;
  const ss=sizes.split(',').map(x=>x.trim()).filter(Boolean);
  const cc=colors.split(',').map(x=>x.trim()).filter(Boolean);
  if(!ss.length||!cc.length){setMsg('Escribe al menos una talla y un color.');return;}
  const count=ss.length*cc.length;
  if(count>100){setMsg('Máximo 100 variantes por producto.');return;}
  const existing=new Map((editing.variants||[]).map(v=>[`${v.size.toLowerCase()}|${v.color.toLowerCase()}`,v]));
  const variants:ProductVariant[]=[];
  for(const size of ss)for(const color of cc){
   const key=`${size.toLowerCase()}|${color.toLowerCase()}`;
   const old=existing.get(key);
   variants.push(old||{id:crypto.randomUUID(),product_id:editing.id,sku:`${normSku(editing.sku)}-${code(color,'CLR')}-${code(size,'UNI')}`,size,color,stock:Math.max(0,initialStock),active:true});
  }
  const next={...editing,variants};
  setWorking(true);
  try{await saveProduct(next);setEditing(next);setMsg(`${variants.length} variantes listas y guardadas.`);await refresh();setMovements(await loadInventoryMovements(editing.id));await onChanged()}catch(e:any){setMsg(e.message)}finally{setWorking(false)}
 };

 return <div className="fixed inset-0 z-[130] overflow-y-auto bg-black/75 p-4"><div className="mx-auto my-6 max-w-6xl bg-[#f4f2ed]">
  <div className="flex items-start justify-between border-b p-5"><div><p className="text-xs font-black uppercase tracking-[.2em] text-black/40">Mateo’s · Control urgente</p><h2 className="font-display text-4xl">INVENTARIO Y ACCIONES MASIVAS</h2></div><button onClick={onClose}><X/></button></div>
  <div className="p-5 lg:p-8">
   <div className="grid gap-3 sm:grid-cols-3"><button onClick={()=>setStockFilter('Todos')} className={`p-4 text-left ${stockFilter==='Todos'?'bg-black text-white':'bg-white'}`}><b className="text-2xl">{products.length}</b><p className="text-xs uppercase">Productos</p></button><button onClick={()=>setStockFilter('Bajo')} className={`p-4 text-left ${stockFilter==='Bajo'?'bg-black text-white':'bg-white'}`}><b className="text-2xl">{lowCount}</b><p className="text-xs uppercase">Stock bajo ≤ 5</p></button><button onClick={()=>setStockFilter('Sin stock')} className={`p-4 text-left ${stockFilter==='Sin stock'?'bg-black text-white':'bg-white'}`}><b className="text-2xl">{zeroCount}</b><p className="text-xs uppercase">Sin stock</p></button></div>
   <div className="mt-5 flex flex-wrap gap-2"><input className="field min-w-[260px] flex-1" placeholder="Buscar nombre o SKU" value={query} onChange={e=>setQuery(e.target.value)}/><button onClick={refresh} className="flex items-center gap-2 border border-black px-4 font-black uppercase"><RefreshCw size={17}/> Actualizar</button></div>
   {selected.length>0&&<div className="mt-4 flex flex-wrap items-center gap-2 bg-white p-3"><b>{selected.length} seleccionados</b><button disabled={working} onClick={()=>bulk(true)} className="ml-auto flex items-center gap-2 border border-black px-3 py-2 text-xs font-black uppercase"><RotateCcw size={15}/> Publicar</button><button disabled={working} onClick={()=>bulk(false)} className="flex items-center gap-2 bg-black px-3 py-2 text-xs font-black uppercase text-white"><Archive size={15}/> Archivar</button></div>}
   {msg&&<p className="mt-4 bg-white p-3 text-sm font-bold">{msg}</p>}
   <div className="mt-5 overflow-x-auto bg-white"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-black/45"><th className="p-3"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll}/></th><th className="p-3">Producto</th><th className="p-3">SKU</th><th className="p-3">Stock</th><th className="p-3">Estado</th><th className="p-3">Herramientas</th></tr></thead><tbody>{visible.map(p=><tr key={p.id} className="border-b"><td className="p-3"><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>toggle(p.id)}/></td><td className="p-3"><b>{p.name}</b><p className="text-xs text-black/45">{p.category} · {p.collection}</p></td><td className="p-3 font-mono text-xs">{p.sku}</td><td className="p-3"><b className={p.stock===0?'text-red-700':p.stock<=5?'text-orange-700':''}>{p.stock}</b><p className="text-xs text-black/45">{p.variants?.length||0} variantes</p></td><td className="p-3">{p.active?'Publicado':'Archivado'}</td><td className="p-3"><button onClick={()=>openGenerator(p)} className="flex items-center gap-2 border px-3 py-2 text-xs font-black uppercase"><WandSparkles size={15}/> Variantes</button></td></tr>)}</tbody></table>{!visible.length&&<div className="p-8 text-center text-sm text-black/45">No hay productos con este filtro.</div>}</div>
  </div>
 </div>
 {editing&&<div className="fixed inset-0 z-[140] overflow-y-auto bg-black/75 p-4"><div className="mx-auto my-8 max-w-4xl bg-[#f4f2ed] p-6"><div className="flex justify-between"><div><p className="text-xs font-black uppercase text-black/40">Generador automático</p><h3 className="font-display text-4xl">{editing.name}</h3><p className="text-sm text-black/50">{editing.sku}</p></div><button onClick={()=>setEditing(null)}><X/></button></div>
  <div className="mt-6 grid gap-3 md:grid-cols-3"><label className="text-xs font-black uppercase">Tallas separadas por coma<input className="field mt-2" value={sizes} onChange={e=>setSizes(e.target.value)} placeholder="S,M,L,XL"/></label><label className="text-xs font-black uppercase">Colores separados por coma<input className="field mt-2" value={colors} onChange={e=>setColors(e.target.value)} placeholder="Negro,Blanco,Mocha"/></label><label className="text-xs font-black uppercase">Stock inicial nuevas<input className="field mt-2" type="number" min="0" value={initialStock} onChange={e=>setInitialStock(Number(e.target.value))}/></label></div>
  <button disabled={working} onClick={generate} className="mt-4 flex w-full items-center justify-center gap-2 bg-black px-5 py-4 font-black uppercase text-white disabled:opacity-40"><WandSparkles/> Generar y guardar combinaciones</button>
  <div className="mt-7"><h4 className="flex items-center gap-2 font-display text-3xl"><Boxes/> HISTORIAL DE STOCK</h4><div className="mt-3 max-h-72 overflow-auto bg-white">{movements.length?movements.map(m=><div key={m.id} className="grid grid-cols-[1fr_auto] gap-3 border-b p-3 text-sm"><div><b>{m.sku}</b><p className="text-xs text-black/45">{new Date(m.created_at).toLocaleString('es-PE')} · {m.source}</p></div><div className="text-right"><b>{m.old_stock} → {m.new_stock}</b><p className={`text-xs font-black ${m.delta>0?'text-green-700':m.delta<0?'text-red-700':''}`}>{m.delta>0?'+':''}{m.delta}</p></div></div>):<p className="p-5 text-sm text-black/45">Todavía no hay movimientos registrados para este producto.</p>}</div></div>
 </div></div>}
 </div>;
}
