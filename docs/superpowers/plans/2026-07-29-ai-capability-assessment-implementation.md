# AI Capability Assessment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first web application that lets employees complete the 20-question AI capability assessment and lets an administrator manage campaigns, roster links, results, and training diagnostics.

**Architecture:** A Vite React TypeScript single-page application uses route state rather than a backend. Domain data lives in typed modules; scoring is a pure function covered by Vitest; a local-storage repository persists seeded demonstration data, employee responses, and administrative mutations. The UI exposes an employee assessment route and an administrator workspace with a dense operational dashboard.

**Tech Stack:** React 18, TypeScript, Vite, React Router, Vitest, Testing Library, lucide-react, CSS custom properties, browser localStorage.

---

### Task 1: Create the application shell and testing baseline

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Add package scripts and dependencies**

Use these scripts: `dev`, `build`, `test`, and `test:run`. Install React, React Router, lucide-react, Vite, TypeScript, Vitest, jsdom, and Testing Library.

- [ ] **Step 2: Run the empty test command**

Run: `npm run test:run`

Expected: Vitest starts successfully and reports no test files.

- [ ] **Step 3: Add the router shell and application styles**

Create a `BrowserRouter` application shell with routes for `/`, `/assessment/:token`, `/result/:token`, and `/admin/*`. Establish the deep navy, paper white, blue, and restrained gold palette with responsive layout primitives.

- [ ] **Step 4: Run the build**

Run: `npm run build`

Expected: Vite emits a production bundle without TypeScript errors.

### Task 2: Implement and test the assessment domain model

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/questions.ts`
- Create: `src/domain/scoring.ts`
- Create: `src/domain/scoring.test.ts`

- [ ] **Step 1: Write the failing scoring tests**

Cover the public `scoreAssessment(answers, elapsedSeconds)` API:

```ts
expect(scoreAssessment(lowAnswers, 600).level).toBe(1)
expect(scoreAssessment(levelThreeAnswers, 600).level).toBe(3)
expect(scoreAssessment(blockedLevelSixAnswers, 600).level).toBe(3)
expect(scoreAssessment(straightLineAnswers, 120).confidence).toBe('low')
```

The level-three fixture scores at least two points in levels 1-3 and below two in level 4. The blocked fixture scores highly in later levels but scores below two in level 4, proving high-level scores cannot skip the prerequisite gate.

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm run test:run -- src/domain/scoring.test.ts`

Expected: FAIL because `questions` and `scoreAssessment` do not exist.

- [ ] **Step 3: Implement typed questions and pure scoring**

Model 20 fixed scenario questions with IDs, level 1-8, dimension, prompt, four options, and scores 0-3. Implement the sequential threshold rule: L1 is the floor; a later level requires an average score of at least two for that level and every earlier level. Return `level`, four dimension averages, weak dimensions, confidence, review flag, and grade metadata.

- [ ] **Step 4: Re-run focused tests**

Run: `npm run test:run -- src/domain/scoring.test.ts`

Expected: all scoring tests pass.

### Task 3: Add a tested local assessment repository

**Files:**
- Create: `src/domain/store.ts`
- Create: `src/domain/store.test.ts`

- [ ] **Step 1: Write failing repository tests**

Test that `createCampaign` stores a campaign; `importParticipants` rejects duplicate roster entries while retaining valid rows; `submitAssessment` stores one result and rejects a second submission for the same participant and campaign.

- [ ] **Step 2: Run the repository test and verify it fails**

Run: `npm run test:run -- src/domain/store.test.ts`

Expected: FAIL because the local repository API does not exist.

- [ ] **Step 3: Implement seed data and local-storage persistence**

Seed a current campaign and representative participants/results. Store campaigns, participants, responses, and results under one versioned storage key. Keep a memory fallback for jsdom. Expose pure validation messages for bad rows and duplicate emails/names.

- [ ] **Step 4: Re-run repository tests**

