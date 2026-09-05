const MASTERY_SYLLABUS = MASTERY_RAW.map(topic => ({
  subject: topic.s === "ext1" ? "Mathematics Extension 1" : "Mathematics Extension 2",
  subjectKey: topic.s,
  year: topic.y,
  topicCode: topic.c,
  topicName: topic.n,
  sections: topic.x.map(section => ({
    sectionCode: section.c,
    sectionName: section.n,
    skills: section.k.map((wording, skillIndex) => ({
      skillId: `${topic.c.toLowerCase().replace(/-/g, "_")}_${section.c.toLowerCase().replace(/\./g, "_")}_${skillIndex + 1}`,
      skillName: wording,
      nesaWording: wording
    }))
  }))
}));

const STORAGE_KEY = "hsc-maths-mastery-v1";
const themeToggle = document.getElementById("theme-toggle");
const themeLabel = themeToggle.querySelector(".theme-label");
const tree = document.getElementById("mastery-tree");
const searchInput = document.getElementById("mastery-search");
const resultCount = document.getElementById("mastery-result-count");
const statusFilter = document.getElementById("status-filter");
const subjectFilter = document.getElementById("subject-filter");
const yearFilter = document.getElementById("year-filter");
const clearButton = document.getElementById("clear-mastery-view");

const STATUS = {
  grey: { label: "Not started", detail: "Not properly learnt or attempted yet." },
  blue: { label: "Learning", detail: "Newly learnt; still needs guidance or examples." },
  red: { label: "Weak", detail: "Cannot solve reliably or does not know how to start." },
  yellow: { label: "Inconsistent", detail: "Understands it, but harder or unfamiliar questions expose gaps." },
  green: { label: "HSC-ready", detail: "Can solve unfamiliar exam-level questions independently and accurately." }
};

const state = loadState();
const view = { subject: "", year: "", status: "", query: "" };

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function getRecord(id) {
  if (!state[id]) state[id] = { status: "grey", notes: "", lastRevised: "" };
  return state[id];
}
function today() { return new Date().toISOString().slice(0, 10); }
function daysSince(dateString) {
  if (!dateString) return Infinity;
  const then = new Date(`${dateString}T00:00:00`);
  return Math.floor((Date.now() - then.getTime()) / 86400000);
}
function isDue(rec) {
  if (!rec.lastRevised) return false;
  if (rec.status === "green") return daysSince(rec.lastRevised) >= 21;
  if (rec.status === "yellow") return daysSince(rec.lastRevised) >= 10;
  if (rec.status === "red") return daysSince(rec.lastRevised) >= 5;
  return false;
}

function getInitialTheme() {
  const saved = localStorage.getItem("hsc-maths-theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeLabel.textContent = theme === "dark" ? "Light" : "Dark";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#060914" : "#eef4ff");
}
themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("hsc-maths-theme", next);
  applyTheme(next);
});
applyTheme(getInitialTheme());

function renderSegmented(container, options, key) {
  container.innerHTML = "";
  options.forEach(option => {
    const button = document.createElement("button");
    button.className = "segment-button" + (view[key] === option.value ? " active" : "");
    button.type = "button";
    button.textContent = option.label;
    button.addEventListener("click", () => { view[key] = option.value; render(); });
    container.appendChild(button);
  });
}

function matchesSkill(topic, section, skill) {
  const rec = getRecord(skill.skillId);
  if (view.subject && topic.subjectKey !== view.subject) return false;
  if (view.year && String(topic.year) !== view.year) return false;
  if (view.status === "attention" && !["red", "yellow"].includes(rec.status)) return false;
  if (view.status === "due" && !isDue(rec)) return false;
  if (view.status && !["attention", "due"].includes(view.status) && rec.status !== view.status) return false;
  if (view.query) {
    const haystack = [topic.topicCode, topic.topicName, section.sectionCode, section.sectionName, skill.skillName, rec.notes].join(" ").toLowerCase();
    if (!haystack.includes(view.query.toLowerCase())) return false;
  }
  return true;
}

