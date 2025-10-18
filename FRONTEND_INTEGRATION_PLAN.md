# TypeScript Integration Plan - front-end (Main Jiki App)

**Goal**: Integrate TypeScript types generated from Rails API schemas to ensure type safety for the main Jiki learning platform.

**Status**: Ready for implementation
**Estimated Time**: 3-4 hours
**Dependencies**: Requires API repo changes (see API_CHANGES.md)

---

## Overview

This plan adds TypeScript type generation from the Rails API to the main `front-end` monorepo. Unlike `code-videos`, this is already a pnpm workspace monorepo with multiple packages (`app`, `content`, `curriculum`, `interpreters`).

The `@jiki/api-types` package will be added to the workspace and consumed by the `app` package.

---

## Repository Structure

```
front-end/
├── pnpm-workspace.yaml
├── package.json
├── app/                    # Next.js app (@jiki/app)
├── content/                # Content package (@jiki/content)
├── curriculum/             # Curriculum package (@jiki/curriculum)
└── interpreters/           # Interpreters package (@jiki/interpreters)
```

**After integration:**

```
front-end/
├── pnpm-workspace.yaml     # Add reference to ../api/typescript
├── package.json
├── app/                    # Consumes @jiki/api-types
│   └── package.json        # Add dependency: "@jiki/api-types": "workspace:*"
├── content/
├── curriculum/
└── interpreters/
```

---

## Changes Required

### 1. Update Workspace Configuration

**File**: `pnpm-workspace.yaml`

Add reference to API-generated types:

```yaml
packages:
  - "app"
  - "content"
  - "curriculum"
  - "interpreters"
  - "../api/typescript" # Add API types to workspace
```

**Why**: Allows pnpm to treat `@jiki/api-types` as a workspace package, creating automatic symlinks.

---

### 2. Update App Package Dependencies

**File**: `app/package.json`

Add dependency to API-generated types:

```json
{
  "dependencies": {
    "@jiki/api-types": "workspace:*"
  }
}
```

**Why**: Uses pnpm workspace protocol to reference the API types package in the workspace.

---

### 3. Create Type Definitions (if needed)

