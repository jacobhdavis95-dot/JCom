import { STATUS, filterPunches, formatDate, makePunch, openCount, progress } from "./core.mjs";

const STORAGE_KEY = "jcom-mvp-v1";
const FIELD_TEMPLATES = {
  "Framing — first walk": ["Exterior elevations", "Garage", "First floor", "Stairs", "Second floor", "Roof / trusses", "Openings", "Final overview"],
  "Framing — follow-up": ["Prior punch items", "First floor corrections", "Second floor corrections", "Truss / roof corrections", "Final overview"],
  "Windows & doors": ["Front elevation", "Right elevation", "Rear elevation", "Left elevation", "Interior openings", "Operation / closeout"],
  "Interior trim": ["Entry / foyer", "Kitchen", "Living areas", "Bedrooms", "Bathrooms", "Stairs", "Final overview"],
  "Decks": ["Ledger / house connection", "Posts / beams", "Joists", "Decking", "Rails / stairs", "Final overview"],
  "Service / closeout": ["Open punch items", "Reported concern", "Completed correction", "Surrounding conditions", "Final overview"]
};
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
    { id: "w2", jobId: "job-1", date: "2026-09-19", type: "Framing follow-up", pm: "Will Thompson", coverage: 100, media: 12, status: "Complete" },
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
state.activities = (state.activities || []).map(item => ({ jobId: item.jobId || state.activeJob, ...item }));
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
  const job = state.jobs.find(item => item.id === jobId) || activeJob();
  const defaultTemplate = job.phase === "Windows & Doors" ? "Windows & doors" : job.phase === "Interior Trim" ? "Interior trim" : job.phase === "Decks" ? "Decks" : job.phase === "Service" ? "Service / closeout" : "Framing — first walk";
  state.workflow[jobId] ||= { media: [], status: "documents", suggestions: [], template: defaultTemplate, areas: {}, revisionConfirmed: false };
  const flow = state.workflow[jobId];
  flow.media ||= []; flow.suggestions ||= []; flow.template ||= defaultTemplate; flow.areas ||= {}; flow.revisionConfirmed ??= false;
  return flow;
}
function templateAreas(flow = jobWorkflow()) { return FIELD_TEMPLATES[flow.template] || FIELD_TEMPLATES["Framing — first walk"]; }
function activeArea(flow = jobWorkflow()) { return flow.activeArea || templateAreas(flow).find(area => !flow.areas[area]) || templateAreas(flow)[0]; }
function logActivity(icon, title, detail, jobId = state.activeJob) { state.activities.unshift({ jobId, icon, title, detail, time: "Just now", at: new Date().toISOString() }); }
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
  const hasDocs = docs.length > 0 && flow.revisionConfirmed;
  const hasMedia = flow.media.length > 0;
  const hasFindings = flow.suggestions.length > 0;
  const currentStep = !hasDocs ? 1 : !hasMedia ? 2 : !hasFindings ? 3 : 4;
  setHeading(`${job.lot} · ${job.community}`, "Guided field review");
  app.innerHTML = `
    <section class="workflow-intro">
      <div><span class="eyebrow">Simple four-step process</span><h2>From job documents to a clear punch list</h2><p>Choose the walk type, confirm the current documents, capture each area, then review every draft before it enters the job record.</p></div>
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
  const flow = jobWorkflow();
  const types = new Set(docs.map(doc => doc.type));
  const readiness = [
    ["Plan set", [...types].some(type => /PDF|PLAN|DWG/.test(type))],
    ["Truss layout", docs.some(doc => /truss|layout/i.test(doc.name))],
    ["Seals / supporting docs", docs.some(doc => /seal|calculation|spec/i.test(doc.name))]
  ];
  return `<article class="workflow-card ${current === 1 ? "active" : "complete"}">
    <div class="workflow-card-head"><span class="step-badge">1</span><div><span class="eyebrow">Start here</span><h3>Choose the walk and confirm documents</h3><p>Set the field template, upload references, and confirm the revision before capturing the site.</p></div><span class="step-state ${docs.length && flow.revisionConfirmed ? "done" : "needed"}">${docs.length && flow.revisionConfirmed ? `✓ Ready` : "Required"}</span></div>
    <div class="setup-grid">
      <label class="compact-field"><span>Job walk template</span><select data-action="select-template">${Object.keys(FIELD_TEMPLATES).map(name => `<option ${flow.template === name ? "selected" : ""}>${esc(name)}</option>`).join("")}</select></label>
      <div class="readiness-list">${readiness.map(([label, ready]) => `<span class="${ready ? "ready" : "missing"}">${ready ? "✓" : "○"} ${label}</span>`).join("")}</div>
    </div>
    <div class="document-types"><span>▤ Building plans</span><span>⌂ Truss layout</span><span>✓ Truss seals</span><span>✎ Redlines</span><span>＋ Other documents</span></div>
    ${docs.length ? `<div class="uploaded-list">${docs.slice(-5).map(doc => `<span><strong>${esc(doc.name)}</strong><small>${esc(doc.type)}</small></span>`).join("")}</div>` : `<div class="step-help">Upload the current approved plan set and every document the PM may need during the walk.</div>`}
    <div class="step-actions"><button class="button ${docs.length ? "" : "primary"}" data-action="upload-doc">${docs.length ? "＋ Add documents" : "↑ Upload plans and documents"}</button>${docs.length ? `<button class="button ${flow.revisionConfirmed ? "success" : "primary"}" data-action="confirm-revision">${flow.revisionConfirmed ? "✓ Current revision confirmed" : "Confirm current revision"}</button>` : ""}</div>
  </article>`;
}

function workflowCapture(flow, unlocked, current) {
  const areas = templateAreas(flow);
  const covered = areas.filter(area => flow.areas[area]).length;
  return `<article class="workflow-card ${current === 2 ? "active" : ""} ${unlocked ? "" : "locked"}">
    <div class="workflow-card-head"><span class="step-badge">2</span><div><span class="eyebrow">Capture the site</span><h3>Walk area by area</h3><p>JCom keeps the walkthrough organized so missed spaces are obvious before you leave.</p></div><span class="step-state ${flow.media.length ? "done" : "needed"}">${flow.media.length ? `✓ ${covered}/${areas.length} areas` : unlocked ? "Next step" : "Locked"}</span></div>
    ${unlocked ? `<div class="area-guide"><div class="area-guide-head"><strong>${esc(flow.template)}</strong><span>${covered} of ${areas.length} covered</span></div><div class="area-list">${areas.map(area => `<button class="area-chip ${flow.areas[area] ? "done" : ""} ${activeArea(flow) === area ? "active" : ""}" data-action="select-area" data-area="${esc(area)}">${flow.areas[area] ? "✓" : "○"} ${esc(area)}</button>`).join("")}</div><p>Capturing now: <strong>${esc(activeArea(flow))}</strong></p></div><div class="capture-actions"><button class="capture-button video" data-action="record-video"><span>▶</span><strong>Record or upload video</strong><small>Tagged to ${esc(activeArea(flow))}</small></button><button class="capture-button photo" data-action="take-photo"><span>▧</span><strong>Add site photo</strong><small>Capture a close-up or overview</small></button><button class="capture-button voice" data-action="voice-punch"><span>◉</span><strong>Speak a punch item</strong><small>Hands-free field note</small></button></div>${flow.media.length ? `<div class="media-strip">${flow.media.map((item, index) => `<span>${item.kind === "video" ? "▶" : "▧"} ${esc(item.area || "General")} · ${esc(item.name)}${item.kind === "photo" ? ` <button class="inline-link" data-action="mark-photo" data-index="${index}">Mark up</button>` : ""}</span>`).join("")}</div>` : ""}` : `<div class="locked-message">Upload documents and confirm the current revision to unlock field capture.</div>`}
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
  const reviewed = flow.suggestions.filter(item => item.decision).length;
  return `<article class="workflow-card ${current === 4 ? "active" : ""} ${unlocked ? "" : "locked"}">
    <div class="workflow-card-head"><span class="step-badge">4</span><div><span class="eyebrow">Final PM decision</span><h3>Review and create the punch list</h3><p>Every draft needs a decision and supporting evidence. Only PM-approved items enter the official record.</p></div><span class="step-state ${reviewed === flow.suggestions.length ? "done" : "needed"}">${unlocked ? `${reviewed}/${flow.suggestions.length} reviewed` : "Locked"}</span></div>
    ${unlocked ? `<div class="finding-list">${flow.suggestions.map(findingCard).join("")}</div><div class="step-actions"><button class="button navy" data-action="continue-punch">View punch list →</button><button class="button" data-action="share-packet">Share / save job packet</button></div>` : `<div class="locked-message">Generate the draft findings to unlock PM review.</div>`}
  </article>`;
}

