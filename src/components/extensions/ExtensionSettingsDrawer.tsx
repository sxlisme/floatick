import React, { useEffect, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  ArrowLeft,
  Check,
  FileZip,
  FileHtml,
  FolderOpen,
  GlobeSimple,
  LinkSimple,
  PencilSimple,
  Plus,
  PuzzlePiece,
  Trash,
  X,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { Tooltip } from "@/components/common/Tooltip";
import { api } from "@/lib/api";
import { useExtensionStore } from "@/stores/useExtensionStore";

interface ExtensionSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenExtension: (id: string) => void;
}

type PendingSource = {
  path: string;
  kind: "folder" | "zip" | "url";
};

const sourceDisplayName = (path: string): string => {
  const lastSegment = path.split(/[\\/]/).filter(Boolean).pop() || "Extension";
  return lastSegment.replace(/\.zip$/i, "");
};

const urlDisplayName = (value: string): string => {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
};

export const ExtensionSettingsDrawer: React.FC<ExtensionSettingsDrawerProps> = ({
  isOpen,
  onClose,
  onOpenExtension,
}) => {
  const { t } = useTranslation();
  const extensions = useExtensionStore((state) => state.extensions);
  const loading = useExtensionStore((state) => state.loading);
  const error = useExtensionStore((state) => state.error);
  const loadExtensions = useExtensionStore((state) => state.loadExtensions);
  const importExtension = useExtensionStore((state) => state.importExtension);
  const addUrlExtension = useExtensionStore((state) => state.addUrlExtension);
  const renameExtension = useExtensionStore((state) => state.renameExtension);
  const removeExtension = useExtensionStore((state) => state.removeExtension);
  const clearError = useExtensionStore((state) => state.clearError);

  const [pendingSource, setPendingSource] = useState<PendingSource | null>(null);
  const [importName, setImportName] = useState("");
  const [isImportNameCustomized, setIsImportNameCustomized] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      void loadExtensions();
    } else {
      setPendingSource(null);
      setEditingId(null);
      setDeleteId(null);
      setDialogError(null);
      clearError();
    }
  }, [isOpen, loadExtensions, clearError]);

  if (!isOpen) return null;

  const selectSource = async (kind: "folder" | "zip") => {
    clearError();
    setDialogError(null);
    try {
      await api.setAutoHideSuspended(true);
      const selection = await open(
        kind === "folder"
          ? {
              directory: true,
              multiple: false,
              title: t("selectExtensionFolder"),
            }
          : {
              directory: false,
              multiple: false,
              title: t("selectExtensionZip"),
              filters: [{ name: "ZIP", extensions: ["zip"] }],
            }
      );
      if (typeof selection === "string") {
        setPendingSource({ path: selection, kind });
        setImportName(sourceDisplayName(selection));
        setIsImportNameCustomized(false);
      }
    } catch (selectionError) {
      setDialogError(
        selectionError instanceof Error ? selectionError.message : String(selectionError)
      );
    } finally {
      await api.setAutoHideSuspended(false).catch(() => {});
    }
  };

  const startUrlExtension = () => {
    clearError();
    setDialogError(null);
    setPendingSource({ path: "", kind: "url" });
    setImportName("");
    setIsImportNameCustomized(false);
  };

  const confirmImport = async () => {
    if (!pendingSource || !pendingSource.path.trim() || !importName.trim()) return;
    try {
      if (pendingSource.kind === "url") {
        await addUrlExtension(pendingSource.path, importName.trim());
      } else {
        await importExtension(pendingSource.path, importName.trim());
      }
      setPendingSource(null);
      setImportName("");
      setIsImportNameCustomized(false);
    } catch {
      // The store exposes the backend validation message in this drawer.
    }
  };

  const confirmRename = async () => {
    if (!editingId || !editingName.trim()) return;
    try {
      await renameExtension(editingId, editingName.trim());
      setEditingId(null);
    } catch {
      // The store exposes the backend validation message in this drawer.
    }
  };

  const confirmRemove = async (id: string) => {
    try {
      await removeExtension(id);
      setDeleteId(null);
    } catch {
      // The store exposes the backend validation message in this drawer.
    }
  };

  return (
    <div className="absolute inset-0 z-[70] bg-[var(--color-bg-panel)] text-[var(--color-text-primary)] flex flex-col select-none animate-in fade-in duration-150">
      <div
        onMouseDown={() => void api.startWindowDrag()}
        className="h-12 px-4 border-b border-[var(--color-border-panel)] flex items-center justify-between shrink-0 cursor-grab active:cursor-grabbing"
      >
        <span className="text-[14px] font-semibold tracking-tight">
          {t("extensionSettings")}
        </span>
        <Tooltip content={t("back")}>
          <button
            type="button"
            aria-label={t("back")}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer"
          >
            <ArrowLeft size={17} weight="bold" />
          </button>
        </Tooltip>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-4 no-scrollbar">
        <section>
          <span className="text-[12px] font-medium text-[var(--color-text-subtle)] px-1 block mb-1.5">
            {t("addExtension")}
          </span>
          <div className="mb-2.5 px-2.5 py-2 rounded-md border border-[var(--color-border-panel)] bg-[var(--color-hover-overlay)] text-[11px] text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-1.5 mb-1">
              <FolderOpen size={13} className="shrink-0" />
              <span>{t("extensionFolderPathHint")}</span>
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <FileZip size={13} className="shrink-0" />
              <span>{t("extensionZipPathHint")}</span>
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <GlobeSimple size={13} className="shrink-0" />
              <span>{t("extensionUrlHint")}</span>
            </div>
            <p className="pl-[19px] text-[10.5px] text-[var(--color-text-subtle)]">
              {t("extensionImportPathNote")}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => void selectSource("folder")}
              className="h-9 px-2 rounded-lg border border-[var(--color-border-panel)] bg-[var(--color-bg-elevated)] flex items-center justify-center gap-1.5 text-[12.5px] font-medium hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer"
            >
              <FolderOpen size={16} />
              <span>{t("importFolder")}</span>
            </button>
            <button
              type="button"
              onClick={() => void selectSource("zip")}
              className="h-9 px-2 rounded-lg border border-[var(--color-border-panel)] bg-[var(--color-bg-elevated)] flex items-center justify-center gap-1.5 text-[12.5px] font-medium hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer"
            >
              <FileZip size={16} />
              <span>{t("importZip")}</span>
            </button>
            <button
              type="button"
              onClick={startUrlExtension}
              className="h-9 px-2 rounded-lg border border-[var(--color-border-panel)] bg-[var(--color-bg-elevated)] flex items-center justify-center gap-1.5 text-[12.5px] font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-500/8 hover:border-sky-500/30 tactile-btn cursor-pointer"
            >
              <LinkSimple size={16} weight="bold" />
              <span>{t("addUrl")}</span>
            </button>
          </div>

          {pendingSource && (
            <div className="mt-2.5 border border-[var(--color-border-panel)] rounded-lg bg-[var(--color-bg-elevated)] p-3">
              {pendingSource.kind === "url" ? (
                <div className="flex items-center gap-2 mb-2.5 min-w-0">
                  <GlobeSimple size={15} weight="bold" className="shrink-0 text-sky-500" />
                  <input
                    type="url"
                    value={pendingSource.path}
                    autoFocus
                    onChange={(event) => {
                      const value = event.target.value;
                      setPendingSource({ kind: "url", path: value });
                      if (!isImportNameCustomized) {
                        setImportName(urlDisplayName(value));
                      }
                    }}
                    onBlur={() => {
                      if (!isImportNameCustomized) {
                        setImportName(urlDisplayName(pendingSource.path));
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void confirmImport();
                    }}
                    placeholder={t("extensionUrlPlaceholder")}
                    className="h-8 min-w-0 flex-1 px-2.5 rounded-md border border-[var(--color-border-panel)] bg-[var(--color-bg-panel)] text-[12px] outline-none focus:border-sky-500 select-text"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-2.5 min-w-0 text-[var(--color-text-secondary)]">
                  {pendingSource.kind === "folder" ? (
                    <FolderOpen size={15} className="shrink-0" />
                  ) : (
                    <FileZip size={15} className="shrink-0" />
                  )}
                  <span className="text-[11.5px] truncate" title={pendingSource.path}>
                    {pendingSource.path}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={importName}
                  maxLength={60}
                  autoFocus={pendingSource.kind !== "url"}
                  onChange={(event) => {
                    setImportName(event.target.value);
                    setIsImportNameCustomized(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void confirmImport();
                  }}
                  placeholder={t("extensionName")}
                  className="h-8 min-w-0 flex-1 px-2.5 rounded-md border border-[var(--color-border-panel)] bg-[var(--color-bg-panel)] text-[12.5px] outline-none focus:border-[var(--color-teal-primary)] select-text"
                />
                <Tooltip content={t("cancel")}>
                  <button
                    type="button"
                    onClick={() => setPendingSource(null)}
                    className="w-8 h-8 rounded-md flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer"
                  >
                    <X size={15} weight="bold" />
                  </button>
                </Tooltip>
                <Tooltip
                  content={
                    pendingSource.kind === "url" ? t("addUrlExtension") : t("importExtension")
                  }
                >
                  <button
                    type="button"
                    disabled={loading || !pendingSource.path.trim() || !importName.trim()}
                    onClick={() => void confirmImport()}
                    className="w-8 h-8 rounded-md flex items-center justify-center bg-[var(--color-teal-primary)] text-white disabled:opacity-40 tactile-btn cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Plus size={15} weight="bold" />
                  </button>
                </Tooltip>
              </div>
            </div>
          )}

          {(dialogError || error) && (
            <div className="mt-2 px-2.5 py-2 rounded-md bg-red-500/8 text-red-500 text-[11.5px] leading-relaxed select-text">
              {dialogError || error}
            </div>
          )}
        </section>

        <section>
          <div className="px-1 mb-1.5 flex items-center justify-between">
            <span className="text-[12px] font-medium text-[var(--color-text-subtle)]">
              {t("installedExtensions")}
            </span>
            <span className="text-[10.5px] font-mono text-[var(--color-text-subtle)]">
              {extensions.length}
            </span>
          </div>

          <div className="border border-[var(--color-border-panel)] rounded-lg bg-[var(--color-bg-elevated)] divide-y divide-[var(--color-border-panel)] overflow-hidden">
            {extensions.length === 0 ? (
              <div className="py-8 flex flex-col items-center text-[var(--color-text-subtle)]">
                <PuzzlePiece size={24} weight="thin" className="mb-2" />
                <span className="text-[12px]">{t("noExtensions")}</span>
              </div>
            ) : (
              extensions.map((extension) => (
                <div key={extension.id} className="min-h-[52px] px-3 py-2 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onOpenExtension(extension.id)}
                    aria-label={
                      extension.sourceType === "url" ? t("webPage") : t("localPage")
                    }
                    className={`w-8 h-8 shrink-0 rounded-md flex items-center justify-center tactile-btn cursor-pointer ${
                      extension.sourceType === "url"
                        ? "bg-sky-500/10 text-sky-500"
                        : "bg-[var(--color-teal-tint)] text-[var(--color-teal-primary)]"
                    }`}
                  >
                    {extension.sourceType === "url" ? (
                      <GlobeSimple size={16} weight="bold" />
                    ) : (
                      <FileHtml size={16} weight="bold" />
                    )}
                  </button>

                  {editingId === extension.id ? (
                    <input
                      type="text"
                      value={editingName}
                      maxLength={60}
                      autoFocus
                      onChange={(event) => setEditingName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void confirmRename();
                        if (event.key === "Escape") setEditingId(null);
                      }}
                      className="h-8 min-w-0 flex-1 px-2 rounded-md border border-[var(--color-teal-primary)] bg-[var(--color-bg-panel)] text-[12.5px] outline-none select-text"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenExtension(extension.id)}
                      className="min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <span className="block text-[12.5px] font-medium truncate">
                        {extension.name}
                      </span>
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`shrink-0 text-[9px] font-medium px-1 py-px rounded ${
                            extension.sourceType === "url"
                              ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                              : "bg-[var(--color-teal-tint)] text-[var(--color-teal-primary)]"
                          }`}
                        >
                          {extension.sourceType === "url" ? t("webPage") : t("localPage")}
                        </span>
                        <span
                          title={
                            extension.sourceType === "url"
                              ? extension.entryPath
                              : extension.entryFile
                          }
                          className="min-w-0 text-[10.5px] font-mono text-[var(--color-text-subtle)] truncate"
                        >
                          {extension.sourceType === "url"
                            ? extension.entryPath
                            : extension.entryFile}
                        </span>
                      </span>
                    </button>
                  )}

                  {deleteId === extension.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <Tooltip content={t("cancel")}>
                        <button
                          type="button"
                          onClick={() => setDeleteId(null)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer"
                        >
                          <X size={14} weight="bold" />
                        </button>
                      </Tooltip>
                      <Tooltip content={t("confirmDeleteExtension")}>
                        <button
                          type="button"
                          onClick={() => void confirmRemove(extension.id)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-red-500 hover:bg-red-500/8 tactile-btn cursor-pointer"
                        >
                          <Check size={14} weight="bold" />
                        </button>
                      </Tooltip>
                    </div>
                  ) : editingId === extension.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer"
                      >
                        <X size={14} weight="bold" />
                      </button>
                      <button
                        type="button"
                        disabled={!editingName.trim()}
                        onClick={() => void confirmRename()}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-teal-primary)] hover:bg-[var(--color-teal-tint)] disabled:opacity-35 tactile-btn cursor-pointer"
                      >
                        <Check size={14} weight="bold" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <Tooltip content={t("renameExtension")}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(extension.id);
                            setEditingName(extension.name);
                            setDeleteId(null);
                          }}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-hover-overlay)] tactile-btn cursor-pointer"
                        >
                          <PencilSimple size={14} />
                        </button>
                      </Tooltip>
                      <Tooltip content={t("deleteExtension")}>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteId(extension.id);
                            setEditingId(null);
                          }}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-text-secondary)] hover:text-red-500 hover:bg-red-500/8 tactile-btn cursor-pointer"
                        >
                          <Trash size={14} />
                        </button>
                      </Tooltip>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
