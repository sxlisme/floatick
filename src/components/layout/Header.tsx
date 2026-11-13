import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Archive,
  ArrowSquareOut,
  GearSix,
  CaretUp,
  FileHtml,
  GlobeSimple,
  PushPin,
  PuzzlePiece,
  SlidersHorizontal,
} from "@phosphor-icons/react";
import { FloatickBrandMark } from "@/components/common/FloatickBrandMark";
import { useTodoStore } from "@/stores/useTodoStore";
import { useNoteStore } from "@/stores/useNoteStore";
import { api } from "@/lib/api";
import { useClipboardStore } from "@/stores/useClipboardStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { Tooltip } from "@/components/common/Tooltip";
import type { LocalExtension, MainTab } from "@/types";

interface HeaderProps {
  activeTab: MainTab;
  extensions: LocalExtension[];
  activeExtensionId: string | null;
  onOpenSettings: () => void;
  onOpenExtensionSettings: () => void;
  onOpenExtension: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  extensions,
  activeExtensionId,
  onOpenSettings,
  onOpenExtensionSettings,
  onOpenExtension,
}) => {
  const { t } = useTranslation();
  const [showExtensions, setShowExtensions] = useState(false);

  useEffect(() => {
    if (!showExtensions) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setShowExtensions(false);
      }
    };
    window.addEventListener("keydown", handleEscape, true);
    return () => window.removeEventListener("keydown", handleEscape, true);
  }, [showExtensions]);

  const todos = useTodoStore((s) => s.todos);
  const activeScope = useTodoStore((s) => s.activeScope);
  const setActiveScope = useTodoStore((s) => s.setActiveScope);

  const notes = useNoteStore((s) => s.notes);
  const clipboardItems = useClipboardStore((s) => s.items);
  const alwaysOnTop = useSettingsStore((s) => s.settings.alwaysOnTop);
  const updateAlwaysOnTop = useSettingsStore((s) => s.updateAlwaysOnTop);

  const activeTodoCount = todos.filter((t) => !t.completedAt && !t.archivedAt).length;
  const archivedTodoCount = todos.filter((t) => !!t.archivedAt).length;

  const activeNoteCount = notes.filter((n) => !n.archivedAt).length;
  const archivedNoteCount = notes.filter((n) => !!n.archivedAt).length;

  const isArchived = activeScope === "archived";
  const activeExtension = extensions.find((extension) => extension.id === activeExtensionId);

  const statusText = (() => {
    if (activeExtension) {
      return activeExtension.name;
    }
    if (activeTab === "clipboard") {
      return t("clipboardCount", { count: clipboardItems.length });
    }
    if (activeTab === "notes") {
      return isArchived
        ? `${t("archive")} · ${archivedNoteCount}`
        : t("noteCount", { count: activeNoteCount });
    }
    if (isArchived) {
      return `${t("archive")} · ${archivedTodoCount}`;
    }
    return activeTodoCount === 0
      ? t("allClear")
      : t("tasksRemaining", { count: activeTodoCount });
  })();

  const handleToggleArchive = () => {
    setActiveScope(isArchived ? "active" : "archived");
  };

  const handleCollapse = async () => {
    await api.hideWindow();
  };

  const handleDragStart = () => {
    api.startWindowDrag();
  };

  return (
    <header
      onMouseDown={handleDragStart}
      className="px-5 pt-[18px] pb-[16px] flex items-center justify-between select-none cursor-grab active:cursor-grabbing bg-[var(--color-bg-header)] border-b border-[var(--color-border-panel)]"
    >
      {/* Left: 38px Brand Mark + Status Text */}
      <div className="flex items-center space-x-[11px] min-w-0 flex-1 mr-2">
        <FloatickBrandMark size={38} />
        <span className="text-[13px] font-medium text-[var(--color-text-secondary)] truncate tracking-tight">
          {statusText}
        </span>
      </div>

      {/* Right: Icon Buttons */}
      <div className="flex items-center space-x-1 shrink-0 text-[var(--color-text-secondary)]">
        {/* Always on Top */}
        <Tooltip content={alwaysOnTop ? t("unpinWindow") : t("pinWindow")}>
          <button
            type="button"
            aria-pressed={alwaysOnTop}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={() => void updateAlwaysOnTop(!alwaysOnTop)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center tactile-btn cursor-pointer ${
              alwaysOnTop
                ? "text-[var(--color-teal-primary)] bg-[var(--color-teal-tint-active)]"
                : "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)]"
            }`}
          >
            <PushPin size={18} weight={alwaysOnTop ? "fill" : "regular"} />
          </button>
        </Tooltip>

        {/* Archive */}
        <Tooltip content={isArchived ? t("active") : t("archive")}>
          <button
            type="button"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={handleToggleArchive}
            className={`w-8 h-8 rounded-lg flex items-center justify-center tactile-btn cursor-pointer ${
              isArchived
                ? "text-[var(--color-teal-primary)] bg-[var(--color-teal-tint-active)]"
                : "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)]"
            }`}
          >
            <Archive size={18} weight={isArchived ? "fill" : "regular"} />
          </button>
        </Tooltip>

        {/* Extensions */}
        <div className="relative">
          <Tooltip content={t("extensions")}>
            <button
              type="button"
              aria-expanded={showExtensions}
              aria-haspopup="menu"
              onMouseDown={(event) => event.stopPropagation()}
              onClick={() => setShowExtensions((visible) => !visible)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center tactile-btn cursor-pointer ${
                showExtensions || activeExtensionId
                  ? "text-[var(--color-teal-primary)] bg-[var(--color-teal-tint-active)]"
                  : "hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)]"
              }`}
            >
              <PuzzlePiece size={18} weight={activeExtensionId ? "fill" : "regular"} />
            </button>
          </Tooltip>

          {showExtensions && (
            <>
              <button
                type="button"
                aria-label={t("close")}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => setShowExtensions(false)}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div
                role="menu"
                onMouseDown={(event) => event.stopPropagation()}
                className="absolute right-0 top-full mt-1.5 z-50 w-64 max-h-[320px] overflow-y-auto rounded-lg bg-[var(--color-bg-drawer)] border border-[var(--color-border-drawer)] shadow-2xl p-1.5 no-scrollbar"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowExtensions(false);
                    onOpenExtensionSettings();
                  }}
                  className="w-full h-8 px-2 rounded-md flex items-center gap-2 text-left text-[12.5px] text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer"
                >
                  <SlidersHorizontal size={15} className="text-[var(--color-text-secondary)]" />
                  <span>{t("extensionSettings")}</span>
                </button>

                <div className="my-1 border-t border-[var(--color-border-panel)]" />

                {extensions.length === 0 ? (
                  <div className="px-2 py-5 text-center text-[11.5px] text-[var(--color-text-subtle)]">
                    {t("noExtensions")}
                  </div>
                ) : (
                  extensions.map((extension) => {
                    const isActive = extension.id === activeExtensionId;
                    const isUrl = extension.sourceType === "url";
                    return (
                      <div
                        key={extension.id}
                        role="none"
                        className={`group w-full min-h-9 rounded-md flex items-center transition-colors ${
                          isActive
                            ? "bg-[var(--color-teal-tint)] text-[var(--color-teal-primary)]"
                            : "text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)]"
                        }`}
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setShowExtensions(false);
                            onOpenExtension(extension.id);
                          }}
                          className="min-w-0 flex-1 self-stretch px-2 py-1.5 flex items-center gap-2 text-left tactile-btn cursor-pointer"
                        >
                          <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                              isUrl
                                ? "bg-sky-500/10 text-sky-500"
                                : "bg-[var(--color-teal-tint)] text-[var(--color-teal-primary)]"
                            }`}
                          >
                            {isUrl ? (
                              <GlobeSimple size={14} weight="bold" />
                            ) : (
                              <FileHtml size={14} weight="bold" />
                            )}
                          </span>
                          <span className="text-[12.5px] truncate">{extension.name}</span>
                        </button>
                        <Tooltip content={t("openInBrowser")}>
                          <button
                            type="button"
                            role="menuitem"
                            aria-label={t("openInBrowser")}
                            onClick={() => {
                              setShowExtensions(false);
                              void api.openExtensionExternal(extension.id).catch((error) => {
                                console.error("Failed to open extension externally", error);
                              });
                            }}
                            className="w-8 h-8 mr-0.5 rounded-md shrink-0 flex items-center justify-center text-[var(--color-text-subtle)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)] tactile-btn cursor-pointer"
                          >
                            <ArrowSquareOut size={14} weight="bold" />
                          </button>
                        </Tooltip>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Settings */}
        <Tooltip content={t("settings")}>
          <button
            type="button"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={onOpenSettings}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer"
          >
            <GearSix size={18} />
          </button>
        </Tooltip>

        {/* Collapse */}
        <Tooltip content={t("escToClose")}>
          <button
            type="button"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={handleCollapse}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer"
          >
            <CaretUp size={18} weight="bold" />
          </button>
        </Tooltip>
      </div>
    </header>
  );
};
