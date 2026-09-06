const categoryMap = document.querySelector('#category-map, #tag-map');

if (categoryMap) {
  const openBranch = branch => {
    if (!branch) return;
    branch.classList.add('is-open');
    branch.querySelector('.category-node').setAttribute('aria-expanded', 'true');
    branch.querySelector('.category-branch-body').setAttribute('aria-hidden', 'false');
  };

  const openHashCategory = () => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const branch = id ? document.getElementById(id) : null;
    if (!branch || !branch.classList.contains('category-branch')) return;
    openBranch(branch);
    requestAnimationFrame(() => branch.scrollIntoView({ block: 'center' }));
  };

  openHashCategory();
  window.addEventListener('hashchange', openHashCategory);

  categoryMap.addEventListener('click', event => {
    const categoryButton = event.target.closest('.category-node');
    if (categoryButton) {
      const branch = categoryButton.closest('.category-branch');
      const isOpen = branch.classList.toggle('is-open');
      categoryButton.setAttribute('aria-expanded', String(isOpen));
      branch.querySelector('.category-branch-body').setAttribute('aria-hidden', String(!isOpen));
      return;
    }

    const filterButton = event.target.closest('.category-filter');
    if (!filterButton) return;

    const branch = filterButton.closest('.category-branch');
    const filter = filterButton.dataset.filter;
    branch.querySelectorAll('.category-filter').forEach(button => {
      const active = button === filterButton;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    branch.querySelectorAll('.category-post-node').forEach(post => {
      const matches = filter === 'all' || post.dataset.tags.split(' ').includes(filter);
      post.classList.toggle('is-highlighted', filter !== 'all' && matches);
      post.classList.toggle('is-muted', filter !== 'all' && !matches);
    });
  });
}
