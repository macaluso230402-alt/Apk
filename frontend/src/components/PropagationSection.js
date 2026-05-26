import React from 'react';
import { Scissors } from 'lucide-react';

export default function PropagationSection({ propagation }) {
  if (!propagation) return null;
  return (
    <div className="mt-6" data-testid="propagation-section">
      <div className="flex items-center gap-2 mb-3">
        <Scissors size={20} className="text-[#3E6A4B]" />
        <h3 className="text-lg font-bold text-[#1A2E20]">Propagazione e Talee</h3>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {propagation.difficulty && (
          <span className="text-xs px-3 py-1 rounded-full" style={{ background: '#E2E8E4', color: '#1A2E20' }} data-testid="propagation-difficulty">
            Difficoltà: {propagation.difficulty}
          </span>
        )}
        {propagation.best_season && (
          <span className="badge-light" data-testid="propagation-season">
            Stagione: {propagation.best_season}
          </span>
        )}
        {propagation.rooting_time && (
          <span className="badge-water" data-testid="propagation-time">
            Radicazione: {propagation.rooting_time}
          </span>
        )}
      </div>

      {propagation.methods && propagation.methods.length > 0 && (
        <div className="mb-4">
          <p className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-2">Metodi consigliati</p>
          <div className="flex flex-wrap gap-2">
            {propagation.methods.map((method, idx) => (
              <span key={`${idx}-${method}`} className="badge-pet-friendly" data-testid={`propagation-method-${idx}`}>
                {method}
              </span>
            ))}
          </div>
        </div>
      )}

      {propagation.steps && propagation.steps.length > 0 && (
        <div className="bg-[#F3F5F1] rounded-xl p-4 mb-4">
          <p className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-3">Passi da seguire</p>
          <ol className="space-y-2">
            {propagation.steps.map((step, idx) => (
              <li key={`${idx}-step`} className="flex gap-3 text-sm text-[#1A2E20]" data-testid={`propagation-step-${idx}`}>
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#3E6A4B] text-white text-xs flex items-center justify-center font-bold">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {propagation.tips && (
        <div className="bg-white border-l-4 border-[#E07A5F] rounded-r-xl p-4" data-testid="propagation-tips">
          <p className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-1">Consigli</p>
          <p className="text-sm text-[#1A2E20] italic">{propagation.tips}</p>
        </div>
      )}
    </div>
  );
}
