<script setup lang="ts">
import { computed } from "vue";
import { useData, useRoute } from "vitepress";
import { Content } from "vitepress";
import BgPixels from "./components/BgPixels.vue";
import HomePage from "./components/HomePage.vue";
import ArticleMeta from "./components/ArticleMeta.vue";

const { frontmatter } = useData();
const route = useRoute();

const isHome = computed(() => frontmatter.value.layout === "home");
const isPost = computed(() => route.path.startsWith("/posts/"));
</script>

<template>
  <BgPixels />
  <HomePage v-if="isHome" />
  <main v-else-if="isPost" class="article-shell">
    <a class="back" href="/index.html">← 返回首页</a>
    <article class="article">
      <ArticleMeta />
      <div class="article-content"><Content /></div>
    </article>
  </main>
  <main
    v-else
    class="article-shell"
    :class="{ 'category-shell': frontmatter.wide }"
  >
    <a class="back" href="/index.html">← 返回首页</a>
    <header class="page-title">
      <p class="section-kicker">{{ frontmatter.kicker }}</p>
      <h1>{{ frontmatter.title }}</h1>
      <p class="page-lead">{{ frontmatter.lead }}</p>
    </header>
    <Content />
  </main>
</template>
