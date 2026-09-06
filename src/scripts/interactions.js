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

document.addEventListener('wheel', event => {
  const scroller = event.target.closest('.meta-tags-scroll, .article-tags-scroll');
  if (!scroller || !scroller.matches(':hover') || scroller.scrollWidth <= scroller.clientWidth) return;
  event.preventDefault();
  scroller.scrollLeft += event.deltaY || event.deltaX;
}, { passive: false });
