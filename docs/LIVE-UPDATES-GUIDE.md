# Capacitor Live Updates Guide

## How It Works

Users with the native app get **automatic over-the-air updates** without needing to reinstall the APK.

### Update Flow:

```
You: Push code to preview branch
        ↓
Vercel: Auto-deploys to askchetna.com
        ↓
Next.js: Serves new code + updates /api/version
        ↓
User's App: Checks /api/version on startup
        ↓
If new version available: Shows update notification
        ↓
User clicks "Update": Page reloads, gets latest code
```

---

## How to Deploy Updates

### 1. **Regular Updates (Non-Critical)**

Just push your code:

```bash
git add .
git commit -m "fix(feature): description"
git push origin preview
```

Vercel auto-deploys. Users see an update notification next time they open the app.

- Users can click "Update" to refresh
- Users can click "Later" to dismiss for 24 hours

### 2. **Critical/Security Updates**

Edit `src/app/api/version/route.ts` and set `critical: true`:

```typescript
const versionInfo = {
  version: '1.0.1',
  critical: true,  // ⚠️ Forces update - no dismiss option
  changelog: 'Security fix: Fixed authentication vulnerability',
  // ...
};
```

Then:

```bash
git add .
git commit -m "fix(security): critical auth vulnerability"
git push origin preview
```

Users will see "⚠️ Critical Update Available" and MUST update (no "Later" button).

### 3. **Version Number Management**

Keep the version in sync:

**In `src/lib/updates/versionManager.ts`:**
```typescript
export const CURRENT_VERSION = '1.0.1';  // Update this
```

**In `src/app/api/version/route.ts`:**
```typescript
const versionInfo = {
  version: '1.0.1',  // Must match CURRENT_VERSION
  // ...
};
```

---

## When Users Get Updates

Updates are checked:
1. ✅ When app launches (cold start)
2. ✅ Every 2 hours while app is open
3. ✅ When user clicks the "Update" button

---

## API Endpoint Reference

**GET `/api/version`**

Returns current version info:

```json
{
  "version": "1.0.1",
  "releaseDate": "2026-07-26",
  "critical": false,
  "changelog": "Bug fixes and performance improvements",
  "minNativeVersion": "1.0.0"
}
```

**Response codes:**
- `200 OK` — Version info
- `5xx` — Server error (users will retry)

---

## What Triggers Updates vs New APK

### ✅ Updates work (no new APK):
- UI changes (React, CSS)
- Feature logic changes
- Bug fixes
- API integration changes
- Database schema changes (if backward compatible)
- Authentication flow updates

### ❌ Requires new APK:
- Native plugin additions (Firebase, Camera, etc.)
- Permission changes
- Native code changes
- Icon/splash screen changes
- Package name changes
- Plugin version updates

---

## Rollback Strategy

If an update breaks something:

1. **Quick fix needed?**
   ```bash
   # Fix the bug
   git add .
   git commit -m "fix: revert breaking change"
   git push origin preview
   ```
   Users get the fix on next app launch.

2. **Need to pause updates?**
   Edit `src/app/api/version/route.ts` and don't increment version. Users won't be prompted.

3. **Emergency kill switch:**
   Set the API version to an older value to "downgrade" users:
   ```typescript
   version: '1.0.0',  // Revert to 1.0.0
   ```

---

## Best Practices

1. **Test before pushing**
   ```bash
   npm run dev
   # Test in browser, check console for errors
   ```

2. **Increment version for tracking**
   - Patch: `1.0.0` → `1.0.1` (bug fixes)
   - Minor: `1.0.0` → `1.1.0` (new features)
   - Major: `1.0.0` → `2.0.0` (breaking changes)

3. **Write clear changelogs**
   ```typescript
   changelog: "Fixed birth chart loading issue + improved performance"
   ```

4. **Use critical flag sparingly**
   - Only for security issues or major bugs
   - Too many critical updates = user frustration

5. **Monitor adoption**
   - Check analytics to see who updated
   - Compare user versions if available

---

## Example Scenarios

### Scenario 1: Bug Fix
```bash
# Code fix
git commit -m "fix: corrected dasha calculation"
git push origin preview

# Update version
# src/app/api/version/route.ts: version: '1.0.2'
# src/lib/updates/versionManager.ts: export const CURRENT_VERSION = '1.0.2'

git add .
git commit -m "chore: bump version to 1.0.2"
git push origin preview
```

Users see: "✨ Update Available - Version 1.0.2 - Bug fixes"

### Scenario 2: Security Patch
```bash
# Security fix
git commit -m "fix(security): prevent XSS in chart display"
git push origin preview

# Mark as critical
# src/app/api/version/route.ts: critical: true, version: '1.0.3'

git add .
git commit -m "chore(security): mark 1.0.3 as critical"
git push origin preview
```

Users see: "⚠️ Critical Update Available" (must update)

### Scenario 3: New Feature
```bash
# Add feature (e.g., new remedies section)
git commit -m "feat: add remedies recommendations"
git push origin preview

# Increment minor version
# version: '1.1.0'

git add .
git commit -m "chore: bump to 1.1.0"
git push origin preview
```

Users see: "✨ Update Available - Version 1.1.0 - New remedies feature"

---

## Troubleshooting

**Problem: Users not getting update notifications**
- Check if version is correctly incremented in both files
- Check `/api/version` returns correct data
- Users must open app to check for updates

**Problem: Update notification shows but click doesn't work**
- Check browser console for errors
- Verify `/api/version` returns 200 status
- Check network tab to see request/response

**Problem: Too many users on old version**
- Set `critical: true` to force update
- Send push notification asking users to update

---

## Next Steps

1. ✅ Install packages: `npm install @capacitor/app-update`
2. ✅ Files created (version manager, API, component)
3. ✅ Integrated into layout
4. ✅ Test in browser DevTools (simulate native app user-agent)
5. ✅ Deploy to production

For testing, open browser DevTools, open app in mobile view, and check console for update checks.
