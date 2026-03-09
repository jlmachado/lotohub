'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { useAppContext } from '@/context/AppContext';
import { Skeleton } from '@/components/ui/skeleton';

interface WidgetProps {
  type: string;
  leagueId?: number;
  season?: number;
  teamId?: number;
  matchId?: number;
  targetLeague?: string;
  targetTeam?: string;
  targetGame?: string;
  targetStandings?: string;
  className?: string;
  id?: string;
}

export const FootballWidget = ({
  type,
  leagueId,
  season,
  teamId,
  matchId,
  targetLeague,
  targetTeam,
  targetGame,
  targetStandings,
  className,
  id
}: WidgetProps) => {
  return (
    <div 
      id={id}
      className={className}
      data-type={type}
      data-league={leagueId}
      data-season={season}
      data-team={teamId}
      data-fixture={matchId}
      data-target-league={targetLeague}
      data-target-team={targetTeam}
      data-target-game={targetGame}
      data-target-standings={targetStandings}
    />
  );
};

export const FootballWidgetContainer = ({ children }: { children: React.ReactNode }) => {
  const { footballApiConfig } = useAppContext();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const cfg = footballApiConfig.widgetConfig;

  useEffect(() => {
    // Trigger script re-parse when it's already loaded but content changes
    if (scriptLoaded && typeof (window as any)._apiSports !== 'undefined') {
      (window as any)._apiSports.load();
    }
  }, [scriptLoaded, children]);

  return (
    <div className="w-full">
      <Script 
        src="https://widgets.api-sports.io/2.0.0/widgets.js" 
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      
      {/* Configuration Widget */}
      <div 
        data-type="config"
        data-sport="football"
        data-key={footballApiConfig.apiKey}
        data-lang={cfg.lang}
        data-theme={cfg.theme}
        data-show-error={cfg.showErrors ? 'true' : 'false'}
        data-show-logos={cfg.showLogos ? 'true' : 'false'}
        data-refresh={cfg.refresh}
        data-standings={cfg.standings ? 'true' : 'false'}
        data-team-squad={cfg.squad ? 'true' : 'false'}
        data-team-statistics={cfg.statistics ? 'true' : 'false'}
        data-player-statistics={cfg.playerStatistics ? 'true' : 'false'}
        data-player-injuries={cfg.injuries ? 'true' : 'false'}
        data-tab={cfg.defaultTab}
        data-game-tab={cfg.gameTab}
        className="hidden"
      />

      {children}
    </div>
  );
};
