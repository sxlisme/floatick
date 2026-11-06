use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::{self, Read};
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use zip::ZipArchive;

const REGISTRY_FILE: &str = "extensions.json";
const EXTENSIONS_DIR: &str = "extensions";
const RUNTIME_ENTRY_FILE: &str = "__floatick_entry.html";
const THEME_BRIDGE_CSS_FILE: &str = "__floatick_theme.css";
const THEME_BRIDGE_JS_FILE: &str = "__floatick_theme.js";
const MAX_ARCHIVE_BYTES: u64 = 100 * 1024 * 1024;
const MAX_EXTRACTED_BYTES: u64 = 250 * 1024 * 1024;
const MAX_FILE_BYTES: u64 = 50 * 1024 * 1024;
const MAX_ENTRIES: usize = 5_000;
const NO_HTML_ERROR: &str = "extension-import:no-html";
const AMBIGUOUS_HTML_ERROR: &str = "extension-import:ambiguous-html";
static EXTENSIONS_LOCK: Mutex<()> = Mutex::new(());

const THEME_BRIDGE_TAGS: &[u8] = br#"
    <link rel="stylesheet" href="./__floatick_theme.css" data-floatick-theme-bridge>
    <script src="./__floatick_theme.js" data-floatick-theme-bridge></script>
"#;

const THEME_BRIDGE_CSS: &str = r#":root {
  color-scheme: light;
  --floatick-bg: #f5f5f7;
  --floatick-surface: #ffffff;
  --floatick-surface-hover: #eceef1;
  --floatick-text: #11181c;
  --floatick-text-secondary: rgba(17, 24, 28, 0.72);
  --floatick-text-subtle: rgba(17, 24, 28, 0.52);
  --floatick-border: rgba(70, 82, 88, 0.18);
  --floatick-accent: #0f8f83;
  --floatick-accent-soft: rgba(15, 143, 131, 0.1);
  --floatick-hover: rgba(25, 34, 39, 0.07);
}

:root.dark {
  color-scheme: dark;
  --floatick-bg: #202124;
  --floatick-surface: #2c2d31;
  --floatick-surface-hover: #36373c;
  --floatick-text: #f5f5f7;
  --floatick-text-secondary: rgba(240, 240, 245, 0.74);
  --floatick-text-subtle: rgba(240, 240, 245, 0.52);
  --floatick-border: rgba(255, 255, 255, 0.15);
  --floatick-accent: #00c7b7;
  --floatick-accent-soft: rgba(0, 199, 183, 0.12);
  --floatick-hover: rgba(255, 255, 255, 0.06);
}

:root[data-floatick-theme],
:root[data-floatick-theme] body {
  background-color: var(--floatick-bg) !important;
  color: var(--floatick-text) !important;
}
"#;

const THEME_BRIDGE_JS: &str = r#"(() => {
  const tokenNames = [
    "--floatick-bg",
    "--floatick-surface",
    "--floatick-surface-hover",
    "--floatick-text",
    "--floatick-text-secondary",
    "--floatick-text-subtle",
    "--floatick-border",
    "--floatick-accent",
    "--floatick-accent-soft",
    "--floatick-hover"
  ];

  const applyTheme = (detail) => {
    const theme = detail && detail.theme === "dark" ? "dark" : "light";
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    root.dataset.floatickTheme = theme;
    root.style.colorScheme = theme;

    const tokens = detail && detail.tokens;
    if (tokens && typeof tokens === "object") {
      tokenNames.forEach((name) => {
        const value = tokens[name];
        if (typeof value === "string" && value) {
          root.style.setProperty(name, value);
        }
      });
    }

    window.dispatchEvent(new CustomEvent("floatick:themechange", {
      detail: { theme, tokens: tokens || {} }
    }));
  };

  window.addEventListener("message", (event) => {
    if (event.source === window.parent && event.data && event.data.type === "floatick:theme") {
      applyTheme(event.data);
    }
  });

  const initialTheme = new URLSearchParams(window.location.search).get("floatickTheme");
  applyTheme({ theme: initialTheme });
  window.parent.postMessage({ type: "floatick:theme-ready" }, "*");
})();
"#;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalExtension {
    pub id: String,
    pub name: String,
    pub entry_path: String,
    pub entry_file: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExtensionRecord {
    id: String,
    name: String,
    #[serde(default = "default_entry_file")]
    entry_file: String,
    created_at: String,
}

