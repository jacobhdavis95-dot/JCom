import { STATUS, filterPunches, formatDate, makePunch, openCount, progress } from "./core.mjs";

const STORAGE_KEY = "jcom-mvp-v1";
const seed = {
  activeJob: "job-1",
  jobs: [
    { id: "job-1", lot: "Lot 214", community: "Barrett Ridge", address: "812 Willow Bend Drive", builder: "Drees Homes", pm: "Will Thompson", phase: "Framing", nextWalk: "2026-09-22", status: "Active" },
    { id: "job-2", lot: "Lot 087", community: "Olde Mill Trace", address: "305 Millstone Way", builder: "Pulte Homes", pm: "Chad Harrelson", phase: "Windows & Doors", nextWalk: "2026-09-23", status: "Active" },
    { id: "job-3", lot: "Lot 342", community: "Preserve at White Oak", address: "147 White Oak Landing", builder: "David Weekley", pm: "Will Thompson", phase: "Framing", nextWalk: "2026-09-24", status: "Active" },
    { id: "job-4", lot: "Lot 019", community: "Wendell Falls", address: "61 Pine Hollow Court", builder: "Garman Homes", pm: "Nathan Rhodes", phase: "Interior Trim", nextWalk: "2026-09-26", status: "Active" }
  ],
  punches: [
    { id: "p1", jobId: "job-1", number: "P-001", title: "Install missing header blocking", location: "Kitchen — rear wall", trade: "Framing", priority: "Priority", status: "Open", due: "2026-09-23", reference: "A3.1 / Detail 7", notes: "Verify blocking at both sides of opening.", source: "PM created", createdAt: "2026-09-22", createdBy: "Will Thompson", photo: "" },
    { id: "p2", jobId: "job-1", number: "P-002", title: "Verify truss T14 orientation", location: "Second floor — bedroom 3", trade: "Framing", priority: "Hold point", status: "Scheduled", due: "2026-09-22", reference: "Truss layout / T14", notes: "Visible condition does not match layout direction. Confirm before continuing.", source: "Walkthrough suggestion — PM approved", createdAt: "2026-09-21", createdBy: "Will Thompson", photo: "" },
    { id: "p3", jobId: "job-1", number: "P-003", title: "Add backing for future handrail", location: "Main stair — landing", trade: "Framing", priority: "Standard", status: "Corrected", due: "2026-09-21", reference: "A5.2", notes: "Correction photo received; awaiting PM verification.", source: "PM created", createdAt: "2026-09-20", createdBy: "Will Thompson", photo: "" },
    { id: "p4", jobId: "job-1", number: "P-004", title: "Replace damaged sill plate section", location: "Garage — left wall", trade: "Framing", priority: "Priority", status: "Verified", due: "2026-09-20", reference: "Field observation", notes: "Verified during second walk.", source: "PM created", createdAt: "2026-09-19", createdBy: "Will Thompson", photo: "" },
    { id: "p5", jobId: "job-2", number: "P-001", title: "Re-square rear bedroom window", location: "Bedroom 2", trade: "Windows & Doors", priority: "Priority", status: "Open", due: "2026-09-24", reference: "Window schedule W-12", notes: "", source: "PM created", createdAt: "2026-09-22", createdBy: "Chad Harrelson", photo: "" }
  ],
  docs: [
    { id: "d1", jobId: "job-1", name: "Architectural Plans — Rev 3", type: "PLAN", detail: "28 pages · Current set", uploaded: "2026-09-18", by: "Jacob Davis" },
    { id: "d2", jobId: "job-1", name: "Truss Placement Layout", type: "TRUSS", detail: "2 pages · Building A", uploaded: "2026-09-18", by: "Jacob Davis" },
    { id: "d3", jobId: "job-1", name: "Individual Truss Seals", type: "SEALS", detail: "34 seals · Indexed T01–T34", uploaded: "2026-09-18", by: "Jacob Davis" },
    { id: "d4", jobId: "job-1", name: "Redlines — First Walk", type: "REDLINE", detail: "6 annotations", uploaded: "2026-09-21", by: "Will Thompson" }
  ],
  walks: [
    { id: "w1", jobId: "job-1", date: "2026-09-21", type: "First walk", pm: "Will Thompson", coverage: 72, media: 18, status: "In progress" },
    { id: "w2", jobId: "job-1", date: "2026-09-19", type: "Safety walk", pm: "Will Thompson", coverage: 100, media: 12, status: "Complete" },
    { id: "w3", jobId: "job-2", date: "2026-09-22", type: "Window verification", pm: "Chad Harrelson", coverage: 84, media: 22, status: "In progress" }
  ],
  activities: [
    { icon: "✓", title: "Punch P-004 verified", detail: "Garage sill plate correction accepted", time: "32 min ago" },
    { icon: "▧", title: "Correction photo added", detail: "P-003 · Main stair landing", time: "1 hr ago" },
    { icon: "↑", title: "Redlines uploaded", detail: "Lot 214 · Barrett Ridge", time: "Yesterday" },
    { icon: "◉", title: "Site walk started", detail: "Lot 087 · Olde Mill Trace", time: "Yesterday" }
  ]
};

