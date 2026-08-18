import { useEffect, useState } from 'react';
import { Boxes } from 'lucide-react';
import { isCurrentUserAdmin, onAuthChange } from './store';
import InventoryToolsPanel from './InventoryToolsPanel';

export default function InventoryToolsLauncher(){
  const [isAdmin,setIsAdmin]=useState(false);
  const [open,setOpen]=useState(false);

  useEffect(()=>{
    let alive=true;
    const check=async()=>{
      const value=await isCurrentUserAdmin();
      if(alive)setIsAdmin(value);
    };
    void check();
    const unsubscribe=onAuthChange(()=>void check());
    return()=>{alive=false;unsubscribe()};
  },[]);

  if(!isAdmin)return null;

  return <>
    <button onClick={()=>setOpen(true)} className="fixed bottom-5 left-5 z-[70] flex items-center gap-2 rounded-full bg-[#c9ff36] px-5 py-3 text-sm font-black uppercase text-black shadow-xl" aria-label="Abrir herramientas de inventario"><Boxes size={18}/> Inventario</button>
    <InventoryToolsPanel open={open} onClose={()=>setOpen(false)} onChanged={()=>{}}/>
  </>;
}
