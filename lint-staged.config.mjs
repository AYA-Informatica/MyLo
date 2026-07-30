/**
 * Pre-commit formatting.
 *
 * Prettier is invoked from the repository root and discovers each project's own
 * .prettierrc from the file being formatted, so no per-project working directory
 * is needed. lint-staged appends the staged paths to each command.
 *
 * ESLint deliberately does not run here. It needs its config resolved from the
 * project directory, which means wrapping every invocation in a subshell `cd`,
 * and that is fragile enough to be worth avoiding on a hook that runs on every
 * commit. `npm run lint` covers both projects, and CI enforces it on every push.
 */
export default {
  "*.{ts,tsx,js,mjs,cjs,json,md,yml,yaml,css}": ["prettier --write"],
};