fn default_entry_file() -> String {
    "index.html".to_string()
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExtensionRegistry {
    version: u32,
    #[serde(default)]
    extensions: Vec<ExtensionRecord>,
}

impl Default for ExtensionRegistry {
    fn default() -> Self {
        Self {
            version: 1,
            extensions: Vec::new(),
        }
    }
}

#[derive(Default)]
struct ImportStats {
    entries: usize,
    bytes: u64,
}

impl ImportStats {
    fn add_entry(&mut self, bytes: u64) -> Result<(), String> {
        self.entries += 1;
        if self.entries > MAX_ENTRIES {
            return Err(format!(
                "Extension contains more than {MAX_ENTRIES} entries"
            ));
        }
        if bytes > MAX_FILE_BYTES {
            return Err(format!(
                "Extension contains a file larger than {} MB",
                MAX_FILE_BYTES / 1024 / 1024
            ));
        }
        self.bytes = self.bytes.saturating_add(bytes);
        if self.bytes > MAX_EXTRACTED_BYTES {
            return Err(format!(
                "Extension is larger than {} MB after extraction",
                MAX_EXTRACTED_BYTES / 1024 / 1024
            ));
        }
        Ok(())
    }
}

fn extensions_root() -> Result<PathBuf, String> {
    let root = crate::storage::get_storage_dir()?.join(EXTENSIONS_DIR);
    fs::create_dir_all(&root)
        .map_err(|error| format!("Failed to create extensions directory: {error}"))?;
    Ok(root)
}

fn load_registry_unlocked() -> Result<ExtensionRegistry, String> {
    let path = crate::storage::get_storage_dir()?.join(REGISTRY_FILE);
    if !path.exists() {
        return Ok(ExtensionRegistry::default());
    }
    let content = fs::read_to_string(&path)
        .map_err(|error| format!("Failed to read {REGISTRY_FILE}: {error}"))?;
    serde_json::from_str(&content)
        .map_err(|error| format!("Failed to parse {REGISTRY_FILE}: {error}"))
}

fn save_registry(registry: &ExtensionRegistry) -> Result<(), String> {
    crate::storage::atomic_save(REGISTRY_FILE, registry)
}

fn validate_name(name: &str) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("Extension name cannot be empty".to_string());
    }
    if name.chars().count() > 60 {
        return Err("Extension name cannot exceed 60 characters".to_string());
    }
    if name.chars().any(char::is_control) {
        return Err("Extension name contains unsupported characters".to_string());
    }
    Ok(name.to_string())
}

fn is_valid_extension_id(id: &str) -> bool {
    id.starts_with("ext-")
        && id
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || character == '-')
}

fn validate_entry_file(entry_file: &str) -> Result<&Path, String> {
    let path = Path::new(entry_file);
    let has_only_normal_components = path
        .components()
        .all(|component| matches!(component, Component::Normal(_)));
    if entry_file.is_empty() || !has_only_normal_components || !is_html_file(path) {
        return Err("Extension registry contains an invalid entry file".to_string());
    }
    Ok(path)
}

fn runtime_entry_relative_path(entry_file: &Path) -> PathBuf {
    entry_file
        .parent()
        .unwrap_or_else(|| Path::new(""))
        .join(RUNTIME_ENTRY_FILE)
}

fn to_local_extension(record: &ExtensionRecord, root: &Path) -> Result<LocalExtension, String> {
    let entry_file = validate_entry_file(&record.entry_file)?;
    Ok(LocalExtension {
        id: record.id.clone(),
        name: record.name.clone(),
        entry_path: root
            .join(&record.id)
            .join(runtime_entry_relative_path(entry_file))
            .to_string_lossy()
            .into_owned(),
        entry_file: record.entry_file.clone(),
        created_at: record.created_at.clone(),
    })
}

fn has_ascii_prefix_ignore_case(content: &[u8], offset: usize, prefix: &[u8]) -> bool {
    content
        .get(offset..offset.saturating_add(prefix.len()))
        .is_some_and(|candidate| candidate.eq_ignore_ascii_case(prefix))
}

