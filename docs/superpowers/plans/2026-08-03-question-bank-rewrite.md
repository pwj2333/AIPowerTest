# Question Bank Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 20 assessment questions with plain-language workplace scenarios whose answer lengths are balanced and whose 0-3 scores appear in different positions.

**Architecture:** Keep the existing question IDs, level assignments, dimensions, and option IDs so scoring and saved answers remain compatible. Assign each default question a stable score order, preserve that order in Markdown serialization, and reject imported banks whose visible score positions are predictable.

**Tech Stack:** TypeScript, React, Vitest

---

### Task 1: Lock the question-quality rules

**Files:**
- Create: `src/domain/questions.test.ts`

- [ ] Add a test that requires exactly 20 questions and one option for each score from 0 through 3.
- [ ] Add a test that rejects the visible score order `[0, 1, 2, 3]` and requires multiple score-order patterns across the question bank.
- [ ] Add a test that limits the longest-to-shortest answer difference within each question to 8 characters.
- [ ] Run `npm run test:run -- src/domain/questions.test.ts` and verify the order and length tests fail against the current question bank.

### Task 2: Rewrite the 20 questions

**Files:**
- Modify: `src/domain/questions.ts`

- [ ] Change `makeOptions` to apply a stable question-specific score order while keeping IDs in the form `q1-option-3`.
- [ ] Replace all 20 prompts with concrete workplace situations written in plain Chinese.
- [ ] Preserve score order through Markdown export/import and reject predictable imported orders.
- [ ] Run `npm run test:run -- src/domain/questions.test.ts` and verify all question-quality tests pass.

### Task 3: Verify and publish

**Files:**
- Verify: `src/domain/scoring.test.ts`
- Verify: `src/pages/EmployeePage.test.tsx`

- [ ] Run `npm run test:run` and verify all tests pass.
- [ ] Run `npm run build` and verify TypeScript and Vite production compilation succeed.
- [ ] Commit the question-bank rewrite and push `main` to GitHub.
- [ ] Confirm the triggered GitHub Actions Docker workflow completes successfully.
