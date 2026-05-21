-- Phase 12: Seed AI analysis feature registry entries (AIA-05)
-- These are dormant by default; runtime availability is controlled by Feature Gateway.
INSERT INTO feature_registry (slug, name, description, default_enabled, category) VALUES
    ('ai_analysis_enabled', 'AI Analysis', 'Global master switch for AI analysis bounded context', false, 'analysis'),
    ('multi_solution_detection', 'Multi-Solution Detection', 'Detect and group multiple solution strategies', false, 'analysis'),
    ('plagiarism_graph', 'Plagiarism Graph', 'Graph-based plagiarism and similarity analysis', false, 'analysis'),
    ('teaching_cards', 'Teaching Cards', 'AI-generated teaching insights for problems', false, 'analysis'),
    ('class_cognition_snapshot', 'Class Cognition Snapshot', 'Class-level cognition profile and analytics', false, 'analysis')
ON CONFLICT (slug) DO NOTHING;
