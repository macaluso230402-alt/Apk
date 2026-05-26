import React from 'react';
import { Droplets, Sun, Trash2 } from 'lucide-react';

export default function PlantCard({ plant, index, onView, onDelete }) {
  return (
    <div
      className="plant-card card-hover cursor-pointer animate-fade-in-up"
      style={{ animationDelay: `${index * 0.1}s` }}
      data-testid={`plant-card-${index}`}
    >
      {plant.image_url && plant.image_url.startsWith('data:') && (
        <div className="h-48 bg-[#F3F5F1] overflow-hidden">
          <img src={plant.image_url} alt={plant.common_name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-4">
        <h3 className="text-xl font-bold text-[#1A2E20] mb-1" data-testid={`plant-name-${index}`}>{plant.common_name}</h3>
        {plant.scientific_name && (
          <p className="text-sm text-[#8A9F8E] italic mb-3">{plant.scientific_name}</p>
        )}
        <div className="flex flex-wrap gap-2 mb-4">
          {plant.pet_friendly && <span className="badge-pet-friendly">Pet-Friendly</span>}
          {plant.light_requirement && (
            <span className="badge-light flex items-center gap-1">
              <Sun size={12} />{plant.light_requirement.substring(0, 30)}
            </span>
          )}
          {plant.water_requirement && (
            <span className="badge-water flex items-center gap-1">
              <Droplets size={12} />{plant.water_requirement.substring(0, 30)}
            </span>
          )}
        </div>
        {plant.description && (
          <p className="text-sm text-[#5C7061] mb-4 line-clamp-2">{plant.description}</p>
        )}
        <div className="flex gap-2">
          <button onClick={() => onView(plant.id)} className="btn-secondary flex-1" data-testid={`view-plant-${index}`}>
            Dettagli
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(plant.id); }}
            className="p-3 hover:bg-red-50 rounded-full text-red-600 transition-colors"
            data-testid={`delete-plant-${index}`}
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
