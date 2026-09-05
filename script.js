const treeContainer = document.getElementById("resource-tree");
const searchInput = document.getElementById("search");

function createNode(node) {
  if (node.type === "file") {
    const link = document.createElement("a");
    link.className = "file-link";
    link.href = node.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "📄 " + node.name;
    link.dataset.name = node.name.toLowerCase();

    return link;
  }

  const folder = document.createElement("div");
  folder.className = "folder";

  const title = document.createElement("div");
  title.className = "folder-title";
  title.textContent = "▸ " + node.name;

  const children = document.createElement("div");
  children.className = "children hidden";

  (node.children || []).forEach(child => {
    children.appendChild(createNode(child));
  });

  title.addEventListener("click", () => {
    const closed = children.classList.toggle("hidden");
    title.textContent = (closed ? "▸ " : "▾ ") + node.name;
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
    const matches = element.dataset.name.includes(query);
    element.style.display = matches ? "" : "none";
    return matches;
  }

  if (element.classList.contains("folder")) {
    const children = element.querySelector(":scope > .children");
    let hasMatch = false;

    [...children.children].forEach(child => {
      if (searchNode(child, query)) {
        hasMatch = true;
      }
    });

    const title = element.querySelector(":scope > .folder-title");

    if (title.textContent.substring(2).toLowerCase().includes(query)) {
      hasMatch = true;
    }

    element.style.display = hasMatch ? "" : "none";

    if (query && hasMatch) {
      children.classList.remove("hidden");
      title.textContent = "▾ " + title.textContent.substring(2);
    }

    return hasMatch;
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

renderTree();