fn find_opening_tag_end(content: &[u8], tag: &[u8]) -> Option<usize> {
    if tag.is_empty() || content.len() < tag.len() {
        return None;
    }

    for offset in 0..=content.len() - tag.len() {
        if !has_ascii_prefix_ignore_case(content, offset, tag) {
            continue;
        }
        let boundary = content.get(offset + tag.len()).copied();
        if !boundary.is_some_and(|byte| byte == b'>' || byte.is_ascii_whitespace()) {
            continue;
        }
        if let Some(relative_end) = content[offset + tag.len()..]
            .iter()
            .position(|byte| *byte == b'>')
        {
            return Some(offset + tag.len() + relative_end + 1);
        }
    }
    None
}

fn build_runtime_entry(index: &[u8]) -> Vec<u8> {
    if let Some(insertion_point) = find_opening_tag_end(index, b"<head") {
        let mut runtime = Vec::with_capacity(index.len() + THEME_BRIDGE_TAGS.len());
        runtime.extend_from_slice(&index[..insertion_point]);
        runtime.extend_from_slice(THEME_BRIDGE_TAGS);
        runtime.extend_from_slice(&index[insertion_point..]);
        return runtime;
    }

    if let Some(insertion_point) = find_opening_tag_end(index, b"<html") {
        let mut runtime = Vec::with_capacity(index.len() + THEME_BRIDGE_TAGS.len() + 13);
        runtime.extend_from_slice(&index[..insertion_point]);
        runtime.extend_from_slice(b"\n  <head>");
        runtime.extend_from_slice(THEME_BRIDGE_TAGS);
        runtime.extend_from_slice(b"  </head>\n");
        runtime.extend_from_slice(&index[insertion_point..]);
        return runtime;
    }

    let mut runtime = Vec::with_capacity(index.len() + THEME_BRIDGE_TAGS.len());
    runtime.extend_from_slice(THEME_BRIDGE_TAGS);
    runtime.extend_from_slice(index);
    runtime
}

fn write_if_changed(path: &Path, content: &[u8]) -> Result<(), String> {
    if fs::read(path).is_ok_and(|existing| existing == content) {
        return Ok(());
    }
    fs::write(path, content)
        .map_err(|error| format!("Failed to create extension runtime file: {error}"))
}

fn ensure_runtime_entry(directory: &Path, entry_file: &str) -> Result<(), String> {
    let entry_file = validate_entry_file(entry_file)?;
    let entry_path = directory.join(entry_file);
    let runtime_directory = entry_path
        .parent()
        .ok_or_else(|| "Could not locate extension entry directory".to_string())?;
    let index = fs::read(&entry_path)
        .map_err(|error| format!("Failed to read extension entry file: {error}"))?;
    let runtime = build_runtime_entry(&index);
    write_if_changed(&runtime_directory.join(RUNTIME_ENTRY_FILE), &runtime)?;
    write_if_changed(
        &runtime_directory.join(THEME_BRIDGE_CSS_FILE),
        THEME_BRIDGE_CSS.as_bytes(),
    )?;
    write_if_changed(
        &runtime_directory.join(THEME_BRIDGE_JS_FILE),
        THEME_BRIDGE_JS.as_bytes(),
    )
}

fn create_extension_id(root: &Path) -> String {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or(0);
    for suffix in 0..1_000u16 {
        let id = if suffix == 0 {
            format!("ext-{timestamp:x}")
        } else {
            format!("ext-{timestamp:x}-{suffix}")
        };
        if !root.join(&id).exists() {
            return id;
        }
    }
    format!("ext-{timestamp:x}-fallback")
}

fn copy_directory_contents(
    source: &Path,
    destination: &Path,
    stats: &mut ImportStats,
) -> Result<(), String> {
    fs::create_dir_all(destination)
        .map_err(|error| format!("Failed to create extension directory: {error}"))?;
    let entries = fs::read_dir(source)
        .map_err(|error| format!("Failed to read extension folder: {error}"))?;

    for entry in entries {
        let entry = entry.map_err(|error| format!("Failed to read extension entry: {error}"))?;
        let file_type = entry
            .file_type()
            .map_err(|error| format!("Failed to inspect extension entry: {error}"))?;
        if file_type.is_symlink() {
            return Err("Symbolic links are not supported in extensions".to_string());
        }
        let target = destination.join(entry.file_name());
        if file_type.is_dir() {
            stats.add_entry(0)?;
            copy_directory_contents(&entry.path(), &target, stats)?;
        } else if file_type.is_file() {
            let size = entry
                .metadata()
                .map_err(|error| format!("Failed to inspect extension file: {error}"))?
                .len();
            stats.add_entry(size)?;
            fs::copy(entry.path(), target)
                .map_err(|error| format!("Failed to copy extension file: {error}"))?;
        }
    }
    Ok(())
}

