'use client';

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';
import { Banner } from '@/context/AppContext';
import { useRouter } from 'next/navigation';

interface Props {
  items: Banner[];
  initialIndex: number;
  onClose: () => void;
}

export function StatusViewerModal({ items, initialIndex, onClose }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const router = useRouter();
  const duration = 5000;

  const next = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentIndex, items.length, onClose]);

  const prev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  }, [currentIndex]);

  // Separate effect for auto-advancing logic
  useEffect(() => {
    if (progress >= 100) {
      next();
    }
  }, [progress, next]);

  // Timer to advance progress
  useEffect(() => {
    const intervalTime = 50;
    const step = (intervalTime / duration) * 100;
    
    const timer = setInterval(() => {
      setProgress((p) => Math.min(p + step, 100));
    }, intervalTime);

    return () => clearInterval(timer);
  }, [currentIndex]); // Restart interval when slide changes

  const currentItem = items[currentIndex];

  const handleAction = () => {
    if (currentItem.linkUrl) {
      router.push(currentItem.linkUrl);
      onClose();
    }
  };

  if (!currentItem) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-in fade-in duration-300">
      {/* Progress Bars */}
      <div className="absolute top-4 left-4 right-4 z-[110] flex gap-1.5">
        {items.map((_, idx) => (
          <div key={idx} className="h-[2px] flex-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{
                width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header Info */}
      <div className="absolute top-8 left-4 right-4 z-[110] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border border-white/50 overflow-hidden relative">
            <Image src={currentItem.imageUrl} alt="" fill className="object-cover" />
          </div>
          <span className="text-white font-bold text-sm drop-shadow-md">{currentItem.title}</span>
        </div>
        <button onClick={onClose} className="text-white p-2 hover:bg-white/10 rounded-full transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        {currentItem.imageUrl && (
          <Image
            src={currentItem.imageUrl}
            alt={currentItem.title}
            fill
            className="object-cover opacity-90"
            priority
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-4xl font-black text-white mb-4 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] uppercase italic tracking-tighter">
            {currentItem.title}
          </h2>
          {currentItem.content && (
            <p className="text-xl text-white/90 font-medium drop-shadow-md max-w-xs leading-relaxed">
              {currentItem.content}
            </p>
          )}
        </div>

        {currentItem.linkUrl && (
          <button
            onClick={handleAction}
            className="absolute bottom-12 z-[110] bg-primary text-primary-foreground px-10 py-3.5 rounded-xl font-black text-lg uppercase italic shadow-2xl active:scale-95 transition-transform lux-shine"
          >
            Acessar Agora
          </button>
        )}
      </div>

      {/* Navigation Zones */}
      <div className="absolute inset-0 flex z-[105]">
        <div className="w-1/3 h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); prev(); }} />
        <div className="w-2/3 h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); next(); }} />
      </div>
    </div>
  );
}
