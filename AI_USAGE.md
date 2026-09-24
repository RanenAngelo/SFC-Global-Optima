# AI Tool Usage Declaration (SRS §1.8.13–16, §1.10.16)
# NOTE TO TEAM: every member must independently review, modify where required,
# understand, and test all AI-assisted code before submission (SRS §1.8.15).
# Fill in "Verified by" with the reviewing team member's name.

## Tool 1
- Name of the AI tool: Arena.ai Agent Mode (multi-model coding agent)
- Purpose of use: scaffolding and implementation assistance for backend, Spark jobs,
  Python pipelines, tests, and documentation of the DineIQ Analytics system
- Type of assistance requested: code generation, debugging, test creation, documentation
- Files or modules affected: src/, spark_jobs/, spark_sql/, python_pipeline/, tests/,
  config/, database/, documentation/, reports/ generators, Ranen/dineiq API-integration edits
- Modifications performed: (team to record what they changed after review)
- Testing completed: pytest suite (tests/), manual API checks, pipeline re-runs
- Name of the team member who verified the output: (TO BE FILLED BY TEAM)

## Ground rules applied during AI-assisted development
- All analytics, predictions, classifications, recommendations, and forecasts are
  produced by the team's own Spark / Python / ML / application logic operating on
  the project dataset. No external generative-AI decision API is used at runtime
  (SRS §1.8.16).
- No hard-coded insights or fabricated metrics: every number is computed from data.
- Food photography in Ranen/dineiq/public/img/ is AI-generated imagery (visual only).