fn is_ignored_archive_path(path: &Path) -> bool {
    path.components()
        .next()
        .is_some_and(|component| component.as_os_str() == "__MACOSX")
        || path.file_name().is_some_and(|name| name == ".DS_Store")
}

fn extract_zip(source: &Path, destination: &Path) -> Result<(), String> {
    let archive_size = source
        .metadata()
        .map_err(|error| format!("Failed to inspect ZIP archive: {error}"))?
        .len();
    if archive_size > MAX_ARCHIVE_BYTES {
        return Err(format!(
            "ZIP archive cannot exceed {} MB",
            MAX_ARCHIVE_BYTES / 1024 / 1024
        ));
    }

    let file =
        File::open(source).map_err(|error| format!("Failed to open ZIP archive: {error}"))?;
    let mut archive =
        ZipArchive::new(file).map_err(|error| format!("Invalid ZIP archive: {error}"))?;
    if archive.len() > MAX_ENTRIES {
        return Err(format!(
            "ZIP archive contains more than {MAX_ENTRIES} entries"
        ));
    }

    let mut stats = ImportStats::default();
    for index in 0..archive.len() {
        let mut entry = archive
            .by_index(index)
            .map_err(|error| format!("Failed to read ZIP entry: {error}"))?;
        let relative = entry
            .enclosed_name()
            .ok_or_else(|| "ZIP archive contains an unsafe path".to_string())?;
        if is_ignored_archive_path(&relative) {
            continue;
        }
        if entry
            .unix_mode()
            .is_some_and(|mode| mode & 0o170000 == 0o120000)
        {
            return Err("Symbolic links are not supported in extensions".to_string());
        }

        stats.add_entry(if entry.is_dir() { 0 } else { entry.size() })?;
        let output_path = destination.join(relative);
        if entry.is_dir() {
            fs::create_dir_all(&output_path)
                .map_err(|error| format!("Failed to create ZIP directory: {error}"))?;
            continue;
        }
        if let Some(parent) = output_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("Failed to create ZIP directory: {error}"))?;
        }
        let mut output = File::create(&output_path)
            .map_err(|error| format!("Failed to create extracted file: {error}"))?;
        let copied = io::copy(&mut entry.by_ref().take(MAX_FILE_BYTES + 1), &mut output)
            .map_err(|error| format!("Failed to extract ZIP entry: {error}"))?;
        if copied > MAX_FILE_BYTES {
            return Err(format!(
                "Extension contains a file larger than {} MB",
                MAX_FILE_BYTES / 1024 / 1024
            ));
        }
    }
    Ok(())
}

fn is_html_file(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            extension.eq_ignore_ascii_case("html") || extension.eq_ignore_ascii_case("htm")
        })
}

fn is_named_entry(path: &Path, expected: &str) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name.eq_ignore_ascii_case(expected))
}

fn is_generated_runtime_file(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name.eq_ignore_ascii_case(RUNTIME_ENTRY_FILE))
}

fn collect_html_files(directory: &Path, matches: &mut Vec<PathBuf>) -> Result<(), String> {
    for entry in fs::read_dir(directory)
        .map_err(|error| format!("Failed to inspect extracted extension: {error}"))?
    {
        let entry = entry.map_err(|error| format!("Failed to inspect extension entry: {error}"))?;
        let file_type = entry
            .file_type()
            .map_err(|error| format!("Failed to inspect extension entry: {error}"))?;
        if file_type.is_dir() {
            collect_html_files(&entry.path(), matches)?;
        } else if file_type.is_file()
            && is_html_file(&entry.path())
            && !is_generated_runtime_file(&entry.path())
        {
            matches.push(entry.path());
        }
    }
    Ok(())
}

