# Participant Submission Authorization Design

## Goal

Allow a rostered participant to save and submit an assessment without an administrator session, while keeping administrator-only data lifecycle operations protected.

## Root Cause

Submitting an assessment creates one state patch containing three employee-owned changes:

- add the completed result;
- set the participant `completedAt` timestamp;
- remove the participant's saved draft.

The server currently treats every non-empty `remove` patch as an administrator operation. The draft removal therefore causes the complete employee submission to fail with HTTP 401 and the misleading message that the administrator login expired.

## Authorization Boundary

After the employee submits the roster token and matching name to the participant-session endpoint, the server issues a short-lived HttpOnly participant session. That session may perform the existing employee workflow:

- update `visitedAt` or `completedAt` on an existing participant;
- save or remove assessment drafts;
- append a participant result that does not replace an existing result.

The server binds all employee-owned IDs in one patch to the participant session. A missing, expired, mismatched, or multi-participant session is rejected.

An administrator session remains required for:

- creating or changing campaigns;
- creating participants or changing roster identity fields;
- changing the question bank;
- deleting campaigns, participants, or submitted results.

The existing one-submission rule remains enforced by `mergeStatePatch`, which rejects replacement of an existing participant result.

## Implementation

Add a participant-session endpoint that verifies the invitation token, matching roster name, and open campaign before issuing the session cookie. Change `patchRequiresAdmin` so that only removals from `campaigns`, `participants`, and `results` require administrator authentication. Removing entries from `drafts` is part of the employee submission lifecycle and must not require an administrator session. For non-admin writes, require every participant-owned change in the patch to target the authenticated participant.

The home name-entry flow and direct assessment identity gate both create the participant session before flushing `visitedAt`. The browser's existing PATCH calls then include the HttpOnly cookie automatically.

## Verification

Add HTTP integration tests that verify a missing participant session is rejected, a matching participant session can send the combined submission patch, and a session cannot write another participant's data. The successful test must verify a persisted result, the participant completion timestamp, and removal of the draft.

Keep the existing test that verifies campaign deletion returns 401 without an administrator session. Run the complete frontend and server test suite and the production build before publishing.
