<script setup lang="ts">
import { computed } from "vue";
import { data as posts } from "../../data/posts.data";
import { slugify } from "../../../scripts/utils.mjs";
import PostCard from "./PostCard.vue";

// Posts arrive sorted by date desc; grouping keeps that order.
const months = computed(() => {
  const groups = new Map<string, typeof posts>();
  for (const post of posts) {
    const month = post.date.slice(0, 7);
    if (!groups.has(month)) groups.set(month, []);
    groups.get(month)!.push(post);
  }
  return [...groups.entries()].map(([month, entries]) => ({
    month,
    dates: [...new Set(entries.map((post) => post.date))].map((date) => ({
      date,
      posts: entries.filter((post) => post.date === date),
    })),
  }));
});
</script>

<template>
  <div class="page-layout">
    <section class="post-grid">
      <section
        v-for="group in months"
        :key="group.month"
        class="archive-month"
      >
        <h2>{{ group.month }}</h2>
        <section
          v-for="day in group.dates"
          :key="day.date"
          class="archive-date"
          :id="`date-${slugify(day.date)}`"
        >
          <h3>{{ day.date }}</h3>
          <PostCard v-for="post in day.posts" :key="post.url" :post="post" />
        </section>
      </section>
    </section>
    <aside class="archive-timeline" aria-label="归档时间轴">
      <div class="archive-timeline-heading">
        <span class="section-kicker">TIMELINE</span>
        <span>按日期跳转</span>
      </div>
      <nav class="archive-timeline-nav">
        <div
          v-for="group in months"
          :key="group.month"
          class="archive-timeline-group"
        >
          <span class="archive-timeline-month">{{ group.month }}</span>
          <a
            v-for="day in group.dates"
            :key="day.date"
            class="archive-timeline-link"
            :href="`#date-${slugify(day.date)}`"
          >
            <span>{{ day.date.slice(5) }}</span>
            <small>{{ day.posts.length }} 篇</small>
          </a>
        </div>
      </nav>
    </aside>
  </div>
</template>