let state = load();
state.workflow ||= {};
let currentFilter = "All";
let searchTerm = "";

const routes = [
  ["dashboard", "⌂", "Dashboard"],
  ["jobs", "▦", "Jobs"],
  ["walks", "◉", "Site walks"],
  ["punch", "✓", "Punch lists"],
  ["documents", "▤", "Documents"],
  ["reports", "↗", "Reports"]
];

const app = document.querySelector("#app");
const nav = document.querySelector("#nav");
const modalRoot = document.querySelector("#modal-root");
const toast = document.querySelector("#toast");

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(seed); }
  catch { return structuredClone(seed); }
}

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function activeJob() { return state.jobs.find((job) => job.id === state.activeJob) || state.jobs[0]; }
function jobPunches(jobId = state.activeJob) { return state.punches.filter((item) => item.jobId === jobId); }
function jobWorkflow(jobId = state.activeJob) {
  state.workflow[jobId] ||= { media: [], status: "documents", suggestions: [] };
  return state.workflow[jobId];
}
function esc(value = "") { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
function route() { return location.hash.replace("#", "") || "dashboard"; }
function statusClass(status) { return status.toLowerCase().replaceAll(" ", "-"); }

function renderNav() {
  const open = openCount(state.punches);
  nav.innerHTML = routes.map(([key, icon, label]) => `<a href="#${key}" class="${route() === key ? "active" : ""}"><span class="nav-icon">${icon}</span>${label}${key === "punch" ? `<span class="count">${open}</span>` : ""}</a>`).join("");
}

function setHeading(eyebrow, title) {
  document.querySelector("#page-eyebrow").textContent = eyebrow;
  document.querySelector("#page-title").textContent = title;
}

function render() {
  renderNav();
  const name = route();
  ({ dashboard: renderDashboard, jobs: renderJobs, walks: renderWalks, punch: renderPunches, documents: renderDocuments, reports: renderReports }[name] || renderDashboard)();
  document.body.classList.remove("menu-open");
}

function renderDashboard() {
  setHeading("Overview", "Good morning, Jacob");
  const punches = state.punches;
  const next = state.jobs[0];
  app.innerHTML = `
    <section class="hero">
      <div class="hero-content">
        <span class="eyebrow" style="color:#91c6eb">Your field assistant</span>
        <h2>Walk faster. Document clearly. Close the loop.</h2>
        <p>Keep plans, field evidence, PM notes, and punch-list progress together—without replacing the judgment of your project managers.</p>
        <div class="hero-actions">
          <button class="button primary" data-action="new-walk">① Begin guided review</button>
          <button class="button" data-action="new-punch">＋ Quick punch item</button>
        </div>
      </div>
      <div class="walk-card">
        <div class="walk-card-top"><span class="eyebrow" style="color:#8fc2e8">Resume walkthrough</span><span class="status walk">In progress</span></div>
        <h3>${next.lot} · ${next.community}</h3>
        <p>${next.address}<br>First framing walk · ${next.pm}</p>
        <div class="walk-progress"><span style="width:72%"></span></div>
        <div class="walk-meta"><span>12 of 17 areas captured</span><strong>72%</strong></div>
      </div>
    </section>
    <section class="stat-grid">
      ${stat("Active jobs", state.jobs.length, "▦", "+2 this week")}
      ${stat("Open punch items", openCount(punches), "!", `${punches.filter(p => p.priority === "Hold point" && p.status !== "Verified").length} hold point`)}
      ${stat("Walks this week", state.walks.length, "◉", "84% avg. coverage")}
      ${stat("Verified items", punches.filter(p => p.status === "Verified").length, "✓", "Record complete")}
    </section>
    <section class="split-grid">
      <div class="panel">
        <div class="panel-head"><div><span class="eyebrow">Field schedule</span><h2>Active jobs</h2></div><a class="button small ghost" href="#jobs">View all →</a></div>
        <div class="job-list">${state.jobs.map(jobRow).join("")}</div>
      </div>
      <div class="panel activity-panel">
        <div class="panel-head"><div><span class="eyebrow">Documentation trail</span><h2>Recent activity</h2></div></div>
        <div class="panel-body activity-list">${state.activities.map(activityRow).join("")}</div>
      </div>
    </section>`;
}

function stat(label, value, icon, trend) {
  return `<article class="stat-card"><div class="stat-top"><span class="stat-icon">${icon}</span><span class="trend">${trend}</span></div><strong>${value}</strong><small>${label}</small></article>`;
}

function jobRow(job) {
  const punches = jobPunches(job.id);
  return `<div class="job-row" data-job="${job.id}">
    <span class="job-icon">${esc(job.lot.replace("Lot ", ""))}</span>
    <div class="job-name"><strong>${esc(job.lot)} · ${esc(job.community)}</strong><small>${esc(job.address)}</small></div>
    <div class="job-cell hide-tablet">${esc(job.phase)}<small>${esc(job.builder)}</small></div>
    <div class="job-cell"><span class="status ${openCount(punches) ? "open" : "verified"}">${openCount(punches)} open</span></div>
    <div class="progress-ring" style="--p:${progress(punches)}"><span>${progress(punches)}%</span></div>
    <button class="icon-button" style="width:30px;height:30px" aria-label="Open job">›</button>
  </div>`;
}

function activityRow(item) {
  return `<div class="activity"><span class="activity-icon">${item.icon}</span><div><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p><time>${esc(item.time)}</time></div></div>`;
}

function renderJobs() {
  setHeading("Work in progress", "Jobs");
  app.innerHTML = `
    <div class="page-tools"><div class="search-wrap"><span>⌕</span><input id="job-search" placeholder="Search lot, community, builder, or PM"></div><button class="button primary" data-action="new-job">＋ Add job</button></div>
    <div class="panel"><div class="panel-head"><div><span class="eyebrow">All active work</span><h2>${state.jobs.length} jobs</h2></div></div><div class="job-list">${state.jobs.map(jobRow).join("")}</div></div>`;
  document.querySelector("#job-search").addEventListener("input", (event) => {
    const q = event.target.value.toLowerCase();
    document.querySelector(".job-list").innerHTML = state.jobs.filter(job => Object.values(job).join(" ").toLowerCase().includes(q)).map(jobRow).join("") || `<div class="empty"><h3>No matching jobs</h3></div>`;
  });
}

function renderWalks() {
  const job = activeJob();
  const flow = jobWorkflow();
  const docs = state.docs.filter(doc => doc.jobId === job.id);
  const hasDocs = docs.length > 0;
  const hasMedia = flow.media.length > 0;
  const hasFindings = flow.suggestions.length > 0;
  const currentStep = !hasDocs ? 1 : !hasMedia ? 2 : !hasFindings ? 3 : 4;
  setHeading(`${job.lot} · ${job.community}`, "Guided field review");
  app.innerHTML = `
    <section class="workflow-intro">
      <div><span class="eyebrow">Simple four-step process</span><h2>From job documents to a clear punch list</h2><p>Complete each step in order. JCom keeps everything attached to ${esc(job.lot)} and shows you exactly what comes next.</p></div>
      <span class="workflow-current">Step ${currentStep} of 4</span>
    </section>
    <section class="workflow-rail" aria-label="Field review progress">
      ${workflowRailStep(1, "Documents", "Plans & references", hasDocs, currentStep)}
      ${workflowRailStep(2, "Walkthrough", "Video & photos", hasMedia, currentStep)}
      ${workflowRailStep(3, "Generate", "Draft findings", hasFindings, currentStep)}
      ${workflowRailStep(4, "PM review", "Publish punch list", false, currentStep)}
    </section>
    <section class="workflow-stack">
      ${workflowDocuments(docs, currentStep)}
      ${workflowCapture(flow, hasDocs, currentStep)}
      ${workflowGenerate(flow, hasMedia, currentStep)}
      ${workflowReview(flow, hasFindings, currentStep)}
    </section>`;
}

function workflowRailStep(number, title, detail, complete, current) {
  const stateClass = complete ? "complete" : current === number ? "current" : current > number ? "complete" : "locked";
  return `<div class="rail-step ${stateClass}"><span class="rail-number">${complete ? "✓" : number}</span><span><strong>${title}</strong><small>${detail}</small></span></div>`;
}

function workflowDocuments(docs, current) {
  return `<article class="workflow-card ${current === 1 ? "active" : "complete"}">
    <div class="workflow-card-head"><span class="step-badge">1</span><div><span class="eyebrow">Start here</span><h3>Upload the job documents</h3><p>Add everything JCom should reference before reviewing the walkthrough.</p></div><span class="step-state ${docs.length ? "done" : "needed"}">${docs.length ? `✓ ${docs.length} uploaded` : "Required"}</span></div>
    <div class="document-types"><span>▤ Building plans</span><span>⌂ Truss layout</span><span>✓ Truss seals</span><span>✎ Redlines</span><span>＋ Other documents</span></div>
    ${docs.length ? `<div class="uploaded-list">${docs.slice(-5).map(doc => `<span><strong>${esc(doc.name)}</strong><small>${esc(doc.type)}</small></span>`).join("")}</div>` : `<div class="step-help">Upload the current approved plan set and every document the PM may need during the walk.</div>`}
    <button class="button ${docs.length ? "" : "primary"}" data-action="upload-doc">${docs.length ? "＋ Add more documents" : "↑ Upload plans and documents"}</button>
  </article>`;
}

function workflowCapture(flow, unlocked, current) {
  return `<article class="workflow-card ${current === 2 ? "active" : ""} ${unlocked ? "" : "locked"}">
    <div class="workflow-card-head"><span class="step-badge">2</span><div><span class="eyebrow">Capture the site</span><h3>Add the walkthrough video and photos</h3><p>Record slowly and capture every room, opening, connection, and area needing a closer look.</p></div><span class="step-state ${flow.media.length ? "done" : "needed"}">${flow.media.length ? `✓ ${flow.media.length} file${flow.media.length === 1 ? "" : "s"}` : unlocked ? "Next step" : "Locked"}</span></div>
    ${unlocked ? `<div class="capture-actions"><button class="capture-button video" data-action="record-video"><span>▶</span><strong>Record or upload video</strong><small>Use one slow, continuous walkthrough</small></button><button class="capture-button photo" data-action="take-photo"><span>▧</span><strong>Add site photos</strong><small>Capture close-ups and missed areas</small></button></div>${flow.media.length ? `<div class="media-strip">${flow.media.map(item => `<span>${item.kind === "video" ? "▶" : "▧"} ${esc(item.name)}</span>`).join("")}</div>` : ""}` : `<div class="locked-message">Complete Step 1 to unlock field capture.</div>`}
  </article>`;
}

function workflowGenerate(flow, unlocked, current) {
  return `<article class="workflow-card ${current === 3 ? "active" : ""} ${unlocked ? "" : "locked"}">
    <div class="workflow-card-head"><span class="step-badge">3</span><div><span class="eyebrow">JCom review</span><h3>Generate what may be missing or needed</h3><p>JCom organizes possible plan differences, visible incomplete work, and areas that could not be verified.</p></div><span class="step-state ${flow.suggestions.length ? "done" : "needed"}">${flow.suggestions.length ? `✓ ${flow.suggestions.length} drafts` : unlocked ? "Ready" : "Locked"}</span></div>
    ${unlocked ? `<div class="generate-box"><span class="generate-icon">◆</span><div><strong>${flow.suggestions.length ? "Draft findings are ready" : "Documents and field media are ready"}</strong><p>${flow.suggestions.length ? "Continue to Step 4 to review each item before it becomes part of the punch list." : "Generate a PM review queue using the uploaded references and walkthrough evidence."}</p></div><button class="button primary" data-action="analyze-walk">${flow.suggestions.length ? "Regenerate drafts" : "Generate draft findings"}</button></div>` : `<div class="locked-message">Complete the walkthrough upload to unlock generation.</div>`}
    <div class="notice"><strong>PM-controlled documentation:</strong> Generated observations are drafts—not engineering decisions or code-compliance determinations.</div>
  </article>`;
}

function workflowReview(flow, unlocked, current) {
  const approved = flow.suggestions.filter(item => item.approved).length;
  return `<article class="workflow-card ${current === 4 ? "active" : ""} ${unlocked ? "" : "locked"}">
    <div class="workflow-card-head"><span class="step-badge">4</span><div><span class="eyebrow">Final PM decision</span><h3>Review and create the punch list</h3><p>Approve, edit, or leave out every draft. Only approved items enter the official job record.</p></div><span class="step-state ${approved ? "done" : "needed"}">${unlocked ? `${approved}/${flow.suggestions.length} approved` : "Locked"}</span></div>
    ${unlocked ? `<div class="finding-list">${flow.suggestions.map(findingCard).join("")}</div><button class="button navy" data-action="continue-punch">View official punch list →</button>` : `<div class="locked-message">Generate the draft findings to unlock PM review.</div>`}
  </article>`;
}

function findingCard(item, index) {
  return `<div class="finding ${item.approved ? "approved" : ""}"><span class="finding-icon">${item.approved ? "✓" : "!"}</span><div><strong>${esc(item.title)}</strong><p>${esc(item.location)} · ${esc(item.reference)}</p><small>${esc(item.reason)}</small></div><button class="button small ${item.approved ? "" : "primary"}" data-action="approve-suggestion" data-index="${index}" ${item.approved ? "disabled" : ""}>${item.approved ? "Added" : "Approve"}</button></div>`;
}

function walkCheck(title, detail, done) {
  return `<div class="check-item ${done ? "done" : ""}"><span class="check-circle">${done ? "✓" : ""}</span><span><strong>${title}</strong><small>${detail}</small></span><em>${done ? "Captured" : "Needed"}</em></div>`;
}

function renderPunches() {
  const job = activeJob();
  const items = filterPunches(jobPunches(), searchTerm, currentFilter);
  setHeading(`${job.lot} · ${job.community}`, "Punch list");
  app.innerHTML = `
    <div class="page-tools">
      <div class="search-wrap"><span>⌕</span><input id="punch-search" value="${esc(searchTerm)}" placeholder="Search descriptions, locations, or trades"></div>
      <div style="display:flex;gap:8px"><button class="button" data-action="print">↗ Export</button><button class="button primary" data-action="new-punch">＋ Add punch item</button></div>
    </div>
    <div class="filter-row" style="margin-bottom:16px">${["All", ...STATUS].map(value => `<button class="filter ${currentFilter === value ? "active" : ""}" data-filter="${value}">${value}${value === "All" ? ` · ${jobPunches().length}` : ""}</button>`).join("")}</div>
    ${items.length ? `<section class="punch-grid">${items.map(punchCard).join("")}</section>` : `<div class="panel empty"><div class="empty-icon">✓</div><h3>No punch items here</h3><p>Change the filter or create the first item for this job.</p></div>`}`;
  document.querySelector("#punch-search").addEventListener("input", (event) => { searchTerm = event.target.value; renderPunches(); document.querySelector("#punch-search")?.focus(); });
}

function punchCard(item) {
  const image = item.photo ? `style="background-image:url('${item.photo}')"` : "";
  return `<article class="punch-card" data-punch="${item.id}">
    <div class="punch-photo ${item.photo ? "has-image" : ""}" ${image}><span class="photo-label">${esc(item.source)}</span></div>
    <div class="punch-content"><div class="punch-top"><span class="punch-number">${esc(item.number)}</span><span class="status ${statusClass(item.status)}">${esc(item.status)}</span></div>
    <h3>${esc(item.title)}</h3><div class="punch-location">⌖ ${esc(item.location)}</div>
    <div class="punch-meta"><span>Responsible trade<strong>${esc(item.trade)}</strong></span><span>Due date<strong>${formatDate(item.due)}</strong></span><span>Reference<strong>${esc(item.reference || "Field note")}</strong></span><span>Priority<strong>${esc(item.priority)}</strong></span></div></div>
  </article>`;
}

function renderDocuments() {
  const job = activeJob();
  const docs = state.docs.filter(doc => doc.jobId === job.id);
  setHeading(`${job.lot} · ${job.community}`, "Job documents");
  app.innerHTML = `
    <div class="page-tools"><div><span class="eyebrow">Single source of truth</span><h2 style="margin:5px 0 0">Plans, layouts, seals & field records</h2></div><button class="button primary" data-action="upload-doc">↑ Upload documents</button></div>
    <div class="notice" style="margin-bottom:16px">Upload the current approved set and clearly identify revisions. JCom records uploaded files for the project team; it does not approve design documents.</div>
    <section class="doc-grid">
      ${docs.map(docCard).join("")}
      <button class="doc-card upload-card" data-action="upload-doc"><div><span style="font-size:28px;color:var(--blue)">＋</span><strong>Add job documents</strong><small>PDF, image, or Word files</small></div></button>
    </section>`;
}

function docCard(doc) {
  return `<article class="doc-card"><span class="doc-icon">${esc(doc.type)}</span><h3>${esc(doc.name)}</h3><p>${esc(doc.detail)}</p><div class="doc-foot"><span>${formatDate(doc.uploaded)}</span><span>${esc(doc.by)}</span></div></article>`;
}

function renderReports() {
  const job = activeJob();
  const items = jobPunches();
  setHeading(`${job.lot} · ${job.community}`, "Field report");
  app.innerHTML = `<div class="page-tools"><div><span class="eyebrow">Shareable documentation</span><h2 style="margin:5px 0 0">Punch-list summary</h2></div><button class="button primary" data-action="print">Print / save PDF</button></div>
    <section class="panel"><div class="panel-body" style="padding:28px">
      <div style="display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid var(--navy);padding-bottom:18px;margin-bottom:20px"><div><span class="eyebrow">JCom field report</span><h2 style="margin:5px 0">${esc(job.lot)} · ${esc(job.community)}</h2><p style="margin:0;color:var(--muted);font-size:12px">${esc(job.address)} · ${esc(job.builder)} · ${esc(job.phase)}</p></div><div style="text-align:right"><strong>${items.length} total items</strong><p style="font-size:11px;color:var(--muted)">${openCount(items)} requiring action<br>${items.filter(i => i.status === "Verified").length} verified</p></div></div>
      <div class="punch-grid">${items.map(punchCard).join("")}</div>
      <div class="notice" style="margin-top:20px">This report documents observed field conditions and project-manager actions. It is not an engineering report, inspection certificate, or determination of code compliance.</div>
    </div></section>`;
}

function openPunchModal(item = null, forceNew = false) {
  const editing = Boolean(item) && !forceNew;
  modalRoot.innerHTML = `<div class="modal-backdrop"><form class="modal" id="punch-form">
    <div class="modal-head"><div><span class="eyebrow">PM-controlled record</span><h2>${editing ? `Edit ${esc(item.number)}` : "New punch item"}</h2></div><button type="button" class="icon-button" data-action="close-modal">×</button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="field full"><label>Description</label><input name="title" required placeholder="What needs attention?" value="${esc(item?.title)}"></div>
      <div class="field"><label>Location</label><input name="location" required placeholder="Room or elevation" value="${esc(item?.location)}"></div>
      <div class="field"><label>Responsible trade</label><select name="trade">${["Framing","Windows & Doors","Interior Trim","Service","Builder review","Other"].map(v => `<option ${item?.trade === v ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      <div class="field"><label>Priority</label><select name="priority">${["Standard","Priority","Hold point"].map(v => `<option ${item?.priority === v ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      <div class="field"><label>Status</label><select name="status">${STATUS.map(v => `<option ${item?.status === v ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      <div class="field"><label>Due date</label><input name="due" type="date" value="${esc(item?.due)}"></div>
      <div class="field"><label>Plan / document reference</label><input name="reference" placeholder="A3.1 / Detail 7" value="${esc(item?.reference)}"></div>
      <div class="field full"><label>PM notes</label><textarea name="notes" placeholder="Add the facts needed to understand and close this item.">${esc(item?.notes)}</textarea></div>
    </div><div class="modal-actions">${editing ? `<button type="button" class="button ghost" data-action="delete-punch" data-id="${item.id}">Delete</button>` : ""}<button type="button" class="button" data-action="close-modal">Cancel</button><button class="button primary" type="submit">${editing ? "Save changes" : "Create punch item"}</button></div></div>
  </form></div>`;
  document.querySelector("#punch-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target));
    if (editing) Object.assign(item, values);
    else state.punches.unshift({ ...makePunch({ ...values, photo: item?.photo || "" }, jobPunches()), jobId: state.activeJob });
    state.activities.unshift({ icon: editing ? "↻" : "+", title: editing ? `${item.number} updated` : "Punch item created", detail: values.title, time: "Just now" });
    save(); closeModal(); showToast(editing ? "Punch item updated" : "Punch item created"); render();
  });
}

function openJobModal() {
  modalRoot.innerHTML = `<div class="modal-backdrop"><form class="modal" id="job-form"><div class="modal-head"><div><span class="eyebrow">Project setup</span><h2>Add a job</h2></div><button type="button" class="icon-button" data-action="close-modal">×</button></div><div class="modal-body"><div class="form-grid">
    <div class="field"><label>Lot</label><input name="lot" required placeholder="Lot 001"></div><div class="field"><label>Community</label><input name="community" required></div><div class="field full"><label>Address</label><input name="address" required></div><div class="field"><label>Builder</label><input name="builder" required></div><div class="field"><label>Project manager</label><input name="pm" required></div><div class="field"><label>Phase</label><select name="phase"><option>Framing</option><option>Windows & Doors</option><option>Interior Trim</option><option>Service</option><option>Decks</option></select></div><div class="field"><label>Next walk</label><input type="date" name="nextWalk"></div>
    </div><div class="modal-actions"><button type="button" class="button" data-action="close-modal">Cancel</button><button class="button primary">Add job</button></div></div></form></div>`;
  document.querySelector("#job-form").addEventListener("submit", (event) => {
    event.preventDefault(); const values = Object.fromEntries(new FormData(event.target)); const id = `job-${Date.now()}`;
    state.jobs.unshift({ id, ...values, status: "Active" }); state.activeJob = id; save(); closeModal(); showToast("Job added"); location.hash = "documents";
  });
}

function closeModal() { modalRoot.innerHTML = ""; }
function showToast(message) { toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2300); }

document.addEventListener("click", (event) => {
  const actionEl = event.target.closest("[data-action]");
  const jobEl = event.target.closest("[data-job]");
  const punchEl = event.target.closest("[data-punch]");
  const filterEl = event.target.closest("[data-filter]");
  if (jobEl) { state.activeJob = jobEl.dataset.job; save(); location.hash = "punch"; }
  if (punchEl) openPunchModal(state.punches.find(item => item.id === punchEl.dataset.punch));
  if (filterEl) { currentFilter = filterEl.dataset.filter; renderPunches(); }
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  if (action === "new-punch") openPunchModal();
  if (action === "new-job") openJobModal();
  if (action === "new-walk") location.hash = "walks";
  if (action === "upload-doc") document.querySelector("#document-input").click();
  if (action === "record-video") document.querySelector("#video-input").click();
  if (action === "take-photo") document.querySelector("#photo-input").click();
  if (action === "analyze-walk") {
    const flow = jobWorkflow();
    flow.status = "review";
    flow.suggestions = [
      { title: "Opening requires PM verification", location: "Kitchen — rear wall", reference: "Architectural plan A3.1", reason: "The walkthrough view should be checked against the uploaded opening detail.", approved: false },
      { title: "Visible framing item may be incomplete", location: "Main stair — landing", reference: "Plan detail A5.2", reason: "Review the captured area for backing and alignment before closing the walk.", approved: false },
      { title: "Area not fully verified in walkthrough", location: "Second floor — bedroom 3", reference: "Truss layout", reason: "Add a closer image of the truss tag and connection before final verification.", approved: false }
    ];
    save(); showToast("Draft review generated — PM approval required"); renderWalks();
  }
  if (action === "approve-suggestion") {
    const flow = jobWorkflow();
    const suggestion = flow.suggestions[Number(actionEl.dataset.index)];
    if (suggestion && !suggestion.approved) {
      state.punches.unshift({ ...makePunch({ title: suggestion.title, location: suggestion.location, reference: suggestion.reference, notes: suggestion.reason, source: "JCom draft — PM approved", priority: "Standard" }, jobPunches()), jobId: state.activeJob });
      suggestion.approved = true; save(); showToast("Approved and added to the punch list"); renderWalks();
    }
  }
  if (action === "continue-punch") location.hash = "punch";
  if (action === "finish-walk") { showToast("Walk saved for PM review"); location.hash = "punch"; }
  if (action === "print") window.print();
  if (action === "close-modal") closeModal();
  if (action === "delete-punch") {
    if (confirm("Delete this punch item?")) { state.punches = state.punches.filter(item => item.id !== actionEl.dataset.id); save(); closeModal(); showToast("Punch item deleted"); render(); }
  }
});

document.querySelector("#document-input").addEventListener("change", (event) => {
  const today = new Date().toISOString().slice(0, 10);
  [...event.target.files].forEach(file => state.docs.push({ id: `doc-${Date.now()}-${file.name}`, jobId: state.activeJob, name: file.name, type: file.name.split(".").pop().toUpperCase(), detail: `${Math.max(1, Math.round(file.size / 1024))} KB · Uploaded file`, uploaded: today, by: "Jacob Davis" }));
  jobWorkflow().status = "capture";
  save(); event.target.value = ""; showToast("Documents uploaded — Step 2 is ready"); route() === "walks" ? renderWalks() : renderDocuments();
});

document.querySelector("#video-input").addEventListener("change", (event) => {
  if (!event.target.files.length) return;
  const flow = jobWorkflow();
  [...event.target.files].forEach(file => flow.media.push({ kind: "video", name: file.name, size: file.size }));
  flow.status = "generate";
  showToast("Walkthrough added — Step 3 is ready");
  state.activities.unshift({ icon: "◉", title: "Walkthrough video attached", detail: `${activeJob().lot} · Awaiting PM review`, time: "Just now" }); save(); event.target.value = "";
  if (route() === "walks") renderWalks();
});

document.querySelector("#photo-input").addEventListener("change", (event) => {
  const file = event.target.files[0]; if (!file) return;
  const flow = jobWorkflow();
  flow.media.push({ kind: "photo", name: file.name, size: file.size });
  flow.status = "generate";
  save(); event.target.value = ""; showToast("Site photo added to the walkthrough");
  if (route() === "walks") renderWalks();
});

document.querySelector("#menu-button").addEventListener("click", () => document.body.classList.toggle("menu-open"));
document.querySelector("#search-button").addEventListener("click", () => { location.hash = "punch"; setTimeout(() => document.querySelector("#punch-search")?.focus(), 30); });
window.addEventListener("hashchange", render);
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => {});
render();
