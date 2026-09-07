import React, { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardText, Copy, Star, Trash } from "@phosphor-icons/react";
import { useClipboardStore } from "@/stores/useClipboardStore";
import { formatTime, getGroupLabel } from "@/lib/dateUtils";

export const ClipboardPanel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const items = useClipboardStore((s) => s.items);
  const searchQuery = useClipboardStore((s) => s.searchQuery);
  const showFavoritesOnly = useClipboardStore((s) => s.showFavoritesOnly);
  const setSearchQuery = useClipboardStore((s) => s.setSearchQuery);
  const setShowFavoritesOnly = useClipboardStore((s) => s.setShowFavoritesOnly);
  const loadClipboardItems = useClipboardStore((s) => s.loadClipboardItems);
  const toggleFavorite = useClipboardStore((s) => s.toggleFavorite);
  const deleteItem = useClipboardStore((s) => s.deleteItem);

  useEffect(() => {
    loadClipboardItems();
    const timer = window.setInterval(loadClipboardItems, 2500);
    return () => window.clearInterval(timer);
  }, [loadClipboardItems]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (showFavoritesOnly && !item.favoriteAt) return false;
      if (query && !item.content.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [items, searchQuery, showFavoritesOnly]);

  const groupedItems = useMemo(() => {
    const map = new Map<string, typeof filteredItems>();
    for (const item of filteredItems) {
      const label = getGroupLabel(item.createdAt, i18n.language);
      map.set(label, [...(map.get(label) || []), item]);
    }
    return Array.from(map.entries()).map(([label, groupItems]) => ({ label, items: groupItems }));
  }, [filteredItems, i18n.language]);

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-5 mb-3 flex items-center space-x-2 select-none">
        <div className="flex-1 h-[42px] relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("searchClipboard")}
            className="w-full h-full pl-9 pr-3 text-[13.5px] font-medium rounded-[8px] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:bg-[var(--color-bg-elevated-hover)] focus:placeholder-transparent transition-colors"
          />
          <ClipboardText size={16} weight="bold" className="absolute left-3 text-[var(--color-text-subtle)] pointer-events-none" />
        </div>

        <button
          type="button"
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          title={t("favoritesOnly")}
          className={`w-[42px] h-[42px] shrink-0 rounded-[8px] flex items-center justify-center tactile-btn cursor-pointer transition-colors ${
            showFavoritesOnly
              ? "text-[var(--color-teal-primary)] bg-[var(--color-teal-tint)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)]"
          }`}
        >
          <Star size={20} weight={showFavoritesOnly ? "fill" : "regular"} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3 smooth-scroll">
        {groupedItems.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 space-y-2">
            <ClipboardText size={42} weight="duotone" className="text-[var(--color-teal-primary)]/50" />
            <p className="text-[13.5px] font-semibold text-[var(--color-text-primary)]">
              {t("noClipboardItems")}
            </p>
            <p className="text-[12px] font-medium text-[var(--color-text-subtle)]">
              {t("noClipboardItemsSub")}
            </p>
          </div>
        ) : (
          groupedItems.map((group) => (
            <div key={group.label} className="space-y-0.5">
              <div className="px-2.5 pt-1 text-[12px] font-medium text-[var(--color-text-subtle)]">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="group rounded-[8px] px-3 py-2.5 hover:bg-[var(--color-row-hover)] transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <p className="flex-1 min-w-0 text-[12.5px] leading-[1.48] text-[var(--color-text-primary)] line-clamp-3 select-text whitespace-pre-wrap break-words">
                        {item.content}
                      </p>
                      <div className="flex items-center gap-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => toggleFavorite(item.id)}
                          title={item.favoriteAt ? t("unfavorite") : t("favorite")}
                          className={`w-6 h-6 rounded flex items-center justify-center tactile-btn cursor-pointer ${
                            item.favoriteAt
                              ? "text-[var(--color-teal-primary)]"
                              : "text-[var(--color-text-subtle)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)]"
                          }`}
                        >
                          <Star size={14} weight={item.favoriteAt ? "fill" : "regular"} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.content)}
                          title={t("copy")}
                          className="w-6 h-6 rounded flex items-center justify-center text-[var(--color-text-subtle)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteItem(item.id)}
                          title={t("delete")}
                          className="w-6 h-6 rounded flex items-center justify-center text-[var(--color-text-subtle)] hover:text-[#EF4444] hover:bg-[#EF4444]/10 tactile-btn cursor-pointer"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] font-mono text-[var(--color-text-subtle)]">
                      {formatTime(item.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
