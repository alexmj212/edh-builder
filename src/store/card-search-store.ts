import { create } from 'zustand';
import type { ScryfallCard } from '@scryfall/api-types';
import { searchCards, fetchNextPage } from '../lib/scryfall-client';
import { cacheCards } from '../lib/card-cache';

export interface CardSearchFilters {
  name: string;
  type: string;
  oracleText: string;
}

export interface CardSearchState {
  filters: CardSearchFilters;
  results: ScryfallCard.Any[];
  hasMore: boolean;
  nextPageUrl: string | null;
  currentPage: number;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  setFilter: (key: keyof CardSearchFilters, value: string) => void;
  search: (query: string) => Promise<void>;
  loadMore: () => Promise<void>;
  reset: () => void;
}

let controller: AbortController | null = null;

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export const useCardSearchStore = create<CardSearchState>((set, get) => ({
  filters: { name: '', type: '', oracleText: '' },
  results: [],
  hasMore: false,
  nextPageUrl: null,
  currentPage: 0,
  status: 'idle',
  error: null,

  setFilter: (key, value) => {
    set(state => ({ filters: { ...state.filters, [key]: value } }));
  },

  search: async (query) => {
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    set({ status: 'loading', error: null, results: [], currentPage: 1, hasMore: false, nextPageUrl: null });
    try {
      const list = await searchCards(query, 1, signal);
      if (signal.aborted) return;
      set({
        results: list.data,
        hasMore: list.has_more,
        nextPageUrl: list.next_page ?? null,
        currentPage: 1,
        status: 'success',
        error: null,
      });
      void cacheCards(list.data);
    } catch (err) {
      if (isAbortError(err)) return;
      set({ status: 'error', error: (err as Error).message });
    }
  },

  loadMore: async () => {
    const { hasMore, nextPageUrl, status, currentPage } = get();
    if (!hasMore || !nextPageUrl || status === 'loading') return;
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    set({ status: 'loading' });
    try {
      const list = await fetchNextPage(nextPageUrl, signal);
      if (signal.aborted) return;
      set(state => ({
        results: [...state.results, ...list.data],
        hasMore: list.has_more,
        nextPageUrl: list.next_page ?? null,
        currentPage: currentPage + 1,
        status: 'success',
      }));
      void cacheCards(list.data);
    } catch (err) {
      if (isAbortError(err)) return;
      set({ status: 'error', error: (err as Error).message });
    }
  },

  reset: () => {
    controller?.abort();
    controller = null;
    set({
      filters: { name: '', type: '', oracleText: '' },
      results: [],
      hasMore: false,
      nextPageUrl: null,
      currentPage: 0,
      status: 'idle',
      error: null,
    });
  },
}));
