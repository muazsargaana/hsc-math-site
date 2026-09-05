const treeContainer = document.getElementById("resource-tree");
const searchInput = document.getElementById("search");
const filterGroups = document.getElementById("filter-groups");
const resetFiltersButton = document.getElementById("reset-filters");
const resultCount = document.getElementById("result-count");
const collapseFiltersButton = document.getElementById("collapse-filters");
const showFiltersButton = document.getElementById("show-filters");
const pageShell = document.querySelector(".page-shell");
const activeFilterCount = document.getElementById("active-filter-count");

const MAIN_CATEGORY_ORDER = [
  "Organisation Trial Papers",
  "Internal Assessments",
  "Q's By Topic",
  "Notes"
];

const TRIAL_ORDER = {
  "Mathematics Extension 1": [
    "CSSA",
    "Independent",
    "NEAP",
    "PEM",
    "S&G",
    "QATs",
    "Western Mathematics Exams",
    "ACE",
    "Total Education",
    "Trial Maths"
  ],
  "Mathematics Extension 2": [
    "CSSA",
    "Independent",
    "NEAP",
    "PEM",
    "ACE",
    "S&G",
    "MathsBank",
    "ConquerHSC"
  ]
};

const FILTER_SECTIONS = [
  { id: "courses", title: "Course" },
  { id: "categories", title: "Resource type" },
  { id: "trials", title: "Trial providers", category: "Organisation Trial Papers" },
  { id: "internals", title: "Internal schools", category: "Internal Assessments" },
  { id: "topics", title: "Topic collections", category: "Q's By Topic" }
];

const filterState = {};
const filterDefaults = {};

function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function orderResources() {
  resources.forEach(course => {
    const categoryRank = new Map(
      MAIN_CATEGORY_ORDER.map((name, index) => [name, index])
    );

    course.children.sort((a, b) => {
      const aRank = categoryRank.has(a.name) ? categoryRank.get(a.name) : 999;
      const bRank = categoryRank.has(b.name) ? categoryRank.get(b.name) : 999;
      return aRank - bRank || naturalCompare(a.name, b.name);
    });

    const trialFolder = course.children.find(
      child => child.name === "Organisation Trial Papers"
    );

    if (trialFolder) {
      const preferredOrder = TRIAL_ORDER[course.name] || [];
      const trialRank = new Map(
        preferredOrder.map((name, index) => [name, index])
      );

      trialFolder.children.sort((a, b) => {
        const aRank = trialRank.has(a.name) ? trialRank.get(a.name) : 999;
        const bRank = trialRank.has(b.name) ? trialRank.get(b.name) : 999;
        return aRank - bRank || naturalCompare(a.name, b.name);
      });
    }
  });
}

function unique(values) {
  return [...new Set(values)].sort(naturalCompare);
}

function getCategorySources(categoryName) {
  const values = [];

  resources.forEach(course => {
    const category = course.children.find(child => child.name === categoryName);
    if (!category) return;

    (category.children || []).forEach(child => {
      if (child.type === "folder") values.push(child.name);
    });
  });

  if (categoryName === "Organisation Trial Papers") {
    const preferred = [
      ...TRIAL_ORDER["Mathematics Extension 1"],
      ...TRIAL_ORDER["Mathematics Extension 2"]
    ].filter((name, index, arr) => arr.indexOf(name) === index);

    return unique(values).sort((a, b) => {
      const ai = preferred.indexOf(a);
      const bi = preferred.indexOf(b);
      const ar = ai === -1 ? 999 : ai;
      const br = bi === -1 ? 999 : bi;
      return ar - br || naturalCompare(a, b);
    });
  }

  return unique(values);
}

function initialiseFilterState() {
  filterDefaults.courses = resources.map(course => course.name);
  filterDefaults.categories = [...MAIN_CATEGORY_ORDER];
  filterDefaults.trials = getCategorySources("Organisation Trial Papers");
  filterDefaults.internals = getCategorySources("Internal Assessments");
  filterDefaults.topics = getCategorySources("Q's By Topic");

  Object.entries(filterDefaults).forEach(([key, values]) => {
    filterState[key] = new Set(values);
  });
}

function shortCourseName(name) {
  return name === "Mathematics Extension 1" ? "Extension 1 · 3U" :
         name === "Mathematics Extension 2" ? "Extension 2 · 4U" : name;
}

function optionsForSection(section) {
  if (section.id === "courses") {
    return resources.map(course => ({ value: course.name, label: shortCourseName(course.name) }));
  }

  if (section.id === "categories") {
    return MAIN_CATEGORY_ORDER.map(name => ({ value: name, label: name }));
  }

  return getCategorySources(section.category).map(name => ({ value: name, label: name }));
}

function countActiveRestrictions() {
  let count = 0;

  Object.entries(filterDefaults).forEach(([key, defaults]) => {
    if (filterState[key].size !== defaults.length) count += 1;
  });

  return count;
}

function updateActiveFilterCount() {
  const count = countActiveRestrictions();
  activeFilterCount.textContent = count ? String(count) : "";
  activeFilterCount.style.display = count ? "inline-block" : "none";
}