fn choose_single_entry(candidates: &[PathBuf]) -> Result<Option<PathBuf>, String> {
    match candidates {
        [entry] => Ok(Some(entry.clone())),
        [] => Ok(None),
        _ => Err(AMBIGUOUS_HTML_ERROR.to_string()),
    }
}

fn locate_extension_entry(extracted_root: &Path) -> Result<PathBuf, String> {
    let mut html_files = Vec::new();
    collect_html_files(extracted_root, &mut html_files)?;
    if html_files.is_empty() {
        return Err(NO_HTML_ERROR.to_string());
    }

    for expected in ["index.html", "index.htm"] {
        let root_candidates: Vec<PathBuf> = html_files
            .iter()
            .filter(|path| path.parent() == Some(extracted_root) && is_named_entry(path, expected))
            .cloned()
            .collect();
        if let Some(entry) = choose_single_entry(&root_candidates)? {
            return Ok(entry);
        }
    }

    for expected in ["index.html", "index.htm"] {
        let named_candidates: Vec<PathBuf> = html_files
            .iter()
            .filter(|path| is_named_entry(path, expected))
            .cloned()
            .collect();
        if let Some(entry) = choose_single_entry(&named_candidates)? {
            return Ok(entry);
        }
    }

    if let [entry] = html_files.as_slice() {
        return Ok(entry.clone());
    }
    Err(AMBIGUOUS_HTML_ERROR.to_string())
}

fn relative_entry_file(root: &Path, entry: &Path) -> Result<String, String> {
    let relative = entry
        .strip_prefix(root)
        .map_err(|_| "Could not locate extension entry file".to_string())?;
    validate_entry_file(
        relative
            .to_str()
            .ok_or_else(|| "Extension entry filename is not valid UTF-8".to_string())?,
    )?;
    Ok(relative
        .components()
        .filter_map(|component| match component {
            Component::Normal(value) => Some(value.to_string_lossy()),
            _ => None,
        })
        .collect::<Vec<_>>()
        .join("/"))
}

fn stage_source(source: &Path, staging: &Path) -> Result<String, String> {
    if source.is_dir() {
        let mut stats = ImportStats::default();
        copy_directory_contents(source, staging, &mut stats)?;
    } else {
        if !source.is_file()
            || !source
                .extension()
                .is_some_and(|extension| extension.eq_ignore_ascii_case("zip"))
        {
            return Err("Select an extension folder or a ZIP archive".to_string());
        }
        fs::create_dir_all(staging)
            .map_err(|error| format!("Failed to create import directory: {error}"))?;
        extract_zip(source, staging)?;
    }

    let entry = locate_extension_entry(staging)?;
    relative_entry_file(staging, &entry)
}

pub fn list_extensions() -> Result<Vec<LocalExtension>, String> {
    let _guard = EXTENSIONS_LOCK
        .lock()
        .map_err(|_| "Extensions lock is poisoned".to_string())?;
    let registry = load_registry_unlocked()?;
    let root = extensions_root()?;
    let mut extensions = Vec::new();
    for record in &registry.extensions {
        if !is_valid_extension_id(&record.id) {
            continue;
        }
        let Ok(entry_file) = validate_entry_file(&record.entry_file) else {
            continue;
        };
        let extension_directory = root.join(&record.id);
        if !extension_directory.join(entry_file).is_file() {
            continue;
        }
        ensure_runtime_entry(&extension_directory, &record.entry_file)?;
        extensions.push(to_local_extension(record, &root)?);
    }
    Ok(extensions)
}

