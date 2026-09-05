document.addEventListener('click', event => {
  const card = event.target.closest('.post-card');
  if (!card || event.target.closest('a, button, input, textarea, select')) return;
  const url = card.dataset.postUrl;
  if (url) window.location.href = url;
});

document.addEventListener('keydown', event => {
  const card = event.target.closest('.post-card');
  if (!card || (event.key !== 'Enter' && event.key !== ' ')) return;
  event.preventDefault();
  const url = card.dataset.postUrl;
  if (url) window.location.href = url;
});
