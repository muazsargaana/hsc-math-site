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
  grey: { label: "Not started", short: "Not started" },
  blue: { label: "Learning / newly learnt", short: "Learning" },
  red: { label: "Weak / cannot solve reliably", short: "Weak" },
  yellow: { label: "Understands but inconsistent", short: "Inconsistent" },
  green: { label: "HSC-ready", short: "HSC-ready" }
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
  if (view.status && rec.status !== view.status) return false;
  if (view.query) {
    const haystack = [topic.topicCode, topic.topicName, section.sectionCode, section.sectionName, skill.skillName, rec.notes].join(" ").toLowerCase();
    if (!haystack.includes(view.query.toLowerCase())) return false;
  }
  return true;
}

function filteredTopics() {
  return MASTERY_SYLLABUS.map(topic => {
    const sections = topic.sections.map(section => ({ ...section, skills: section.skills.filter(skill => matchesSkill(topic, section, skill)) })).filter(section => section.skills.length);
    return { ...topic, sections };
  }).filter(topic => topic.sections.length);
}
function allSkillsForTopic(topic) { return topic.sections.flatMap(s => s.skills); }
function summary(skills) {
  const counts = { grey: 0, blue: 0, red: 0, yellow: 0, green: 0 };
  skills.forEach(skill => counts[getRecord(skill.skillId).status]++);
  return { ...counts, greenPct: skills.length ? Math.round(counts.green / skills.length * 100) : 0, remaining: counts.grey + counts.blue };
}

function createStatusSelect(skill) {
  const rec = getRecord(skill.skillId);
  const select = document.createElement("select");
  select.className = `skill-status status-${rec.status}`;
  Object.entries(STATUS).forEach(([value, info]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = info.short;
    option.selected = rec.status === value;
    select.appendChild(option);
  });
  select.addEventListener("change", () => {
    rec.status = select.value;
    rec.lastRevised = today();
    saveState();
    render();
  });
  return select;
}

function createSkillRow(skill) {
  const rec = getRecord(skill.skillId);
  const row = document.createElement("div");
  row.className = "skill-row";

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
  meta.textContent = rec.lastRevised ? `Revised ${rec.lastRevised}` : "Not revised yet";
  textWrap.append(name, meta);
  main.append(dot, textWrap);

  const actions = document.createElement("div");
  actions.className = "skill-actions";
  actions.appendChild(createStatusSelect(skill));
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
  textarea.placeholder = "Quick notes…";
  textarea.value = rec.notes;
  textarea.rows = 2;
  textarea.addEventListener("change", () => {
    rec.notes = textarea.value.trim();
    rec.lastRevised = today();
    saveState();
    noteButton.textContent = rec.notes ? "Notes •" : "Notes";
    meta.textContent = `Revised ${rec.lastRevised}`;
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
  stats.innerHTML = `<b>${fullSummary.greenPct}%</b><span>green</span><em>${fullSummary.red}R · ${fullSummary.yellow}Y · ${fullSummary.remaining} remaining</em>`;
  header.append(arrow, title, stats);
  panel.appendChild(header);

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
  document.getElementById("overall-red").textContent = s.red;
  document.getElementById("overall-yellow").textContent = s.yellow;
  document.getElementById("overall-remaining").textContent = s.remaining;
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

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll(".tilt-card").forEach(card => {
    card.addEventListener("pointermove", event => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.transform = `perspective(900px) rotateX(${(0.5-y)*3}deg) rotateY(${(x-0.5)*4}deg)`;
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });
}

render();
