import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Sun,
  Moon,
  Desktop,
  Copy,
  Check,
  SignOut,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { api } from "@/lib/api";
import type { ThemePreference, LanguagePreference, PresentationMode } from "@/types";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 focus:outline-none ${
      checked ? "bg-[var(--color-teal-primary)]" : "bg-black/15 dark:bg-white/18"
    }`}
  >
    <div
      className={`w-4 h-4 rounded-full bg-white shadow-xs absolute top-0.5 transition-transform ${
        checked ? "translate-x-4.5" : "translate-x-0.5"
      }`}
    />
  </button>
);

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const updateTheme = useSettingsStore((s) => s.updateTheme);
  const updateLanguage = useSettingsStore((s) => s.updateLanguage);
  const updateAlwaysOnTop = useSettingsStore((s) => s.updateAlwaysOnTop);
  const updatePresentationMode = useSettingsStore((s) => s.updatePresentationMode);
  const updatePanelScale = useSettingsStore((s) => s.updatePanelScale);

  const [autostart, setAutostart] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [panelScaleDraft, setPanelScaleDraft] = useState(settings.panelScale);

  useEffect(() => {
    if (isOpen) {
      api.isAutostartEnabled().then(setAutostart).catch(() => {});
      setPanelScaleDraft(settings.panelScale);
    }
  }, [isOpen, settings.panelScale]);

  if (!isOpen) return null;

  const handleToggleAutostart = async () => {
    const next = !autostart;
    try {
      await api.setAutostartEnabled(next);
      setAutostart(next);
    } catch (err) {
      console.error("Failed to update autostart:", err);
    }
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText("~/.floatick");
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 1800);
  };

  const handleQuit = async () => {
    await api.quitApp();
  };

  const commitPanelScale = async (value = panelScaleDraft) => {
    const next = Math.min(1.5, Math.max(0.5, Number(value.toFixed(2))));
    setPanelScaleDraft(next);
    if (next !== settings.panelScale) {
      await updatePanelScale(next);
    }
  };

  const handleResetPanelScale = async () => {
    setPanelScaleDraft(1);
    if (settings.panelScale !== 1) {
      await updatePanelScale(1);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-[var(--color-bg-panel)] text-[var(--color-text-primary)] flex flex-col select-none animate-in fade-in duration-150">
      {/* Header */}
      <div className="h-12 px-4 border-b border-[var(--color-border-panel)] flex items-center justify-between shrink-0 bg-[var(--color-bg-panel)]">
        <span className="text-[14px] font-semibold text-[var(--color-text-primary)] tracking-tight">
          {t("settingsTitle")}
        </span>
        <button
          type="button"
          onClick={onClose}
          title={t("escToClose")}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)] transition-colors tactile-btn cursor-pointer"
        >
          <X size={16} weight="bold" />
        </button>
      </div>

      {/* Settings Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-4 no-scrollbar">
        {/* Appearance & Language */}
        <div>
          <span className="text-[12px] font-medium text-[var(--color-text-subtle)] px-1 block mb-1.5">
            {t("appearanceSectionTitle")}
          </span>
          <div className="bg-[var(--color-bg-elevated)] rounded-xl border border-[var(--color-border-panel)] divide-y divide-[var(--color-border-panel)] overflow-hidden">
            {/* Theme */}
            <div className="px-3.5 py-2 flex items-center justify-between min-h-[44px]">
              <span className="text-[13px] text-[var(--color-text-primary)]">
                {t("themeLabel")}
              </span>
              <div className="flex items-center p-0.5 bg-[var(--color-hover-overlay)] rounded-lg shrink-0">
                {[
                  { id: "system" as ThemePreference, label: t("themeSystemTooltip"), icon: Desktop },
                  { id: "light" as ThemePreference, label: t("themeLightTooltip"), icon: Sun },
                  { id: "dark" as ThemePreference, label: t("themeDarkTooltip"), icon: Moon },
                ].map(({ id, label, icon: Icon }) => {
                  const isActive = settings.theme === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => updateTheme(id)}
                      className={`px-2.5 py-1 text-[11.5px] rounded-md transition-all flex items-center space-x-1.5 cursor-pointer tactile-btn ${
                        isActive
                          ? "bg-[var(--color-bg-drawer)] text-[var(--color-teal-primary)] font-medium shadow-xs"
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      <Icon size={14} weight={isActive ? "fill" : "regular"} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language */}
            <div className="px-3.5 py-2 flex items-center justify-between min-h-[44px]">
              <span className="text-[13px] text-[var(--color-text-primary)]">
                {t("languageLabel")}
              </span>
              <div className="flex items-center p-0.5 bg-[var(--color-hover-overlay)] rounded-lg shrink-0">
                {[
                  { id: "zh" as LanguagePreference, label: "中文" },
                  { id: "en" as LanguagePreference, label: "English" },
                  { id: "system" as LanguagePreference, label: "Auto" },
                ].map(({ id, label }) => {
                  const isActive = settings.language === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => updateLanguage(id)}
                      className={`px-2.5 py-1 text-[11.5px] rounded-md transition-all cursor-pointer tactile-btn ${
                        isActive
                          ? "bg-[var(--color-bg-drawer)] text-[var(--color-teal-primary)] font-medium shadow-xs"
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div>
          <span className="text-[12px] font-medium text-[var(--color-text-subtle)] px-1 block mb-1.5">
            {t("preferencesSectionTitle")}
          </span>
          <div className="bg-[var(--color-bg-elevated)] rounded-xl border border-[var(--color-border-panel)] divide-y divide-[var(--color-border-panel)] overflow-hidden">
            {/* Launch at Login */}
            <div className="px-3.5 py-2.5 flex items-center justify-between min-h-[44px]">
              <span className="text-[13px] text-[var(--color-text-primary)]">
                {t("openAtLoginLabel")}
              </span>
              <ToggleSwitch
                checked={autostart}
                onChange={handleToggleAutostart}
              />
            </div>

            {/* Always on Top */}
            <div className="px-3.5 py-2.5 flex items-center justify-between min-h-[44px]">
              <span className="text-[13px] text-[var(--color-text-primary)]">
                {t("alwaysOnTopLabel")}
              </span>
              <ToggleSwitch
                checked={settings.alwaysOnTop}
                onChange={updateAlwaysOnTop}
              />
            </div>

            {/* Presentation Mode */}
            <div className="px-3.5 py-2.5 flex items-center justify-between min-h-[48px] gap-3">
              <span className="text-[13px] text-[var(--color-text-primary)]">
                {t("presentationModeLabel")}
              </span>
              <div className="flex items-center p-0.5 bg-[var(--color-hover-overlay)] rounded-lg shrink-0">
                {[
                  { id: "panelPersistent" as PresentationMode, label: t("presentationPanelPersistent") },
                  { id: "ballPersistent" as PresentationMode, label: t("presentationBallPersistent") },
                  { id: "transient" as PresentationMode, label: t("presentationTransient") },
                ].map(({ id, label }) => {
                  const isActive = settings.presentationMode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => updatePresentationMode(id)}
                      className={`px-2 py-1 text-[11.5px] rounded-md transition-all whitespace-nowrap cursor-pointer tactile-btn ${
                        isActive
                          ? "bg-[var(--color-bg-drawer)] text-[var(--color-teal-primary)] font-medium shadow-xs"
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Panel Scale */}
            <div className="px-3.5 py-2.5 min-h-[60px]">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-[13px] text-[var(--color-text-primary)]">
                  {t("panelScaleLabel")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="min-w-[42px] text-right text-[12px] font-mono text-[var(--color-text-subtle)]">
                    {Math.round(panelScaleDraft * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={handleResetPanelScale}
                    title={t("resetPanelScale")}
                    className="w-7 h-7 rounded-[8px] flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer"
                  >
                    <ArrowCounterClockwise size={15} weight="bold" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.01}
                value={panelScaleDraft}
                onChange={(event) => setPanelScaleDraft(Number(event.target.value))}
                onMouseUp={() => commitPanelScale()}
                onTouchEnd={() => commitPanelScale()}
                onKeyUp={() => commitPanelScale()}
                onBlur={() => commitPanelScale()}
                className="w-full accent-[var(--color-teal-primary)] cursor-pointer"
              />
              <div className="mt-1 flex justify-between text-[10.5px] font-mono text-[var(--color-text-subtle)]">
                <span>50%</span>
                <span>150%</span>
              </div>
            </div>
          </div>
        </div>

        {/* About & Data */}
        <div>
          <span className="text-[12px] font-medium text-[var(--color-text-subtle)] px-1 block mb-1.5">
            {t("aboutSectionTitle")}
          </span>
          <div className="bg-[var(--color-bg-elevated)] rounded-xl border border-[var(--color-border-panel)] divide-y divide-[var(--color-border-panel)] overflow-hidden">
            {/* Storage Path */}
            <div className="px-3.5 py-2 flex items-center justify-between min-h-[44px]">
              <span className="text-[13px] text-[var(--color-text-primary)]">
                {t("workingDirectorySectionTitle")}
              </span>
              <button
                type="button"
                onClick={handleCopyPath}
                title={t("copyPath")}
                className="flex items-center space-x-1.5 px-2 py-1 rounded-md text-[12px] font-mono text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)] transition-colors cursor-pointer tactile-btn"
              >
                <span>~/.floatick</span>
                {copiedPath ? (
                  <Check size={13} weight="bold" className="text-[var(--color-teal-primary)]" />
                ) : (
                  <Copy size={13} weight="regular" className="text-[var(--color-text-subtle)]" />
                )}
              </button>
            </div>

            {/* Version */}
            <div className="px-3.5 py-2.5 flex items-center justify-between min-h-[44px]">
              <span className="text-[13px] text-[var(--color-text-primary)]">
                {t("versionLabel")}
              </span>
              <span className="text-[12px] font-mono text-[var(--color-text-subtle)]">
                v0.5.1
              </span>
            </div>
          </div>
        </div>

        {/* Quit Action */}
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={handleQuit}
            className="text-[12px] text-red-500/80 hover:text-red-600 hover:bg-red-500/8 px-3 py-1.5 rounded-lg transition-colors cursor-pointer tactile-btn flex items-center space-x-1.5 font-medium"
          >
            <SignOut size={14} weight="bold" />
            <span>{t("quitFloatick")}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
