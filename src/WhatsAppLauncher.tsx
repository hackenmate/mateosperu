import { MessageCircle } from 'lucide-react';

const WHATSAPP_NUMBER='51945961792';
const DEFAULT_MESSAGE='Hola Mateo’s, vi su tienda online y quisiera información sobre sus productos. ¿Me pueden ayudar?';

export default function WhatsAppLauncher(){
  const href=`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(DEFAULT_MESSAGE)}`;
  return <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-20 right-5 z-[70] flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-black shadow-xl sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3 sm:text-sm sm:font-black sm:uppercase"
    aria-label="Consultar por WhatsApp"
  >
    <MessageCircle size={20}/><span className="hidden sm:inline">WhatsApp</span>
  </a>;
}