pub fn import_extension(source_path: &str, name: &str) -> Result<LocalExtension, String> {
    let _guard = EXTENSIONS_LOCK
        .lock()
        .map_err(|_| "Extensions lock is poisoned".to_string())?;
    let name = validate_name(name)?;
    let source = PathBuf::from(source_path)
        .canonicalize()
        .map_err(|error| format!("Could not open extension source: {error}"))?;
    let root = extensions_root()?;
    let canonical_root = root
        .canonicalize()
        .map_err(|error| format!("Could not access extensions directory: {error}"))?;
    if source.is_dir()
        && (source.starts_with(&canonical_root) || canonical_root.starts_with(&source))
    {
        return Err("Choose a folder outside Floatick's extension storage directory".to_string());
    }
    let id = create_extension_id(&root);
    let staging = root.join(format!(".import-{id}"));
    let final_directory = root.join(&id);

    let install_result = (|| {
        let entry_file = stage_source(&source, &staging)?;
        fs::rename(&staging, &final_directory)
            .map_err(|error| format!("Failed to install extension: {error}"))?;

        ensure_runtime_entry(&final_directory, &entry_file)?;

        let record = ExtensionRecord {
            id: id.clone(),
            name,
            entry_file,
            created_at: chrono::Utc::now().to_rfc3339(),
        };
        let mut registry = load_registry_unlocked()?;
        registry.extensions.push(record.clone());
        if let Err(error) = save_registry(&registry) {
            let _ = fs::remove_dir_all(&final_directory);
            return Err(error);
        }
        to_local_extension(&record, &root)
    })();

    if install_result.is_err() {
        let _ = fs::remove_dir_all(&staging);
        let _ = fs::remove_dir_all(&final_directory);
    }
    install_result
}

pub fn rename_extension(id: &str, name: &str) -> Result<LocalExtension, String> {
    let _guard = EXTENSIONS_LOCK
        .lock()
        .map_err(|_| "Extensions lock is poisoned".to_string())?;
    let name = validate_name(name)?;
    let root = extensions_root()?;
    let mut registry = load_registry_unlocked()?;
    let record = registry
        .extensions
        .iter_mut()
        .find(|record| record.id == id)
        .ok_or_else(|| "Extension was not found".to_string())?;
    if !is_valid_extension_id(&record.id) {
        return Err("Extension registry contains an invalid identifier".to_string());
    }
    record.name = name;
    let result = to_local_extension(record, &root)?;
    save_registry(&registry)?;
    Ok(result)
}

