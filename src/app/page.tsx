'use client';

import { Header } from '@/components/header';
import { useEffect, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { PopupDialog } from '@/components/popup-dialog';
import { NewsTicker } from '@/components/NewsTicker';
import { HomeCards } from '@/components/HomeCards';
import { StatusBar } from '@/components/StatusBar';


export default function Home() {
  const { popups, user } = useAppContext();
  const [activePopup, setActivePopup] = useState<any>(null);
  
  useEffect(() => {
    const now = new Date();
    const validPopups = popups
      .filter(p => {
        const isClosed = localStorage.getItem(`popupClosed_${p.id}`);
        if (isClosed) {
          const closedTime = new Date(isClosed);
          if (now.getTime() - closedTime.getTime() < 6 * 60 * 60 * 1000) {
            return false;
          }
        }
        if (!p.active) return false;
        const start = p.startAt ? new Date(p.startAt) : null;
        const end = p.endAt ? new Date(p.endAt) : null;
        if (start && now < start) return false;
        if (end && now > end) return false;
        return true;
      })
      .sort((a, b) => b.priority - a.priority);

    if (validPopups.length > 0) {
      setActivePopup(validPopups[0]);
    }
  }, [popups]);

  const handleClosePopup = () => {
    if (activePopup) {
      localStorage.setItem(`popupClosed_${activePopup.id}`, new Date().toISOString());
      setActivePopup(null);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Header />
      
      {/* Área de Status (Story) */}
      <div className="pt-6">
        <StatusBar />
      </div>

      <NewsTicker />
      
      <HomeCards />

      {user && (
        <PopupDialog 
          popup={activePopup} 
          isOpen={!!activePopup} 
          onOpenChange={(open) => { if(!open) handleClosePopup()}} 
        />
      )}
    </main>
  );
}