function findingCard(item, index) {
  const evidence = item.evidence || "Walkthrough media · linked area";
  return `<div class="finding ${item.decision === "Approved" ? "approved" : ""} ${item.decision === "Not in scope" ? "muted" : ""}"><span class="finding-icon">${item.decision === "Approved" ? "✓" : item.decision ? "•" : "!"}</span><div class="finding-copy"><strong>${esc(item.title)}</strong><p>${esc(item.location)} · ${esc(item.reference)}</p><small>${esc(item.reason)}</small><span class="evidence-tag">▧ ${esc(evidence)}</span>${item.decision ? `<span class="decision-tag">${esc(item.decision)}</span>` : ""}</div><div class="finding-actions">${item.decision ? `<button class="button small" data-action="reset-suggestion" data-index="${index}">Change</button>` : `<button class="button small primary" data-action="approve-suggestion" data-index="${index}">Approve</button><button class="button small" data-action="edit-suggestion" data-index="${index}">Edit</button><button class="button small" data-action="decide-suggestion" data-decision="Need photo" data-index="${index}">Need photo</button><button class="button small" data-action="decide-suggestion" data-decision="Builder follow-up" data-index="${index}">Builder</button><button class="button small ghost" data-action="decide-suggestion" data-decision="Not in scope" data-index="${index}">Not in scope</button>`}</div></div>`;
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
      <div class="tool-actions"><button class="button" data-action="voice-punch">◉ Speak item</button><button class="button" data-action="share-packet">↗ Share / save</button><button class="button primary" data-action="new-punch">＋ Add punch item</button></div>
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
  const flow = jobWorkflow();
  const docs = state.docs.filter(doc => doc.jobId === job.id);
  setHeading(`${job.lot} · ${job.community}`, "Job documents");
  app.innerHTML = `
    <div class="page-tools"><div><span class="eyebrow">Single source of truth</span><h2 style="margin:5px 0 0">Plans, layouts, seals & field records</h2></div><div class="tool-actions"><button class="button" data-action="import-packet">Import job packet</button><button class="button primary" data-action="upload-doc">↑ Upload documents</button></div></div>
    <div class="notice revision-notice ${flow.revisionConfirmed ? "confirmed" : ""}" style="margin-bottom:16px"><strong>${flow.revisionConfirmed ? "✓ Current revision confirmed" : "Revision check needed"}</strong><span> JCom records the files selected by the project team; it does not approve design documents.</span>${docs.length ? `<button class="button small" data-action="confirm-revision">${flow.revisionConfirmed ? "Mark for recheck" : "Confirm current set"}</button>` : ""}</div>
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
  const flow = jobWorkflow();
  const docs = state.docs.filter(doc => doc.jobId === job.id);
  const timeline = state.activities.filter(item => !item.jobId || item.jobId === job.id).slice(0, 12);
  const openItems = items.filter(item => item.status !== "Verified");
  app.innerHTML = `<div class="page-tools"><div><span class="eyebrow">Complete job record</span><h2 style="margin:5px 0 0">Field documentation packet</h2></div><div class="tool-actions"><button class="button" data-action="closeout-package">Subcontractor closeout</button><button class="button" data-action="print">Save PDF</button><button class="button primary" data-action="share-packet">Share / save packet</button></div></div>
    <section class="panel"><div class="panel-body" style="padding:28px">
      <div class="report-head"><div><span class="eyebrow">JCom field report</span><h2>${esc(job.lot)} · ${esc(job.community)}</h2><p>${esc(job.address)} · ${esc(job.builder)} · ${esc(job.phase)}</p></div><div><strong>${items.length} total items</strong><p>${openCount(items)} requiring action<br>${items.filter(i => i.status === "Verified").length} verified</p></div></div>
      <div class="report-metrics"><span><strong>${docs.length}</strong>Documents</span><span><strong>${flow.media.length}</strong>Evidence files</span><span><strong>${templateAreas(flow).filter(area => flow.areas[area]).length}/${templateAreas(flow).length}</strong>Areas covered</span><span><strong>${openItems.length}</strong>Closeout items</span></div>
      <section class="report-section"><div class="section-title"><span class="eyebrow">Document register</span><h3>Current references</h3></div><div class="report-table">${docs.map(doc => `<div><strong>${esc(doc.name)}</strong><span>${esc(doc.type)} · ${formatDate(doc.uploaded)}</span></div>`).join("") || "<p>No documents uploaded.</p>"}</div></section>
      <section class="report-section"><div class="section-title"><span class="eyebrow">PM-approved record</span><h3>Punch list</h3></div><div class="punch-grid">${items.map(punchCard).join("") || "<p>No punch items.</p>"}</div></section>
      <section class="report-section timeline-section"><div class="section-title"><span class="eyebrow">Audit history</span><h3>Job timeline</h3></div><div class="timeline">${timeline.map(activityRow).join("") || "<p>No activity recorded.</p>"}</div></section>
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

function openSuggestionModal(index) {
  const item = jobWorkflow().suggestions[index];
  if (!item) return;
  modalRoot.innerHTML = `<div class="modal-backdrop"><form class="modal" id="suggestion-form"><div class="modal-head"><div><span class="eyebrow">Edit draft before approval</span><h2>Review finding</h2></div><button type="button" class="icon-button" data-action="close-modal">×</button></div><div class="modal-body"><div class="form-grid"><div class="field full"><label>Description</label><input name="title" required value="${esc(item.title)}"></div><div class="field"><label>Location</label><input name="location" required value="${esc(item.location)}"></div><div class="field"><label>Reference</label><input name="reference" value="${esc(item.reference)}"></div><div class="field full"><label>Reason / PM note</label><textarea name="reason">${esc(item.reason)}</textarea></div><div class="field full"><label>Evidence</label><input name="evidence" value="${esc(item.evidence || "Walkthrough media · linked area")}"></div></div><div class="modal-actions"><button type="button" class="button" data-action="close-modal">Cancel</button><button class="button primary">Save and approve</button></div></div></form></div>`;
  document.querySelector("#suggestion-form").addEventListener("submit", event => {
    event.preventDefault(); Object.assign(item, Object.fromEntries(new FormData(event.target))); closeModal(); approveSuggestion(index);
  });
}

function approveSuggestion(index) {
  const flow = jobWorkflow();
  const suggestion = flow.suggestions[index];
  if (!suggestion || suggestion.decision === "Approved") return;
  state.punches.unshift({ ...makePunch({ title: suggestion.title, location: suggestion.location, reference: suggestion.reference, notes: `${suggestion.reason}\nEvidence: ${suggestion.evidence || "Walkthrough media"}`, source: "JCom draft — PM approved", priority: "Standard" }, jobPunches()), jobId: state.activeJob });
  suggestion.decision = "Approved"; suggestion.approved = true;
  logActivity("✓", "Draft approved into punch list", suggestion.title); save(); showToast("Approved and added to the punch list"); renderWalks();
}

function openMarkupModal(index) {
  const item = jobWorkflow().media[index];
  if (!item?.dataUrl) { showToast("This photo is indexed, but a preview was not stored"); return; }
  modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal markup-modal"><div class="modal-head"><div><span class="eyebrow">Field evidence</span><h2>Mark up photo</h2></div><button type="button" class="icon-button" data-action="close-modal">×</button></div><div class="modal-body"><canvas id="markup-canvas"></canvas><div class="markup-tools"><span>Draw on the area needing attention.</span><button class="button" data-action="clear-markup">Clear</button><button class="button primary" data-action="save-markup" data-index="${index}">Save marked photo</button></div></div></div></div>`;
  const canvas = document.querySelector("#markup-canvas"); const ctx = canvas.getContext("2d"); const image = new Image();
  image.onload = () => { const max = 900; const scale = Math.min(1, max / image.width); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale); ctx.drawImage(image, 0, 0, canvas.width, canvas.height); canvas.dataset.base = item.dataUrl; };
  image.src = item.markedUrl || item.dataUrl;
  let drawing = false;
  const point = event => { const rect = canvas.getBoundingClientRect(); const source = event.touches?.[0] || event; return { x: (source.clientX - rect.left) * canvas.width / rect.width, y: (source.clientY - rect.top) * canvas.height / rect.height }; };
  const start = event => { event.preventDefault(); drawing = true; const p = point(event); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.strokeStyle = "#ef233c"; ctx.lineWidth = Math.max(4, canvas.width / 140); ctx.lineCap = "round"; };
  const move = event => { if (!drawing) return; event.preventDefault(); const p = point(event); ctx.lineTo(p.x, p.y); ctx.stroke(); };
  canvas.addEventListener("pointerdown", start); canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerup", () => drawing = false); canvas.addEventListener("pointerleave", () => drawing = false);
}

function fileToEvidenceImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file); const image = new Image();
    image.onload = () => { const max = 1200; const scale = Math.min(1, max / Math.max(image.width, image.height)); const canvas = document.createElement("canvas"); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale); canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(url); resolve(canvas.toDataURL("image/jpeg", .76)); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image could not be read")); }; image.src = url;
  });
}

function packetData() {
  const job = activeJob(); const flow = jobWorkflow();
  return { format: "JCom Job Packet", version: 1, exportedAt: new Date().toISOString(), job, documentRevisionConfirmed: flow.revisionConfirmed, documents: state.docs.filter(doc => doc.jobId === job.id), walkthrough: { template: flow.template, areas: flow.areas, media: flow.media, findings: flow.suggestions }, punchList: jobPunches(), timeline: state.activities.filter(item => !item.jobId || item.jobId === job.id) };
}

function downloadFile(file) {
  const url = URL.createObjectURL(file); const anchor = document.createElement("a"); anchor.href = url; anchor.download = file.name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function sharePacket() {
  const packet = packetData(); const slug = `${packet.job.lot}-${packet.job.community}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const file = new File([JSON.stringify(packet, null, 2)], `jcom-${slug}.json`, { type: "application/json" });
  try {
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: `JCom · ${packet.job.lot}`, text: "Complete JCom field documentation packet", files: [file] });
    else { downloadFile(file); showToast("Complete job packet saved for upload"); }
    logActivity("↗", "Job packet shared or saved", `${packet.punchList.length} punch items · ${packet.documents.length} documents`); save();
  } catch (error) { if (error.name !== "AbortError") { downloadFile(file); showToast("Job packet saved for upload"); } }
}

function closeoutHtml() {
  const job = activeJob(); const items = jobPunches().filter(item => item.status !== "Verified");
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>JCom Closeout · ${esc(job.lot)}</title><style>body{font:15px system-ui;max-width:850px;margin:40px auto;padding:20px;color:#102536}h1{color:#071b2d;border-bottom:4px solid #e12b39;padding-bottom:12px}.item{border:1px solid #d8e0e6;border-radius:12px;padding:16px;margin:12px 0}.meta{color:#647482;font-size:13px}.tag{display:inline-block;background:#e8f4ff;padding:4px 8px;border-radius:20px;font-size:12px}</style><h1>JCom subcontractor closeout</h1><p><strong>${esc(job.lot)} · ${esc(job.community)}</strong><br>${esc(job.address)}</p><p>${items.length} item(s) require documentation or correction. Return completion photos and notes to the project manager.</p>${items.map(item => `<section class="item"><span class="tag">${esc(item.number)} · ${esc(item.status)}</span><h2>${esc(item.title)}</h2><p class="meta">${esc(item.location)} · ${esc(item.trade)} · Due ${esc(item.due || "Not set")}</p><p>${esc(item.notes || "")}</p></section>`).join("")}<p class="meta">Generated by JCom. This is a field documentation record, not an engineering or inspection report.</p>`;
}

async function shareCloseout() {
  const job = activeJob(); const file = new File([closeoutHtml()], `jcom-${job.lot.replace(/\s+/g,"-").toLowerCase()}-closeout.html`, { type: "text/html" });
  try { if (navigator.canShare?.({ files: [file] })) await navigator.share({ title: `Closeout · ${job.lot}`, files: [file] }); else downloadFile(file); logActivity("↗", "Subcontractor closeout package created", `${jobPunches().filter(item => item.status !== "Verified").length} open items`); save(); showToast("Closeout package ready to share or upload"); } catch (error) { if (error.name !== "AbortError") downloadFile(file); }
}

function startVoicePunch() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) { showToast("Voice capture is not supported in this browser"); openPunchModal(); return; }
  const recognition = new Recognition(); recognition.lang = "en-US"; recognition.interimResults = false;
  showToast("Listening — describe the punch item");
  recognition.onresult = event => { const text = event.results[0][0].transcript; openPunchModal({ title: text, location: activeArea(), trade: activeJob().phase, priority: "Standard", status: "Open", reference: "Voice field note", notes: "Captured by voice", photo: "" }, true); };
  recognition.onerror = () => showToast("Voice capture stopped — try again or type the item"); recognition.start();
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
  if (action === "import-packet") document.querySelector("#packet-input").click();
  if (action === "record-video") document.querySelector("#video-input").click();
  if (action === "take-photo") document.querySelector("#photo-input").click();
  if (action === "voice-punch") startVoicePunch();
  if (action === "share-packet") sharePacket();
  if (action === "closeout-package") shareCloseout();
  if (action === "select-template") return;
  if (action === "select-area") { const flow = jobWorkflow(); flow.activeArea = actionEl.dataset.area; save(); renderWalks(); }
  if (action === "confirm-revision") { const flow = jobWorkflow(); flow.revisionConfirmed = !flow.revisionConfirmed; logActivity(flow.revisionConfirmed ? "✓" : "↻", flow.revisionConfirmed ? "Current document revision confirmed" : "Document revision marked for recheck", `${activeJob().lot} · ${state.docs.filter(doc => doc.jobId === state.activeJob).length} files`); save(); showToast(flow.revisionConfirmed ? "Current document set confirmed" : "Revision confirmation cleared"); render(); }
  if (action === "mark-photo") openMarkupModal(Number(actionEl.dataset.index));
  if (action === "clear-markup") { const canvas = document.querySelector("#markup-canvas"); const image = new Image(); image.onload = () => canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height); image.src = canvas.dataset.base; }
  if (action === "save-markup") { const item = jobWorkflow().media[Number(actionEl.dataset.index)]; const canvas = document.querySelector("#markup-canvas"); if (item && canvas) { item.markedUrl = canvas.toDataURL("image/jpeg", .78); logActivity("✎", "Evidence photo marked up", `${item.area || "General"} · ${item.name}`); save(); closeModal(); showToast("Marked photo saved as field evidence"); renderWalks(); } }
  if (action === "analyze-walk") {
    const flow = jobWorkflow();
    flow.status = "review";
    flow.suggestions = [
      { title: "Opening requires PM verification", location: "Kitchen — rear wall", reference: "Architectural plan A3.1", reason: "The walkthrough view should be checked against the uploaded opening detail.", evidence: "Kitchen capture · walkthrough frame", approved: false },
      { title: "Visible framing item may be incomplete", location: "Main stair — landing", reference: "Plan detail A5.2", reason: "Review the captured area for backing and alignment before closing the walk.", evidence: "Stairs capture · site photo", approved: false },
      { title: "Area not fully verified in walkthrough", location: "Second floor — bedroom 3", reference: "Truss layout", reason: "Add a closer image of the truss tag and connection before final verification.", evidence: "Second floor capture · limited view", approved: false }
    ];
    logActivity("◆", "Draft findings generated", `${flow.suggestions.length} items awaiting PM review`); save(); showToast("Draft review generated — PM approval required"); renderWalks();
  }
  if (action === "approve-suggestion") {
    approveSuggestion(Number(actionEl.dataset.index));
  }
  if (action === "edit-suggestion") openSuggestionModal(Number(actionEl.dataset.index));
  if (action === "decide-suggestion") { const suggestion = jobWorkflow().suggestions[Number(actionEl.dataset.index)]; if (suggestion) { suggestion.decision = actionEl.dataset.decision; logActivity("•", `Draft marked: ${suggestion.decision}`, suggestion.title); save(); showToast(`Saved as ${suggestion.decision}`); renderWalks(); } }
  if (action === "reset-suggestion") { const suggestion = jobWorkflow().suggestions[Number(actionEl.dataset.index)]; if (suggestion?.decision === "Approved") showToast("Approved punch remains in the official list"); if (suggestion) { suggestion.decision = ""; suggestion.approved = false; save(); renderWalks(); } }
  if (action === "continue-punch") location.hash = "punch";
  if (action === "finish-walk") { showToast("Walk saved for PM review"); location.hash = "punch"; }
  if (action === "print") window.print();
  if (action === "close-modal") closeModal();
  if (action === "delete-punch") {
    if (confirm("Delete this punch item?")) { state.punches = state.punches.filter(item => item.id !== actionEl.dataset.id); save(); closeModal(); showToast("Punch item deleted"); render(); }
  }
});

