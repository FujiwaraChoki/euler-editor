use crate::error::EulerError;
use font_kit::source::SystemSource;
use std::collections::BTreeSet;

#[tauri::command]
pub fn get_system_fonts() -> Result<Vec<String>, EulerError> {
    let source = SystemSource::new();
    let families = source.all_families().map_err(|error| {
        EulerError::Io(std::io::Error::other(format!(
            "Failed to enumerate system fonts: {error}"
        )))
    })?;

    let mut unique = BTreeSet::new();
    for family in families {
        let trimmed = family.trim();
        if !trimmed.is_empty() {
            unique.insert(trimmed.to_string());
        }
    }

    Ok(unique.into_iter().collect())
}
