# StudyBot NotebookLM-lite Redesign Spec

## Purpose

StudyBot will move from an industrial SaaS dashboard into a NotebookLM-lite learning workspace. The app should make the learner feel that they are studying from trusted source material, not operating an AWS or analytics console.

The primary product loop is:

1. Add learning sources.
2. Ask grounded questions about those sources.
3. Turn answers into study guide, flashcards, quiz, and progress.

## Product direction

The redesign should position StudyBot as a compact source-grounded study notebook:

- Sources are always visible and understandable.
- Chat remains the center of the experience.
- Citations and source snippets are visible enough to build trust.
- Study tools feel like natural next actions from the current source.
- AWS readiness and infrastructure evidence stay hidden or secondary.

## Main layout

The default screen becomes a three-column study workspace.

### Left panel: Sources

The left panel holds the learner's source material.

It includes:

- Small StudyBot brand mark.
- Upload document action.
- Source/document list.
- Current document highlight.
- Document status badges for ready, indexing, analyzing, uploading, and failed states.

The selected source controls the rest of the workspace. The panel should feel like a study library, not an admin sidebar.

### Center panel: Grounded chat

The center panel is the primary workspace.

It includes:

- Current document title and short context header.
- Claude-like warm chat surface.
- User questions and StudyBot answers.
- Inline citation chips below assistant answers.
- Bottom composer with attach/send actions.
- Quick prompt suggestions for common learning tasks.

The chat should be readable and calm, with the answer content more prominent than surrounding chrome.

### Right panel: Study notebook

The right panel provides source context and study actions.

It includes:

- Source summary.
- Recent citation cards with page/slide labels and snippets.
- Quick actions:
  - Generate study guide.
  - Make flashcards.
  - Start quiz.
- Small progress summary, such as weekly streak, quiz score, or reviewed cards.

The panel should support the chat, not compete with it.

## Navigation model

The app should stop feeling like a dashboard with many equal-weight pages.

- Workspace/study room is the default home.
- Documents are represented in the source panel.
- Study guide, flashcards, and quiz are launched from the right panel and can still reuse existing pages or views.
- Progress is secondary.
- Evidence/readiness is hidden behind a small developer/readiness link, not a primary navigation item.
- Dashboard metrics are removed from the landing experience or reduced to quiet supporting details.

## Visual style

The target style is warm academic, NotebookLM-lite, and Claude-clean.

Use:

- Warm cream or parchment background.
- Off-white panels and cards.
- Dark brown or charcoal text.
- Terracotta or muted amber accent.
- Soft beige borders.
- Light shadows only where they clarify layering.

Avoid:

- Blue/teal enterprise gradients as the main brand language.
- Heavy metric cards.
- Dense dashboard grids.
- AWS/service evidence as learner-facing content.
- Overly glassy or corporate surfaces.

## Implementation scope

This redesign is UI-first and should keep the current mock/full-stack behavior intact.

Likely implementation targets after planning:

- `studybot/src/App.tsx`
- `studybot/src/features/shell/AppShell.tsx`
- `studybot/src/features/study-room/StudyRoomPage.tsx`
- `studybot/src/features/documents/DocumentsPage.tsx`
- `studybot/src/styles.css`

Existing API routes, mock provider behavior, domain contracts, and AWS-ready provider skeleton should remain unchanged unless a UI integration requires a small client-side adjustment.

## Out of scope

This redesign does not include:

- Real Cognito authentication.
- Real Bedrock Knowledge Base integration.
- AWS deployment.
- Multi-user notebooks.
- Complex ingestion progress timelines.
- Rich text editing.
- Rewriting backend contracts.

## Success criteria

The redesign is successful when:

- The first screen clearly communicates source-grounded studying.
- The selected document/source is always obvious.
- Chat and citations are central to the experience.
- Study guide, flashcards, and quiz feel like natural actions from the current source.
- The app feels polished, warm, and learner-friendly rather than industrial.
- Existing mock flows still work in the browser after implementation.