function filteredTopics() {
  return MASTERY_SYLLABUS.map(topic => {
    const sections = topic.sections.map(section => ({
      ...section,
      skills: section.skills.filter(skill => matchesSkill(topic, section, skill))
    })).filter(section => section.skills.length);
    return { ...topic, sections };
  }).filter(topic => topic.sections.length);
}
function allSkillsForTopic(topic) { return topic.sections.flatMap(s => s.skills); }
function summary(skills) {
  const counts = { grey: 0, blue: 0, red: 0, yellow: 0, green: 0 };
  skills.forEach(skill => counts[getRecord(skill.skillId).status]++);
  return {
    ...counts,
    greenPct: skills.length ? Math.round(counts.green / skills.length * 100) : 0,
    remaining: counts.grey + counts.blue + counts.red + counts.yellow
  };
}

function setStatus(skill, status) {
  const rec = getRecord(skill.skillId);
  rec.status = status;
  rec.lastRevised = today();
  saveState();
  render();
}

function createTrafficButtons(skill) {
  const rec = getRecord(skill.skillId);
  const wrap = document.createElement("div");
  wrap.className = "traffic-buttons";
  Object.entries(STATUS).forEach(([status, info]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `traffic-button ${status}${rec.status === status ? " active" : ""}`;
    button.title = `${info.label}: ${info.detail}`;
    button.setAttribute("aria-label", `Set ${skill.skillName} to ${info.label}`);
    button.setAttribute("aria-pressed", rec.status === status ? "true" : "false");
    button.innerHTML = `<i></i><span>${info.label}</span>`;
    button.addEventListener("click", () => setStatus(skill, status));
    wrap.appendChild(button);
  });
  return wrap;
}

function createSkillRow(skill) {
  const rec = getRecord(skill.skillId);
  const row = document.createElement("div");
  row.className = `skill-row skill-${rec.status}`;

  const main = document.createElement("div");
  main.className = "skill-main";
  const dot = document.createElement("span");
  dot.className = `status-dot ${rec.status}`;
  const textWrap = document.createElement("div");
  textWrap.className = "skill-text-wrap";
  const name = document.createElement("div");
  name.className = "skill-name";
  name.textContent = skill.skillName;
  const meta = document.createElement("div");
  meta.className = "skill-meta";
  const dueText = isDue(rec) ? " · Due for revision" : "";
  meta.textContent = rec.lastRevised ? `${STATUS[rec.status].label} · Revised ${rec.lastRevised}${dueText}` : `${STATUS[rec.status].label} · Not revised yet`;
  textWrap.append(name, meta);
  main.append(dot, textWrap);

  const actions = document.createElement("div");
  actions.className = "skill-actions";
  actions.appendChild(createTrafficButtons(skill));
  const noteButton = document.createElement("button");
  noteButton.className = "skill-note-button";
  noteButton.type = "button";
  noteButton.textContent = rec.notes ? "Notes •" : "Notes";
  actions.appendChild(noteButton);
  row.append(main, actions);

  const detail = document.createElement("div");
  detail.className = "skill-detail hidden";
  const exact = document.createElement("details");
  exact.className = "nesa-detail";
  const exactSummary = document.createElement("summary");
  exactSummary.textContent = "View NESA wording";
  const wording = document.createElement("p");
  wording.textContent = skill.nesaWording;
  exact.append(exactSummary, wording);
  const textarea = document.createElement("textarea");
  textarea.className = "skill-notes";
  textarea.placeholder = "Quick notes: mistakes, question numbers, what to revise…";
  textarea.value = rec.notes;
  textarea.rows = 2;
  textarea.addEventListener("change", () => {
    rec.notes = textarea.value.trim();
    rec.lastRevised = today();
    saveState();
    render();
  });
  detail.append(exact, textarea);
  row.appendChild(detail);
  noteButton.addEventListener("click", () => {
    detail.classList.toggle("hidden");
    if (!detail.classList.contains("hidden")) textarea.focus();
  });
  return row;
}