document.addEventListener("change", event => {
  if (!event.target.matches('[data-action="select-template"]')) return;
  const flow = jobWorkflow(); flow.template = event.target.value; flow.areas = {}; flow.activeArea = templateAreas(flow)[0]; logActivity("▦", "Walk template selected", flow.template); save(); renderWalks();
});

document.querySelector("#document-input").addEventListener("change", (event) => {
  const today = new Date().toISOString().slice(0, 10);
  [...event.target.files].forEach(file => state.docs.push({ id: `doc-${Date.now()}-${file.name}`, jobId: state.activeJob, name: file.name, type: file.name.split(".").pop().toUpperCase(), detail: `${Math.max(1, Math.round(file.size / 1024))} KB · Uploaded file`, uploaded: today, by: "Jacob Davis" }));
  jobWorkflow().status = "documents"; jobWorkflow().revisionConfirmed = false;
  save(); event.target.value = ""; showToast("Documents uploaded — Step 2 is ready"); route() === "walks" ? renderWalks() : renderDocuments();
});

document.querySelector("#video-input").addEventListener("change", (event) => {
  if (!event.target.files.length) return;
  const flow = jobWorkflow();
  const area = activeArea(flow); [...event.target.files].forEach(file => flow.media.push({ kind: "video", name: file.name, size: file.size, area })); flow.areas[area] = true;
  flow.status = "generate";
  showToast("Walkthrough added — Step 3 is ready");
  state.activities.unshift({ icon: "◉", title: "Walkthrough video attached", detail: `${activeJob().lot} · Awaiting PM review`, time: "Just now" }); save(); event.target.value = "";
  if (route() === "walks") renderWalks();
});

