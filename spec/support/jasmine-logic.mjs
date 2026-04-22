export default {
  spec_dir: "spec",
  spec_files: [
    "authStore.spec.js",
    "chatStore.spec.js",
    "multiModelService.spec.js",
    "ollamaClient.spec.js",
    "preferencesStore.spec.js"
  ],
  helpers: [
    "helpers/**/*.?(m)js"
  ],
  env: {
    stopSpecOnExpectationFailure: false,
    random: true,
    forbidDuplicateNames: true
  }
}
