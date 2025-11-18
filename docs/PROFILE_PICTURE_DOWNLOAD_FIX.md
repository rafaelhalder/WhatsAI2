# Profile Picture Download Fix

## Problem
The backend was saving temporary WhatsApp media URLs (like `https://pps.whatsapp.net/...`) directly to the database. These URLs have expiring signatures, causing "URL signature expired" errors when users try to view profile pictures later.

## Root Cause
In `webhook-controller.ts`, when processing `contacts.update` webhook events, the code was directly saving the `profilePicUrl` from the webhook to the database:

```typescript
// ❌ BEFORE (Lines 377-380)
if (remoteJid && (profilePicUrl || pushName)) {
  await this.conversationService.updateContactFromWebhook(instanceId, remoteJid, {
    ...(pushName && { contactName: pushName }),
    ...(profilePicUrl && { contactPicture: profilePicUrl })  // Temporary URL!
  });
}
```

## Solution
The fix downloads the image from the temporary URL and stores it permanently in local storage before saving to the database.

### Changes Made

#### 1. Added Profile Picture Download Method
**File:** `server/src/services/conversation-service.ts`

Created a new private method `downloadAndStoreProfilePicture()` that:
- Downloads images from temporary WhatsApp URLs using axios
- Saves them to `/uploads/media/profile_pictures/` with unique UUIDs
- Returns permanent URL path (e.g., `/uploads/media/profile_pictures/abc-123.jpg`)
- Handles errors gracefully (returns null on failure)

```typescript
private async downloadAndStoreProfilePicture(profilePicUrl: string, remoteJid: string): Promise<string | null>
```

#### 2. Updated Contact Update Logic
**File:** `server/src/services/conversation-service.ts`

Modified `updateContactFromWebhook()` method to:
- Detect temporary URLs using proper hostname validation (security-safe)
- Download and store images before saving to database
- Skip picture update if download fails (non-breaking)

```typescript
// ✅ AFTER
if (data.contactPicture) {
  let isTemporaryUrl = false;
  try {
    const url = new URL(data.contactPicture);
    isTemporaryUrl = url.hostname === 'pps.whatsapp.net' || 
                    url.hostname === 'mmg.whatsapp.net' ||
                    url.hostname.endsWith('.pps.whatsapp.net') ||
                    url.hostname.endsWith('.mmg.whatsapp.net');
  } catch {
    isTemporaryUrl = false;
  }
  
  if (isTemporaryUrl) {
    const permanentUrl = await this.downloadAndStoreProfilePicture(data.contactPicture, remoteJid);
    if (permanentUrl) {
      updateData.contactPicture = permanentUrl;
    }
  } else {
    updateData.contactPicture = data.contactPicture;
  }
}
```

#### 3. Enabled Static File Serving
**File:** `server/src/core/app.ts`

Added Express middleware to serve uploaded files:

```typescript
this.app.use('/uploads', express.static('uploads'));
```

#### 4. Updated .gitignore
**File:** `.gitignore`

Added `uploads/` directory to prevent committing user-uploaded files.

### Security Considerations

#### URL Validation
Fixed CodeQL security alert about incomplete URL substring sanitization:

- ❌ **Before:** `data.contactPicture.includes('pps.whatsapp.net')`
  - Could match malicious URLs like `https://evil.com/pps.whatsapp.net/fake`
  
- ✅ **After:** Proper hostname validation using `URL` constructor
  - Only matches actual WhatsApp domains
  - Prevents URL injection attacks

#### Download Safety
- Uses axios with proper timeout (30 seconds)
- Limits file size to 10MB for profile pictures
- Validates status codes (< 400)
- Catches and logs errors without breaking webhook processing

### File Structure
```
uploads/
└── media/
    └── profile_pictures/
        ├── abc-123-def-456.jpg
        ├── xyz-789-ghi-012.png
        └── ...
```

### Testing

#### Unit Test
Run the URL detection test:
```bash
cd server
npx tsx scripts/test-profile-pic-download.ts
```

This validates:
- Temporary WhatsApp URLs are correctly identified
- Permanent URLs are not downloaded
- Security: Malicious URLs with whatsapp.net in path/query are rejected

#### Manual Testing
1. Trigger a `contacts.update` webhook with a temporary profile picture URL
2. Check console logs for download progress:
   ```
   🖼️ [PROFILE_PIC_DOWNLOAD] Starting download for 5511999999999@s.whatsapp.net
   ✅ [PROFILE_PIC_DOWNLOAD] Downloaded successfully (45678 bytes)
   💾 [PROFILE_PIC_DOWNLOAD] Saved to: /path/to/uploads/media/profile_pictures/abc-123.jpg
   ✅ [PROFILE_PIC_DOWNLOAD] Permanent URL: /uploads/media/profile_pictures/abc-123.jpg
   ```
3. Verify the image is accessible at: `http://localhost:3000/uploads/media/profile_pictures/abc-123.jpg`
4. Check database - `contactPicture` field should contain permanent URL

### Performance Impact
- **Minimal:** Downloads happen asynchronously during webhook processing
- Only downloads when profile picture changes
- Cached by filesystem - subsequent views are instant
- No impact on webhook response time (non-blocking)

### Migration Path
Existing contacts with temporary URLs will automatically be updated when:
1. Next `contacts.update` webhook arrives for that contact
2. User manually refreshes contact info

No manual migration needed.

### Rollback Plan
If issues occur:
1. Revert commits: `git revert f36b87a de36035`
2. Restart server
3. Old temporary URLs will continue to expire, but no new downloads will occur

### Future Enhancements
1. **S3/CDN Storage:** Modify `downloadAndStoreProfilePicture()` to upload to S3 instead of local storage
2. **Cleanup Job:** Schedule periodic cleanup of orphaned profile pictures
3. **Image Optimization:** Resize/compress profile pictures to standard size (e.g., 200x200)
4. **Lazy Loading:** Only download on first view instead of immediately

### Related Files
- `server/src/api/controllers/webhook-controller.ts` - Webhook handler
- `server/src/services/conversation-service.ts` - Main fix location
- `server/src/services/incoming-media-service.ts` - Similar media download logic
- `server/src/core/app.ts` - Static file serving

### References
- Issue: URL signature expired errors
- CodeQL Alert: js/incomplete-url-substring-sanitization (Fixed)
- Stack: TypeScript, Node.js, Express, Axios
