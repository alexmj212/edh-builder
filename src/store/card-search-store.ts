import { create } from 'zustand';
import type { Card, SearchResult } from '../lib/scryfall';
import { searchCards, fetchNextPage } from '../lib/scryfall';
import { cacheCards } from '../lib/card-cache';

export interface CardSearchFilters {
  name: string;
  type: string;
  oracleText: string;
}

export interface CardSearchState {
  filters: CardSearchFilters;
  results: Card[];
  hasMore: boolean;
  searchHandle: SearchResult | null;
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
  searchHandle: null,
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
    set({ status: 'loading', error: null, results: [], currentPage: 1, hasMore: false, searchHandle: null });
    try {
      const result = await searchCards(query, undefined, signal);
      if (signal.aborted) return;
      set({
        results: result.data,
        hasMore: result.hasMore,
        searchHandle: result,
        currentPage: 1,
        status: 'success',
        error: null,
      });
      void cacheCards(result.data);
    } catch (err) {
      if (isAbortError(err)) return;
      set({ status: 'error', error: (err as Error).message });
    }
  },

  loadMore: async () => {
    const { hasMore, searchHandle, status, currentPage } = get();
    if (!hasMore || !searchHandle || status === 'loading') return;
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    set({ status: 'loading' });
    try {
      const result = await fetchNextPage(searchHandle, signal);
      if (signal.aborted) return;
      set(state => ({
        results: [...state.results, ...result.data],
        hasMore: result.hasMore,
        searchHandle: result,
        currentPage: currentPage + 1,
        status: 'success',
      }));
      void cacheCards(result.data);
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
      searchHandle: null,
      currentPage: 0,
      status: 'idle',
      error: null,
    });
  },
}));
