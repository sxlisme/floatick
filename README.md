<div align="center">
  <h1>
    <img src="./docs/assets/app-icon.png" width="36" height="36" align="absmiddle" alt="Floatick Icon" />
    Floatick
  </h1>
  <p><strong>Lightweight tray-based todos & notes for macOS and Windows</strong></p>
  <p>Capture fast. Finish with focus. Local-first · Fast & Minimal · Open Source</p>
  <p>
    <a href="https://github.com/sxlisme/floatick/actions/workflows/ci.yml">
      <img src="https://github.com/sxlisme/floatick/actions/workflows/ci.yml/badge.svg" alt="CI Status" />
    </a>
    <img src="https://img.shields.io/badge/macOS-10.15%2B-111111?logo=apple" alt="macOS 10.15+" />
    <img src="https://img.shields.io/badge/Windows-10%2B-0078D4?logo=windows" alt="Windows 10+" />
    <img src="https://img.shields.io/badge/Tauri-v2-24C8D8?logo=tauri" alt="Tauri v2" />
    <img src="https://img.shields.io/badge/Rust-1.80%2B-DEA584?logo=rust" alt="Rust 1.80+" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript" alt="TypeScript 5.x" />
    <a href="./LICENSE">
      <img src="https://img.shields.io/badge/license-MIT-00C7B7" alt="MIT License" />
    </a>
  </p>
  <p>
    <strong>English</strong> · <a href="./README.zh-CN.md">简体中文</a>
  </p>
</div>

<p align="center">
  <img src="./docs/assets/floatick-showcase.png" width="100%" alt="Floatick Menu Bar Todos, TipTap Markdown Editor, and Quick Notes" />
</p>

Floatick is a lightweight, local-first productivity app for macOS and Windows. It rests quietly in your menu bar or notification area. One click opens a focused workspace beside the tray icon. No heavy setup or cloud sign-up, just fast capture and effortless follow-through.

## Key Features

- **Native System Tray**: Sits quietly in the macOS menu bar or Windows notification area. Click to open beside the tray icon without cluttering the Dock or taskbar.
- **Full-Width Cards & Floating Capsules**: Task titles span the full row width without premature truncation. Hovering smoothly reveals frosted action capsules (deadline, edit, copy markdown, delete).
- **Separated Browsing & Editing**: Check off tasks instantly in the list; open the full TipTap editor drawer on demand via double-click or `⌘N`.
- **TipTap Markdown & Slash Commands**: Press `/` for interactive checklists, headings, code blocks, and quotes with instant formatting.
- **Deadlines without Noise**: Set due dates directly on task rows. Overdue items stay clearly highlighted without intrusive notification popups.
- **Quick Notes & Shared Tags**: Capture snippets and thoughts grouped by date. Reusable color tags work across both todos and notes.
- **Local-First Privacy**: No accounts, no cloud sync, no tracking. All data is saved as plain, readable JSON in `~/.floatick`.
- **Fast, Lightweight & Native**: Built with Tauri 2 and Rust with a sub-30MB idle footprint, smooth 120Hz animations, and optional launch at login.

## Download & Installation

Download the latest installer from [GitHub Releases](https://github.com/sxlisme/floatick/releases):

- macOS: use the Universal DMG for both Apple silicon and Intel Macs, then drag Floatick to `Applications`.
- Windows: use the x64 NSIS setup executable. Windows 10 and later are supported.

> **First-Launch Note for macOS**:
> If macOS displays an "unidentified developer" warning, open **System Settings → Privacy & Security**, scroll down to **Security**, and click **Open Anyway** (only required on first launch).

## Shortcuts & Controls

| Action | Shortcut / Gesture | Description |
| --- | --- | --- |
| **Toggle Window** | Click Menu Bar Icon | Toggle Floatick panel under the status tray |
| **New Item** | `⌘N` / `Ctrl+N` | Open editor drawer (Todo or Note) |
| **Edit Item** | Double-click / Hover ✏️ | Open TipTap editor drawer for existing item |
| **Save & Close** | `⌘ ⏎` / `Ctrl+Enter` | Save current item and close drawer |
| **Close / Dismiss** | `Esc` | Closes active drawer first, then collapses panel |
| **Search Workspace** | `⌘F` / `Ctrl+F` | Focus search bar |
| **Switch Tabs** | `Tab` / `⌘1`, `⌘2` / `Ctrl+1`, `Ctrl+2` | Toggle between Todos and Notes views |
| **Preferences** | `⌘,` / `Ctrl+,` | Open Settings drawer (Theme, autostart, pin) |
| **Slash Commands** | Type `/` in editor | Insert task lists, headings, code blocks, quotes |
| **Set Deadline** | Click ⏰ on hover | Open date & time picker directly on row |
| **Copy Markdown** | Click ⎘ on hover | Copy title and content as clean Markdown |
| **Quit Floatick** | Right-click tray / Settings | Quit the application |

## Local Data & Privacy

Floatick automatically creates human-readable JSON files in your home directory on first launch:

| File Path | Purpose |
| --- | --- |
| `~/.floatick/todos.json` | Todos, completion status, deadlines, reminders, and archives |
| `~/.floatick/notes.json` | Notes content, color tags, pinning, and archives |
| `~/.floatick/tags.json` | Reusable color tags shared between todos and notes |
| `~/.floatick/settings.json` | Theme (system/light/dark), language, autostart, and stay-on-top |

Your data never leaves your computer. Floatick operates completely offline and collects zero telemetry.

## Development

### Requirements

- macOS 10.15+ or Windows 10+
- [Node.js](https://nodejs.org/) 18+ and [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/) (1.80+) and Cargo

### Local Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start Tauri development server (with hot reload)
pnpm tauri:dev
```

### Production Build

```bash
# Build the native bundles for the current platform
pnpm tauri:build
```

macOS bundles are written under `src-tauri/target/release/bundle/macos/` and `.../dmg/`. Windows installers are written under `src-tauri/target/release/bundle/nsis/`.

## Project Structure

```text
src/                          # Frontend (React 19 + TypeScript + Vite + Tailwind CSS)
  components/
    common/                   # TipTap editor, search bar, common UI components
    layout/                   # Header, ContentSwitcher, window frame
    notes/                    # Note list, note rows, note editor drawer
    settings/                 # Preferences drawer (theme, language, autostart)
    tags/                     # Tag management & filtering
    todos/                    # Todo list, item rows, deadline picker, editor drawer
  stores/                     # Zustand state management
  i18n/                       # Localization resources (English and Chinese)
  lib/                        # Tauri IPC API bindings
src-tauri/                    # Native Backend (Rust + Tauri 2.x)
  src/
    tray.rs                   # macOS/Windows system tray & window anchoring
    storage.rs                # Atomic JSON file persistence in ~/.floatick
    commands.rs               # IPC commands exposed to frontend
    lib.rs                    # Window lifecycle & auto-dismiss on blur
website/                      # Marketing website (Astro)
docs/                         # Design specifications and architecture guides
```

## License

Floatick is released under the [MIT License](./LICENSE).
