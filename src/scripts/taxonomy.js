// The same controller powers category and tag maps; each page supplies matching taxonomy-* markup.
const taxonomyMaps = document.querySelectorAll(
  "#taxonomy-map, #tag-map, #untagged-map, #uncategorized-map",
);

if (taxonomyMaps.length) {
  const openBranch = (branch) => {
    if (!branch) return;
    branch.classList.add("is-open");
    branch
      .querySelector(".taxonomy-node")
      .setAttribute("aria-expanded", "true");
    branch
      .querySelector(".taxonomy-branch-body")
      .setAttribute("aria-hidden", "false");
  };

  const openHashBranch = () => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const branch = id ? document.getElementById(id) : null;
    if (!branch || !branch.classList.contains("taxonomy-branch")) return;
    openBranch(branch);
    requestAnimationFrame(() => branch.scrollIntoView({ block: "center" }));
  };

  openHashBranch();
  window.addEventListener("hashchange", openHashBranch);

  taxonomyMaps.forEach((taxonomyMap) =>
    taxonomyMap.addEventListener("click", (event) => {
      const taxonomyButton = event.target.closest(".taxonomy-node");
      if (taxonomyButton) {
        const branch = taxonomyButton.closest(".taxonomy-branch");
        const isOpen = branch.classList.toggle("is-open");
        taxonomyButton.setAttribute("aria-expanded", String(isOpen));
        branch
          .querySelector(".taxonomy-branch-body")
          .setAttribute("aria-hidden", String(!isOpen));
        return;
      }

      const filterButton = event.target.closest(".taxonomy-filter");
      if (!filterButton) return;

      const branch = filterButton.closest(".taxonomy-branch");
      const filter = filterButton.dataset.filter;
      branch.querySelectorAll(".taxonomy-filter").forEach((button) => {
        const active = button === filterButton;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      branch.querySelectorAll(".taxonomy-post-node").forEach((post) => {
        const matches =
          filter === "all" || post.dataset.tags.split(" ").includes(filter);
        post.classList.toggle("is-highlighted", filter !== "all" && matches);
        post.classList.toggle("is-muted", filter !== "all" && !matches);
      });
    }),
  );
}
