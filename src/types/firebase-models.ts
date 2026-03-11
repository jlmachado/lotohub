/**
 * @fileOverview Definição de interfaces para persistência no Firestore.
 */

import { User, Banca, NewsMessage, Banner, Popup } from '@/context/AppContext';
import { LedgerEntry } from '@/services/ledger-service';
import { FootballBet, FootballData } from '@/context/AppContext';

export interface FirestoreDocument {
  id: string;
  createdAt: string;
  updatedAt: string;
  bancaId?: string;
}

export type FirestoreUser = User & FirestoreDocument;
export type FirestoreBanca = Banca & FirestoreDocument;
export type FirestoreLedger = LedgerEntry & FirestoreDocument;
export type FirestoreFootballBet = FootballBet & FirestoreDocument;
export type FirestoreNews = NewsMessage & FirestoreDocument;
export type FirestoreBanner = Banner & FirestoreDocument;
export type FirestorePopup = Popup & FirestoreDocument;
