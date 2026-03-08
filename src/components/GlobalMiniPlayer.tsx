'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Minimize2, Maximize2, Play, X, GripVertical } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

type PlayerState = 'open' | 'minimized' | 'closed';
type Corner = 'tl' | 'tr' | 'bl' | 'br';

export function GlobalMiniPlayer() {
  const { liveMiniPlayerConfig } = useAppContext();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  
  const [playerState, setPlayerState] = useState<PlayerState>('closed');
  const [corner, setCorner] = useState<Corner>('br');
  const [bubblePos, setBubblePos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [allowInteractUntil, setAllowInteractUntil] = useState(0);

  const bubbleRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });

  // --- Effect to initialize state from localStorage and config ---
  useEffect(() => {
    if (!isMobile) {
      setPlayerState('closed');
      return;
    }

    const showOnCurrentPage = 
      (pathname === '/' && liveMiniPlayerConfig?.showOnHome) ||
      (pathname.startsWith('/sinuca') && liveMiniPlayerConfig?.showOnSinuca);

    if (!liveMiniPlayerConfig?.enabled || !showOnCurrentPage) {
      setPlayerState('closed');
      return;
    }

    const closedUntil = localStorage.getItem('gmp_closed_until');
    if (closedUntil && new Date().getTime() < parseInt(closedUntil, 10)) {
      setPlayerState('closed');
      return;
    }

    const savedState = localStorage.getItem('gmp_state') as PlayerState | null;
    const savedCorner = localStorage.getItem('gmp_corner') as Corner | null;

    setPlayerState(savedState || liveMiniPlayerConfig.defaultState || 'open');
    setCorner(savedCorner || 'br');
    setBubblePos({ x: 0, y: 0 }); // Reset position on load
  }, [isMobile, liveMiniPlayerConfig, pathname]);

  // --- Effect to persist state to localStorage ---
  useEffect(() => {
    if (playerState !== 'closed') {
      localStorage.setItem('gmp_state', playerState);
    }
    localStorage.setItem('gmp_corner', corner);
  }, [playerState, corner]);

  // --- Drag Handlers ---
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const point = 'touches' in e ? e.touches[0] : e;
    if (bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect();
      offsetRef.current = {
        x: point.clientX - rect.left,
        y: point.clientY - rect.top,
      };
    }
  }, []);

  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !bubbleRef.current) return;
    e.preventDefault();
    const point = 'touches' in e ? e.touches[0] : e;
    setBubblePos({
      x: point.clientX - offsetRef.current.x,
      y: point.clientY - offsetRef.current.y,
    });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging || !bubbleRef.current) return;
    setIsDragging(false);

    const { innerWidth, innerHeight } = window;
    const rect = bubbleRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let newCorner: Corner = 'br';
    if (centerY < innerHeight / 2) {
      newCorner = centerX < innerWidth / 2 ? 'tl' : 'tr';
    } else {
      newCorner = centerX < innerWidth / 2 ? 'bl' : 'br';
    }
    setCorner(newCorner);
    setBubblePos({ x: 0, y: 0 }); // Reset position to snap
  }, [isDragging]);

  // --- State Changers ---
  const handleClose = useCallback(() => {
    setPlayerState('closed');
    const closeUntil = new Date().getTime() + 6 * 60 * 60 * 1000; // 6 hours
    localStorage.setItem('gmp_closed_until', closeUntil.toString());
    localStorage.setItem('gmp_state', 'closed');
  }, []);

  const handleMinimize = useCallback(() => setPlayerState('minimized'), []);
  const handleExpand = useCallback(() => setPlayerState('open'), []);
  
  const handleAllowInteraction = () => {
    setAllowInteractUntil(Date.now() + 10000); // 10 seconds
  };
  
  const isInteracting = Date.now() < allowInteractUntil;

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // --- Render Logic ---
  if (playerState === 'closed' || !liveMiniPlayerConfig) {
    return null;
  }
  
  const videoSrc = `https://www.youtube.com/embed/${liveMiniPlayerConfig.youtubeEmbedId}?autoplay=1&mute=1&playsinline=1&controls=0&loop=1&playlist=${liveMiniPlayerConfig.youtubeEmbedId}`;

  return (
    <>
      {/* Open State (Top Bar) */}
      <div
        className={cn(
          'gmp-container gmp-top-bar',
          playerState === 'open' ? 'active' : ''
        )}
        style={{ '--gmp-top-height': `${liveMiniPlayerConfig.topHeight}px` } as React.CSSProperties}
      >
        <div 
          className="gmp-video-wrapper" 
          style={{ pointerEvents: isInteracting ? 'auto' : 'none' }}
        >
          <iframe src={videoSrc} title={liveMiniPlayerConfig.title} className="gmp-iframe"></iframe>
        </div>
        <div className="gmp-content">
           <Play className="h-6 w-6 text-red-500" />
           <h3 className="gmp-title">{liveMiniPlayerConfig.title}</h3>
        </div>
        <div className="gmp-controls">
          {!isInteracting && (
            <button onClick={handleAllowInteraction} className="gmp-control-btn">Interagir</button>
          )}
          <button onClick={handleMinimize} className="gmp-control-btn"><Minimize2 size={18} /></button>
          <button onClick={handleClose} className="gmp-control-btn"><X size={18} /></button>
        </div>
      </div>

      {/* Minimized State (Bubble) */}
      <div
        ref={bubbleRef}
        className={cn(
          'gmp-container gmp-bubble',
          `gmp-snap-${corner}`,
          playerState === 'minimized' ? 'active' : '',
          isDragging && 'dragging'
        )}
        style={{
          '--gmp-bubble-size': `${liveMiniPlayerConfig.bubbleSize}px`,
          transform: isDragging ? `translate(${bubblePos.x}px, ${bubblePos.y}px)` : '',
        } as React.CSSProperties}
        onClick={!isDragging ? handleExpand : undefined}
      >
        <div className="gmp-bubble-content">
          <Play size={24} className="ml-1" />
          {liveMiniPlayerConfig.showLiveBadge && <div className="gmp-bubble-badge"></div>}
        </div>
        <div 
          className="gmp-drag-handle"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <GripVertical size={20} />
        </div>
      </div>
    </>
  );
}
