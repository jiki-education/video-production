# TypeScript Integration - Implementation Summary

**Goal**: Sync TypeScript types across Rails API and both frontend repos using auto-generated types.

---

## Three PRs Required

### 1. **API Repo PR** - Foundation

- **Repo**: `jiki-education/jiki` (Rails API)
- **Plan**: See `API_CHANGES.md`
- **Estimated Time**: 4-5 hours
- **Merge First**: Yes - both frontend PRs depend on this

**Key Changes**:

- Create `typescript/` package with TypeScript generation
- Add `lib/typescript_generator/` with Ruby generators
- Add `rake typescript:generate` task
- Generate types from `INPUT_SCHEMAS` constant

**Output**: `@jiki/api-types` package at `api/typescript/`

---

### 2. **code-videos Repo PR** - Video Pipeline Editor

- **Repo**: `jiki-education/code-videos`
- **Plan**: See `TYPESCRIPT_INTEGRATION_PLAN.md`
- **Estimated Time**: 2-3 hours
- **Depends On**: API PR merged

**Key Changes**:

- Add `"@jiki/api-types": "file:../api/typescript"` to package.json
- Update `lib/nodes/types.ts` to import from `@jiki/api-types`
- Add CI workflow to generate types from API main branch
- Update README with type generation instructions

---

### 3. **front-end Repo PR** - Main Jiki App

- **Repo**: `jiki-education/front-end`
- **Plan**: See `FRONTEND_INTEGRATION_PLAN.md`
- **Estimated Time**: 3-4 hours
- **Depends On**: API PR merged

**Key Changes**:

- Add `'../api/typescript'` to `pnpm-workspace.yaml`
- Add `"@jiki/api-types": "workspace:*"` to `app/package.json`
- Create `app/lib/api/types.ts` to re-export API types
- Add CI workflow to generate types from API main branch
- Update README with type generation instructions

---

## Implementation Order

```
1. API PR
   ├─ Create typescript/ package
   ├─ Add generators
   └─ Test: bundle exec rake typescript:generate

2. code-videos PR (can be parallel with #3)
   ├─ Add dependency to @jiki/api-types
   ├─ Update node types
   └─ Test: pnpm install && pnpm typecheck

3. front-end PR (can be parallel with #2)
   ├─ Add workspace reference
   ├─ Add dependency to @jiki/api-types
   └─ Test: pnpm install && pnpm typecheck
```

---

## How It Works

### Local Development

```bash
# Setup (one-time)
cd ~/Code/jiki
git clone git@github.com:jiki-education/jiki.git api
git clone git@github.com:jiki-education/code-videos.git
git clone git@github.com:jiki-education/front-end.git

# When API schemas change
cd api
bundle exec rake typescript:generate

# Frontends automatically pick up changes
cd ../code-videos
pnpm install  # Symlinks to ../api/typescript
pnpm typecheck

cd ../front-end
pnpm install  # Workspace links to ../api/typescript
pnpm typecheck
```

### CI (Automatic)

```yaml
# Both frontend CIs do this:
1. Checkout frontend repo
2. Checkout API repo (main branch)
3. Generate types: bundle exec rake typescript:generate
4. Install dependencies (creates symlinks)
5. Run typecheck
6. Run tests
```

### Type Flow

```
Rails INPUT_SCHEMAS
    ↓ (bundle exec rake typescript:generate)
api/typescript/src/nodes.ts
    ↓ (pnpm build)
api/typescript/dist/nodes.d.ts
    ↓ (file: dependency)
code-videos/node_modules/@jiki/api-types → ../api/typescript
front-end/node_modules/@jiki/api-types → ../api/typescript
    ↓ (import)
Frontend TypeScript code
```

---

## Benefits

✅ **Single source of truth**: Rails INPUT_SCHEMAS define all types
✅ **Zero drift**: Types auto-generated, can't get out of sync
✅ **CI enforcement**: Breaking changes caught immediately
✅ **Type safety**: Frontend can't use wrong input structures
✅ **No publishing overhead**: Uses local file: dependencies
✅ **Works offline**: Once types are generated locally

---

## Example: Schema Change Flow

### Scenario: Add new input field to `talking-head`