document.querySelector("#photo-input").addEventListener("change", (event) => {
  const file = event.target.files[0]; if (!file) return;
  const flow = jobWorkflow();
  const area = activeArea(flow);
  fileToEvidenceImage(file).then(dataUrl => { flow.media.push({ kind: "photo", name: file.name, size: file.size, area, dataUrl }); flow.areas[area] = true; flow.status = "generate"; logActivity("▧", "Site photo added", `${area} · ${file.name}`); try { save(); } catch { flow.media.at(-1).dataUrl = ""; save(); } event.target.value = ""; showToast("Site photo added to the walkthrough"); if (route() === "walks") renderWalks(); }).catch(() => showToast("That photo could not be added"));
});

document.querySelector("#packet-input").addEventListener("change", async event => {
  const file = event.target.files[0]; if (!file) return;
  try { const packet = JSON.parse(await file.text()); if (packet.format !== "JCom Job Packet" || !packet.job?.id) throw new Error("Invalid packet"); const id = state.jobs.some(job => job.id === packet.job.id) ? `${packet.job.id}-import-${Date.now()}` : packet.job.id; state.jobs.unshift({ ...packet.job, id }); state.activeJob = id; state.docs.push(...(packet.documents || []).map(doc => ({ ...doc, jobId: id, id: `${doc.id}-import-${Date.now()}` }))); state.punches.push(...(packet.punchList || []).map(item => ({ ...item, jobId: id, id: `${item.id}-import-${Date.now()}` }))); state.workflow[id] = { template: packet.walkthrough?.template, areas: packet.walkthrough?.areas || {}, media: packet.walkthrough?.media || [], suggestions: packet.walkthrough?.findings || packet.findings || [], revisionConfirmed: packet.documentRevisionConfirmed, status: "review" }; logActivity("↓", "Job packet imported", file.name, id); save(); showToast("Complete JCom packet imported"); location.hash = "reports"; render(); } catch { showToast("That file is not a valid JCom job packet"); } finally { event.target.value = ""; }
});

document.querySelector("#menu-button").addEventListener("click", () => document.body.classList.toggle("menu-open"));
document.querySelector("#search-button").addEventListener("click", () => { location.hash = "punch"; setTimeout(() => document.querySelector("#punch-search")?.focus(), 30); });
function updateConnectionStatus() { const status = document.querySelector("#connection-status"); const online = navigator.onLine; status.textContent = online ? "● Online" : "● Offline · saved on device"; status.classList.toggle("offline", !online); if (online && status.dataset.wasOffline) showToast("Back online — field record is ready"); if (!online) status.dataset.wasOffline = "true"; }
window.addEventListener("online", updateConnectionStatus);
window.addEventListener("offline", updateConnectionStatus);
window.addEventListener("hashchange", render);
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => {});
updateConnectionStatus();
render();
