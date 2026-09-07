import { create } from "zustand";
import type { ClipboardItem } from "@/types";
import { api } from "@/lib/api";

interface ClipboardState {
  items: ClipboardItem[];
  isLoaded: boolean;
  searchQuery: string;
  showFavoritesOnly: boolean;

  setSearchQuery: (query: string) => void;
  setShowFavoritesOnly: (value: boolean) => void;
  loadClipboardItems: () => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useClipboardStore = create<ClipboardState>((set, get) => ({
  items: [],
  isLoaded: false,
  searchQuery: "",
  showFavoritesOnly: false,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setShowFavoritesOnly: (value) => set({ showFavoritesOnly: value }),

  loadClipboardItems: async () => {
    try {
      const items = await api.getClipboardItems();
      set({ items, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  toggleFavorite: async (id) => {
    const now = new Date().toISOString();
    const items = get().items.map((item) =>
      item.id === id
        ? { ...item, favoriteAt: item.favoriteAt ? null : now }
        : item
    );
    set({ items });
    await api.saveClipboardItems(items);
  },

  deleteItem: async (id) => {
    const items = get().items.filter((item) => item.id !== id);
    set({ items });
    await api.saveClipboardItems(items);
  },
}));
