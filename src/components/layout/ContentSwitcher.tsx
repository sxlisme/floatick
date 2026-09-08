import React from "react";
import { useTranslation } from "react-i18next";
import type { MainTab } from "@/types";

interface ContentSwitcherProps {
  selected: MainTab;
  onSelected: (tab: MainTab) => void;
}

export const ContentSwitcher: React.FC<ContentSwitcherProps> = ({
  selected,
  onSelected,
}) => {
  const { t } = useTranslation();

  return (
    <div className="px-5 pt-3 mb-3 select-none">
      <div className="h-[40px] flex items-center space-x-[3px]">
        {([
          ["todos", t("todos")],
          ["notes", t("notes")],
          ["clipboard", t("clipboard")],
        ] as [MainTab, string][]).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => onSelected(tab)}
            className={`flex-1 h-full rounded-[8px] flex items-center justify-center text-[13.5px] tactile-btn cursor-pointer ${
              selected === tab
                ? "text-[var(--color-teal-primary)] font-semibold bg-[var(--color-teal-tint)]"
                : "text-[var(--color-text-secondary)] font-medium hover:bg-[var(--color-hover-overlay)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};
