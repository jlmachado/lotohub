
/**
 * @fileOverview Alias para generateTicketImage (V3) garantindo remoção do QR Code em todo o sistema.
 */

import { generateTicketImage, TicketImageData } from './generateTicketImage';

export async function legacyGenerateTicketImage(ticket: TicketImageData): Promise<string> {
  return generateTicketImage(ticket);
}

export type { TicketImageData };
