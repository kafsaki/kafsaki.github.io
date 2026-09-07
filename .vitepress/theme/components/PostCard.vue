<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vitepress";
import { slugify } from "../../../scripts/utils.mjs";
import type { Post } from "../../data/posts.data";

const props = defineProps<{ post: Post }>();
const router = useRouter();

const categories = computed(() =>
  props.post.categories.length ? props.post.categories : ["未分类"],
);

const isInteractive = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  !!target.closest("a, button, input, textarea, select");

const onClick = (event: MouseEvent) => {
  if (isInteractive(event.target)) return;
  router.go(props.post.url);
};
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  router.go(props.post.url);
};
// Vertical wheel scrolls the tag row horizontally, like the old listener.
const onWheel = (event: WheelEvent) => {
  const scroller = event.currentTarget as HTMLElement;
  if (scroller.scrollWidth <= scroller.clientWidth) return;
  event.preventDefault();
  scroller.scrollLeft += event.deltaY || event.deltaX;
};
</script>

<template>
  <article class="post-card" tabindex="0" @click="onClick" @keydown="onKeydown">
    <div class="post-meta">
      <div class="meta-row meta-categories">
        <a
          v-for="category in categories"
          :key="category"
          class="meta-chip meta-category"
          :href="`/categories.html#category-${slugify(category)}`"
          >{{ category }}</a
        >
      </div>
    </div>
    <h2>
      <a :href="post.url">{{ post.title }}</a>
    </h2>
    <p>{{ post.excerpt }}{{ post.excerpt.length >= 180 ? "..." : "" }}</p>
    <div class="post-footer">
      <div class="post-info">
        <a
          class="meta-chip meta-date"
          :href="`/archives.html#date-${slugify(post.date)}`"
        >
          <time :datetime="post.date">{{ post.date }}</time>
        </a>
        <span class="reading-time"
          >阅读时长 · {{ post.readingMinutes }} 分钟</span
        >
      </div>
      <div
        v-if="post.tags.length"
        class="meta-tags-scroll"
        tabindex="0"
        aria-label="文章标签，可使用滚轮横向浏览"
        @wheel="onWheel"
      >
        <div class="meta-row meta-tags">
          <a
            v-for="tag in post.tags"
            :key="tag"
            class="meta-chip meta-tag"
            :href="`/tags.html#tag-${slugify(tag)}`"
            >{{ tag }}</a
          >
        </div>
      </div>
    </div>
  </article>
</template>
