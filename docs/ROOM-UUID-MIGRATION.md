# Room UUID Migration

## Overview

As of this update, the presenter room system now uses proper UUIDs for room IDs instead of string literals. The default room ID has been changed from `"default"` to `"00000000-0000-0000-0000-000000000001"`.

## Automatic Migration

The system will automatically create the default room with the proper UUID on backend startup if it doesn't exist. No manual intervention is required for new installations.

## Existing Installations

If you have an existing installation with the old `"default"` room ID, the backend will continue to work, but you may encounter validation errors when trying to use the old room ID. 

### Manual Migration (Optional)

To migrate from the old "default" room to the new UUID-based room:

1. **Backup your database** (optional, for safety):
   ```bash
   cp ~/Library/Application\ Support/obs-live-suite/data.db ~/Library/Application\ Support/obs-live-suite/data.db.backup
   ```

2. **Delete the old room**:
   ```bash
   sqlite3 ~/Library/Application\ Support/obs-live-suite/data.db "DELETE FROM rooms WHERE id = 'default';"
   ```

3. **Restart the backend** - it will automatically create the new room with the proper UUID:
   ```bash
   # If using pnpm dev, just kill and restart
   # If using PM2:
   pnpm pm2:restart
   ```

4. **Verify**:
   ```bash
   curl http://localhost:3002/api/rooms
   # Should show the new room with UUID 00000000-0000-0000-0000-000000000001
   ```

## Frontend Components

All frontend components have been updated to use the `DEFAULT_ROOM_ID` constant from `@/lib/models/Room`, so they will automatically use the correct UUID.

## API Changes

The room ID validation now properly enforces UUID format. Any API calls to presenter/cue endpoints must use the proper UUID:

**Before:**
```json
{
  "roomId": "default",
  "type": "cue",
  "body": "Test"
}
```

**After:**
```json
{
  "roomId": "00000000-0000-0000-0000-000000000001",
  "type": "cue",
  "body": "Test"
}
```

Or use the constant in your code:
```typescript
import { DEFAULT_ROOM_ID } from "@/lib/models/Room";

// Use DEFAULT_ROOM_ID in your API calls
```