pub fn remove_extension(id: &str) -> Result<(), String> {
    let _guard = EXTENSIONS_LOCK
        .lock()
        .map_err(|_| "Extensions lock is poisoned".to_string())?;
    let root = extensions_root()?;
    let mut registry = load_registry_unlocked()?;
    let index = registry
        .extensions
        .iter()
        .position(|record| record.id == id)
        .ok_or_else(|| "Extension was not found".to_string())?;
    if !is_valid_extension_id(&registry.extensions[index].id) {
        return Err("Extension registry contains an invalid identifier".to_string());
    }
    let directory = root.join(&registry.extensions[index].id);
    let trash = root.join(format!(".remove-{id}"));

    if directory.exists() {
        fs::rename(&directory, &trash)
            .map_err(|error| format!("Failed to prepare extension removal: {error}"))?;
    }
    registry.extensions.remove(index);
    if let Err(error) = save_registry(&registry) {
        if trash.exists() {
            let _ = fs::rename(&trash, &directory);
        }
        return Err(error);
    }
    if trash.exists() {
        fs::remove_dir_all(&trash)
            .map_err(|error| format!("Extension was removed but cleanup failed: {error}"))?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_directory(name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or(0);
        std::env::temp_dir().join(format!("floatick-{name}-{unique}"))
    }

    #[test]
    fn validates_extension_names() {
        assert_eq!(validate_name("  My extension  ").unwrap(), "My extension");
        assert!(validate_name(" ").is_err());
        assert!(validate_name(&"x".repeat(61)).is_err());
    }

    #[test]
    fn validates_generated_extension_identifiers() {
        assert!(is_valid_extension_id("ext-18ff0a-2"));
        assert!(!is_valid_extension_id("../extensions"));
        assert!(!is_valid_extension_id("ext-with/slash"));
    }

    #[test]
    fn locates_a_single_wrapped_index_file() {
        let root = test_directory("wrapped-extension");
        let wrapped = root.join("my-extension");
        fs::create_dir_all(&wrapped).unwrap();
        fs::write(wrapped.join("index.html"), "<!doctype html>").unwrap();

        assert_eq!(
            locate_extension_entry(&root).unwrap(),
            wrapped.join("index.html")
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_archives_with_multiple_entry_files() {
        let root = test_directory("ambiguous-extension");
        fs::create_dir_all(root.join("first")).unwrap();
        fs::create_dir_all(root.join("second")).unwrap();
        fs::write(root.join("first/index.html"), "first").unwrap();
        fs::write(root.join("second/index.html"), "second").unwrap();

        assert_eq!(
            locate_extension_entry(&root).unwrap_err(),
            AMBIGUOUS_HTML_ERROR
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn uses_the_only_html_file_when_index_is_missing() {
        let root = test_directory("single-custom-entry");
        let wrapped = root.join("calculator");
        fs::create_dir_all(&wrapped).unwrap();
        fs::write(wrapped.join("calculator.HTML"), "<!doctype html>").unwrap();

        assert_eq!(
            locate_extension_entry(&root).unwrap(),
            wrapped.join("calculator.HTML")
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn reports_when_no_html_file_exists() {
        let root = test_directory("missing-html");
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("readme.txt"), "No entry here").unwrap();

        assert_eq!(locate_extension_entry(&root).unwrap_err(), NO_HTML_ERROR);
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn rejects_multiple_unnamed_html_files() {
        let root = test_directory("multiple-custom-entries");
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("calculator.html"), "calculator").unwrap();
        fs::write(root.join("settings.htm"), "settings").unwrap();

        assert_eq!(
            locate_extension_entry(&root).unwrap_err(),
            AMBIGUOUS_HTML_ERROR
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn prefers_a_root_index_when_other_html_files_exist() {
        let root = test_directory("root-index-priority");
        fs::create_dir_all(root.join("docs")).unwrap();
        fs::write(root.join("index.htm"), "entry").unwrap();
        fs::write(root.join("docs/index.html"), "documentation").unwrap();

        assert_eq!(
            locate_extension_entry(&root).unwrap(),
            root.join("index.htm")
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn old_registry_records_default_to_index_html() {
        let record: ExtensionRecord = serde_json::from_str(
            r#"{"id":"ext-1","name":"Legacy","createdAt":"2026-11-05T00:00:00Z"}"#,
        )
        .unwrap();

        assert_eq!(record.entry_file, "index.html");
    }

    #[test]
    fn injects_the_theme_bridge_into_an_existing_head() {
        let original = b"<!doctype html><HTML><HEAD><title>Test</title></HEAD><body></body></HTML>";
        let runtime = String::from_utf8(build_runtime_entry(original)).unwrap();

        assert!(runtime.contains("<HEAD>\n    <link rel=\"stylesheet\""));
        assert!(runtime.contains("<title>Test</title>"));
        assert_eq!(
            original,
            b"<!doctype html><HTML><HEAD><title>Test</title></HEAD><body></body></HTML>"
        );
    }

    #[test]
    fn creates_a_head_for_minimal_extension_documents() {
        let runtime =
            String::from_utf8(build_runtime_entry(b"<html><body>Test</body></html>")).unwrap();

        assert!(runtime.contains("<html>\n  <head>"));
        assert!(runtime.contains("__floatick_theme.js"));
        assert!(runtime.contains("<body>Test</body>"));
    }

    #[test]
    fn creates_runtime_files_without_changing_the_original_entry() {
        let root = test_directory("theme-runtime");
        fs::create_dir_all(&root).unwrap();
        let original = b"<!doctype html><html><head></head><body>Test</body></html>";
        fs::write(root.join("index.html"), original).unwrap();

        ensure_runtime_entry(&root, "index.html").unwrap();

        assert_eq!(fs::read(root.join("index.html")).unwrap(), original);
        assert!(fs::read_to_string(root.join(RUNTIME_ENTRY_FILE))
            .unwrap()
            .contains("data-floatick-theme-bridge"));
        assert!(root.join(THEME_BRIDGE_CSS_FILE).is_file());
        assert!(root.join(THEME_BRIDGE_JS_FILE).is_file());
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn creates_the_runtime_next_to_a_nested_custom_entry() {
        let root = test_directory("nested-runtime");
        let app = root.join("wrapped/app");
        fs::create_dir_all(&app).unwrap();
        fs::write(app.join("calculator.htm"), "<html></html>").unwrap();

        ensure_runtime_entry(&root, "wrapped/app/calculator.htm").unwrap();

        assert!(app.join(RUNTIME_ENTRY_FILE).is_file());
        assert!(app.join(THEME_BRIDGE_CSS_FILE).is_file());
        assert!(!root.join(RUNTIME_ENTRY_FILE).exists());
        fs::remove_dir_all(root).unwrap();
    }
}
