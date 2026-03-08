'use client';

import { useAppContext } from '@/context/AppContext';
import { cn } from '@/lib/utils';
import { useEffect, useState, useMemo } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

export const NewsTicker = () => {
  const { news } = useAppContext();
  
  const activeNews = useMemo(() => {
    const filtered = news.filter(n => n.active).sort((a, b) => a.order - b.order);
    return filtered.length > 0 ? filtered : [{ id: 'default', text: 'Bem-vindo ao LotoHub!' }];
  }, [news]);

  const [emblaRef] = useEmblaCarousel({ loop: true, axis: 'y', draggable: true }, [
    Autoplay({ delay: 4000, stopOnInteraction: false })
  ]);

  return (
    <div className="px-4 mb-6">
      <div 
        className="h-[50px] bg-[#111827] rounded-xl overflow-hidden shadow-md flex items-center"
      >
        <div className="embla w-full h-full" ref={emblaRef}>
          <div className="embla__container h-full">
            {activeNews.map((item) => (
              <div 
                key={item.id} 
                className="embla__slide h-full flex items-center px-4"
              >
                <span className="text-white text-base font-medium truncate w-full">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
