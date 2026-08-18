import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, CreditCard, Menu, MessageCircle, Minus, Plus, Search, ShieldCheck, ShoppingBag, Trash2, X } from 'lucide-react';
import { createMercadoPagoCheckout, createOrder } from './store';
import { loadPublicProducts } from './publicCatalog';
import AdminPanel from './AdminPanel';
import type { CartItem, CheckoutForm, Product } from './types';

const categories = ['Todos', 'Mujer', 'Hombre', 'Niños'] as const;
const departments = ['Amazonas','Áncash','Apurímac','Arequipa','Ayacucho','Cajamarca','Callao','Cusco','Huancavelica','Huánuco','Ica','Junín','La Libertad','Lambayeque','Lima','Loreto','Madre de Dios','Moquegua','Pasco','Piura','Puno','San Martín','Tacna','Tumbes','Ucayali'];
const money = (n:number) => `S/ ${n.toFixed(2)}`;

function Brand(){
  return <div className="flex items-center gap-3"><div className="grid h-9 w-9 grid-cols-3 items-end gap-1"><span className="h-4 skew-x-[-12deg] bg-black"/><span className="h-6 skew-x-[-12deg] bg-black"/><span className="h-8 skew-x-[-12deg] bg-black"/></div><span className="font-display text-3xl tracking-[.12em]">MATEO’S</span></div>;
}

