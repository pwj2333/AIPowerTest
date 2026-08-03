# Admin Data Lifecycle Design

## Goal

Make administrator data workflows reusable, exportable, and safe to clean up. People can be copied between assessment campaigns and exported as CSV. Results can be filtered by campaign and exported as personal detail or department summaries. Campaigns can be hidden by archiving, recovered later, or permanently deleted after explicit confirmation.

## Requirements

- People page selects a campaign instead of assuming the first campaign.
- Roster CSV export includes name, department, position, completion status, and completion time.
- Copying people to another campaign preserves name, department, and position, creates new invite tokens, and reports duplicate identities without importing them.
- Results and exports pages select a campaign and expose clear empty states.
- Results page exports the currently filtered result set.
- Exports page provides roster, personal result detail, and department summary CSV files.
- Campaign archive is the default cleanup action and hides archived campaigns unless requested.
- Permanent deletion requires confirmation and cascades to the campaign's participants, drafts, and results only.
- Deletion must persist to the remote server and remain protected by administrator authentication.

## Architecture

`AssessmentRepository` remains the single state owner. It gains `copyParticipants` and `deleteCampaign`; `setCampaignStatus` handles archive and recovery. Repository writes compare previous and next state and include explicit removal ID lists in remote patches. The HTTP server validates and applies removals before normal merge updates, preserving existing submission conflict checks and authentication.

CSV generation is pure and lives in `src/domain/exports.ts`. Browser download code stays in the page components. The page components keep only selection, filtering, feedback, and persistence error recovery state.

## Data Safety

Archive changes only campaign status. Permanent deletion removes the campaign, all participants belonging to it, their drafts, and their stored results. The question bank and other campaigns are untouched. The UI uses `window.confirm` with the cascade scope before calling the repository delete method.

## Testing

- Repository tests cover duplicate-safe copying, archive/recovery, and cascading deletion.
- Server tests cover removal patch semantics and administrator authorization.
- CSV tests cover quoting and all export shapes.
- Administrator page tests cover campaign selectors, copy/export controls, archive/recovery, confirmation, and empty states.
- `npm run test:run` and `npm run build` are required before pushing.
