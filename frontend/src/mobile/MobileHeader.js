import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function MobileHeader({ title, showBack = false, right = null }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-[#E2E8E4]">
      <div className="px-4 py-3 flex items-center gap-3">
        {showBack && (
          <button onClick={() => navigate(-1)} className="-ml-1 p-2 hover:bg-[#F3F5F1] rounded-full transition" data-testid="mob-back">
            <ArrowLeft size={22} className="text-[#1A2E20]" />
          </button>
        )}
        <h1 className="text-lg font-bold text-[#1A2E20] flex-1 truncate">{title}</h1>
        {right}
      </div>
    </header>
  );
}
