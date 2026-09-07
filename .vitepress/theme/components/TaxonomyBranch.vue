<script setup lang="ts">
import { ref } from "vue";
import type { TaxonomyFilter, TaxonomyNode } from "./taxonomy";

const props = defineProps<{
  id: string;
  label: string;
  count: number;
  filters: TaxonomyFilter[];
  filterLabel: string;
  nodes: TaxonomyNode[];
  extraClass?: string;
  open: boolean;
}>();

const emit = defineEmits<{ toggle: [id: string] }>();

const activeFilter = ref("all");
const matches = (node: TaxonomyNode) =>
  activeFilter.value === "all" || node.keys.includes(activeFilter.value);

const nodeClass = (node: TaxonomyNode) => ({
  "is-highlighted": activeFilter.value !== "all" && matches(node),
  "is-muted": activeFilter.value !== "all" && !matches(node),
});
</script>

<template>
  <section
    class="taxonomy-branch"
    :class="[extraClass, { 'is-open': open }]"
    :id="id"
  >
    <button
      class="taxonomy-node"
      type="button"
      :aria-expanded="open"
      @click="emit('toggle', id)"
    >
      <span class="taxonomy-node-marker" aria-hidden="true">+</span>
      <span>{{ label }}</span>
      <small>{{ count }} 篇</small>
    </button>
    <div class="taxonomy-branch-body" :aria-hidden="!open">
      <div class="taxonomy-filters" :aria-label="filterLabel">
        <button
          v-for="filter in filters"
          :key="filter.key"
          class="taxonomy-filter"
          :class="{ 'is-active': activeFilter === filter.key }"
          type="button"
          :aria-pressed="activeFilter === filter.key"
          @click="activeFilter = filter.key"
        >
          {{ filter.label }}
        </button>
      </div>
      <div class="taxonomy-post-nodes">
        <a
          v-for="node in nodes"
          :key="node.url"
          class="taxonomy-post-node"
          :class="nodeClass(node)"
          :href="node.url"
        >
          <span class="taxonomy-post-title">{{ node.title }}</span>
          <time class="taxonomy-post-date" :datetime="node.date">{{
            node.date
          }}</time>
        </a>
      </div>
    </div>
  </section>
</template>
