import React from 'react';
import { MessageCircle } from 'lucide-react';

export const WhatsAppFAB: React.FC = () => {
  return (
    <a
      href="https://wa.me/556133876200?text=Olá!%20Vim%20pelo%20aplicativo%20e%20preciso%20de%20ajuda"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-[100]"
      aria-label="Contato via WhatsApp"
    >
      <MessageCircle size={28} fill="currentColor" className="text-white" />
    </a>
  );
};
