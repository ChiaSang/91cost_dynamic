# 91cost_dynamic

## Local pre-push security check

This repository includes a reusable Git hook in `.githooks/pre-push`.

Enable it once per clone:

```bash
git config core.hooksPath .githooks
chmod +x .githooks/pre-push
```

Useful commands:

```bash
corepack pnpm pre-push
corepack pnpm check:security
corepack pnpm check
```

The hook currently runs the security audit only, which matches the GitHub
workflow's dependency check. If you want a stricter gate, use
`corepack pnpm check` before pushing.
