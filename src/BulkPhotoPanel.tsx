import { useMemo, useState } from 'react';
import { FolderOpen, ImagePlus, UploadCloud, X } from 'lucide-react';
import { previewFolderPhotos, uploadFolderPhotos, type FolderPhotoRow } from './bulkPhotoUpload';
import type { Product } from './types';

export default function BulkPhotoPanel({open,onClose,products,onComplete}:{open:boolean;onClose:()=>void;products:Product[];onComplete:()=>Promise<void>|void}){
  const [files,setFiles]=useState<File[]>([]);
  const [rows,setRows]=useState<FolderPhotoRow[]>([]);
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState({done:0,total:0,path:''});
  const [result,setResult]=useState<string>('');

  const matched=useMemo(()=>rows.filter(r=>r.status==='matched'),[rows]);
  const unmatched=useMemo(()=>rows.filter(r=>r.status==='unmatched'),[rows]);
  const groups=useMemo(()=>{
    const map=new Map<string,{sku:string;name:string;color:string;count:number}>();
    for(const row of matched){
      const key=`${row.productId}|${row.color||'General'}`;
      const prev=map.get(key);
      if(prev)prev.count++;
      else map.set(key,{sku:row.productSku||'',name:row.productName||'',color:row.color||'General',count:1});
    }
    return [...map.values()].sort((a,b)=>a.sku.localeCompare(b.sku)||a.color.localeCompare(b.color));
  },[matched]);

  if(!open)return null;

  const selectFolder=(list:FileList|null)=>{
    const selected=Array.from(list||[]).filter(f=>f.type.startsWith('image/'));
    setFiles(selected);
    setRows(previewFolderPhotos(products,selected));
    setResult('');
    setProgress({done:0,total:0,path:''});
  };

  const upload=async()=>{
    if(!matched.length)return;
    setBusy(true);setResult('');
    try{
      const res=await uploadFolderPhotos(products,files,(done,total,path)=>setProgress({done,total,path}));
      setResult(`Carga terminada: ${res.uploaded} fotos subidas · ${res.productsUpdated} productos actualizados · ${res.unmatched.length} sin asociar · ${res.failed.length} fallidas.`);
      await onComplete();
    }catch(e:any){setResult(e?.message||'No se pudo completar la carga.');}
    finally{setBusy(false);}
  };

  return <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/75 p-4">
    <div className="mx-auto my-6 max-w-6xl bg-[#f4f2ed]">
      <div className="flex items-start justify-between border-b p-5">
        <div><p className="text-xs font-black uppercase tracking-[.2em] text-black/40">Catálogo Mateo’s</p><h2 className="font-display text-4xl">CARGA MASIVA DE FOTOS</h2><p className="mt-2 max-w-3xl text-sm text-black/60">Estructura recomendada: <b>CARPETA / SKU / COLOR / fotos</b>. También acepta <b>CARPETA / SKU / fotos</b>.</p></div>
        <button onClick={onClose}><X/></button>
      </div>

      <div className="p-5 lg:p-8">
        <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <section className="space-y-4">
            <label className="flex min-h-52 cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-black/30 bg-white p-8 text-center">
              <FolderOpen size={36}/><b className="uppercase">Seleccionar carpeta completa</b>
              <span className="text-xs text-black/50">Chrome/Edge permiten escoger una carpeta con todas sus subcarpetas.</span>
              <input type="file" className="hidden" accept="image/*" multiple {...({webkitdirectory:'',directory:''} as any)} onChange={e=>selectFolder(e.target.files)}/>
            </label>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-4"><b className="text-2xl">{rows.length}</b><p className="text-xs uppercase text-black/50">Detectadas</p></div>
              <div className="bg-white p-4"><b className="text-2xl">{matched.length}</b><p className="text-xs uppercase text-black/50">Asociadas</p></div>
              <div className="bg-white p-4"><b className="text-2xl">{unmatched.length}</b><p className="text-xs uppercase text-black/50">Sin asociar</p></div>
            </div>

            {busy&&<div className="bg-white p-4"><div className="mb-2 flex justify-between text-xs font-bold"><span>Subiendo</span><span>{progress.done}/{progress.total}</span></div><div className="h-2 overflow-hidden bg-black/10"><div className="h-full bg-black" style={{width:`${progress.total?Math.round(progress.done/progress.total*100):0}%`}}/></div><p className="mt-2 truncate text-xs text-black/50">{progress.path}</p></div>}
            {result&&<div className="bg-white p-4 text-sm font-bold">{result}</div>}
            <button disabled={!matched.length||busy} onClick={upload} className="flex w-full items-center justify-center gap-2 bg-black px-5 py-4 font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-40"><UploadCloud/> {busy?'Subiendo...':'Subir fotografías asociadas'}</button>
          </section>

          <section>
            <h3 className="font-display text-3xl">VISTA PREVIA</h3>
            {!rows.length?<div className="mt-4 flex min-h-64 items-center justify-center bg-white p-8 text-center text-sm text-black/45"><div><ImagePlus className="mx-auto mb-3"/><p>Selecciona tu carpeta para revisar cómo se asociarán las fotografías antes de subirlas.</p></div></div>:<>
              <div className="mt-4 max-h-[420px] overflow-auto bg-white">
                <table className="w-full min-w-[620px] text-left text-sm"><thead className="sticky top-0 bg-white"><tr className="border-b text-xs uppercase text-black/45"><th className="p-3">SKU</th><th className="p-3">Producto</th><th className="p-3">Color</th><th className="p-3">Fotos</th></tr></thead><tbody>{groups.map((g,i)=><tr key={`${g.sku}-${g.color}-${i}`} className="border-b"><td className="p-3 font-bold">{g.sku}</td><td className="p-3">{g.name}</td><td className="p-3">{g.color}</td><td className="p-3 font-black">{g.count}</td></tr>)}</tbody></table>
              </div>
              {unmatched.length>0&&<div className="mt-4 bg-white p-4"><h4 className="font-black uppercase text-red-700">No se encontraron {unmatched.length} archivos</h4><p className="mt-1 text-xs text-black/50">No se subirán hasta que la carpeta o el nombre empiece por un SKU existente.</p><div className="mt-3 max-h-36 overflow-auto text-xs">{unmatched.slice(0,100).map((r,i)=><p key={i} className="border-t py-1">{r.relativePath}</p>)}</div></div>}
            </>}
          </section>
        </div>
      </div>
    </div>
  </div>;
}
