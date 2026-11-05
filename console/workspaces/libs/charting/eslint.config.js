import config from "@workspacenow/eslint-config";

// The vendored EvilCharts source is regenerated from its registry, not hand-edited.
export default [{ ignores: ["src/evilcharts/**"] }, ...config];