```ruby
# api/lib/video_production/input_schemas.rb
'talking-head' => {
  'script' => { type: :single, required: false },
  'backgroundMusic' => { type: :single, required: false }  # NEW
}
```

**What happens:**

1. **API repo**: Commit schema change
2. **API repo**: Run `rake typescript:generate`
3. **API repo**: Commit generated types
4. **API repo**: Merge PR

5. **code-videos repo**: Create PR
6. **code-videos CI**: Checks out API main, generates types
7. **code-videos CI**: TypeScript sees new field in `TalkingHeadInputs`
8. **code-videos CI**: ✅ Passes (field is optional, backward compatible)

9. **If field was required**: CI would fail with type error
10. **Developer**: Updates code to provide required field
11. **CI**: ✅ Passes after fix

---

## Testing Strategy

### API PR Testing

```bash
cd api
bundle exec rake typescript:generate
cd typescript
pnpm install
pnpm build
cat dist/nodes.d.ts  # Verify generated types
```

### code-videos PR Testing

```bash
# After API PR merged
cd api
git pull origin main
bundle exec rake typescript:generate

cd ../code-videos
pnpm install
pnpm typecheck  # Should pass
pnpm test:run
pnpm test:e2e
```

### front-end PR Testing

```bash
# After API PR merged
cd api
git pull origin main
bundle exec rake typescript:generate

cd ../front-end
pnpm install
pnpm typecheck  # Should pass
pnpm test
```

---

## Rollback Plan

### If API PR has issues:

- Revert PR
- No impact on frontends (they haven't merged yet)

### If code-videos PR has issues:

- Revert PR
- No impact on other repos

### If front-end PR has issues:

- Revert PR
- No impact on other repos

**Key**: Each PR is independent and can be rolled back without affecting others.

---

## Timeline

### Week 1

- **Day 1-2**: Implement and merge API PR
- **Day 3-4**: Implement code-videos PR (review/test)
- **Day 4-5**: Implement front-end PR (review/test)

### Week 2

- **Day 1**: Merge code-videos PR
- **Day 2**: Merge front-end PR
- **Day 3-5**: Monitor CI, fix any issues

---

## File Checklist

### API Repo

- [ ] `typescript/package.json`
- [ ] `typescript/tsconfig.json`
- [ ] `typescript/.npmignore`
- [ ] `typescript/README.md`
- [ ] `typescript/src/index.ts`
- [ ] `typescript/src/base.ts`
- [ ] `typescript/src/nodes.ts`
- [ ] `lib/typescript_generator/generator.rb`
- [ ] `lib/typescript_generator/input_schema_generator.rb`
- [ ] `lib/tasks/typescript.rake`
- [ ] `.gitignore` (add typescript/dist/)
- [ ] `.github/workflows/ci.yml` (add type generation check)

### code-videos Repo

- [ ] `package.json` (add @jiki/api-types dependency)
- [ ] `lib/nodes/types.ts` (import from @jiki/api-types)
- [ ] `.github/workflows/ci.yml` (create new)
- [ ] `README.md` (add type generation section)
- [ ] `.gitignore` (add node_modules/@jiki/api-types)

### front-end Repo

- [ ] `pnpm-workspace.yaml` (add ../api/typescript)
- [ ] `app/package.json` (add @jiki/api-types dependency)
- [ ] `app/lib/api/types.ts` (create new)
- [ ] `.github/workflows/ci.yml` (update existing)
- [ ] `README.md` (add type generation section)
- [ ] `.gitignore` (add node_modules/@jiki/api-types)

---

## Success Criteria

After all PRs are merged:

- [ ] Running `rake typescript:generate` in API creates valid TypeScript
- [ ] code-videos CI passes with types from API main
- [ ] front-end CI passes with types from API main
- [ ] TypeScript autocomplete works for API types in both frontends
- [ ] Breaking schema changes cause CI failures (as expected)
- [ ] Documentation clearly explains type generation workflow
- [ ] Team members can regenerate types locally

---

## Questions?

See individual plan documents for detailed Q&A:

- `API_CHANGES.md` - API implementation details
- `TYPESCRIPT_INTEGRATION_PLAN.md` - code-videos integration
- `FRONTEND_INTEGRATION_PLAN.md` - front-end integration
