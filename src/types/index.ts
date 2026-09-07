export interface TodoItem {
  id: string;
  title: string;
  content?: string;
  createdAt: string; // ISO-8601
  startedAt?: string | null;
  completedAt?: string | null;
  archivedAt?: string | null;
  dueAt?: string | null;
  reminderAt?: string | null;
  notifyAtDeadline?: boolean;
  deadlineNotifiedAt?: string | null;
  reminderNotifiedAt?: string | null;
  snoozedUntil?: string | null;
}

export interface TodoTag {
  id: string;
  name: string;
  colorHex: string;
  colorValue?: number;
  createdAt?: string;
}

export interface TagWorkspace {
  version: number;
  tags: TodoTag[];
  assignments: Record<string, string[]>; // todoId -> tagIds
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
  tagIds: string[];
  pinnedAt?: string | null;
  archivedAt?: string | null;
}

export interface ClipboardItem {
  id: string;
  content: string;
  createdAt: string;
  favoriteAt?: string | null;
}

export type ThemePreference = 'system' | 'light' | 'dark';
export type LanguagePreference = 'system' | 'zh' | 'en';
export type PresentationMode = 'panelPersistent' | 'ballPersistent' | 'transient';
export type MainTab = 'todos' | 'notes' | 'clipboard';

export interface AppSettings {
  theme: ThemePreference;
  language: LanguagePreference;
  alwaysOnTop: boolean;
  collapseWhenClickingOutside: boolean;
  presentationMode: PresentationMode;
}
