import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CaretLeft,
  CaretRight,
  CheckSquare,
  ClipboardText,
  Copy,
  Square,
  Star,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useClipboardStore } from "@/stores/useClipboardStore";
import { formatTime, getGroupLabel } from "@/lib/dateUtils";
import { Tooltip } from "@/components/common/Tooltip";

const PAGE_SIZE = 20;

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
  const deleteItems = useClipboardStore((s) => s.deleteItems);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);

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

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pagedItems = filteredItems.slice(pageStart, pageStart + PAGE_SIZE);
  const pageItemIds = pagedItems.map((item) => item.id);
  const allPageSelected =
    pageItemIds.length > 0 && pageItemIds.every((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;
  const pendingDeleteCount = pendingDeleteIds?.length ?? 0;
  const rangeStart = filteredItems.length === 0 ? 0 : pageStart + 1;
  const rangeEnd = Math.min(pageStart + PAGE_SIZE, filteredItems.length);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, showFavoritesOnly]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    const visibleIds = new Set(filteredItems.map((item) => item.id));
    setSelectedIds((previous) => {
      const next = new Set([...previous].filter((id) => visibleIds.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [filteredItems]);

  const groupedItems = useMemo(() => {
    const map = new Map<string, typeof pagedItems>();
    for (const item of pagedItems) {
      const label = getGroupLabel(item.createdAt, i18n.language);
      map.set(label, [...(map.get(label) || []), item]);
    }
    return Array.from(map.entries()).map(([label, groupItems]) => ({ label, items: groupItems }));
  }, [pagedItems, i18n.language]);

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleCurrentPageSelection = () => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (allPageSelected) {
        pageItemIds.forEach((id) => next.delete(id));
      } else {
        pageItemIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const confirmDelete = async () => {
    if (!pendingDeleteIds?.length) return;
    if (pendingDeleteIds.length === 1) {
      await deleteItem(pendingDeleteIds[0]);
    } else {
      await deleteItems(pendingDeleteIds);
    }
    setSelectedIds((previous) => {
      const deleted = new Set(pendingDeleteIds);
      return new Set([...previous].filter((id) => !deleted.has(id)));
    });
    setPendingDeleteIds(null);
  };

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      <div className="px-5 mb-2 flex items-center space-x-2 select-none">
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

        <Tooltip content={t("favoritesOnly")}>
          <button
            type="button"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`w-[42px] h-[42px] shrink-0 rounded-[8px] flex items-center justify-center tactile-btn cursor-pointer transition-colors ${
              showFavoritesOnly
                ? "text-[var(--color-teal-primary)] bg-[var(--color-teal-tint)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)]"
            }`}
          >
            <Star size={20} weight={showFavoritesOnly ? "fill" : "regular"} />
          </button>
        </Tooltip>
      </div>

      {filteredItems.length > 0 && (
        <div className="px-5 mb-2 flex items-center justify-between gap-2 select-none">
          <button
            type="button"
            onClick={toggleCurrentPageSelection}
            className="h-8 px-2.5 rounded-[8px] flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer"
          >
            {allPageSelected ? (
              <CheckSquare size={15} weight="fill" className="text-[var(--color-teal-primary)]" />
            ) : (
              <Square size={15} />
            )}
            <span>{t("selectCurrentPage")}</span>
          </button>

          <div className="flex items-center gap-1.5">
            {selectedCount > 0 && (
              <>
                <span className="text-[12px] font-medium text-[var(--color-text-subtle)]">
                  {t("selectedItems", { count: selectedCount })}
                </span>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="h-8 px-2 rounded-[8px] text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer"
                >
                  {t("clearSelection")}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDeleteIds([...selectedIds])}
                  className="h-8 px-2.5 rounded-[8px] flex items-center gap-1.5 text-[12px] font-semibold text-[#EF4444] hover:bg-[#EF4444]/10 tactile-btn cursor-pointer"
                >
                  <Trash size={14} weight="bold" />
                  <span>{t("deleteSelected")}</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
                    className={`group rounded-[8px] px-3 py-2.5 transition-colors ${
                      selectedIds.has(item.id)
                        ? "bg-[var(--color-teal-tint)]"
                        : "hover:bg-[var(--color-row-hover)]"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Tooltip content={selectedIds.has(item.id) ? t("clearSelection") : t("select")}>
                        <button
                          type="button"
                          onClick={() => toggleSelected(item.id)}
                          className="w-6 h-6 mt-0.5 rounded flex items-center justify-center text-[var(--color-text-subtle)] hover:text-[var(--color-teal-primary)] hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer shrink-0"
                        >
                          {selectedIds.has(item.id) ? (
                            <CheckSquare size={15} weight="fill" className="text-[var(--color-teal-primary)]" />
                          ) : (
                            <Square size={15} />
                          )}
                        </button>
                      </Tooltip>
                      <p className="flex-1 min-w-0 text-[12.5px] leading-[1.48] text-[var(--color-text-primary)] line-clamp-3 select-text whitespace-pre-wrap break-words">
                        {item.content}
                      </p>
                      <div className="flex items-center gap-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Tooltip content={item.favoriteAt ? t("unfavorite") : t("favorite")}>
                          <button
                            type="button"
                            onClick={() => toggleFavorite(item.id)}
                            className={`w-6 h-6 rounded flex items-center justify-center tactile-btn cursor-pointer ${
                              item.favoriteAt
                                ? "text-[var(--color-teal-primary)]"
                                : "text-[var(--color-text-subtle)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)]"
                            }`}
                          >
                            <Star size={14} weight={item.favoriteAt ? "fill" : "regular"} />
                          </button>
                        </Tooltip>
                        <Tooltip content={t("copy")}>
                          <button
                            type="button"
                            onClick={() => handleCopy(item.content)}
                            className="w-6 h-6 rounded flex items-center justify-center text-[var(--color-text-subtle)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer"
                          >
                            <Copy size={14} />
                          </button>
                        </Tooltip>
                        <Tooltip content={t("delete")}>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteIds([item.id])}
                            className="w-6 h-6 rounded flex items-center justify-center text-[var(--color-text-subtle)] hover:text-[#EF4444] hover:bg-[#EF4444]/10 tactile-btn cursor-pointer"
                          >
                            <Trash size={14} />
                          </button>
                        </Tooltip>
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

      {filteredItems.length > PAGE_SIZE && (
        <div className="h-11 px-5 border-t border-[var(--color-border-panel)] flex items-center justify-between shrink-0 bg-[var(--color-bg-panel)] select-none">
          <span className="text-[11.5px] font-mono text-[var(--color-text-subtle)]">
            {t("clipboardItemsRange", {
              start: rangeStart,
              end: rangeEnd,
              total: filteredItems.length,
            })}
          </span>
          <div className="flex items-center gap-1.5">
            <Tooltip content={t("previousPage")}>
              <button
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage <= 1}
                className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)] disabled:opacity-35 disabled:pointer-events-none tactile-btn cursor-pointer"
              >
                <CaretLeft size={15} weight="bold" />
              </button>
            </Tooltip>
            <span className="min-w-[56px] text-center text-[12px] font-mono text-[var(--color-text-secondary)]">
              {t("pageIndicator", { page: currentPage, total: totalPages })}
            </span>
            <Tooltip content={t("nextPage")}>
              <button
                type="button"
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                disabled={currentPage >= totalPages}
                className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)] disabled:opacity-35 disabled:pointer-events-none tactile-btn cursor-pointer"
              >
                <CaretRight size={15} weight="bold" />
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      {pendingDeleteIds && (
        <div className="absolute inset-0 z-[80] bg-black/20 dark:bg-black/45 flex items-center justify-center p-5">
          <div className="w-full max-w-[320px] rounded-[14px] border border-[var(--color-border-panel)] bg-[var(--color-bg-panel)] shadow-xl overflow-hidden">
            <div className="px-4 pt-4 pb-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#EF4444]/12 text-[#EF4444] flex items-center justify-center shrink-0">
                <WarningCircle size={19} weight="fill" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-[var(--color-text-primary)]">
                  {t(
                    pendingDeleteCount > 1
                      ? "deleteClipboardItemsConfirmTitle"
                      : "deleteClipboardItemConfirmTitle",
                    { count: pendingDeleteCount }
                  )}
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--color-text-secondary)]">
                  {t("deleteClipboardConfirmMessage")}
                </p>
              </div>
              <Tooltip content={t("close")}>
                <button
                  type="button"
                  onClick={() => setPendingDeleteIds(null)}
                  className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[var(--color-text-subtle)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer shrink-0"
                >
                  <X size={15} weight="bold" />
                </button>
              </Tooltip>
            </div>
            <div className="px-4 py-3 border-t border-[var(--color-border-panel)] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteIds(null)}
                className="h-8 px-3 rounded-[8px] text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="h-8 px-3 rounded-[8px] text-[12px] font-semibold text-white bg-[#EF4444] hover:bg-[#DC2626] tactile-btn cursor-pointer"
              >
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
