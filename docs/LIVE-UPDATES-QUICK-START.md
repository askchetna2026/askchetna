# Live Updates - Quick Start

## The Simplest Flow

```bash
# 1. Make code changes
# 2. Commit and push
git add .
git commit -m "fix: bug description"
git push origin preview

# 3. Vercel auto-deploys
# 4. Users get update notification on next app open
# 5. Users click "Update" → page reloads → users get new version
```

**That's it!** No new APK needed.

---

## Version Bump (Required)

Every time you want users to be notified of an update, bump the version:

### File 1: `src/lib/updates/versionManager.ts`
```typescript
export const CURRENT_VERSION = '1.0.2';  // ← Change this
```

### File 2: `src/app/api/version/route.ts`
```typescript
const versionInfo = {
  version: '1.0.2',  // ← Must match above
  critical: false,   // Set to true for security fixes
  changelog: 'Your changelog here',
};
```

Then commit:
```bash
git add .
git commit -m "chore: bump to 1.0.2"
git push origin preview
```

---

## Common Scenarios

### Bug Fix
1. Fix the bug
2. Bump version: `1.0.1` → `1.0.2`
3. Push
4. Users get notification

### New Feature
1. Add feature
2. Bump version: `1.0.0` → `1.1.0` (minor bump)
3. Write changelog: "Added new birth chart insights"
4. Push
5. Users get notification

### Security Issue
1. Fix the vulnerability
2. Bump version: `1.0.1` → `1.0.2`
3. Set `critical: true`
4. Write changelog: "Security fix: ..."
5. Push
6. Users see "⚠️ Critical Update" and MUST update

---

## Testing (Browser)

Users on mobile apps check for updates. To test:

1. Open DevTools (F12)
2. Device toolbar → mobile view
3. Modify User-Agent to include "AskChetnaApp"
4. Check console → should see version check

---

## Files Modified

```
src/
├── app/
│   ├── api/version/route.ts          ← Version API endpoint
│   └── layout.tsx                    ← Added UpdateNotification
├── components/
│   └── UpdateNotification.tsx         ← Update UI component
└── lib/updates/
    └── versionManager.ts             ← Version checking logic

docs/
├── LIVE-UPDATES-GUIDE.md             ← Full documentation
└── LIVE-UPDATES-QUICK-START.md       ← This file
```

---

## Version Numbering

Use semantic versioning:

- `1.0.0` → `1.0.1` = Patch (bug fix, minor improvement)
- `1.0.0` → `1.1.0` = Minor (new feature)
- `1.0.0` → `2.0.0` = Major (breaking change, redesign)

Current: **1.0.0**

---

## Checklist Before Push

- [ ] Code tested locally
- [ ] Version bumped (both files)
- [ ] Changelog written
- [ ] Critical flag set correctly
- [ ] Ready to deploy!

Then:
```bash
git add .
git commit -m "fix/feat/chore: description"
git push origin preview
```

✅ Done! Users get update on next app open.
