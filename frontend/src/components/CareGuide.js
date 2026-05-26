import React from 'react';

export default function CareGuide({ careGuide, suitableForUser }) {
  if (!careGuide) return null;
  return (
    <>
      <div className="bg-[#F3F5F1] rounded-xl p-4 space-y-3">
        <h3 className="text-lg font-bold text-[#1A2E20] mb-3">Guida di Cura</h3>
        {careGuide.water && (
          <div data-testid="care-water">
            <p className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-1">Annaffiatura</p>
            <p className="text-base text-[#1A2E20]">{careGuide.water}</p>
          </div>
        )}
        {careGuide.light && (
          <div data-testid="care-light">
            <p className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-1">Luce</p>
            <p className="text-base text-[#1A2E20]">{careGuide.light}</p>
          </div>
        )}
        {careGuide.fertilizer && (
          <div data-testid="care-fertilizer">
            <p className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-1">Fertilizzante</p>
            <p className="text-base text-[#1A2E20]">{careGuide.fertilizer}</p>
          </div>
        )}
        {careGuide.temperature && (
          <div data-testid="care-temperature">
            <p className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-1">Temperatura</p>
            <p className="text-base text-[#1A2E20]">{careGuide.temperature}</p>
          </div>
        )}
        {careGuide.tips && (
          <div data-testid="care-tips">
            <p className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-1">Consigli</p>
            <p className="text-base text-[#1A2E20]">{careGuide.tips}</p>
          </div>
        )}
      </div>

      {suitableForUser && (
        <div className="mt-6">
          <h3 className="text-lg font-bold text-[#1A2E20] mb-3">Adatta per Te</h3>
          <p className="text-base text-[#5C7061] mb-2">Punteggio: {suitableForUser.score}/10</p>
          {suitableForUser.reasons && (
            <ul className="list-disc list-inside space-y-1">
              {suitableForUser.reasons.map((reason, idx) => (
                <li key={`${idx}-${reason}`} className="text-sm text-[#5C7061]">{reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
