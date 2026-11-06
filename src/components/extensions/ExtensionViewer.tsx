import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { ArrowLeft, ArrowClockwise } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "@/components/common/Tooltip";
import type { LocalExtension } from "@/types";

interface ExtensionViewerProps {
  extension: LocalExtension;
  onClose: () => void;
}

type ResolvedTheme = "light" | "dark";

interface ExtensionThemeMessage {
  type: "floatick:theme";
  theme: ResolvedTheme;
  tokens: Record<string, string>;
}

const extensionThemeTokens = {
  "--floatick-bg": "--color-bg-panel",
  "--floatick-surface": "--color-bg-elevated",
  "--floatick-surface-hover": "--color-bg-elevated-hover",
  "--floatick-text": "--color-text-primary",
  "--floatick-text-secondary": "--color-text-secondary",
  "--floatick-text-subtle": "--color-text-subtle",
  "--floatick-border": "--color-border-panel",
  "--floatick-accent": "--color-teal-primary",
  "--floatick-accent-soft": "--color-teal-tint",
  "--floatick-hover": "--color-hover-overlay",
} as const;

function readExtensionTheme(): ExtensionThemeMessage {
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  const tokens = Object.fromEntries(
    Object.entries(extensionThemeTokens).map(([extensionToken, appToken]) => [
      extensionToken,
      styles.getPropertyValue(appToken).trim(),
    ]),
  );
  return {
    type: "floatick:theme",
    theme: root.classList.contains("dark") ? "dark" : "light",
    tokens,
  };
}

function appendInitialTheme(url: string, theme: ResolvedTheme): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}floatickTheme=${theme}`;
}

export const ExtensionViewer: React.FC<ExtensionViewerProps> = ({ extension, onClose }) => {
  const { t } = useTranslation();
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [themeMessage, setThemeMessage] = useState(readExtensionTheme);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const entryUrl = useMemo(() => {
    const theme = readExtensionTheme().theme;
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      return appendInitialTheme(convertFileSrc(extension.entryPath), theme);
    }
    return appendInitialTheme(extension.entryPath, theme);
  }, [extension.entryPath, reloadKey]);

  const syncTheme = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(themeMessage, "*");
  }, [themeMessage]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeMessage(readExtensionTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    syncTheme();
  }, [syncTheme]);

  useEffect(() => {
    const handleBridgeReady = (event: MessageEvent) => {
      if (
        event.source === iframeRef.current?.contentWindow &&
        event.data?.type === "floatick:theme-ready"
      ) {
        syncTheme();
      }
    };
    window.addEventListener("message", handleBridgeReady);
    return () => window.removeEventListener("message", handleBridgeReady);
  }, [syncTheme]);

  return (
    <section className="flex-1 min-h-0 flex flex-col bg-[var(--color-bg-panel)]">
      <div className="h-10 px-3 border-b border-[var(--color-border-panel)] flex items-center justify-between shrink-0 bg-[var(--color-bg-panel)]">
        <div className="flex items-center min-w-0">
          <Tooltip content={t("back")}>
            <button
              type="button"
              aria-label={t("back")}
              onClick={onClose}
              className="w-7 h-7 mr-1.5 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer"
            >
              <ArrowLeft size={16} weight="bold" />
            </button>
          </Tooltip>
          <span className="text-[12.5px] font-medium text-[var(--color-text-primary)] truncate">
            {extension.name}
          </span>
        </div>
        <Tooltip content={t("reloadExtension")}>
          <button
            type="button"
            aria-label={t("reloadExtension")}
            onClick={() => {
              setLoading(true);
              setReloadKey((key) => key + 1);
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer"
          >
            <ArrowClockwise size={15} weight="bold" />
          </button>
        </Tooltip>
      </div>

      <div className="relative flex-1 min-h-0 bg-[var(--color-bg-panel)]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--color-bg-panel)] text-[12px] text-[var(--color-text-secondary)]">
            {t("loadingExtension")}
          </div>
        )}
        <iframe
          ref={iframeRef}
          key={`${extension.id}-${reloadKey}`}
          src={entryUrl}
          title={extension.name}
          onLoad={() => {
            syncTheme();
            setLoading(false);
          }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups allow-downloads"
          referrerPolicy="no-referrer"
          style={{ colorScheme: themeMessage.theme }}
          className="w-full h-full border-0 bg-[var(--color-bg-panel)]"
        />
      </div>
    </section>
  );
};