**File**: `app/lib/api/types.ts` (create if it doesn't exist)

Import and re-export API types for use throughout the app:

```typescript
/**
 * API Types
 *
 * These types are auto-generated from Rails API schemas
 * Source of truth: api/app/models/ and api/lib/
 *
 * To update types:
 * 1. cd ../api
 * 2. bundle exec rake typescript:generate
 * 3. cd ../front-end
 * 4. pnpm install (workspace link updates automatically)
 */

// Re-export all API types
export * from "@jiki/api-types";

// Example: If you need to extend or transform types
import type { User as ApiUser } from "@jiki/api-types";

export interface User extends ApiUser {
  // Add frontend-specific properties if needed
  isLoading?: boolean;
}
```

**Note**: The exact structure depends on what types the API generates. Adjust based on your API schemas.

---

### 4. Add CI Workflow for Type Generation

**File**: `.github/workflows/ci.yml`

Create or update the CI workflow:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  typecheck-and-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout front-end
        uses: actions/checkout@v4
        with:
          path: front-end

      - name: Checkout API repo (main branch)
        uses: actions/checkout@v4
        with:
          repository: jiki-education/jiki
          ref: main
          path: api
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: "3.3"
          bundler-cache: true
          working-directory: api

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Generate TypeScript types from API schemas
        run: |
          cd api
          bundle exec rake typescript:generate

      - name: Install workspace dependencies
        run: |
          cd front-end
          pnpm install

      - name: TypeScript type check (all packages)
        run: |
          cd front-end
          pnpm typecheck

      - name: Lint (all packages)
        run: |
          cd front-end
          pnpm lint

      - name: Run tests (all packages)
        run: |
          cd front-end
          pnpm test

      - name: Build app
        run: |
          cd front-end
          pnpm build:app
```

**Why**:

- Generates types from API `main` branch on every PR
- Tests all workspace packages
- Ensures types are always in sync
- Catches breaking schema changes early

---

### 5. Update Local Development Documentation

**File**: `README.md`

Add section on TypeScript integration:

````markdown
## TypeScript Type Generation

This project uses TypeScript types auto-generated from the Rails API schemas.

### Prerequisites

You must have the `api` repo checked out as a sibling directory:

```bash
cd ~/Code/jiki
git clone git@github.com:jiki-education/jiki.git api
git clone git@github.com:jiki-education/front-end.git
```
````

### Initial Setup

```bash
cd front-end
pnpm install  # Automatically links ../api/typescript via workspace
```

### When API Schemas Change

If you pull changes from the API repo that modify schemas:

```bash
cd ../api
bundle exec rake typescript:generate

cd ../front-end
pnpm typecheck  # Verify types still work
```

### Workspace Structure

This monorepo includes:

- `app/` - Next.js application
- `content/` - Content management
- `curriculum/` - Curriculum data
- `interpreters/` - Code execution engines
- `../api/typescript/` - Generated API types (external workspace package)

All packages can import from `@jiki/api-types`.

### Troubleshooting

**Error: Cannot find module '@jiki/api-types'**

1. Ensure API repo exists at `../api`
2. Generate types: `cd ../api && bundle exec rake typescript:generate`
3. Reinstall: `pnpm install`

**Type errors after API schema changes**

This is expected! The API schema is the source of truth. Update your code to match the new types.

````

---

### 6. Add .gitignore Entries

**File**: `.gitignore`

Add entries to ignore symlinked types:

```gitignore
# TypeScript generated types (from API repo)
app/node_modules/@jiki/api-types
content/node_modules/@jiki/api-types
curriculum/node_modules/@jiki/api-types
interpreters/node_modules/@jiki/api-types
````

**Why**: The types are generated in the API repo, not committed to this repo.

---

## Testing Plan

### 1. Local Testing

```bash
# Generate types from API
cd ../api
bundle exec rake typescript:generate

# Install dependencies (creates workspace links)
cd ../front-end
pnpm install

# Verify types work across all packages
pnpm typecheck

# Run all tests
pnpm test
```

### 2. CI Testing

Create a test PR with these changes and verify:

- [ ] CI successfully checks out both repos
- [ ] Types are generated without errors
- [ ] TypeScript compilation succeeds for all packages
- [ ] All tests pass
- [ ] No type errors in app components

### 3. Schema Change Testing

Make a breaking change to API schemas and verify:

- [ ] CI fails on front-end PR
- [ ] Type errors clearly show what changed
- [ ] After fixing types, CI passes

---

## Rollout Plan

### Phase 1: Add Type Generation (Week 1)

1. Merge API changes (see API_CHANGES.md)
2. Test type generation locally
3. Create PR in front-end with this integration
4. Verify CI works correctly

### Phase 2: Update App Components (Week 1-2)

1. Identify all components that interact with API
2. Update them to use `@jiki/api-types`
3. Fix any type mismatches revealed by generated types
4. Add tests for type compliance

### Phase 3: Monitor (Week 2-3)

1. Watch for CI failures due to schema drift
2. Document any issues with the integration
3. Train team on new workflow

---

## Benefits

✅ **Single source of truth**: Rails schemas define all API types
✅ **Type safety**: Frontend can't use wrong API structures
✅ **CI enforcement**: Breaking changes detected immediately
✅ **No manual sync**: Types auto-generate from schemas
✅ **Workspace integration**: Works seamlessly with pnpm monorepo
✅ **Shared types**: All packages can use `@jiki/api-types`

---

## Rollback Plan

If issues arise:

1. Remove `'../api/typescript'` from `pnpm-workspace.yaml`
2. Remove `"@jiki/api-types": "workspace:*"` from `app/package.json`
3. Run `pnpm install`
4. Remove CI workflow changes
5. Restore any modified type files from git

No data loss - this is purely a type safety enhancement.

---

## Questions & Answers

**Q: What if I don't have the API repo locally?**
A: The workspace install will fail. You need the API repo as a sibling directory.

**Q: Can other packages (content, curriculum, interpreters) use API types?**
A: Yes! Just add `"@jiki/api-types": "workspace:*"` to their package.json.

**Q: What happens when API schemas change?**
A: You'll see TypeScript errors. This is intentional - it forces you to update the frontend to match the API.

**Q: Can we publish to npm instead?**
A: Yes, but workspace dependency is simpler for development. We can switch to npm publishing later if needed.

**Q: Does this affect the monorepo build?**
A: No - it's just an additional workspace package. All existing build processes continue to work.

---

## Related Documents

- `API_CHANGES.md` - Changes needed in API repo
- `TYPESCRIPT_INTEGRATION_PLAN.md` - Similar plan for code-videos repo
- `app/lib/api/types.ts` - API type re-exports
