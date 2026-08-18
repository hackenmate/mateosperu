import { useEffect, useState } from 'react';
import { BarChart3, Bell, Camera, Check, Link2, Save, Settings2, ShieldCheck, UserPlus, X } from 'lucide-react';
import { getSession, isCurrentUserAdmin, loadAdminProducts, onAuthChange, saveProduct } from './store';
import { getMyAdminState, loadPendingAdminRequests, requestAdminAccess, reviewAdminRequest, type AdminRequest } from './adminAccess';
import { loadAnalyticsSummary, loadStoreSettings, saveStoreSettings, type AnalyticsSummary, type StoreSettings } from './storefrontExtras';
import { supabase } from './supabase';
import type { Product } from './types';

type Tab='photos'|'analytics'|'social'|'requests';
const emptyAnalytics:AnalyticsSummary={product_view:0,add_to_cart:0,checkout_start:0,whatsapp_order:0};
const emptySocial:StoreSettings={instagram_url:'',tiktok_url:'',facebook_url:''};

export default function AdminExtrasLauncher(){
  const[session,setSession]=useState<any>(null);
  const[isAdmin,setIsAdmin]=useState(false);
  const[isOwner,setIsOwner]=useState(false);
  const[requestStatus,setRequestStatus]=useState<string|null>(null);
  const[requests,setRequests]=useState<AdminRequest[]>([]);
  const[products,setProducts]=useState<Product[]>([]);
  const[open,setOpen]=useState(false);
  const[tab,setTab]=useState<Tab>('photos');
  const[busy,setBusy]=useState('');
  const[msg,setMsg]=useState('');
  const[analytics,setAnalytics]=useState<AnalyticsSummary>(emptyAnalytics);
  const[social,setSocial]=useState<StoreSettings>(emptySocial);
  const[selectedProductId,setSelectedProductId]=useState('');
  const[selectedColor,setSelectedColor]=useState('');
  const[orderAlert,setOrderAlert]=useState('');

  const refreshIdentity=async()=>{
    const current=await getSession();
    setSession(current);
    if(!current){setIsAdmin(false);setIsOwner(false);setRequestStatus(null);setRequests([]);return;}
    const state=await getMyAdminState();
    setIsAdmin(state.isAdmin);setIsOwner(state.isOwner);setRequestStatus(state.requestStatus);
    if(state.isOwner)setRequests(await loadPendingAdminRequests());
  };

  const refreshAdmin=async()=>{
    if(!await isCurrentUserAdmin())return;
    const[p,a,s]=await Promise.all([loadAdminProducts(),loadAnalyticsSummary(),loadStoreSettings()]);
    setProducts(p);setAnalytics(a);setSocial(s);
    if(!selectedProductId&&p[0])setSelectedProductId(p[0].id);
  };

  useEffect(()=>{void refreshIdentity();const unsub=onAuthChange(()=>void refreshIdentity());return unsub},[]);
  useEffect(()=>{if(open&&isAdmin)void refreshAdmin()},[open,isAdmin]);
  useEffect(()=>{
    if(!isAdmin||!supabase)return;
    const channel=supabase.channel('mateos-admin-orders').on('postgres_changes',{event:'INSERT',schema:'public',table:'orders'},payload=>{
      const code=(payload.new as any)?.code||'nuevo';
      setOrderAlert(`Nuevo pedido ${code}`);
      if(typeof Notification!=='undefined'&&Notification.permission==='granted')new Notification('Mateo’s · Nuevo pedido',{body:`Se registró el pedido ${code}`});
    }).subscribe();
    return()=>{void supabase.removeChannel(channel)};
  },[isAdmin]);

  const selectedProduct=products.find(p=>p.id===selectedProductId)||null;
  const colors=selectedProduct?[...new Set((selectedProduct.variants||[]).map(v=>v.color).filter(Boolean))]:[];
  useEffect(()=>{if(colors.length&&!colors.includes(selectedColor))setSelectedColor(colors[0])},[selectedProductId,products]);

  const toggleColorPhoto=(url:string)=>{
    if(!selectedProduct||!selectedColor)return;
    setProducts(current=>current.map(p=>{
      if(p.id!==selectedProduct.id)return p;
      const currentList=p.color_images?.[selectedColor]||[];
      const next=currentList.includes(url)?currentList.filter(x=>x!==url):[...currentList,url];
      return{...p,color_images:{...(p.color_images||{}),[selectedColor]:next}};
    }));
  };

  const saveColorPhotos=async()=>{if(!selectedProduct)return;setBusy('photos');setMsg('');try{await saveProduct(selectedProduct);await refreshAdmin();setMsg('Fotos por color guardadas.')}catch(e:any){setMsg(e?.message||'No se pudieron guardar las fotos.')}finally{setBusy('')}};
  const askAdmin=async()=>{setBusy('request');setMsg('');try{await requestAdminAccess('Solicitud de acceso administrativo');await refreshIdentity();setMsg('Solicitud enviada. El propietario debe aprobarla.')}catch(e:any){setMsg(e?.message||'No se pudo enviar la solicitud.')}finally{setBusy('')}};
  const review=async(id:string,approve:boolean)=>{setBusy(id);setMsg('');try{await reviewAdminRequest(id,approve);await refreshIdentity();setMsg(approve?'Administrador aprobado.':'Solicitud rechazada.')}catch(e:any){setMsg(e?.message||'No se pudo revisar.')}finally{setBusy('')}};
  const saveSocial=async()=>{setBusy('social');setMsg('');try{await saveStoreSettings(social);setMsg('Redes sociales guardadas.')}catch(e:any){setMsg(e?.message||'No se pudieron guardar las redes.')}finally{setBusy('')}};
  const enableNotifications=async()=>{if(typeof Notification==='undefined'){setMsg('Este navegador no admite notificaciones.');return;}const result=await Notification.requestPermission();setMsg(result==='granted'?'Notificaciones de pedidos activadas.':'Permiso de notificaciones no concedido.');};

  if(!session)return null;
  if(!isAdmin)return <>
    <button onClick={()=>setOpen(true)} className="fixed bottom-5 left-5 z-[76] rounded-full border border-black bg-white px-4 py-3 text-xs font-black uppercase shadow-xl"><UserPlus size={17} className="mr-2 inline"/>Solicitar admin</button>
    {open&&<div className="fixed inset-0 z-[140] grid place-items-center bg-black/75 p-4"><div className="w-full max-w-md bg-[#f4f2ed] p-6"><div className="flex justify-between"><h2 className="font-display text-4xl">ACCESO ADMIN</h2><button onClick={()=>setOpen(false)}><X/></button></div><p className="mt-4 text-sm text-black/60">Crear una cuenta no otorga permisos administrativos. El propietario principal debe aprobar tu solicitud.</p>{requestStatus==='pending'?<div className="mt-4 bg-amber-50 p-4 font-bold">Solicitud pendiente.</div>:<button disabled={busy==='request'} onClick={askAdmin} className="mt-5 w-full bg-black px-5 py-4 font-black uppercase text-white">{requestStatus==='rejected'?'Solicitar nuevamente':'Solicitar acceso'}</button>}{msg&&<p className="mt-4 bg-white p-3 text-sm font-bold">{msg}</p>}</div></div>}
  </>;

  return <>
    <button onClick={()=>setOpen(true)} className="fixed bottom-5 left-5 z-[76] flex items-center gap-2 rounded-full bg-[#c9ff36] px-4 py-3 text-xs font-black uppercase text-black shadow-xl"><Settings2 size={17}/>Herramientas</button>
    {orderAlert&&<button onClick={()=>setOrderAlert('')} className="fixed left-1/2 top-20 z-[150] -translate-x-1/2 rounded bg-black px-5 py-3 text-sm font-black text-white shadow-xl"><Bell size={16} className="mr-2 inline text-[#c9ff36]"/>{orderAlert}</button>}
    {open&&<div className="fixed inset-0 z-[140] overflow-y-auto bg-black/75 p-3 sm:p-5"><div className="mx-auto my-4 max-w-6xl bg-[#f4f2ed] p-4 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-black/40">Mateo’s</p><h2 className="font-display text-4xl sm:text-5xl">HERRAMIENTAS</h2><p className="mt-1 text-sm text-black/50">El stock se edita dentro de cada producto, junto a talla y color.</p></div><button onClick={()=>setOpen(false)}><X/></button></div>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">{([['photos','Fotos por color',Camera],['analytics','Analítica',BarChart3],['social','Redes',Link2],...(isOwner?[['requests','Solicitudes',ShieldCheck] as const]:[])] as any[]).map(([id,label,Icon])=><button key={id} onClick={()=>setTab(id)} className={`flex shrink-0 items-center gap-2 px-4 py-3 text-xs font-black uppercase ${tab===id?'bg-black text-white':'border border-black/20 bg-white'}`}><Icon size={16}/>{label}</button>)}</div>
      {msg&&<div className="mt-4 bg-white p-3 text-sm font-bold">{msg}</div>}

      {tab==='photos'&&<div className="mt-5"><div className="grid gap-3 sm:grid-cols-2"><select className="field" value={selectedProductId} onChange={e=>setSelectedProductId(e.target.value)}><option value="">Producto</option>{products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><select className="field" value={selectedColor} onChange={e=>setSelectedColor(e.target.value)}><option value="">Color</option>{colors.map(c=><option key={c}>{c}</option>)}</select></div>{selectedProduct&&selectedColor&&<><p className="mt-4 text-sm font-bold">Marca las fotos que deben mostrarse cuando el cliente elija <b>{selectedColor}</b>.</p><div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">{[...new Set([selectedProduct.image,...(selectedProduct.images||[])].filter(Boolean))].map(url=>{const active=(selectedProduct.color_images?.[selectedColor]||[]).includes(url);return <button key={url} onClick={()=>toggleColorPhoto(url)} className={`relative aspect-square overflow-hidden border-4 ${active?'border-black':'border-transparent'}`}><img src={url} className="h-full w-full object-cover"/>{active&&<span className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-[#c9ff36]"><Check size={14}/></span>}</button>})}</div><button disabled={busy==='photos'} onClick={saveColorPhotos} className="mt-4 bg-black px-5 py-3 text-xs font-black uppercase text-white"><Save size={15} className="mr-2 inline"/>Guardar fotos por color</button></>}</div>}

      {tab==='analytics'&&<div className="mt-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Vistas de producto',analytics.product_view],['Agregados al carrito',analytics.add_to_cart],['Checkouts iniciados',analytics.checkout_start],['Pedidos WhatsApp',analytics.whatsapp_order]].map(([label,value])=><div key={String(label)} className="bg-white p-5"><p className="text-xs font-black uppercase text-black/45">{label}</p><p className="mt-2 font-display text-5xl">{value}</p></div>)}</div><p className="mt-3 text-xs text-black/50">Resumen de los últimos 30 días.</p><button onClick={enableNotifications} className="mt-5 border border-black px-4 py-3 text-xs font-black uppercase"><Bell size={15} className="mr-2 inline"/>Activar avisos del navegador</button></div>}

      {tab==='social'&&<div className="mt-5 max-w-2xl space-y-3"><label className="block"><span className="text-xs font-black uppercase">Instagram</span><input className="field mt-1" placeholder="https://instagram.com/..." value={social.instagram_url} onChange={e=>setSocial({...social,instagram_url:e.target.value})}/></label><label className="block"><span className="text-xs font-black uppercase">TikTok</span><input className="field mt-1" placeholder="https://tiktok.com/@..." value={social.tiktok_url} onChange={e=>setSocial({...social,tiktok_url:e.target.value})}/></label><label className="block"><span className="text-xs font-black uppercase">Facebook</span><input className="field mt-1" placeholder="https://facebook.com/..." value={social.facebook_url} onChange={e=>setSocial({...social,facebook_url:e.target.value})}/></label>{isOwner?<button disabled={busy==='social'} onClick={saveSocial} className="bg-black px-5 py-3 text-xs font-black uppercase text-white"><Save size={15} className="mr-2 inline"/>Guardar redes</button>:<p className="text-sm text-black/50">Solo el propietario puede cambiar las redes.</p>}</div>}

      {tab==='requests'&&isOwner&&<div className="mt-5 space-y-3">{requests.map(r=><div key={r.id} className="bg-white p-4"><b>{r.email||r.user_id}</b><p className="text-xs text-black/50">{new Date(r.created_at).toLocaleString('es-PE')}</p><div className="mt-3 flex gap-2"><button disabled={busy===r.id} onClick={()=>review(r.id,true)} className="bg-black px-4 py-3 text-xs font-black uppercase text-white">Aprobar</button><button disabled={busy===r.id} onClick={()=>review(r.id,false)} className="border border-red-700 px-4 py-3 text-xs font-black uppercase text-red-700">Rechazar</button></div></div>)}{!requests.length&&<div className="bg-white p-6 text-center text-sm text-black/50">No hay solicitudes pendientes.</div>}</div>}
    </div></div>}
  </>;
}
