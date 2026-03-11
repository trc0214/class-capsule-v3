# GitHub Sync Plan

Use small, reviewable commits while the project transitions into the Vite + React shell.

1. `chore: add vite react runtime`
2. `refactor: move legacy shell into react wrapper`
3. `refactor: migrate legacy modules into feature folders`
4. `feat: replace legacy DOM sections with native react components`
5. `feat: switch storage provider to remote api`

Suggested workflow:

1. Run `npm install`.
2. Verify `npm run dev` and `npm run build`.
3. Review `git diff`.
4. Push each milestone after validation instead of one large migration commit.
