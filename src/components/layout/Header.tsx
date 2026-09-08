import React from "react";
import { useTranslation } from "react-i18next";
import { Archive, GearSix, CaretUp, PushPin } from "@phosphor-icons/react";
import { FloatickBrandMark } from "@/components/common/FloatickBrandMark";
import { useTodoStore } from "@/stores/useTodoStore";
import { useNoteStore } from "@/stores/useNoteStore";
import { api } from "@/lib/api";
import { useClipboardStore } from "@/stores/useClipboardStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { Tooltip } from "@/components/common/Tooltip";
import type { MainTab } from "@/types";

interface HeaderProps {
  activeTab: MainTab;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenSettings,
}) => {
  const { t } = useTranslation();

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

  const statusText = (() => {
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
