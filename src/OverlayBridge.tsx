import { useEffect } from 'react';

export default function OverlayBridge(){
  useEffect(()=>{
    const root=document.getElementById('root');
    if(!root)return;

    const sync=()=>{
      const overlays=Array.from(root.querySelectorAll<HTMLElement>('.fixed.inset-0'));
      const hasOpenOverlay=overlays.some(el=>{
        if(el.classList.contains('pointer-events-none'))return false;
        const style=getComputedStyle(el);
        return style.display!=='none'&&style.visibility!=='hidden';
      });
      document.body.classList.toggle('mateos-overlay-open',hasOpenOverlay);
    };

    const observer=new MutationObserver(sync);
    observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
    sync();
    return()=>{
      observer.disconnect();
      document.body.classList.remove('mateos-overlay-open');
    };
  },[]);
  return null;
}
