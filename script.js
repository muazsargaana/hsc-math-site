const treeContainer = document.getElementById("resource-tree");
const searchInput = document.getElementById("search");

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

function createNode(node, depth = 0, path = []) {
  if (node.type === "file") {
    const link = document.createElement("a");
    link.className = "file-link";
    link.href = node.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "📄 " + node.name;
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

function renderTree() {
  treeContainer.innerHTML = "";
  resources.forEach(node => {
    treeContainer.appendChild(createNode(node));
  });
}

function searchNode(element, query) {
  if (element.classList.contains("file-link")) {
    const matches =
      element.dataset.name.includes(query) ||
      element.dataset.path.includes(query);

    element.style.display = matches ? "" : "none";
    return matches;
  }

  if (element.classList.contains("folder")) {
    const children = element.querySelector(":scope > .children");
    const title = element.querySelector(":scope > .folder-title");
    const label = title.querySelector(".folder-label");
    const folderMatches = label.textContent.toLowerCase().includes(query);

    let hasMatch = false;

    [...children.children].forEach(child => {
      if (searchNode(child, query)) {
        hasMatch = true;
      }
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

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();

  if (!query) {
    renderTree();
    return;
  }

  [...treeContainer.children].forEach(node => {
    searchNode(node, query);
  });
});

orderResources();
renderTree();
