import { MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER='51945961792';
const DEFAULT_MESSAGE='Hola Mateo’s, vi su tienda online y quisiera información sobre sus productos. ¿Me pueden ayudar?';

export default function WhatsAppLauncher(){
  const href=`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;
  return <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-20 right-5 z-[70] flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-black uppercase text-black shadow-xl"
    aria-label="Consultar por WhatsApp"
  >
    <MessageCircle size={18}/> WhatsApp
  </a>;
}