function renderFilters() {
  filterGroups.innerHTML = "";

  FILTER_SECTIONS.forEach(section => {
    const options = optionsForSection(section);
    if (!options.length) return;

    const group = document.createElement("section");
    group.className = "filter-group";

    const header = document.createElement("div");
    header.className = "filter-group-head";

    const title = document.createElement("h3");
    title.textContent = section.title;

    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.className = "mini-button";
    allButton.textContent = "all";
    allButton.addEventListener("click", () => {
      filterState[section.id] = new Set(options.map(option => option.value));
      renderFilters();
      applyFilters();
    });

    header.appendChild(title);
    header.appendChild(allButton);
    group.appendChild(header);

    const list = document.createElement("div");
    list.className = "check-list";

    options.forEach(option => {
      const label = document.createElement("label");
      label.className = "check-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = filterState[section.id].has(option.value);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          filterState[section.id].add(option.value);
        } else {
          filterState[section.id].delete(option.value);
        }
        updateActiveFilterCount();
        applyFilters();
      });

      const text = document.createElement("span");
      text.textContent = option.label;

      label.appendChild(checkbox);
      label.appendChild(text);
      list.appendChild(label);
    });

    group.appendChild(list);
    filterGroups.appendChild(group);
  });

  updateActiveFilterCount();
}

function cloneFilteredNode(node, context = {}) {
  if (node.type === "file") return { ...node };

  const nextContext = { ...context };

  if (!context.course) {
    nextContext.course = node.name;
    if (!filterState.courses.has(node.name)) return null;
  } else if (!context.category) {
    nextContext.category = node.name;
    if (!filterState.categories.has(node.name)) return null;
  } else if (!context.source) {
    nextContext.source = node.name;

    if (context.category === "Organisation Trial Papers" && !filterState.trials.has(node.name)) return null;
    if (context.category === "Internal Assessments" && !filterState.internals.has(node.name)) return null;
    if (context.category === "Q's By Topic" && !filterState.topics.has(node.name)) return null;
  }

  const children = (node.children || [])
    .map(child => cloneFilteredNode(child, nextContext))
    .filter(Boolean);

  if (!children.length) return null;
  return { ...node, children };
}

function getFilteredResources() {
  return resources.map(course => cloneFilteredNode(course)).filter(Boolean);
}

function createNode(node, depth = 0, path = []) {
  if (node.type === "file") {
    const link = document.createElement("a");
    link.className = "file-link";
    link.href = node.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = node.name;
    link.dataset.name = node.name.toLowerCase();
    link.dataset.path = [...path, node.name].join(" › ").toLowerCase();
    return link;
  }

  const folder = document.createElement("div");
  folder.className = "folder";
  folder.dataset.depth = depth;

  if (depth === 0) folder.classList.add("course-folder");
  if (depth === 1 && MAIN_CATEGORY_ORDER.includes(node.name)) {
    folder.classList.add("main-category");
  }

  const title = document.createElement("button");
  title.type = "button";
  title.className = "folder-title";
  title.setAttribute("aria-expanded", "false");

  const arrow = document.createElement("span");
  arrow.className = "folder-arrow";
  arrow.textContent = "›";

  const label = document.createElement("span");
  label.className = "folder-label";
  label.textContent = node.name;

  title.appendChild(arrow);
  title.appendChild(label);

  const children = document.createElement("div");
  children.className = "children hidden";

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

function renderTree(nodes = getFilteredResources()) {
  treeContainer.innerHTML = "";

  nodes.forEach(node => {
    treeContainer.appendChild(createNode(node));
  });

  resultCount.textContent = `${countFiles(nodes)} files`;
}

function searchNode(element, query) {
  if (element.classList.contains("file-link")) {
    const terms = query.split(/\s+/).filter(Boolean);
    const haystack = `${element.dataset.name} ${element.dataset.path}`;
    const matches = terms.every(term => haystack.includes(term));

    element.style.display = matches ? "" : "none";
    return matches;
  }

  if (element.classList.contains("folder")) {
    const children = element.querySelector(":scope > .children");
    const title = element.querySelector(":scope > .folder-title");
    const label = title.querySelector(".folder-label");
    const folderName = label.textContent.toLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);
    const folderMatches = terms.every(term => folderName.includes(term));

    let hasMatch = false;

    [...children.children].forEach(child => {
      if (searchNode(child, query)) hasMatch = true;
    });

    const matches = folderMatches || hasMatch;
    element.style.display = matches ? "" : "none";

    if (query && matches) {
      children.classList.remove("hidden");
      title.setAttribute("aria-expanded", "true");
      title.querySelector(".folder-arrow").classList.add("open");
    }

    return matches;
  }

  return false;
}

function applySearch() {
  const query = searchInput.value.trim().toLowerCase();
  if (!query) return;

  [...treeContainer.children].forEach(node => {
    searchNode(node, query);
  });

  const visibleFiles = [...document.querySelectorAll(".file-link")]
    .filter(link => link.style.display !== "none").length;

  resultCount.textContent = `${visibleFiles} matches`;
}

function applyFilters() {
  renderTree();
  applySearch();
}

searchInput.addEventListener("input", () => {
  renderTree();
  applySearch();
});

resetFiltersButton.addEventListener("click", () => {
  initialiseFilterState();
  searchInput.value = "";
  renderFilters();
  renderTree();
});

collapseFiltersButton.addEventListener("click", () => {
  pageShell.classList.add("filters-collapsed");
});

showFiltersButton.addEventListener("click", () => {
  pageShell.classList.remove("filters-collapsed");
});

orderResources();
initialiseFilterState();
renderFilters();
renderTree();