export default function App(){
  const [products,setProducts]=useState<Product[]>([]);
  const [loading,setLoading]=useState(true);
  const [category,setCategory]=useState<(typeof categories)[number]>('Todos');
  const [query,setQuery]=useState('');
  const [selected,setSelected]=useState<Product|null>(null);
  const [size,setSize]=useState('');
  const [color,setColor]=useState('');
  const [photoIndex,setPhotoIndex]=useState(0);
  const [cartOpen,setCartOpen]=useState(false);
  const [checkout,setCheckout]=useState(false);
  const [admin,setAdmin]=useState(false);
  const [menu,setMenu]=useState(false);
  const [notice,setNotice]=useState('');
  const [processing,setProcessing]=useState(false);
  const [cart,setCart]=useState<CartItem[]>(()=>{try{return JSON.parse(localStorage.getItem('mateos-cart')||'[]')}catch{return[]}});
  const [form,setForm]=useState<CheckoutForm>({name:'',email:'',phone:'',department:'',province:'',district:'',shipping:'Agencia de envío',agency:'',notes:'',coupon:''});

  const reloadCatalog=()=>loadPublicProducts().then(setProducts).catch(()=>setNotice('No se pudo actualizar el catálogo.'));
  useEffect(()=>{reloadCatalog().finally(()=>setLoading(false))},[]);
  useEffect(()=>localStorage.setItem('mateos-cart',JSON.stringify(cart)),[cart]);

  const filtered=useMemo(()=>products.filter(p=>(category==='Todos'||p.category===category)&&(!query.trim()||`${p.name} ${p.category} ${p.collection}`.toLowerCase().includes(query.toLowerCase()))),[products,category,query]);
  const total=cart.reduce((s,i)=>s+i.price*i.quantity,0);
  const count=cart.reduce((s,i)=>s+i.quantity,0);
  const selectedVariants=useMemo(()=>selected?.variants?.filter(v=>v.active&&v.stock>0)||[],[selected]);
  const availableSizes=useMemo(()=>[...new Set(selectedVariants.map(v=>v.size))],[selectedVariants]);
  const availableColors=useMemo(()=>[...new Set(selectedVariants.filter(v=>!size||v.size===size).map(v=>v.color))],[selectedVariants,size]);
  const selectedVariant=useMemo(()=>selectedVariants.find(v=>v.size===size&&v.color===color)||null,[selectedVariants,size,color]);
  const selectedImages=useMemo(()=>{
    if(!selected)return[];
    const byColor=color?selected.color_images?.[color]:undefined;
    const base=byColor?.length?byColor:selected.images?.length?selected.images:selected.image?[selected.image]:[];
    return [...new Set(base.filter(Boolean))];
  },[selected,color]);

  const openProduct=(p:Product)=>{
    setSelected(p);
    const variants=(p.variants||[]).filter(v=>v.active&&v.stock>0);
    const first=variants[0];
    setSize(first?.size||p.sizes[0]||'Única');
    setColor(first?.color||p.colors[0]||'Único');
    setPhotoIndex(0);
  };

  useEffect(()=>{
    if(!selected)return;
    if(availableColors.length&&!availableColors.includes(color)){
      setColor(availableColors[0]);
      setPhotoIndex(0);
    }
  },[size,selected,availableColors,color]);

  const add=()=>{
    if(!selected||!selectedVariant){setNotice('Esta combinación de talla y color no tiene stock disponible.');return;}
    setCart(c=>{const i=c.findIndex(x=>x.id===selected.id&&x.size===size&&x.color===color);return i>=0?c.map((x,n)=>n===i?{...x,quantity:Math.min(selectedVariant.stock,x.quantity+1)}:x):[...c,{...selected,size,color,quantity:1}]});
    setSelected(null);setCartOpen(true);
  };
  const valid=()=>Boolean(form.name&&form.phone&&form.department&&form.province&&form.district&&cart.length);

  const submitWhatsApp=async()=>{
    if(!valid()){setNotice('Completa los datos obligatorios y agrega productos.');return;}
    setProcessing(true);
    try{
      const order=await createOrder(form,cart,total);
      const lines=cart.map(i=>`• ${i.name} | ${i.size} | ${i.color} | x${i.quantity} — ${money(i.price*i.quantity)}`).join('\n');
      const msg=`Hola, Mateo’s. Quiero confirmar mi pedido ${order.code}.\n\n${lines}\n\nTotal confirmado: ${money(order.total)}\nDestino: ${form.department}, ${form.province}, ${form.district}\nCliente: ${form.name}\nCelular: ${form.phone}`;
      window.open(`https://wa.me/51945961792?text=${encodeURIComponent(msg)}`,'_blank','noopener,noreferrer');
      setCart([]);setCheckout(false);setNotice(`Pedido ${order.code} registrado.`);
    }catch(e:any){setNotice(e?.message||'No se pudo registrar el pedido.');}
    finally{setProcessing(false);}
  };

  const submitOnline=async()=>{
    if(!valid()){setNotice('Completa los datos obligatorios y agrega productos.');return;}
    if(!form.email){setNotice('Para pagar online necesitamos tu correo.');return;}
    setProcessing(true);
    try{
      const order=await createOrder(form,cart,total);
      const payment=await createMercadoPagoCheckout(order,form.email);
      sessionStorage.setItem('mateos-last-order',order.code);
      window.location.assign(payment.url);
    }catch(e:any){setNotice(e?.message||'El pago online todavía no está disponible. Puedes pedir por WhatsApp.');setProcessing(false);}
  };

  return <div className="min-h-screen bg-[#f4f2ed] text-[#101010]">
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f4f2ed]/95 backdrop-blur">
      <div className="bg-black px-4 py-2 text-center text-[11px] font-bold uppercase tracking-[.16em] text-white">Envíos desde Arequipa a todo el Perú · Compra segura por WhatsApp</div>
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 lg:px-10"><button className="lg:hidden" onClick={()=>setMenu(true)}><Menu/></button><Brand/><nav className="hidden gap-8 lg:flex">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className="text-sm font-bold uppercase tracking-wider">{c}</button>)}</nav><button className="relative p-2" onClick={()=>setCartOpen(true)}><ShoppingBag/>{count>0&&<span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#c9ff36] px-1 text-[10px] font-black">{count}</span>}</button></div>
    </header>

    {menu&&<div className="fixed inset-0 z-50 bg-black p-6 text-white"><button className="float-right" onClick={()=>setMenu(false)}><X/></button><div className="pt-20">{categories.map(c=><button key={c} onClick={()=>{setCategory(c);setMenu(false)}} className="block w-full border-b border-white/20 py-5 text-left font-display text-5xl">{c}</button>)}</div></div>}

    <main>
      <section className="relative min-h-[72vh] overflow-hidden bg-black text-white"><img src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1800&q=88" className="absolute inset-0 h-full w-full object-cover opacity-60"/><div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent"/><div className="relative mx-auto flex min-h-[72vh] max-w-[1440px] items-end px-5 pb-16 lg:px-10"><div><p className="mb-4 text-xs font-bold uppercase tracking-[.3em] text-[#c9ff36]">Nueva temporada</p><h1 className="font-display text-[18vw] leading-[.75] sm:text-8xl lg:text-[10rem]">MUÉVETE<br/>A TU MANERA.</h1><p className="mt-6 max-w-xl text-white/75">Moda workout, deportiva, urbana y confort para mujer, hombre y niños.</p><button onClick={()=>document.getElementById('catalogo')?.scrollIntoView({behavior:'smooth'})} className="mt-7 flex items-center gap-3 bg-white px-7 py-4 text-sm font-black uppercase text-black">Ver colección <ArrowUpRight size={18}/></button></div></div></section>
      <section id="catalogo" className="mx-auto max-w-[1440px] px-5 py-16 lg:px-10"><div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.28em] text-black/45">Colección Mateo’s</p><h2 className="font-display text-6xl">ENCUENTRA TU FIT.</h2></div><label className="flex min-w-[280px] items-center gap-3 border-b-2 border-black bg-white/50 px-4 py-3"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar producto" className="w-full bg-transparent outline-none"/></label></div><div className="mb-8 flex gap-2 overflow-x-auto">{categories.map(c=><button key={c} onClick={()=>setCategory(c)} className={`rounded-full px-5 py-2.5 text-xs font-black uppercase ${category===c?'bg-black text-white':'border border-black/20'}`}>{c}</button>)}</div>{loading?<p>Cargando catálogo...</p>:filtered.length===0?<div className="py-16 text-center text-black/50"><p className="font-display text-4xl">PRONTO NUEVAS PRENDAS</p><p className="mt-2 text-sm">Estamos preparando el catálogo.</p></div>:<div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 lg:grid-cols-4">{filtered.map(p=><article key={p.id}><button className="relative aspect-[3/4] w-full overflow-hidden bg-[#ddd9d0]" onClick={()=>openProduct(p)}><img src={p.image||p.images[0]} alt={p.name} className="h-full w-full object-cover transition duration-500 hover:scale-105"/>{p.badge&&<span className="absolute left-3 top-3 bg-[#c9ff36] px-3 py-1.5 text-[10px] font-black uppercase">{p.badge}</span>}</button><div className="pt-4"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-black/45">{p.category} · {p.collection}</p><button onClick={()=>openProduct(p)} className="mt-1 text-left font-bold">{p.name}</button><p className="mt-2 font-black">{money(p.price)}</p></div></article>)}</div>}</section>
    </main>

    <footer className="bg-[#c9ff36] px-5 py-12 lg:px-10"><div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-8 md:flex-row"><div><Brand/><p className="mt-4 max-w-md text-sm">Moda deportiva y confort para toda la familia. Envíos desde Arequipa.</p></div><div><a href="https://wa.me/51945961792" className="font-bold">+51 945 961 792</a><button onClick={()=>setAdmin(true)} className="mt-4 flex items-center gap-2 text-sm font-bold"><ShieldCheck size={18}/> Administrar tienda</button></div></div></footer>

    {selected&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4"><div className="grid max-h-[94vh] w-full max-w-5xl overflow-y-auto bg-[#f4f2ed] md:grid-cols-2"><div className="p-4"><div className="aspect-[3/4] overflow-hidden bg-[#ddd9d0]"><img src={selectedImages[photoIndex]||selected.image||selected.images[0]} className="h-full w-full object-cover"/></div>{selectedImages.length>1&&<div className="mt-3 grid grid-cols-5 gap-2">{selectedImages.map((url,index)=><button key={`${url}-${index}`} onClick={()=>setPhotoIndex(index)} className={`aspect-square overflow-hidden border-2 ${photoIndex===index?'border-black':'border-transparent'}`}><img src={url} className="h-full w-full object-cover"/></button>)}</div>}</div><div className="relative p-7"><button className="absolute right-5 top-5" onClick={()=>setSelected(null)}><X/></button><p className="text-xs font-bold uppercase text-black/45">{selected.category} · {selected.collection}</p><h3 className="mt-2 font-display text-5xl">{selected.name}</h3><div className="mt-3 flex items-center gap-3"><p className="text-2xl font-black">{money(selected.price)}</p>{selected.old_price&&selected.old_price>selected.price?<p className="text-sm text-black/40 line-through">{money(selected.old_price)}</p>:null}</div><p className="mt-4 text-sm text-black/60">{selected.description}</p><p className="mt-6 text-xs font-black uppercase">Talla</p><div className="mt-2 flex flex-wrap gap-2">{availableSizes.map(s=><button key={s} onClick={()=>{setSize(s);setPhotoIndex(0)}} className={`border px-4 py-2 ${size===s?'bg-black text-white':'bg-white'}`}>{s}</button>)}</div><p className="mt-6 text-xs font-black uppercase">Color</p><div className="mt-2 flex flex-wrap gap-2">{availableColors.map(c=><button key={c} onClick={()=>{setColor(c);setPhotoIndex(0)}} className={`border px-4 py-2 ${color===c?'bg-black text-white':'bg-white'}`}>{c}</button>)}</div>{selectedVariants.length===0?<p className="mt-6 bg-white p-3 text-sm font-bold">Producto temporalmente sin stock.</p>:<button onClick={add} disabled={!selectedVariant} className="mt-7 w-full bg-black px-5 py-4 font-black uppercase text-white disabled:opacity-30">Agregar al carrito</button>}</div></div></div>}

    <div className={`fixed inset-0 z-50 ${cartOpen?'':'pointer-events-none'}`}><div onClick={()=>setCartOpen(false)} className={`absolute inset-0 bg-black/55 transition ${cartOpen?'opacity-100':'opacity-0'}`}/><aside className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#f4f2ed] transition ${cartOpen?'translate-x-0':'translate-x-full'}`}><div className="flex items-center justify-between border-b p-6"><h3 className="font-display text-4xl">CARRITO ({count})</h3><button onClick={()=>setCartOpen(false)}><X/></button></div><div className="flex-1 overflow-y-auto p-6">{cart.map((i,n)=><div key={`${i.id}-${i.size}-${i.color}`} className="mb-5 grid grid-cols-[80px_1fr] gap-4 border-b pb-5"><img src={i.image} className="h-24 w-20 object-cover"/><div><div className="flex justify-between"><div><p className="text-sm font-black">{i.name}</p><p className="text-xs text-black/50">{i.size} · {i.color}</p></div><button onClick={()=>setCart(c=>c.filter((_,x)=>x!==n))}><Trash2 size={16}/></button></div><div className="mt-3 flex items-center justify-between"><div className="flex border"><button className="p-2" onClick={()=>setCart(c=>c.flatMap((x,k)=>k===n?(x.quantity>1?[{...x,quantity:x.quantity-1}]:[]):[x]))}><Minus size={13}/></button><span className="p-2 text-xs font-black">{i.quantity}</span><button className="p-2" onClick={()=>setCart(c=>c.map((x,k)=>k===n?{...x,quantity:x.quantity+1}:x))}><Plus size={13}/></button></div><b>{money(i.price*i.quantity)}</b></div></div></div>)}</div>{cart.length>0&&<div className="border-t bg-white p-6"><div className="mb-4 flex justify-between font-black"><span>Total estimado</span><span>{money(total)}</span></div><button onClick={()=>{setCartOpen(false);setCheckout(true)}} className="w-full bg-black px-5 py-4 font-black uppercase text-white">Continuar compra</button></div>}</aside></div>

    {checkout&&<div className="fixed inset-0 z-[60] grid place-items-center overflow-y-auto bg-black/65 p-4"><div className="relative w-full max-w-xl bg-[#f4f2ed] p-7"><button className="absolute right-5 top-5" onClick={()=>setCheckout(false)}><X/></button><h3 className="font-display text-5xl">FINALIZAR COMPRA</h3><p className="mt-2 text-sm text-black/55">El total final, stock y cupón se verifican antes de registrar el pedido.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><input className="field sm:col-span-2" placeholder="Nombre completo *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input className="field" type="email" placeholder="Correo (opcional)" value={form.email||''} onChange={e=>setForm({...form,email:e.target.value})}/><input className="field" placeholder="Celular *" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/><select className="field" value={form.department} onChange={e=>setForm({...form,department:e.target.value})}><option value="">Departamento *</option>{departments.map(d=><option key={d}>{d}</option>)}</select><input className="field" placeholder="Provincia *" value={form.province} onChange={e=>setForm({...form,province:e.target.value})}/><input className="field" placeholder="Distrito *" value={form.district} onChange={e=>setForm({...form,district:e.target.value})}/><select className="field" value={form.shipping} onChange={e=>setForm({...form,shipping:e.target.value})}><option>Agencia de envío</option><option>Delivery en Arequipa</option><option>Recojo coordinado</option></select><input className="field sm:col-span-2" placeholder="Agencia preferida (opcional)" value={form.agency} onChange={e=>setForm({...form,agency:e.target.value})}/><input className="field sm:col-span-2 uppercase" placeholder="Cupón (opcional)" value={form.coupon||''} onChange={e=>setForm({...form,coupon:e.target.value.toUpperCase()})}/><textarea className="field sm:col-span-2" placeholder="Notas del pedido (opcional)" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></div><div className="mt-6 grid gap-3"><button disabled={processing} onClick={submitWhatsApp} className="flex w-full items-center justify-center gap-2 bg-[#25D366] px-5 py-4 font-black uppercase disabled:opacity-50"><MessageCircle/> {processing?'Registrando...':'Pedir por WhatsApp'}</button><button disabled={processing} onClick={submitOnline} className="flex w-full items-center justify-center gap-2 border border-black px-5 py-3 text-xs font-black uppercase disabled:opacity-40"><CreditCard size={17}/> Pago online (próximamente)</button></div></div></div>}

    {notice&&<div className="fixed bottom-5 left-1/2 z-[80] flex max-w-[92vw] -translate-x-1/2 items-center gap-3 bg-black px-5 py-4 text-sm font-bold text-white"><Check className="shrink-0 text-[#c9ff36]" size={18}/>{notice}<button onClick={()=>setNotice('')}><X size={16}/></button></div>}
    <AdminPanel open={admin} onClose={()=>setAdmin(false)} onCatalogChanged={reloadCatalog}/>
  </div>;
}
