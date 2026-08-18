import { useMemo, useState } from 'react';
import { BrainCircuit, CheckCircle2, FolderOpen, Loader2, Sparkles, UploadCloud, X } from 'lucide-react';
import { analyzeCatalogFiles, groupCatalogPhotos, visionGroupToDraft, type VisionGroup } from './aiCatalogVision';
import { saveProduct, uploadProductImages } from './store';

export default function AICatalogPanel({open,onClose,onCreated}:{open:boolean;onClose:()=>void;onCreated?:()=>void}){
  const [files,setFiles]=useState<File[]>([]);
  const [groups,setGroups]=useState<VisionGroup[]>([]);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const [progress,setProgress]=useState({done:0,total:0});
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [created,setCreated]=useState(0);

  const selectedGroups=useMemo(()=>groups.filter(g=>selected.has(g.id)),[groups,selected]);
  if(!open)return null;

  const choose=(list:FileList|null)=>{
    const imgs=Array.from(list||[]).filter(f=>f.type.startsWith('image/'));
    setFiles(imgs);setGroups([]);setCreated(0);setStatus(imgs.length?`${imgs.length} imágenes listas para analizar.`:'');
  };

  const analyze=async()=>{
    if(!files.length)return;
    if(files.length>200){setStatus('Para mantener el navegador estable, analiza máximo 200 imágenes por lote.');return;}
    setBusy(true);setGroups([]);setCreated(0);
    try{
      const photos=await analyzeCatalogFiles(files,(done,total,text)=>{setProgress({done,total});setStatus(text)});
      const found=groupCatalogPhotos(photos);
      setGroups(found);setSelected(new Set(found.map(g=>g.id)));
      setStatus(`IA terminó: ${photos.length} fotos → ${found.length} grupos de prendas propuestos.`);
    }catch(e:any){setStatus(e?.message||'No se pudo analizar las imágenes.');}
    finally{setBusy(false)}
  };

  const patchGroup=(id:string,patch:Partial<VisionGroup>)=>setGroups(gs=>gs.map(g=>g.id===id?{...g,...patch}:g));
  const toggle=(id:string)=>setSelected(s=>{const n=new Set(s);n.has(id)?n.delete(id):n.add(id);return n});

  const createDrafts=async()=>{
    if(!selectedGroups.length)return;
    setBusy(true);setCreated(0);
    let count=0;
    try{
      for(const group of selectedGroups){
        setStatus(`Creando ${count+1}/${selectedGroups.length}: ${group.proposedName}`);
        const draft=visionGroupToDraft(group);
        const urls=await uploadProductImages(draft.id,group.photos.map(p=>p.file));
        draft.images=urls;
        draft.image=urls[0]||'';
        draft.color_images={[group.color]:urls};
        await saveProduct(draft);
        count++;setCreated(count);
      }
      setStatus(`${count} productos creados como BORRADORES. No están publicados todavía.`);
      onCreated?.();
    }catch(e:any){setStatus(`Se crearon ${count}. Error: ${e?.message||'fallo desconocido'}`)}
    finally{setBusy(false)}
  };

  return <div className="fixed inset-0 z-[140] overflow-y-auto bg-black/80 p-3 md:p-6">
    <div className="mx-auto my-4 max-w-7xl bg-[#f4f2ed]">
      <header className="flex items-start justify-between border-b p-5 md:p-7">
        <div><p className="text-xs font-black uppercase tracking-[.2em] text-black/45">Automatización de catálogo</p><h2 className="font-display text-4xl md:text-5xl">BANDEJA IA</h2><p className="mt-2 max-w-3xl text-sm text-black/60">Selecciona una carpeta desordenada. La IA analiza cada foto, propone tipo de prenda, color, categoría y agrupa imágenes visualmente similares. Luego crea productos como borradores para revisión.</p></div>
        <button onClick={onClose}><X/></button>
      </header>
      <div className="grid gap-6 p-5 md:p-7 lg:grid-cols-[360px_1fr]">
        <aside className="space-y-4">
          <label className="flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-black/30 bg-white p-6 text-center">
            <FolderOpen size={40}/><b className="uppercase">Seleccionar carpeta o muchas fotos</b><span className="text-xs text-black/50">No necesitan SKU ni nombres especiales.</span>
            <input type="file" accept="image/*" multiple className="hidden" {...({webkitdirectory:'',directory:''} as any)} onChange={e=>choose(e.target.files)}/>
          </label>
          <div className="grid grid-cols-2 gap-2"><div className="bg-white p-4 text-center"><b className="text-3xl">{files.length}</b><p className="text-xs uppercase text-black/45">Fotos</p></div><div className="bg-white p-4 text-center"><b className="text-3xl">{groups.length}</b><p className="text-xs uppercase text-black/45">Grupos IA</p></div></div>
          {busy&&<div className="bg-white p-4"><div className="flex items-center gap-2 font-bold"><Loader2 className="animate-spin" size={18}/> Procesando</div><div className="mt-3 h-2 overflow-hidden bg-black/10"><div className="h-full bg-black" style={{width:`${progress.total?Math.round(progress.done/progress.total*100):0}%`}}/></div><p className="mt-2 text-xs text-black/50">{progress.done}/{progress.total}</p></div>}
          {status&&<div className="bg-white p-4 text-sm font-bold">{status}</div>}
          <button disabled={!files.length||busy} onClick={analyze} className="flex w-full items-center justify-center gap-2 bg-black px-5 py-4 font-black uppercase text-white disabled:opacity-30"><BrainCircuit/> Analizar con IA</button>
          <button disabled={!selectedGroups.length||busy} onClick={createDrafts} className="flex w-full items-center justify-center gap-2 bg-[#c9ff36] px-5 py-4 font-black uppercase text-black disabled:opacity-30"><UploadCloud/> Crear {selectedGroups.length||''} borradores</button>
          {created>0&&<p className="flex items-center gap-2 bg-white p-3 text-sm font-bold"><CheckCircle2 size={18}/>{created} creados</p>}
        </aside>
        <section>
          <div className="mb-4 flex items-end justify-between gap-3"><div><h3 className="font-display text-3xl">RESULTADOS</h3><p className="text-xs text-black/50">Desmarca cualquier grupo dudoso antes de crear los borradores.</p></div>{groups.length>0&&<button onClick={()=>setSelected(new Set(groups.map(g=>g.id)))} className="text-xs font-black uppercase underline">Seleccionar todos</button>}</div>
          {!groups.length?<div className="grid min-h-80 place-items-center bg-white p-8 text-center text-black/45"><div><Sparkles className="mx-auto mb-3" size={38}/><p>Las prendas clasificadas aparecerán aquí.</p></div></div>:<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{groups.map(group=><article key={group.id} className={`bg-white p-3 ${selected.has(group.id)?'ring-2 ring-black':''}`}>
            <div className="mb-3 flex items-center justify-between"><label className="flex items-center gap-2 text-xs font-black uppercase"><input type="checkbox" checked={selected.has(group.id)} onChange={()=>toggle(group.id)}/> Incluir</label><span className={`px-2 py-1 text-[10px] font-black uppercase ${group.confidence>=.55?'bg-[#c9ff36]':'bg-yellow-200'}`}>{Math.round(group.confidence*100)}% confianza</span></div>
            <div className="grid grid-cols-3 gap-1">{group.photos.slice(0,6).map(p=><img key={p.id} src={p.url} className="aspect-square w-full object-cover"/>)}{group.photos.length>6&&<div className="grid aspect-square place-items-center bg-black text-white">+{group.photos.length-6}</div>}</div>
            <div className="mt-3 space-y-2"><input className="field font-bold" value={group.proposedName} onChange={e=>patchGroup(group.id,{proposedName:e.target.value})}/><input className="field text-xs" value={group.proposedSku} onChange={e=>patchGroup(group.id,{proposedSku:e.target.value.toUpperCase()})}/><div className="grid grid-cols-2 gap-2"><select className="field text-xs" value={group.audience} onChange={e=>patchGroup(group.id,{audience:e.target.value as any})}><option>Mujer</option><option>Hombre</option><option>Niños</option></select><input className="field text-xs" value={group.color} onChange={e=>patchGroup(group.id,{color:e.target.value})}/></div><p className="text-xs text-black/50">IA: {group.type} · {group.color} · {group.photos.length} foto(s)</p></div>
          </article>)}</div>}
        </section>
      </div>
    </div>
  </div>;
}
