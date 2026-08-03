# Admin Data Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make people reusable and exportable, let administrators export filtered results, and provide safe archive/delete/recover controls for assessment batches.

**Architecture:** Keep the existing repository as the single source of truth. Add explicit copy, archive/recover, and cascading delete operations; extend remote patches with removal lists so local and server state have identical semantics. Add small pure CSV helpers for deterministic exports, then make each admin page select a batch instead of assuming the first one.

**Tech Stack:** React, TypeScript, Vitest, Node `node:test`, existing `AssessmentRepository` and file-backed HTTP server.

---

### Task 1: Repository lifecycle and copy APIs

**Files:**
- Modify: `src/domain/store.ts`
- Test: `src/domain/store.test.ts`

- [ ] **Step 1: Write failing tests**

Add tests that create two campaigns and verify:

```ts
it("copies people to another campaign and skips existing identities", () => {
  const repository = createAssessmentRepository("copy-test");
  const source = repository.createCampaign({ name: "source" });
  const target = repository.createCampaign({ name: "target" });
  repository.importParticipants(source.id, [
    { name: "Alice", department: "Sales", position: "Lead" },
    { name: "Bob", department: "Sales", position: "Rep" },
  ]);
  repository.importParticipants(target.id, [{ name: "Alice", department: "Sales", position: "Old" }]);
  const report = repository.copyParticipants(source.id, target.id);
  expect(report.imported.map((person) => person.name)).toEqual(["Bob"]);
  expect(report.skipped).toEqual([{ name: "Alice", department: "Sales" }]);
});

it("archives, recovers, and permanently deletes a campaign with its data", () => {
  const repository = createAssessmentRepository("delete-test");
  const campaign = repository.createCampaign({ name: "to delete" });
  const [person] = repository.importParticipants(campaign.id, [
    { name: "Alice", department: "Sales", position: "Lead" },
  ]).imported;
  repository.saveDraft(person.id, { q1: "q1-option-1" });
  expect(repository.setCampaignStatus(campaign.id, "archived").status).toBe("archived");
  expect(repository.setCampaignStatus(campaign.id, "open").status).toBe("open");
  repository.deleteCampaign(campaign.id);
  expect(repository.getCampaign(campaign.id)).toBeUndefined();
  expect(repository.getParticipant(person.id)).toBeUndefined();
  expect(repository.getDraft(person.id)).toEqual({});
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run `npm test -- --run src/domain/store.test.ts`. It must fail because the new repository methods do not exist.

- [ ] **Step 3: Implement the minimal repository API**

Add `copyParticipants(sourceCampaignId, targetCampaignId)` returning `{ imported: Participant[]; skipped: Array<Pick<RosterRow, "name" | "department">> }`, add `deleteCampaign(campaignId)` that removes the campaign, its participants, their drafts, and their results, and reuse `setCampaignStatus` for archive/recover. Extend `AssessmentRepository` and keep duplicate identity matching consistent with `importParticipants`.

- [ ] **Step 4: Run the focused test and confirm it passes**

Run `npm test -- --run src/domain/store.test.ts` and confirm all repository tests pass.

- [ ] **Step 5: Commit**

Run `git add src/domain/store.ts src/domain/store.test.ts && git commit -m "feat: add campaign lifecycle and people copy APIs"`.

### Task 2: Remote removal patches

**Files:**
- Modify: `src/domain/store.ts`
- Modify: `server.mjs`
- Test: `server.test.mjs`

- [ ] **Step 1: Write failing server tests**

Add a PATCH request containing `remove: { campaigns: ["campaign-1"], participants: ["person-1"], drafts: ["person-1"], results: ["person-1"] }` and assert the subsequent GET no longer contains those records. Add an authorization test asserting the existing admin token requirement still applies to removal patches.

- [ ] **Step 2: Run `node --test server.test.mjs` and confirm the new tests fail**

The current server ignores the `remove` field and leaves all records intact.

- [ ] **Step 3: Implement removal-aware patches**

Add an optional `remove` object to `AssessmentStatePatch`, have `createStatePatch` include IDs present in the previous state but absent from the next state, and make `server.mjs` validate arrays of string IDs, delete matching records, delete draft keys, and then apply normal merge updates. Keep the existing request-size and admin-token checks.

- [ ] **Step 4: Run server tests**

Run `node --test server.test.mjs` and confirm all tests pass.

- [ ] **Step 5: Commit**

Run `git add src/domain/store.ts server.mjs server.test.mjs && git commit -m "feat: persist deletion patches on server"`.

### Task 3: CSV export helpers

**Files:**
- Create: `src/domain/exports.ts`
- Test: `src/domain/exports.test.ts`

- [ ] **Step 1: Write failing tests**

Test CSV escaping for commas, quotes, and newlines, and test builders for roster rows, personal results, and department summaries. The expected output must use UTF-8-safe fields and include headers.

- [ ] **Step 2: Run `npm test -- --run src/domain/exports.test.ts` and confirm failure**

- [ ] **Step 3: Implement pure helpers**

Export `toCsv(rows: Array<Array<string | number | null | undefined>>)` and typed builders that accept participants/results for one campaign. Escape every field with `"..."` and double embedded quotes; leave download mechanics in the page layer.

- [ ] **Step 4: Run the focused test and confirm it passes**

- [ ] **Step 5: Commit**

Run `git add src/domain/exports.ts src/domain/exports.test.ts && git commit -m "feat: add reusable csv exports"`.

### Task 4: People and campaign workflows

**Files:**
- Modify: `src/pages/PeoplePage.tsx`
- Modify: `src/pages/CampaignsPage.tsx`
- Test: `src/pages/AdminPage.test.tsx`

- [ ] **Step 1: Write failing UI tests**

Cover selecting a non-first campaign, exporting the visible roster, copying people to another campaign with duplicate feedback, archiving and recovering a campaign, and requiring a confirmation dialog before permanent deletion.

- [ ] **Step 2: Run the focused page tests and confirm failure**

Run `npm test -- --run src/pages/AdminPage.test.tsx`.

- [ ] **Step 3: Implement the workflows**

Use refreshable campaign state, add a roster CSV download button, add a target-campaign copy control that calls `copyParticipants`, and show imported/skipped/error counts. In campaigns, hide archived batches by default with an archived toggle, add archive/recover icons, and gate `deleteCampaign` behind `window.confirm` with a clear cascade warning. Await `flush()` and reload remote state on persistence errors.

- [ ] **Step 4: Run page tests and build**

Run `npm test -- --run src/pages/AdminPage.test.tsx` and `npm run build`.

- [ ] **Step 5: Commit**

Run `git add src/pages/PeoplePage.tsx src/pages/CampaignsPage.tsx src/pages/AdminPage.test.tsx && git commit -m "feat: make people and campaigns reusable"`.

### Task 5: Results and export pages

**Files:**
- Modify: `src/pages/ResultsPage.tsx`
- Modify: `src/pages/ExportsPage.tsx`
- Test: `src/pages/AdminPage.test.tsx`

- [ ] **Step 1: Write failing UI tests**

Verify both pages expose a batch selector, results filters apply to export data, and the export page offers roster, personal results, and department summary downloads. Verify empty states when there are no campaigns or no completed results.

- [ ] **Step 2: Run the focused page tests and confirm failure**

- [ ] **Step 3: Implement selectors and exports**

Replace first-campaign reads with selected campaign state. Reuse `toCsv` and the typed builders for filtered results, all roster rows, personal result detail, and department summary. Keep buttons disabled when there is no data and show a concise empty state.

- [ ] **Step 4: Run full verification**

Run `npm run test:run` and `npm run build`. Confirm Vitest, Node server tests, and TypeScript/Vite build all exit with code 0.

- [ ] **Step 5: Commit**

Run `git add src/pages/ResultsPage.tsx src/pages/ExportsPage.tsx src/pages/AdminPage.test.tsx && git commit -m "feat: add selectable result and export workflows"`.

### Task 6: Final review and deployment handoff

**Files:**
- Review: `git diff HEAD~5..HEAD`
- Review: `README.md`, `docs/deployment.md`

- [ ] **Step 1: Inspect the complete diff and status**

Run `git status --short` and `git diff HEAD~5..HEAD --check`.

- [ ] **Step 2: Run the required verification again**

Run `npm run test:run` and `npm run build` from a clean working tree.

- [ ] **Step 3: Push the verified commits**

Run `git push` only after the checks pass; report the resulting commit and any remote/action status.