Run: `npm run test:run -- src/domain/store.test.ts`

Expected: all repository tests pass.

### Task 4: Implement the employee assessment and results experience

**Files:**
- Create: `src/components/GradeBadge.tsx`
- Create: `src/components/QuestionCard.tsx`
- Create: `src/pages/AssessmentPage.tsx`
- Create: `src/pages/ResultPage.tsx`
- Create: `src/pages/EmployeePage.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write the failing employee flow test**

Render the assessment route with a seeded participant, select one answer, advance the question counter, submit the remaining fixture answers, and assert the results page shows the calculated grade and three action tasks.

- [ ] **Step 2: Run the employee test and verify it fails**

Run: `npm run test:run -- src/pages/EmployeePage.test.tsx`

Expected: FAIL because the employee components and routes do not exist.

- [ ] **Step 3: Implement welcome, one-question flow, autosave, submission, and result view**

The assessment route must show the imported identity, purpose statement, 20-question progress, prior/next controls, answer selection, and a confirm-submit action. Persist in-progress answers after every selection. The result route must show level, confidence, capability statement, dimension bars, weak areas, and three level-specific tasks. Completed users can revisit the result but cannot resubmit.

- [ ] **Step 4: Re-run the employee test**

Run: `npm run test:run -- src/pages/EmployeePage.test.tsx`

Expected: test passes.

### Task 5: Implement the administrator workspace

**Files:**
- Create: `src/components/AdminNav.tsx`
- Create: `src/components/LevelDistribution.tsx`
- Create: `src/components/ResultsTable.tsx`
- Create: `src/pages/AdminLayout.tsx`
- Create: `src/pages/AdminOverviewPage.tsx`
- Create: `src/pages/CampaignsPage.tsx`
- Create: `src/pages/PeoplePage.tsx`
- Create: `src/pages/ResultsPage.tsx`
- Create: `src/pages/QuestionBankPage.tsx`
- Create: `src/pages/ExportsPage.tsx`
- Create: `src/pages/AdminPage.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write the failing administrator test**

Render `/admin` and assert that the dashboard shows participation, average level, eight-level distribution, department comparison, priority gaps, and a route to the results list. Render the people view, import a two-row CSV fixture, and assert it reports one valid import and one duplicate row.

- [ ] **Step 2: Run the administrator test and verify it fails**

Run: `npm run test:run -- src/pages/AdminPage.test.tsx`

Expected: FAIL because the admin layout and views do not exist.

- [ ] **Step 3: Implement operational admin pages**

Build a desktop-first sidebar workspace with responsive collapse behavior. The overview calculates campaign statistics from stored data. Campaigns supports create/open/close using local state. People supports CSV text import and link copy. Results supports department, level, and confidence filters plus a person detail pane. Question Bank displays the 20 items and grading rules. Exports downloads CSV text for both detailed results and department summaries.

- [ ] **Step 4: Re-run the administrator test**

Run: `npm run test:run -- src/pages/AdminPage.test.tsx`

Expected: test passes.

### Task 6: Complete visual polish and verification

**Files:**
- Modify: `src/styles.css`
- Modify: `README.md`

- [ ] **Step 1: Add responsive detail styles**

Ensure grade badges use the eight-tier palette as accents, text never overflows compact controls, tables scroll horizontally on narrow screens, and charts keep stable dimensions. Use lucide icons for action buttons with title tooltips.

- [ ] **Step 2: Add a run guide**

Document `npm install`, `npm run dev`, the demo employee link, and the `/admin` route. State that persistence is browser-local for this standalone prototype.

- [ ] **Step 3: Run the complete verification suite**

Run: `npm run test:run && npm run build`

Expected: all tests pass and production build succeeds.

- [ ] **Step 4: Run the development server and inspect the browser**

Run: `npm run dev -- --host 127.0.0.1`

Expected: the employee and admin workflows render correctly at desktop and mobile widths, with no console errors or overlapping content.
