# Automated Asana Data Synchronization with Supabase

This document explains the new automated data synchronization system that replaces the previous UI-triggered sync mechanism.

## Overview

The application now uses a **scheduled Supabase Edge Function** to automatically sync data from Asana API once daily, instead of manual refresh through the UI.

## Changes Made

### 1. UI is Now Read-Only
- The dashboard UI only reads data from Supabase cache
- Manual refresh button now only refreshes from cache (no API calls)
- Loading progress no longer shows API fetch operations
- Cache status in header shows automatic update schedule

### 2. Supabase Edge Function for Data Sync
- **Location**: `supabase/functions/asana-sync/index.ts`
- **Purpose**: Fetches complete Asana report data and saves to Supabase
- **Features**:
  - Rate limiting to respect Asana API limits
  - Error handling and logging
  - Detailed progress tracking
  - Automatic cache replacement

### 3. Daily Cronjob Setup
- **Location**: `supabase/cronjob-setup.sql`
- **Schedule**: Daily at 2:00 AM
- **Method**: Uses Supabase `pg_cron` extension
- **Endpoint**: Calls the Edge Function via HTTP

## Deployment Instructions

### Step 1: Deploy the Edge Function

1. Install Supabase CLI if not already installed:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link to your project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. Deploy the function:
   ```bash
   supabase functions deploy asana-sync
   ```

5. Set environment variables for the function:
   ```bash
   supabase secrets set ASANA_TOKEN=your_asana_token_here
   supabase secrets set ASANA_PROJECT_ID=your_project_id_here
   supabase secrets set ASANA_TEAM_ID=your_team_id_here
   supabase secrets set RATE_LIMIT=150
   ```

### Step 2: Set Up the Cronjob

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `supabase/cronjob-setup.sql`
4. **Important**: Replace `your-project-ref` in the URL with your actual project reference
5. Run the SQL script

### Step 3: Verify Setup

1. Test the Edge Function manually:
   ```bash
   curl -X POST "https://your-project-ref.supabase.co/functions/v1/asana-sync" \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json"
   ```

2. Check if the cronjob is scheduled:
   ```sql
   SELECT * FROM cron.job;
   ```

3. Monitor function logs in Supabase dashboard under Edge Functions > asana-sync > Logs

## Environment Variables Required

### For Edge Function (set via Supabase secrets):
- `ASANA_TOKEN` - Your Asana Personal Access Token
- `ASANA_PROJECT_ID` - Your Asana project ID  
- `ASANA_TEAM_ID` - Your Asana team ID
- `RATE_LIMIT` - API rate limit (default: 150 requests/minute)

### For Next.js Application (in .env.local):
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Your Supabase publishable key
- `ADMIN_PWD` - Admin password for authentication

## Monitoring and Troubleshooting

### Check Sync Status
The UI cache status shows:
- Last update timestamp
- Cache age in minutes  
- "อัพเดตอัตโนมัติทุกวัน 02:00 น." (Auto-update daily at 2:00 AM)

### View Function Logs
1. Go to Supabase Dashboard
2. Navigate to Edge Functions > asana-sync
3. Click on Logs tab
4. Check for any errors or successful execution logs

### Manual Sync (if needed)
You can manually trigger a sync by calling the Edge Function directly (useful for testing or emergency updates):

```bash
curl -X POST "https://your-project-ref.supabase.co/functions/v1/asana-sync" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### Common Issues

1. **Function not deploying**: Check Supabase CLI setup and project linking
2. **Environment variables missing**: Verify all secrets are set correctly
3. **Cronjob not running**: Check if pg_cron extension is enabled
4. **API rate limits**: Increase delay between requests in function if needed
5. **No data in UI**: Check if Edge Function ran successfully and data exists in `asana_reports` table

## Benefits of This Approach

1. **Better Performance**: UI loads instantly from cache
2. **Reduced API Usage**: Only one scheduled API call per day instead of on-demand calls
3. **Consistent Data**: All users see the same data until next sync
4. **Reliability**: Less prone to timeout issues during UI usage
5. **Scalability**: Supports multiple concurrent users without API limits

## Reverting to Previous Behavior (if needed)

If you need to revert to the old UI-triggered sync:

1. Disable the cronjob:
   ```sql
   SELECT cron.unschedule('daily-asana-sync');
   ```

2. Restore the original `useAsanaDataApi.ts` hook from git history

3. Update the UI components to restore manual refresh functionality

## Data Structure

The Edge Function maintains the same data structure as the previous system:
- Sections with tasks and subtasks
- Team users information
- Timestamps and version tracking
- Cache TTL and metadata