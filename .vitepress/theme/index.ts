import type { Theme } from "vitepress";
import Layout from "./Layout.vue";
import HomePage from "./components/HomePage.vue";
import ArchivesPage from "./components/ArchivesPage.vue";
import TaxonomyMap from "./components/TaxonomyMap.vue";
import ArticleMeta from "./components/ArticleMeta.vue";
import "./custom.css";

export default {
  Layout,
  enhanceApp({ app }) {
    app.component("HomePage", HomePage);
    app.component("ArchivesPage", ArchivesPage);
    app.component("TaxonomyMap", TaxonomyMap);
    app.component("ArticleMeta", ArticleMeta);
  },
} satisfies Theme;
