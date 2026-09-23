# JCom production architecture

## Product boundary

JCom assists project managers with consistent walks and clear documentation. It may suggest visible conditions for review, but only a PM can publish an item to the official punch list. It must not label a condition as an engineering failure or code violation.

## Production services

| Area | Recommended responsibility |
|---|---|
| Web/PWA | Job setup, documents, guided capture, punch workflow, reports |
| API | Authorization, jobs, revisions, punches, comments, assignments, audit events |
| Database | PostgreSQL with tenant and market separation |
| Object storage | Original plans, videos, frames, photos, exports; never store job media in Git |
| Queue/workers | PDF extraction, thumbnailing, video frame selection, report generation |
| Document index | Plan sheets, truss identifiers, revisions, detail references, redlines |
| Suggestion service | Returns draft observations with evidence, source, confidence, and limitations |
| Identity | Company SSO plus role-based access for managers, project managers, subcontractors, and read-only users |

## Suggested workflow

1. Create a job and upload the current approved document set.
2. Extract sheets, titles, room/opening labels, schedules, and truss identifiers.
3. PM selects a walk template appropriate to the phase.
4. Capture service guides the PM through required areas and flags missing coverage.
5. Media worker stores original evidence and selects clear frames.
6. Suggestion service compares visible conditions with job-specific references.
7. Draft items enter a PM review queue—not the published punch list.
8. PM approves, edits, rejects, or marks an item unable to verify.
9. Approved items are assigned and tracked through correction and verification.
10. The final report retains before/after evidence and a complete audit trail.

## Data entities

- Organization, market, user, role
- Builder, community, job, phase
- Document, revision, sheet, reference region
- Walk, capture area, media asset, frame
- Draft suggestion, PM decision, rejection reason
- Punch item, assignment, status event, comment
- Correction evidence, verification event, report

## Security and retention

- Encrypt transport and stored files.
- Use signed, expiring URLs for job media.
- Keep every punch status change append-only in the audit history.
- Separate customer/job data by organization and market.
- Configure retention with company legal and customer requirements.
- Require explicit confirmation before sharing reports externally.

## Automation quality gates

- Every suggestion must cite a captured image and, when applicable, a plan/detail reference.
- Low-confidence observations stay out of the main review queue.
- “Unable to verify” is a valid and important result.
- Measure false positives, false negatives, acceptance rate, and PM time saved.
- A rejected suggestion should capture a reason for future improvement.
