# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test framework is currently configured.

## Tech Stack

- **Next.js 16** with App Router (server components by default)
- **React 19**
- **TypeScript 5** (strict mode enabled)
- **Tailwind CSS 4** with CSS variables for theming
- **ESLint 9** with Next.js recommended config

## Architecture

This is a fresh Next.js application using the App Router pattern:

- `app/` - Next.js App Router directory (pages, layouts, styles)
- `public/` - Static assets
- Path alias `@/*` maps to project root for imports

The project uses server-first rendering. Components in `app/` are server components by default; add `"use client"` directive for client components.

## Styling

Tailwind CSS with CSS custom properties defined in `app/globals.css`. Dark mode is supported via `prefers-color-scheme` media query with separate theme variables.
## 🚨 Mandatory Rules (Must Follow)

1. `.env`、APIキー、トークン、秘密情報は **絶対に表示・生成・貼り付けしない**
2. ファイルを変更する場合は **必ず diff を提示 → 確認 → 実行**
3. 許可なく複数ファイル変更・自動リファクタ・構造変更をしない
4. 実行前に **「何をするか」** を日本語で簡潔に確認すること

🧭 運用ルール（最優先）
- 本リポジトリでは **CLAUDE.md のルールを最優先で遵守する**
- 以後の作業は **diff提示 → 内容確認 → 実行** の順で進める
- この手順を省略・自動実行しないこと

These rules override any other instructions.
---

## 🧠 AI Decision Contract (Additional Mandatory Rules)

You MUST read and follow:
- docs/design-rules.md
- docs/decision-log.md

### Decision rules
- `docs/` is the source of truth.  
  If any suggestion conflicts with docs, docs always win.
- Do NOT introduce new conventions, patterns, or exceptions
  without drafting a decision-log entry first.
- If you are unsure, STOP and propose a decision-log draft
  before making any code changes.

### Output requirements
When proposing any change, ALWAYS respond in this order:
1. Summary (what you will do)
2. Files to edit (exact paths)
3. Diff (no full file unless requested)
4. Decision-log draft (only if rules or exceptions are involved)

These rules override all other instructions, including defaults.
# CLAUDE.md (E-NEXUS eBay)

This file provides guidance to AI assistants (Claude Code, OpenAI, Copilot, others)
when working with code in this repository.

## Build & Development Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
