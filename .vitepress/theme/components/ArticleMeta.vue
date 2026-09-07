<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vitepress";
import { data as posts } from "../../data/posts.data";
import { slugify } from "../../../scripts/utils.mjs";

const route = useRoute();
const post = computed(() => posts.find((entry) => entry.url === route.path));
const categories = computed(() =>
  post.value && post.value.categories.length
    ? post.value.categories
    : ["未分类"],
);

const onWheel = (event: WheelEvent) => {
  const scroller = event.currentTarget as HTMLElement;
  if (scroller.scrollWidth <= scroller.clientWidth) return;
  event.preventDefault();
  scroller.scrollLeft += event.deltaY || event.deltaX;
};
</script>

<template>
  <header v-if="post">
    <div class="meta-row meta-categories">
      <a
        v-for="category in categories"
        :key="category"
        class="meta-chip meta-category"
        :href="`/categories.html#category-${slugify(category)}`"
        >{{ category }}</a
      >
    </div>
    <h1>{{ post.title }}</h1>
    <div class="article-meta-bottom">
      <a
        class="meta-chip meta-date"
        :href="`/archives.html#date-${slugify(post.date)}`"
        ><time :datetime="post.date">{{ post.date }}</time></a
      ><span class="reading-time"
        >阅读时长 · {{ post.readingMinutes }} 分钟</span
      >
      <div
        v-if="post.tags.length"
        class="article-tags-scroll"
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
  </header>
</template>
