Design a modern chatbot framework inspired by Hubot, but entirely command-first.

The framework should be a production-grade command execution platform for chat systems like Slack, Discord, Teams, and CLI. Optimize for determinism, extensibility, operational safety, maintainability, and testability.

Include:
- a central runtime/kernel
- thin adapters for inbound event normalization and outbound delivery
- a first-class command bus for registration, parsing, alias resolution, validation, authorization, confirmation, execution, help, and discovery
- ordered async middleware
- plugin/module loading
- ephemeral runtime state plus pluggable durable storage
- structured logs, lifecycle events, auditability, and correlation IDs

Use a layered outbound design, not a lowest-common-denominator API:
- portable response primitives
- a framework-defined structured message IR with fallback text
- an explicit adapter-native escape hatch for rich provider-specific payloads like Slack Block Kit, Discord embeds/components, Teams cards, threads, ephemeral replies, edits, and reactions

Require:
- canonical command IDs like `tickets.create`
- declarative command schemas
- permission checks
- confirmation flows for side-effecting commands
- explicit adapter capability declarations
- safe default behavior for unknown input
- javascript
- ESM Imports
- no semicolons
- test driven design and development – write failing test first, then write the code to make it pass, refactor/dedup, repeat.
- minimize dependencies to reduce vulnerability surface.

Produce:
- architecture overview
- core components and responsibilities
- command lifecycle
- output/rendering model
- adapter capability model
- plugin contract
- example folder structure
- example command
- example structured response
- example native adapter response
- rationale for major design decisions

Make it feel like a modern, implementation-friendly successor to Hubot that preserves extensibility while fully betting on commands.
