# Participant Submission Authorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow rostered employees to submit completed assessments without an administrator session while preserving authentication for management operations.

**Architecture:** Keep the existing shared PATCH endpoint and state merge rules. Add a short-lived participant session established by token plus name, narrow the authorization classifier so draft removal is treated as part of the employee workflow, and bind every employee-owned patch to that participant session.

**Tech Stack:** Node.js HTTP server, Node test runner, TypeScript, React, Vitest

---

### Task 1: Add participant-session API coverage

**Files:**
- Modify: `server.test.mjs`

- [ ] Add an integration test that starts `startServer` with one open campaign and two rostered participants.
- [ ] Assert that the combined employee patch returns 401 without a participant session.
- [ ] POST `/api/participant/session` with the first participant's token and matching name, then use its cookie for the combined submission patch.
- [ ] Assert that the patch returns 200 and cannot target the second participant.
- [ ] Run the focused server tests and verify the new employee test fails before production code changes.

### Task 2: Implement participant-scoped submission authorization

**Files:**
- Modify: `server.mjs`
- Modify: `src/domain/store.ts`
- Modify: `src/pages/AssessmentPage.tsx`
- Modify: `src/pages/HomePage.tsx`

- [ ] Add the participant-session cookie, token/name verification endpoint, expiration handling, and target-ID validation in `server.mjs`.
- [ ] Change `patchRequiresAdmin` to inspect only `remove.campaigns`, `remove.participants`, and `remove.results`.
- [ ] Add `authenticateParticipant` to the repository and invoke it from both employee entry paths before flushing `visitedAt`.
- [ ] Run the focused server and employee tests and verify participant submission passes while cross-participant writes fail.

### Task 3: Verify and publish

**Files:**
- Verify: `server.test.mjs`
- Verify: `src/pages/EmployeePage.test.tsx`

- [ ] Run `npm run test:run` and verify every frontend and server test passes.
- [ ] Run `npm run build` and verify TypeScript and Vite production compilation succeed.
- [ ] Run `git diff --check` and inspect the final diff for scope.
- [ ] Commit the fix, push `main`, and confirm the Docker image workflow succeeds.