function renderTopic(topic) {
  const panel = document.createElement("section");
  panel.className = "mastery-topic";
  const fullSummary = summary(allSkillsForTopic(topic));
  const total = allSkillsForTopic(topic).length || 1;
  const header = document.createElement("button");
  header.className = "mastery-topic-header";
  header.type = "button";
  const arrow = document.createElement("span");
  arrow.className = "folder-arrow open";
  arrow.textContent = "›";
  const title = document.createElement("div");
  title.innerHTML = `<span class="topic-code">${topic.topicCode}</span><strong>${topic.topicName}</strong><small>${topic.subjectKey === "ext1" ? "Extension 1" : "Extension 2"} · Year ${topic.year}</small>`;
  const stats = document.createElement("div");
  stats.className = "topic-stats";
  stats.innerHTML = `<b>${fullSummary.greenPct}%</b><span>HSC-ready</span><em>${fullSummary.red} red · ${fullSummary.yellow} yellow · ${fullSummary.blue} learning · ${fullSummary.grey} not started</em>`;
  header.append(arrow, title, stats);
  panel.appendChild(header);

  const progress = document.createElement("div");
  progress.className = "topic-progress";
  progress.innerHTML = `
    <span class="grey" style="--w:${fullSummary.grey / total * 100}%"></span>
    <span class="blue" style="--w:${fullSummary.blue / total * 100}%"></span>
    <span class="red" style="--w:${fullSummary.red / total * 100}%"></span>
    <span class="yellow" style="--w:${fullSummary.yellow / total * 100}%"></span>
    <span class="green" style="--w:${fullSummary.green / total * 100}%"></span>`;
  panel.appendChild(progress);

  const body = document.createElement("div");
  body.className = "mastery-topic-body";
  topic.sections.forEach(section => {
    const sectionEl = document.createElement("section");
    sectionEl.className = "mastery-section";
    const sectionTitle = document.createElement("div");
    sectionTitle.className = "mastery-section-title";
    sectionTitle.innerHTML = `<span>${section.sectionCode}</span><strong>${section.sectionName}</strong>`;
    sectionEl.appendChild(sectionTitle);
    section.skills.forEach(skill => sectionEl.appendChild(createSkillRow(skill)));
    body.appendChild(sectionEl);
  });
  header.addEventListener("click", () => {
    body.classList.toggle("hidden");
    arrow.classList.toggle("open", !body.classList.contains("hidden"));
  });
  panel.appendChild(body);
  return panel;
}

function updateOverall() {
  const skills = MASTERY_SYLLABUS.flatMap(allSkillsForTopic);
  const s = summary(skills);
  document.getElementById("overall-green").textContent = `${s.greenPct}%`;
  document.getElementById("green-count").textContent = `${s.green} skills`;
  document.getElementById("overall-red").textContent = s.red;
  document.getElementById("overall-yellow").textContent = s.yellow;
  document.getElementById("overall-blue").textContent = s.blue;
  document.getElementById("overall-grey").textContent = s.grey;
  const ring = document.getElementById("mastery-ring");
  const ringValue = document.getElementById("mastery-ring-value");
  if (ring) ring.style.setProperty("--progress", s.greenPct);
  if (ringValue) ringValue.textContent = `${s.greenPct}%`;
}

function render() {
  renderSegmented(subjectFilter, [{value:"",label:"All"},{value:"ext1",label:"3U"},{value:"ext2",label:"4U"}], "subject");
  renderSegmented(yearFilter, [{value:"",label:"All"},{value:"11",label:"Year 11"},{value:"12",label:"Year 12"}], "year");
  statusFilter.value = view.status;
  tree.innerHTML = "";
  const topics = filteredTopics();
  topics.forEach(topic => tree.appendChild(renderTopic(topic)));
  const visibleSkills = topics.reduce((n,t) => n + t.sections.reduce((m,s) => m + s.skills.length, 0), 0);
  resultCount.textContent = `${visibleSkills} skills`;
  updateOverall();
  if (!topics.length) {
    const empty = document.createElement("div");
    empty.className = "mastery-empty";
    empty.textContent = "No syllabus skills match this view.";
    tree.appendChild(empty);
  }
}

searchInput.addEventListener("input", e => { view.query = e.target.value.trim(); render(); });
statusFilter.addEventListener("change", e => { view.status = e.target.value; render(); });
clearButton.addEventListener("click", () => {
  view.subject = ""; view.year = ""; view.status = ""; view.query = "";
  searchInput.value = "";
  render();
});

document.querySelectorAll("[data-status-filter]").forEach(button => {
  button.addEventListener("click", () => {
    view.status = button.dataset.statusFilter;
    document.querySelector(".mastery-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
    render();
  });
});
document.getElementById("jump-weak")?.addEventListener("click", () => {
  view.status = "red";
  document.querySelector(".mastery-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
  render();
});
document.getElementById("jump-due")?.addEventListener("click", () => {
  view.status = "due";
  document.querySelector(".mastery-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
  render();
});

document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
});

const glow = document.querySelector(".cursor-glow");
if (glow && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  window.addEventListener("pointermove", event => {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  }, { passive: true });
}

render();