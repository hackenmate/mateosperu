import { useEffect, useState } from 'react';
import { Check, ShieldCheck, UserPlus, X } from 'lucide-react';
import { getSession, onAuthChange } from './store';
import { getMyAdminState, loadPendingAdminRequests, requestAdminAccess, reviewAdminRequest, type AdminRequest } from './adminAccess';

export default function AdminAccessLauncher(){
  const[session,setSession]=useState<any>(null);
  const[isAdmin,setIsAdmin]=useState(false);
  const[isOwner,setIsOwner]=useState(false);
  const[requestStatus,setRequestStatus]=useState<string|null>(null);
  const[requests,setRequests]=useState<AdminRequest[]>([]);
  const[open,setOpen]=useState(false);
  const[msg,setMsg]=useState('');
  const[busy,setBusy]=useState(false);

  const refresh=async()=>{
    const current=await getSession();
    setSession(current);
    if(!current){setIsAdmin(false);setIsOwner(false);setRequestStatus(null);setRequests([]);return;}
    const state=await getMyAdminState();
    setIsAdmin(state.isAdmin);setIsOwner(state.isOwner);setRequestStatus(state.requestStatus);
    if(state.isOwner)setRequests(await loadPendingAdminRequests());
  };

  useEffect(()=>{
    void refresh();
    const unsub=onAuthChange(()=>void refresh());
    return unsub;
  },[]);

  if(!session)return null;

  const request=async()=>{
    setBusy(true);setMsg('');
    try{await requestAdminAccess('Solicitud de acceso administrativo');await refresh();setMsg('Solicitud enviada. El propietario debe aprobarla.');}
    catch(e:any){setMsg(e?.message||'No se pudo enviar la solicitud.');}
    finally{setBusy(false)}
  };

  const review=async(id:string,approve:boolean)=>{
    setBusy(true);setMsg('');
    try{await reviewAdminRequest(id,approve);await refresh();setMsg(approve?'Administrador aprobado.':'Solicitud rechazada.');}
    catch(e:any){setMsg(e?.message||'No se pudo revisar la solicitud.');}
    finally{setBusy(false)}
  };

  if(isAdmin&&!isOwner)return null;

  return <>
    <button onClick={()=>setOpen(true)} className="fixed bottom-32 left-5 z-[76] flex items-center gap-2 rounded-full border border-black bg-white px-5 py-3 text-sm font-black uppercase text-black shadow-xl">
      {isOwner?<><ShieldCheck size={18}/> Solicitudes admin{requests.length?` (${requests.length})`:''}</>:<><UserPlus size={18}/> Solicitar admin</>}
    </button>
    {open&&<div className="fixed inset-0 z-[135] overflow-y-auto bg-black/75 p-4"><div className="mx-auto my-10 max-w-2xl bg-[#f4f2ed] p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-black/40">Seguridad</p><h2 className="font-display text-4xl">{isOwner?'SOLICITUDES ADMIN':'ACCESO ADMINISTRATIVO'}</h2></div><button onClick={()=>setOpen(false)}><X/></button></div>
      {msg&&<div className="mt-4 bg-white p-3 text-sm font-bold">{msg}</div>}
      {isOwner?<div className="mt-5 space-y-3">{requests.map(r=><div key={r.id} className="bg-white p-4"><b>{r.email||r.user_id}</b><p className="mt-1 text-xs text-black/50">Solicitado: {new Date(r.created_at).toLocaleString('es-PE')}</p>{r.message&&<p className="mt-2 text-sm">{r.message}</p>}<div className="mt-4 flex gap-2"><button disabled={busy} onClick={()=>review(r.id,true)} className="flex items-center gap-2 bg-black px-4 py-3 text-xs font-black uppercase text-white disabled:opacity-40"><Check size={16}/> Aprobar</button><button disabled={busy} onClick={()=>review(r.id,false)} className="border border-red-700 px-4 py-3 text-xs font-black uppercase text-red-700 disabled:opacity-40">Rechazar</button></div></div>)}{!requests.length&&<div className="bg-white p-6 text-center text-sm text-black/50">No hay solicitudes pendientes.</div>}</div>:<div className="mt-5 bg-white p-5"><p className="text-sm text-black/65">Crear una cuenta no otorga permisos administrativos. Puedes solicitar acceso y el propietario principal decidirá si lo aprueba.</p>{requestStatus==='pending'?<div className="mt-4 border border-amber-400 bg-amber-50 p-4 font-bold">Solicitud pendiente de aprobación.</div>:requestStatus==='approved'?<div className="mt-4 bg-[#c9ff36] p-4 font-bold">Tu acceso fue aprobado. Cierra sesión e inicia de nuevo si aún no ves el panel.</div>:<button disabled={busy} onClick={request} className="mt-4 flex w-full items-center justify-center gap-2 bg-black px-5 py-4 font-black uppercase text-white disabled:opacity-40"><UserPlus/> {requestStatus==='rejected'?'Solicitar nuevamente':'Solicitar acceso admin'}</button>}</div>}
    </div></div>}
  </>;
}
