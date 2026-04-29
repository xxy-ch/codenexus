-- Phase: Seed LLM feature registry entries (S05-T01)
-- Dormant by default; runtime availability is controlled by Feature Gateway.
-- category='llm', slug prefix 'llm_' per architecture convention.
INSERT INTO feature_registry (slug, name, description, default_enabled, category) VALUES
    ('llm_code_assistant', 'AI Code Assistant', 'LLM-powered code assistance and suggestions', false, 'llm'),
    ('llm_teaching_cards', 'AI Teaching Cards', 'LLM-generated teaching insights for problems', false, 'llm'),
    ('llm_problem_recommend', 'AI Problem Recommend', 'LLM-driven problem recommendation engine', false, 'llm')
ON CONFLICT (slug) DO NOTHING;
