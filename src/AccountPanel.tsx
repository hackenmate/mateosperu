import { useEffect, useState } from 'react';
import { Heart, LogIn, LogOut, Package, Save, UserRound, X } from 'lucide-react';
import { getSession, loadMyOrders, loadProfile, resetPassword, saveProfile, signInUser, signInWithGoogle, signOutUser, signUpUser } from './store';
import type { OrderRow, Profile } from './types';

export default function AccountPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [session, setSession] = useState<any>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [msg, setMsg] = useState('');

  const refresh = async () => {
    const current = await getSession();
    setSession(current);
    if (current) {
      setProfile(await loadProfile());
      setOrders(await loadMyOrders());
    }
  };

  useEffect(() => {
    if (open) void refresh();
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    try {
      setMsg('');
      if (mode === 'login') await signInUser(email, password);
      else await signUpUser(email, password, name, phone);
      await refresh();
      setMsg(mode === 'register' ? 'Cuenta creada. Revisa tu correo si se requiere confirmación.' : 'Sesión iniciada.');
    } catch (e: any) {
      setMsg(e.message);
    }
  };

  const recover = async () => {
    if (!email) {
      setMsg('Escribe tu correo.');
      return;
    }
    try {
      await resetPassword(email);
      setMsg('Te enviamos un enlace de recuperación.');
    } catch (e: any) {
      setMsg(e.message);
    }
  };

  const persistProfile = async () => {
    try {
      await saveProfile(profile || {});
      setMsg('Perfil guardado.');
    } catch (e: any) {
      setMsg(e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/70 p-4">
      <div className="mx-auto my-8 max-w-3xl bg-[#f4f2ed]">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-black/40">Mateo’s Perú</p>
            <h2 className="font-display text-4xl">MI CUENTA</h2>
          </div>
          <button onClick={onClose}><X /></button>
        </div>

        {!session ? (
          <div className="mx-auto max-w-md p-8">
            <div className="mb-5 flex gap-2">
              <button onClick={() => setMode('login')} className={`flex-1 px-4 py-3 font-black uppercase ${mode === 'login' ? 'bg-black text-white' : 'border'}`}>Ingresar</button>
              <button onClick={() => setMode('register')} className={`flex-1 px-4 py-3 font-black uppercase ${mode === 'register' ? 'bg-black text-white' : 'border'}`}>Crear cuenta</button>
            </div>
            {mode === 'register' && (
              <>
                <input className="field mb-3" placeholder="Nombre completo" value={name} onChange={e => setName(e.target.value)} />
                <input className="field mb-3" placeholder="Celular" value={phone} onChange={e => setPhone(e.target.value)} />
              </>
            )}
            <input className="field mb-3" type="email" placeholder="Correo" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="field" type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />
            <button onClick={submit} className="mt-4 flex w-full items-center justify-center gap-2 bg-black px-5 py-4 font-black uppercase text-white"><LogIn /> {mode === 'login' ? 'Entrar' : 'Registrarme'}</button>
            <button onClick={() => void signInWithGoogle()} className="mt-3 w-full border border-black px-5 py-3 font-black uppercase">Continuar con Google</button>
            {mode === 'login' && <button onClick={recover} className="mt-4 w-full text-sm underline">Olvidé mi contraseña</button>}
            {msg && <p className="mt-4 text-sm font-bold">{msg}</p>}
          </div>
        ) : (
          <div className="p-6 lg:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-black text-white"><UserRound /></div>
                <div><b>{session.user.email}</b><p className="text-xs text-black/50">Cliente Mateo’s Perú</p></div>
              </div>
              <button onClick={async () => { await signOutUser(); setSession(null); setProfile(null); setOrders([]); }} className="flex items-center gap-2 border px-4 py-2 font-bold"><LogOut size={17} /> Salir</button>
            </div>

            <section className="bg-white p-5">
              <h3 className="flex items-center gap-2 font-display text-3xl"><UserRound /> PERFIL</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input className="field" placeholder="Nombre completo" value={profile?.full_name || ''} onChange={e => setProfile({ ...(profile || { user_id: session.user.id, phone: '' }), full_name: e.target.value })} />
                <input className="field" placeholder="Celular" value={profile?.phone || ''} onChange={e => setProfile({ ...(profile || { user_id: session.user.id, full_name: '' }), phone: e.target.value })} />
                <input className="field sm:col-span-2" placeholder="DNI / documento (opcional)" value={profile?.document_number || ''} onChange={e => setProfile({ ...(profile || { user_id: session.user.id, full_name: '', phone: '' }), document_number: e.target.value })} />
              </div>
              <button onClick={persistProfile} className="mt-4 flex items-center gap-2 bg-black px-4 py-3 font-black uppercase text-white"><Save size={17} /> Guardar perfil</button>
            </section>

            <section className="mt-6">
              <h3 className="flex items-center gap-2 font-display text-3xl"><Package /> MIS PEDIDOS</h3>
              <div className="mt-3 space-y-3">
                {orders.length === 0 ? <p className="bg-white p-4 text-sm text-black/50">Todavía no tienes pedidos asociados a tu cuenta.</p> : orders.map(o => (
                  <div key={o.id} className="bg-white p-4">
                    <div className="flex justify-between gap-3">
                      <div><b>{o.code}</b><p className="text-xs text-black/50">{new Date(o.created_at).toLocaleDateString('es-PE')} · {o.status}</p><p className="text-xs text-black/50">Pago: {o.payment_status || 'Pendiente'}</p></div>
                      <b>S/ {Number(o.total).toFixed(2)}</b>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <p className="mt-6 flex items-center gap-2 text-sm text-black/50"><Heart size={16} /> Tus favoritos se sincronizan al iniciar sesión.</p>
            {msg && <p className="mt-5 bg-black p-3 text-sm font-bold text-white">{msg}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
