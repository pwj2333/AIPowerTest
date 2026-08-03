# Question Bank Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the assessment questions plain-language, make every answer exactly 18 characters, and randomize visible option positions without placing the highest score last.

**Architecture:** Keep question IDs, levels, dimensions, option IDs, and scoring unchanged. Enforce answer length in the question-bank parser, rewrite the default question text, and expose a deterministic seeded display shuffle that is stable for a participant but constrained so score 3 is never the final visible option.

**Tech Stack:** TypeScript, React, Vitest, Testing Library

---

### Task 1: Add failing question-bank invariants

**Files:**
- Modify: `src/domain/questions.test.ts`
- Test: `src/domain/questions.test.ts`

- [x] **Step 1: Require exact answer length and plain-language prompts**

Add assertions that every option is exactly 18 Unicode characters and every prompt ends with a direct question mark.

```ts
expect(new Set(questions.flatMap((question) => question.options.map((option) => Array.from(option.label).length)))).toEqual(new Set([18]));
expect(questions.every((question) => question.prompt.endsWith("？"))).toBe(true);
```

- [x] **Step 2: Require parser rejection for a wrong-length answer**

Change one serialized option to a 17-character label and assert `parseQuestionMarkdown` throws the exact-length validation message.

- [x] **Step 3: Run the focused test and verify it fails**

Run: `npm run test:run -- src/domain/questions.test.ts`

Expected: FAIL because the current bank has mixed option lengths and the parser only rejects a spread pattern.

### Task 2: Rewrite the bank and enforce exact lengths

**Files:**
- Modify: `src/domain/questions.ts`
- Test: `src/domain/questions.test.ts`

- [x] **Step 1: Add the single answer-length constant and parser check**

Use `const answerLength = 18` and reject any question whose four option labels do not all have that length.

- [x] **Step 2: Replace all 20 prompts with direct workplace wording**

Keep the current level, dimension, category, score meaning, and IDs. Rewrite each prompt and its four labels so labels are direct, concrete, and exactly 18 characters.

- [x] **Step 3: Run the focused test and verify it passes**

Run: `npm run test:run -- src/domain/questions.test.ts`

Expected: PASS, including round-trip serialization and exact-length validation.

### Task 3: Make visible option order seeded and safe

**Files:**
- Modify: `src/components/QuestionCard.tsx`
- Create: `src/components/QuestionCard.test.tsx`

- [x] **Step 1: Write failing display-order tests**

Test that the same `question` and `seed` render the same score order, different seeds can render different orders, and the last rendered option never has score 3.

- [x] **Step 2: Run the component test and verify it fails**

Run: `npm run test:run -- src/components/QuestionCard.test.tsx`

Expected: FAIL for at least one seed because the existing shuffle can put score 3 last.

- [x] **Step 3: Implement the constrained seeded shuffle**

Keep the existing seeded Fisher–Yates shuffle, then swap the last option with the preceding option only when the last score is 3. The score ID remains unchanged, so saved answers and scoring remain compatible.

- [x] **Step 4: Run the component test and verify it passes**

Run: `npm run test:run -- src/components/QuestionCard.test.tsx`

Expected: PASS with stable, varied, non-terminal score-3 positions.

### Task 4: Verify the complete change

**Files:**
- Verify: `src/domain/questions.test.ts`
- Verify: `src/components/QuestionCard.test.tsx`
- Verify: `src/pages/EmployeePage.test.tsx`

- [x] **Step 1: Run all tests**

Run: `npm run test:run`

Expected: PASS with no warnings or errors.

- [x] **Step 2: Run the production build**

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.

- [x] **Step 3: Inspect the final diff and status**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors and only the intended question-bank, display-order, test, and plan files changed.
