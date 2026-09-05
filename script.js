const treeContainer = document.getElementById("resource-tree");
const searchInput = document.getElementById("search");
const resultCount = document.getElementById("result-count");
const courseFilter = document.getElementById("course-filter");
const typeFilter = document.getElementById("type-filter");
const sourceFilterWrap = document.getElementById("source-filter-wrap");
const sourceFilter = document.getElementById("source-filter");
const clearViewButton = document.getElementById("clear-view");
const themeToggle = document.getElementById("theme-toggle");
const themeLabel = themeToggle.querySelector(".theme-label");

const COURSE_ORDER = [
  "Mathematics Extension 1 · Preliminary",
  "Mathematics Extension 1",
  "Mathematics Extension 2",
  "Shared Resources"
];

const MAIN_CATEGORY_ORDER = [
  "Preliminary Papers",
  "Organisation Trial Papers",
  "Internal Assessments",
  "Q's By Topic",
  "Notes",
  "Textbooks",
  "Textbook Libraries"
];

const TRIAL_ORDER = {
  "Mathematics Extension 1": [
    "CSSA", "Independent", "NEAP", "PEM", "S&G", "QATs",
    "Western Mathematics Exams", "ACE", "Total Education", "Trial Maths"
  ],
  "Mathematics Extension 2": [
    "CSSA", "Independent", "NEAP", "PEM", "ACE", "S&G",
    "MathsBank", "ConquerHSC"
  ]
};

const COURSE_OPTIONS = [
  { value: "", label: "All" },
  { value: "Mathematics Extension 1 · Preliminary", label: "Ext 1 Prelim" },
  { value: "Mathematics Extension 1", label: "Ext 1 HSC" },
  { value: "Mathematics Extension 2", label: "Ext 2 HSC" },
  { value: "Shared Resources", label: "Shared" }
];

const TYPE_OPTIONS = [
  { value: "", label: "Everything" },
  { value: "Preliminary Papers", label: "Prelim papers" },
  { value: "Organisation Trial Papers", label: "HSC trials" },
  { value: "Internal Assessments", label: "Internals" },
  { value: "Q's By Topic", label: "By topic" },
  { value: "Notes", label: "Notes" },
  { value: "Textbooks", label: "Textbooks" },
  { value: "Textbook Libraries", label: "Libraries" }
];

const SOURCE_FILTER_TYPES = new Set([
  "Preliminary Papers",
  "Organisation Trial Papers",
  "Q's By Topic",
  "Textbooks",
  "Textbook Libraries"
]);

const viewState = {
  course: "",
  type: "",
  source: ""
};

function isHiddenFolder(name) {
  return typeof name === "string" && name.toLowerCase().includes("unknown school");
}

function mergeExternalResources() {
  if (typeof externalResources === "undefined" || !Array.isArray(externalResources)) return;

  externalResources.forEach(externalCourse => {
    let course = resources.find(item => item.name === externalCourse.course);

    if (!course) {
      course = {
        type: "folder",
        name: externalCourse.course,
        children: []
      };
      resources.push(course);
    }

    (externalCourse.categories || []).forEach(externalCategory => {
      let category = (course.children || []).find(item => item.name === externalCategory.name);

      if (!category) {
        category = {
          type: "folder",
          name: externalCategory.name,
          children: []
        };
        course.children.push(category);
      }

      category.children = category.children || [];
      category.children.push(...(externalCategory.children || []));
    });
  });
}

