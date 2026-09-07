<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { data as posts } from "../../data/posts.data";
import { slugify } from "../../../scripts/utils.mjs";
import TaxonomyBranch from "./TaxonomyBranch.vue";
import type { Post } from "../../data/posts.data";
import type { TaxonomyFilter, TaxonomyNode } from "./taxonomy";

const props = defineProps<{ mode: "tags" | "categories" }>();

const UNCATEGORIZED = "未分类";
const categoriesOf = (post: Post) =>
  post.categories.length ? post.categories : [UNCATEGORIZED];

interface BranchData {
  id: string;
  label: string;
  count: number;
  filters: TaxonomyFilter[];
  filterLabel: string;
  nodes: TaxonomyNode[];
  extraClass?: string;
}

// One branch per tag (category filters inside) or per category (tag filters).
const build = () => {
  const byTag = props.mode === "tags";
  const keys = byTag
    ? [...new Set(posts.flatMap((post) => post.tags))].sort()
    : [
        ...new Set(posts.flatMap((post) => post.categories)),
      ].sort((a, b) => a.localeCompare(b, "zh-CN"));

  const toBranch = (label: string, entries: Post[]): BranchData => {
    const filters: TaxonomyFilter[] = byTag
      ? [...new Set(entries.flatMap(categoriesOf))]
          .sort((a, b) => a.localeCompare(b, "zh-CN"))
          .map((category) => ({ key: slugify(category), label: category }))
      : [...new Set(entries.flatMap((post) => post.tags))]
          .sort()
          .map((tag) => ({ key: slugify(tag), label: tag }));
    return {
      id: byTag ? `tag-${slugify(label)}` : `category-${slugify(label)}`,
      label,
      count: entries.length,
      filters: [
        { key: "all", label: byTag ? "全部分类" : "全部标签" },
        ...filters,
      ],
      filterLabel: `${label} ${byTag ? "分类" : "标签"}筛选`,
      nodes: entries.map((post) => ({
        url: post.url,
        title: post.title,
        date: post.date,
        keys: byTag
          ? categoriesOf(post).map(slugify)
          : post.tags.map(slugify),
      })),
      extraClass: byTag ? "tag-branch" : "",
    };
  };

  const branches = keys.map((key) =>
    toBranch(
      key,
      posts.filter((post) =>
        byTag ? post.tags.includes(key) : post.categories.includes(key),
      ),
    ),
  );

  const leftovers = byTag
    ? posts.filter((post) => post.tags.length === 0)
    : posts.filter((post) => post.categories.length === 0);
  const extra = leftovers.length
    ? toBranch(byTag ? "无标签" : UNCATEGORIZED, leftovers)
    : null;

  return { branches, extra };
};

const { branches, extra } = build();

const openIds = ref(new Set<string>());
const toggle = (id: string) => {
  const next = new Set(openIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  openIds.value = next;
};

// Deep links like tags.html#tag-web open the branch and center it.
const openHashBranch = () => {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return;
  const element = document.getElementById(id);
  if (!element?.classList.contains("taxonomy-branch")) return;
  if (!openIds.value.has(id)) {
    const next = new Set(openIds.value);
    next.add(id);
    openIds.value = next;
  }
  requestAnimationFrame(() => element.scrollIntoView({ block: "center" }));
};

onMounted(() => {
  openHashBranch();
  window.addEventListener("hashchange", openHashBranch);
});
onBeforeUnmount(() =>
  window.removeEventListener("hashchange", openHashBranch),
);

const mapId = computed(() =>
  props.mode === "tags" ? "tag-map" : "taxonomy-map",
);
const rootLabel = computed(() =>
  props.mode === "tags" ? "ALL TAGS" : "ALL CATEGORIES",
);
const rootSummary = computed(() =>
  props.mode === "tags"
    ? `${branches.length} 个标签 · ${posts.length} 篇文章`
    : `${branches.length} 个分类 · ${posts.length} 篇文章`,
);
const extraMapId = computed(() =>
  props.mode === "tags" ? "untagged-map" : "uncategorized-map",
);
const extraRootLabel = computed(() =>
  props.mode === "tags" ? "NO TAG" : "UNCATEGORIZED",
);
const extraRootSummary = computed(() =>
  extra ? `${extra.count} 篇文章` : "",
);
</script>

<template>
  <div :class="mode === 'tags' ? 'tag-taxonomy' : 'category-taxonomy'">
    <section
      class="taxonomy-map"
      :class="{ 'tag-map': mode === 'tags' }"
      :id="mapId"
      :aria-label="mode === 'tags' ? '文章标签思维导图' : '文章分类思维导图'"
    >
      <div class="taxonomy-root">
        <span class="taxonomy-root-label">{{ rootLabel }}</span>
        <strong>{{ rootSummary }}</strong>
      </div>
      <div class="taxonomy-branches">
        <TaxonomyBranch
          v-for="branch in branches"
          :key="branch.id"
          v-bind="branch"
          :open="openIds.has(branch.id)"
          @toggle="toggle"
        />
      </div>
    </section>
    <section
      v-if="extra"
      class="taxonomy-map"
      :class="
        mode === 'tags' ? 'tag-map tag-untagged-map' : 'taxonomy-uncategorized-map'
      "
      :id="extraMapId"
      :aria-label="mode === 'tags' ? '无标签文章' : '未分类文章'"
    >
      <div class="taxonomy-root">
        <span class="taxonomy-root-label">{{ extraRootLabel }}</span>
        <strong>{{ extraRootSummary }}</strong>
      </div>
      <div class="taxonomy-branches">
        <TaxonomyBranch
          :key="extra.id"
          v-bind="extra"
          :open="openIds.has(extra.id)"
          @toggle="toggle"
        />
      </div>
    </section>
  </div>
</template>
