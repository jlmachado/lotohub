'use client';

import { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import Image from 'next/image';
import { StatusViewerModal } from './StatusViewerModal';

export function StatusBar() {
  const { banners } = useAppContext();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Proteção defensiva contra banners indefinidos durante a hidratação
  const activeStatus = (banners || [])
    .filter(b => b.active)
    .sort((a, b) => a.position - b.position);

  if (activeStatus.length === 0) return null;

  return (
    <div className="px-4 mb-6">
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide no-scrollbar -mx-4 px-4">
        {activeStatus.map((item, index) => (
          <div
            key={item.id}
            className="flex flex-col items-center gap-1.5 min-w-[72px] cursor-pointer active:scale-95 transition-transform"
            onClick={() => setActiveIndex(index)}
          >
            <div className="w-[64px] h-[64px] rounded-full p-[2.5px] bg-gradient-to-tr from-amber-400 to-orange-600 shadow-md">
              <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-[#111827] bg-muted">
                <Image
                  src={item.imageUrl}
                  alt={item.title}
                  fill
                  className="object-cover"
                />
              </div>
            </div>
            <span className="text-[11px] text-white/90 font-semibold truncate w-[72px] text-center drop-shadow-sm">
              {item.title}
            </span>
          </div>
        ))}
      </div>

      {activeIndex !== null && (
        <StatusViewerModal
          items={activeStatus}
          initialIndex={activeIndex}
          onClose={() => setActiveIndex(null)}
        />
      )}
    </div>
  );
}
