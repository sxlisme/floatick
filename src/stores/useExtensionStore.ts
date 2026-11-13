import { create } from "zustand";
import { api } from "@/lib/api";
import i18n from "@/i18n";
import type { LocalExtension } from "@/types";

interface ExtensionState {
  extensions: LocalExtension[];
  loading: boolean;
  error: string | null;
  loadExtensions: () => Promise<void>;
  importExtension: (sourcePath: string, name: string) => Promise<LocalExtension>;
  addUrlExtension: (url: string, name: string) => Promise<LocalExtension>;
  renameExtension: (id: string, name: string) => Promise<LocalExtension>;
  removeExtension: (id: string) => Promise<void>;
  clearError: () => void;
}

const errorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "extension-import:no-html") {
    return i18n.t("extensionNoHtmlError");
  }
  if (message === "extension-import:ambiguous-html") {
    return i18n.t("extensionAmbiguousHtmlError");
  }
  if (message === "extension-url:invalid") {
    return i18n.t("extensionInvalidUrlError");
  }
  return message;
};

export const useExtensionStore = create<ExtensionState>((set) => ({
  extensions: [],
  loading: false,
  error: null,

  loadExtensions: async () => {
    set({ loading: true, error: null });
    try {
      const extensions = await api.listExtensions();
      set({ extensions, loading: false });
    } catch (error) {
      set({ loading: false, error: errorMessage(error) });
    }
  },

  importExtension: async (sourcePath, name) => {
    set({ loading: true, error: null });
    try {
      const extension = await api.importExtension(sourcePath, name);
      set((state) => ({
        extensions: [...state.extensions, extension],
        loading: false,
      }));
      return extension;
    } catch (error) {
      const message = errorMessage(error);
      set({ loading: false, error: message });
      throw error;
    }
  },

  addUrlExtension: async (url, name) => {
    set({ loading: true, error: null });
    try {
      const extension = await api.addUrlExtension(url, name);
      set((state) => ({
        extensions: [...state.extensions, extension],
        loading: false,
      }));
      return extension;
    } catch (error) {
      const message = errorMessage(error);
      set({ loading: false, error: message });
      throw error;
    }
  },

  renameExtension: async (id, name) => {
    set({ error: null });
    try {
      const updated = await api.renameExtension(id, name);
      set((state) => ({
        extensions: state.extensions.map((extension) =>
          extension.id === id ? updated : extension
        ),
      }));
      return updated;
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    }
  },

  removeExtension: async (id) => {
    set({ error: null });
    try {
      await api.removeExtension(id);
      set((state) => ({
        extensions: state.extensions.filter((extension) => extension.id !== id),
      }));
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