function getInitialTheme() {
  const saved = localStorage.getItem("hsc-maths-theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeLabel.textContent = theme === "dark" ? "Light" : "Dark";
  themeToggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} mode`);
}

themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("hsc-maths-theme", next);
  applyTheme(next);
});

function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function orderResources() {
  const courseRank = new Map(COURSE_ORDER.map((name, index) => [name, index]));
  resources.sort((a, b) => {
    const aRank = courseRank.has(a.name) ? courseRank.get(a.name) : 999;
    const bRank = courseRank.has(b.name) ? courseRank.get(b.name) : 999;
    return aRank - bRank || naturalCompare(a.name, b.name);
  });

  resources.forEach(course => {
    const categoryRank = new Map(
      MAIN_CATEGORY_ORDER.map((name, index) => [name, index])
    );

    course.children.sort((a, b) => {
      const aRank = categoryRank.has(a.name) ? categoryRank.get(a.name) : 999;
      const bRank = categoryRank.has(b.name) ? categoryRank.get(b.name) : 999;
      return aRank - bRank || naturalCompare(a.name, b.name);
    });

    const trials = course.children.find(child => child.name === "Organisation Trial Papers");
    if (trials) {
      const preferred = TRIAL_ORDER[course.name] || [];
      const rank = new Map(preferred.map((name, index) => [name, index]));
      trials.children.sort((a, b) => {
        const aRank = rank.has(a.name) ? rank.get(a.name) : 999;
        const bRank = rank.has(b.name) ? rank.get(b.name) : 999;
        return aRank - bRank || naturalCompare(a.name, b.name);
      });
    }

    const prelim = course.children.find(child => child.name === "Preliminary Papers");
    if (prelim) {
      prelim.children.sort((a, b) => naturalCompare(a.name, b.name));
    }

    const textbooks = course.children.find(child => child.name === "Textbooks");
    if (textbooks) {
      const order = [
        "Cambridge",
        "Fitzpatrick",
        "Maths in Focus",
        "New Advanced Mathematics",
        "Steven Howard"
      ];
      const rank = new Map(order.map((name, index) => [name, index]));
      textbooks.children.sort((a, b) => {
        const aRank = rank.has(a.name) ? rank.get(a.name) : 999;
        const bRank = rank.has(b.name) ? rank.get(b.name) : 999;
        return aRank - bRank || naturalCompare(a.name, b.name);
      });
    }
  });
}

function renderSegmented(container, options, selectedValue, onSelect) {
  container.innerHTML = "";

  options.forEach(option => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "segment-button";
    button.textContent = option.label;
    button.classList.toggle("active", option.value === selectedValue);
    button.setAttribute("aria-pressed", option.value === selectedValue ? "true" : "false");
    button.addEventListener("click", () => onSelect(option.value));
    container.appendChild(button);
  });
}

function sourceOptionsForCurrentView() {
  if (!SOURCE_FILTER_TYPES.has(viewState.type)) return [];

  const names = [];

  resources.forEach(course => {
    if (viewState.course && course.name !== viewState.course) return;

    const category = course.children.find(child => child.name === viewState.type);
    if (!category) return;

    (category.children || []).forEach(child => {
      if (child.type === "folder" && !isHiddenFolder(child.name)) names.push(child.name);
    });
  });

  const unique = [...new Set(names)];

  if (viewState.type === "Organisation Trial Papers") {
    const preferred = [
      ...TRIAL_ORDER["Mathematics Extension 1"],
      ...TRIAL_ORDER["Mathematics Extension 2"]
    ].filter((name, index, array) => array.indexOf(name) === index);

    return unique.sort((a, b) => {
      const ai = preferred.indexOf(a);
      const bi = preferred.indexOf(b);
      const ar = ai === -1 ? 999 : ai;
      const br = bi === -1 ? 999 : bi;
      return ar - br || naturalCompare(a, b);
    });
  }

  return unique.sort(naturalCompare);
}

function sourceLabelForType() {
  if (viewState.type === "Organisation Trial Papers") return "All providers";
  if (viewState.type === "Preliminary Papers") return "All years";
  if (viewState.type === "Textbooks") return "All publishers";
  if (viewState.type === "Textbook Libraries") return "All libraries";
  return "All collections";
}

function renderControls() {
  renderSegmented(courseFilter, COURSE_OPTIONS, viewState.course, value => {
    viewState.course = value;
    viewState.source = "";
    renderControls();
    applyView();
  });

  renderSegmented(typeFilter, TYPE_OPTIONS, viewState.type, value => {
    viewState.type = value;
    viewState.source = "";
    renderControls();
    applyView();
  });

  const sources = sourceOptionsForCurrentView();
  const showSource = SOURCE_FILTER_TYPES.has(viewState.type) && sources.length > 0;
  sourceFilterWrap.classList.toggle("hidden-control", !showSource);

  if (showSource) {
    sourceFilter.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = sourceLabelForType();
    sourceFilter.appendChild(allOption);

    sources.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      sourceFilter.appendChild(option);
    });

    if (sources.includes(viewState.source)) {
      sourceFilter.value = viewState.source;
    } else {
      viewState.source = "";
      sourceFilter.value = "";
    }
  }

  clearViewButton.classList.toggle(
    "hidden-control",
    !viewState.course && !viewState.type && !viewState.source
  );
}

sourceFilter.addEventListener("change", () => {
  viewState.source = sourceFilter.value;
  renderControls();
  applyView();
});

clearViewButton.addEventListener("click", () => {
  viewState.course = "";
  viewState.type = "";
  viewState.source = "";
  searchInput.value = "";
  renderControls();
  applyView();
});

function cloneForView(node, context = {}) {
  if (node.type === "file") return { ...node };
  if (isHiddenFolder(node.name)) return null;

  if (!context.course) {
    if (viewState.course && node.name !== viewState.course) return null;

    const children = (node.children || [])
      .map(child => cloneForView(child, { course: node.name }))
      .filter(Boolean);

    return children.length ? { ...node, children } : null;
  }

  if (!context.category) {
    if (viewState.type && node.name !== viewState.type) return null;

    const children = (node.children || [])
      .map(child => cloneForView(child, {
        course: context.course,
        category: node.name
      }))
      .filter(Boolean);

    return children.length ? { ...node, children } : null;
  }

  if (
    viewState.source &&
    context.category === viewState.type &&
    SOURCE_FILTER_TYPES.has(context.category) &&
    !context.source
  ) {
    if (node.name !== viewState.source) return null;
  }

  const children = (node.children || [])
    .map(child => cloneForView(child, {
      ...context,
      source: context.source || node.name
    }))
    .filter(Boolean);

  return children.length ? { ...node, children } : null;
}

function getVisibleResources() {
  return resources.map(course => cloneForView(course)).filter(Boolean);
}

function linkKind(url) {
  if (/drive\.google\.com\/drive\/folders\//i.test(url)) return "LINK";
  if (/mediafire\.com\/folder\//i.test(url)) return "LINK";
  return "PDF";
}

function createNode(node, depth = 0, path = []) {
  if (node.type === "file") {
    const link = document.createElement("a");
    link.className = "file-link";
    link.href = node.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = node.name;
    link.dataset.kind = linkKind(node.url);
    link.dataset.name = node.name.toLowerCase();
    link.dataset.path = [...path, node.name].join(" › ").toLowerCase();
    return link;
  }

  const folder = document.createElement("div");
  folder.className = "folder";

  if (depth === 0) folder.classList.add("course-folder");
  if (depth === 1 && MAIN_CATEGORY_ORDER.includes(node.name)) {
    folder.classList.add("main-category");
  }

  const title = document.createElement("button");
  title.type = "button";
  title.className = "folder-title";

  const autoOpen = Boolean(
    (viewState.type && depth <= 1) ||
    (viewState.source && depth <= 2)
  );

  title.setAttribute("aria-expanded", autoOpen ? "true" : "false");

  const arrow = document.createElement("span");
  arrow.className = "folder-arrow";
  arrow.textContent = "›";
  arrow.classList.toggle("open", autoOpen);

  const label = document.createElement("span");
  label.className = "folder-label";
  label.textContent = node.name;

  title.appendChild(arrow);
  title.appendChild(label);

  const children = document.createElement("div");
  children.className = "children";
  if (!autoOpen) children.classList.add("hidden");

  (node.children || []).forEach(child => {
    children.appendChild(createNode(child, depth + 1, [...path, node.name]));
  });

  title.addEventListener("click", () => {
    const opening = children.classList.contains("hidden");
    children.classList.toggle("hidden");
    title.setAttribute("aria-expanded", opening ? "true" : "false");
    arrow.classList.toggle("open", opening);
  });

  folder.appendChild(title);
  folder.appendChild(children);
  return folder;
}

function countFiles(nodes) {
  let count = 0;

  function walk(node) {
    if (node.type === "file") {
      count += 1;
      return;
    }
    (node.children || []).forEach(walk);
  }

  nodes.forEach(walk);
  return count;
}

function renderTree() {
  const nodes = getVisibleResources();
  treeContainer.innerHTML = "";
  nodes.forEach(node => treeContainer.appendChild(createNode(node)));
  resultCount.textContent = `${countFiles(nodes)} files`;
}

function searchNode(element, terms) {
  if (element.classList.contains("file-link")) {
    const haystack = `${element.dataset.name} ${element.dataset.path}`;
    const matches = terms.every(term => haystack.includes(term));
    element.style.display = matches ? "" : "none";
    return matches;
  }

  if (!element.classList.contains("folder")) return false;

  const children = element.querySelector(":scope > .children");
  const title = element.querySelector(":scope > .folder-title");
  const label = title.querySelector(".folder-label").textContent.toLowerCase();
  const ownMatch = terms.every(term => label.includes(term));
  let childMatch = false;

  [...children.children].forEach(child => {
    if (searchNode(child, terms)) childMatch = true;
  });

  const matches = ownMatch || childMatch;
  element.style.display = matches ? "" : "none";

  if (matches) {
    children.classList.remove("hidden");
    title.setAttribute("aria-expanded", "true");
    title.querySelector(".folder-arrow").classList.add("open");
  }

  return matches;
}

function applySearch() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) return;

  const terms = query.split(/\s+/).filter(Boolean);
  [...treeContainer.children].forEach(node => searchNode(node, terms));

  const visibleFiles = [...document.querySelectorAll(".file-link")]
    .filter(link => link.style.display !== "none").length;

  resultCount.textContent = `${visibleFiles} matches`;
}

function applyView() {
  renderTree();
  applySearch();
}

searchInput.addEventListener("input", applyView);

applyTheme(getInitialTheme());
mergeExternalResources();
orderResources();
renderControls();
applyView();