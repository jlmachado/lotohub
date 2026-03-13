'use client';

import { useEffect, useRef } from 'react';
import { ResultsAutoSyncService } from '@/services/results-auto-sync-service';
import { getCurrentUser } from '@/utils/auth';

/**
 * Hook para gerenciar a execução da sincronização automática no cliente.
 * Restrito a usuários administrativos para evitar sobrecarga.
 */
export function useResultsAutoSync() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    // Apenas Admins disparam a sincronização automática
    const isPrivileged = user?.tipoUsuario === 'ADMIN' || user?.tipoUsuario === 'SUPER_ADMIN';
    
    if (!isPrivileged) return;

    const startCycle = async () => {
      const config = ResultsAutoSyncService.getConfig();
      if (!config.enabled) return;

      // Verifica se é hora de rodar
      const now = Date.now();
      const nextRun = config.nextRunAt ? new Date(config.nextRunAt).getTime() : 0;

      if (now >= nextRun) {
        await ResultsAutoSyncService.runCycle();
      }
    };

    // Primeira verificação ao montar
    startCycle();

    // Loop de monitoramento a cada 30 segundos para checar o relógio
    timerRef.current = setInterval(startCycle, 30000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
}
