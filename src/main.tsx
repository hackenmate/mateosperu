import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { UserRound } from 'lucide-react';
import App from './App';
import AccountPanel from './AccountPanel';
import AdminExtrasLauncher from './AdminExtrasLauncher';
import './index.css';

function Root(){
  const [accountOpen,setAccountOpen]=useState(false);

  return <>
    <App />
    {!accountOpen&&<>
      <AdminExtrasLauncher />
      <button onClick={()=>setAccountOpen(true)} className="fixed bottom-5 right-5 z-[72] flex items-center gap-2 rounded-full bg-black px-4 py-3 text-xs font-black uppercase text-white shadow-xl sm:px-5 sm:text-sm" aria-label="Abrir mi cuenta"><UserRound size={18}/><span className="hidden sm:inline">Mi cuenta</span></button>
    </>}
    <AccountPanel open={accountOpen} onClose={()=>setAccountOpen(false)}/>
  </>;
}

createRoot(document.getElementById('root')!).render(<StrictMode><Root /></StrictMode>);
