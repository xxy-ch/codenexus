//! Feature gateway data models.
//!
//! Defines types for the three-ring feature flag model:
//! - Feature registry entries (canonical feature catalog)
//! - Feature flag overrides (scoped at global/campus/grade/class)
//! - Resolved feature state (effective enabled + source)

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// Source of a resolved feature flag value.
///
/// Ordered by specificity: ClassOverride > GradeOverride > CampusOverride >
/// GlobalOverride > Default > SystemEmergencyOff.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FeatureSource {
    Default,
    GlobalOverride,
    CampusOverride,
    GradeOverride,
    ClassOverride,
    SystemEmergencyOff,
}

impl std::fmt::Display for FeatureSource {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FeatureSource::Default => write!(f, "default"),
            FeatureSource::GlobalOverride => write!(f, "global"),
            FeatureSource::CampusOverride => write!(f, "campus"),
            FeatureSource::GradeOverride => write!(f, "grade"),
            FeatureSource::ClassOverride => write!(f, "class"),
            FeatureSource::SystemEmergencyOff => write!(f, "system_emergency_off"),
        }
    }
}

impl FeatureSource {
    /// Parse a scope string from the database into a FeatureSource variant.
    pub fn from_scope_str(s: &str) -> Option<Self> {
        match s {
            "global" => Some(FeatureSource::GlobalOverride),
            "campus" => Some(FeatureSource::CampusOverride),
            "grade" => Some(FeatureSource::GradeOverride),
            "class" => Some(FeatureSource::ClassOverride),
            _ => None,
        }
    }
}

/// Feature scope levels for overrides.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FeatureScope {
    Global,
    Campus,
    Grade,
    Class,
}

impl FeatureScope {
    pub fn as_str(&self) -> &'static str {
        match self {
            FeatureScope::Global => "global",
            FeatureScope::Campus => "campus",
            FeatureScope::Grade => "grade",
            FeatureScope::Class => "class",
        }
    }
}

/// A resolved feature flag result.
///
/// Contains the effective enabled state and the source it was resolved from.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ResolvedFeature {
    pub enabled: bool,
    pub source: FeatureSource,
}

/// A feature registry entry from the `feature_registry` table.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FeatureRegistryEntry {
    pub id: Uuid,
    pub slug: String,
    pub name: String,
    pub description: Option<String>,
    pub default_enabled: bool,
    pub category: String,
    pub created_at: DateTime<Utc>,
}

/// A feature flag override from the `feature_flags` table.
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FeatureFlagEntry {
    pub id: Uuid,
    pub feature_slug: String,
    pub scope: String,
    pub scope_id: Option<i64>,
    pub enabled: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Request body for setting a feature flag override.
#[derive(Debug, Clone, Deserialize)]
pub struct SetFlagRequest {
    pub enabled: bool,
    pub scope: String,
    pub scope_id: Option<i64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_feature_source_display() {
        assert_eq!(FeatureSource::Default.to_string(), "default");
        assert_eq!(FeatureSource::GlobalOverride.to_string(), "global");
        assert_eq!(FeatureSource::CampusOverride.to_string(), "campus");
        assert_eq!(FeatureSource::GradeOverride.to_string(), "grade");
        assert_eq!(FeatureSource::ClassOverride.to_string(), "class");
        assert_eq!(
            FeatureSource::SystemEmergencyOff.to_string(),
            "system_emergency_off"
        );
    }

    #[test]
    fn test_feature_source_from_scope_str() {
        assert_eq!(
            FeatureSource::from_scope_str("global"),
            Some(FeatureSource::GlobalOverride)
        );
        assert_eq!(
            FeatureSource::from_scope_str("campus"),
            Some(FeatureSource::CampusOverride)
        );
        assert_eq!(
            FeatureSource::from_scope_str("grade"),
            Some(FeatureSource::GradeOverride)
        );
        assert_eq!(
            FeatureSource::from_scope_str("class"),
            Some(FeatureSource::ClassOverride)
        );
        assert_eq!(FeatureSource::from_scope_str("unknown"), None);
    }

    #[test]
    fn test_feature_scope_as_str() {
        assert_eq!(FeatureScope::Global.as_str(), "global");
        assert_eq!(FeatureScope::Campus.as_str(), "campus");
        assert_eq!(FeatureScope::Grade.as_str(), "grade");
        assert_eq!(FeatureScope::Class.as_str(), "class");
    }

    #[test]
    fn test_set_flag_request_deserialize() {
        let json = r#"{"enabled":true,"scope":"campus","scope_id":1}"#;
        let req: SetFlagRequest = serde_json::from_str(json).unwrap();
        assert!(req.enabled);
        assert_eq!(req.scope, "campus");
        assert_eq!(req.scope_id, Some(1));
    }

    #[test]
    fn test_set_flag_request_deserialize_null_scope_id() {
        let json = r#"{"enabled":false,"scope":"global","scope_id":null}"#;
        let req: SetFlagRequest = serde_json::from_str(json).unwrap();
        assert!(!req.enabled);
        assert_eq!(req.scope, "global");
        assert_eq!(req.scope_id, None);
    }

    #[test]
    fn test_resolved_feature_serialization() {
        let rf = ResolvedFeature {
            enabled: true,
            source: FeatureSource::CampusOverride,
        };
        let json = serde_json::to_string(&rf).unwrap();
        assert!(json.contains("\"enabled\":true"));
        // serde serializes enum variant names by default
        assert!(json.contains("\"source\":\"CampusOverride\""));
    }
}
