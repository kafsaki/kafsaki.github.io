<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { data as posts } from "../../data/posts.data";
import PostCard from "./PostCard.vue";

const query = ref("");
const searchInput = ref<HTMLInputElement | null>(null);

// Mirrors the old textContent match: everything visible on the card.
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return posts;
  return posts.filter((post) =>
    [
      post.title,
      post.excerpt,
      post.date,
      post.tags.join(" "),
      post.categories.join(" "),
    ]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
});

const onKeydown = (event: KeyboardEvent) => {
  if (
    event.key !== "/" ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.shiftKey
  )
    return;
  const target = event.target as HTMLElement;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  )
    return;
  event.preventDefault();
  event.stopPropagation();
  searchInput.value?.focus();
  searchInput.value?.select();
};

onMounted(() => document.addEventListener("keydown", onKeydown, true));
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown, true));
</script>

<template>
  <header class="site-header">
    <nav class="site-nav">
      <a class="brand" href="/index.html"
        ><span class="brand-mark" aria-hidden="true">K</span
        ><span class="brand-copy"
          ><span class="brand-name">kafsaki's blog</span
          ><span class="brand-subtitle">PERSONAL TECH LOG</span></span
        ></a
      >
      <div class="nav-links">
        <a class="nav-link" href="/archives.html"
          ><span class="nav-index">01</span>归档</a
        ><a class="nav-link" href="/tags.html"
          ><span class="nav-index">02</span>标签</a
        ><a class="nav-link" href="/categories.html"
          ><span class="nav-index">03</span>分类</a
        ><a class="nav-link" href="/about.html"
          ><span class="nav-index">04</span>关于</a
        >
      </div>
    </nav>
    <div class="hero">
      <p class="eyebrow">个人技术日志 · {{ posts.length }} 篇文章</p>
      <h1>把复杂问题写清楚。</h1>
      <p>记录系统编程、AI Agent 与持续构建中的真实经验。</p>
    </div>
  </header>
  <main>
    <div class="toolbar">
      <div class="search-heading">
        <span class="section-kicker">INDEX / QUERY</span
        ><label for="search">搜索文章</label>
      </div>
      <div class="search-control">
        <span class="search-icon" aria-hidden="true">⌕</span
        ><input
          id="search"
          ref="searchInput"
          v-model="query"
          type="search"
          placeholder="输入标题或关键词"
          autocomplete="off"
        /><span class="search-hint" aria-hidden="true">/</span>
      </div>
    </div>
    <section class="post-grid" id="posts">
      <PostCard v-for="post in filtered" :key="post.url" :post="post" />
    </section>
  </main>
  <footer>© 2026 kafsaki</footer>
</template>
