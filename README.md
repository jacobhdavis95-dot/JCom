# JCom

**Walk it. Document it. Complete it.**

JCom is a mobile-first field resource for construction project managers. It keeps job documents, guided site walks, field evidence, punch items, correction tracking, and shareable reports in one place.

JCom is intentionally **not** an engineering, inspection, or code-compliance product. Automated observations are drafts until a project manager approves them.

## Working MVP

- Dashboard for active jobs, walks, punch status, and activity
- Job creation and job switching
- Guided site-walk capture checklist
- Video and photo capture inputs on supported mobile devices
- Phase-based job walk templates and area-by-area capture progress
- Document revision readiness confirmation
- Voice-to-punch capture on supported browsers
- Evidence-linked PM draft review with approve, edit, follow-up, and not-in-scope decisions
- Photo markup for stored field-evidence images
- PM-controlled punch-item creation, editing, assignment, priority, and status
- Plan/truss/seal/redline document intake
- Complete job packet with native share, upload-ready JSON save/import, printable PDF, and subcontractor closeout file
- Job activity timeline and offline connection status
- Browser persistence using `localStorage`
- Responsive installable PWA shell and offline asset cache
- Zero runtime dependencies

## Run locally

```bash
npm start
```

Open `http://localhost:4173`.

## Verify

```bash
npm test
npm run build
```

## GitHub Pages

The included workflow publishes the static app whenever `main` is updated. In the GitHub repository, set **Settings → Pages → Source** to **GitHub Actions**.

## Current boundary

This repository is the interactive frontend MVP. Uploaded file metadata and punch items persist locally in the browser; large media files are not uploaded to a server yet. The production backend, secure object storage, authentication, audit events, document extraction, and video-suggestion pipeline are specified in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Suggested pilot

Pilot the workflow with 5–10 completed or active framing jobs. Have PMs record what they expected JCom to catch, then use that labeled evidence to prioritize automation. Accuracy should be measured by accepted suggestions, rejected suggestions, missed items, and time saved per walk.
