.PHONY: help alignment contest-alignment

.DEFAULT_GOAL := help

help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "%-20s %s\n", $$1, $$2}'

alignment: ## Verify frontend/backend/database alignment end-to-end
	python3 -m unittest scripts.tests.test_check_alignment
	python3 scripts/check_alignment.py
	cd frontend && /bin/zsh -lc 'npm test -- --run src/services/__tests__/admin.truthfulness.test.ts src/services/__tests__/problems.submissions-alignment.test.ts src/pages/admin/__tests__/ReportManagement.alignment.test.tsx'
	cd frontend && /bin/zsh -lc 'npm run build'

contest-alignment: ## Verify contest flow visual/data alignment
	cd frontend && /bin/zsh -lc 'npm run test:contest-alignment'
	cd frontend && /bin/zsh -lc 'npm run build'
