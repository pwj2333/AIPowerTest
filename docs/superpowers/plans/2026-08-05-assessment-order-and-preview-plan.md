# Assessment Order and Admin Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep employee assessment ordering randomized while making the administrator question preview show the saved Markdown order and true 0–3 scoring order.

**Architecture:** The employee path continues to use `stableOptionOrder` and the adaptive stage ordering. The administrator path will consume `parsed.questions` directly and sort only the preview copy of each question's options by `score`, so preview rendering cannot affect stored data or employee behavior.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite.

---

### Task 1: Lock the administrator preview contract with a failing test

**Files:**
- Modify: `src/pages/AdminPage.test.tsx:58-72`

- [ ] **Step 1: Replace the randomized-preview assertion with a source-order assertion**

Keep the existing `render` setup and change the test to assert both the real score order and the first option's source text:

```tsx
  it("shows preview options in source order with their real scores", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/admin/question-bank"]}>
        <App />
      </MemoryRouter>,
    );

    const bank = assessmentRepository.getQuestionBank();
    const firstQuestion = bank.questions[0];
    const preview = container.querySelector(".question-bank-detail");
    const scores = Array.from(preview?.querySelectorAll("ol li b") ?? [])
      .map((node) => Number(node.textContent?.match(/\d+/)?.[0]));
    const labels = Array.from(preview?.querySelectorAll("ol li span") ?? [])
      .map((node) => node.textContent);

    expect(scores).toEqual([0, 1, 2, 3]);
    expect(labels).toEqual(firstQuestion.options
      .slice()
      .sort((left, right) => left.score - right.score)
      .map((option) => option.label));
  });
```

- [ ] **Step 2: Run the focused test and confirm it fails for the current randomized preview**

Run:

```bash
npm exec vitest run src/pages/AdminPage.test.tsx -t "source order"
```

Expected: FAIL because `QuestionBankPage` currently calls `stableOptionOrder` for preview options.

### Task 2: Separate administrator preview ordering from employee answer ordering

**Files:**
- Modify: `src/pages/QuestionBankPage.tsx:1,89`

- [ ] **Step 1: Remove the employee shuffle import from the administrator page**

Change the imports so `QuestionBankPage` no longer imports `stableOptionOrder`:

```tsx
import { AlertTriangle, CheckCircle2, ChevronDown, Download, FileQuestion, RotateCcw, Save, Upload } from "lucide-react";
import { ChangeEvent, useMemo, useState } from "react";
import { defaultQuestionMarkdown, getDimensionLabel, parseQuestionMarkdown } from "../domain/questions";
```

- [ ] **Step 2: Sort only a copied option array by the real score**

Replace the preview list expression:

```tsx
{[...question.options]
  .sort((left, right) => left.score - right.score)
  .map((option) => (
    <li key={option.id}><span>{option.label}</span><b>{option.score} 分</b></li>
  ))}
```

The surrounding `parsed.questions.map(...)` remains unchanged, preserving the Markdown question order and showing unsaved parsed edits immediately.

- [ ] **Step 3: Run the focused tests and confirm the fix**

Run:

```bash
npm exec vitest run src/pages/AdminPage.test.tsx -t "source order"
npm exec vitest run src/components/QuestionCard.test.tsx
```

Expected: both commands pass; the administrator test sees `[0, 1, 2, 3]`, while the employee component tests still prove stable per-participant shuffling and no top-score-last shortcut.

### Task 3: Run the full verification and commit

**Files:**
- Modify: `src/pages/AdminPage.test.tsx`
- Modify: `src/pages/QuestionBankPage.tsx`

- [ ] **Step 1: Run the complete test suite**

Run:

```bash
npm run test:run
```

Expected: all Vitest files pass and all Node server tests pass with zero failures.

- [ ] **Step 2: Build the production bundle**

Run:

```bash
npm run build
```

Expected: TypeScript and Vite both exit with code 0.

- [ ] **Step 3: Check the diff and commit the implementation**

Run:

```bash
git diff --check
git status --short --branch
git add src/pages/AdminPage.test.tsx src/pages/QuestionBankPage.tsx
git commit -m "fix: show source order in admin question preview"
```

Expected: only the two implementation/test files are committed; employee ordering code is unchanged.
