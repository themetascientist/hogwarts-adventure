"use client";

import { Location, locations } from "@/lib/locations";

interface GameWorldProps {
  location: Location;
  onNavigate: (locationId: string) => void;
}

export default function GameWorld({ location, onNavigate }: GameWorldProps) {
  return (
    <div className="magical-border p-4 bg-[var(--bg-card)]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-3xl">{location.emoji}</span>
        <h2 className="text-xl font-bold text-[var(--gold)]">
          {location.name}
        </h2>
      </div>
      <p className="text-sm text-[var(--text-secondary)] mb-4 italic leading-relaxed">
        {location.description}
      </p>
      {location.connectedTo.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-[var(--text-secondary)] mr-1 self-center">
            Go to:
          </span>
          {location.connectedTo.map((locId) => {
            const target = locations[locId];
            const label = target ? target.name : locId;
            return (
              <button
                key={locId}
                onClick={() => onNavigate(locId)}
                className="px-3 py-1.5 text-sm bg-[var(--bg-secondary)] text-[var(--gold)]
                           magical-border hover:bg-[var(--gold)] hover:text-[var(--bg-primary)]
                           transition-all cursor-pointer"
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
