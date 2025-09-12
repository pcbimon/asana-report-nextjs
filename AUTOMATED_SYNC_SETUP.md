# Automated Asana Data Synchronization with Next.js API

This document explains the automated data synchronization system that replaces the previous UI-triggered sync mechanism using a Next.js API endpoint.

## Overview

The application now uses a **scheduled Next.js API endpoint** to automatically sync data from Asana API once daily, instead of manual refresh through the UI.

## Changes Made

### 1. UI is Now Read-Only
- The dashboard UI only reads data from Supabase cache
- Manual refresh button now only refreshes from cache (no API calls)
- Loading progress no longer shows API fetch operations
- Cache status in header shows automatic update schedule

### 2. Next.js API Endpoint for Data Sync
- **Location**: `app/api/admin/sync/route.ts`
- **Purpose**: Fetches complete Asana report data and saves to Supabase
- **Features**:
  - Rate limiting to respect Asana API limits
  - Error handling and logging
  - Detailed progress tracking
  - Automatic cache replacement
  - Server-side execution with proper environment variable access

### 3. Daily Cronjob Setup
- **Location**: `supabase/cronjob-setup.sql`
- **Schedule**: Daily at 2:00 AM
- **Method**: Uses Supabase `pg_cron` extension
- **Endpoint**: Calls the Next.js API endpoint via HTTP

## Deployment Instructions

### Step 1: Set Up Environment Variables

Update your `.env.local` file (or hosting platform environment variables) with the following:

```bash
# Asana API Configuration
ASANA_TOKEN=your_asana_token_here
ASANA_PROJECT_ID=your_project_id_here
ASANA_TEAM_ID=your_team_id_here
RATE_LIMIT=150

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
NEXT_DB_URL=your_supabase_database_url_here

# Admin Authentication
ADMIN_PWD=your_admin_password_here
```

### Step 2: Deploy Your Next.js Application

Deploy your application to your hosting platform (Vercel, Netlify, etc.) with the environment variables set.

### Step 3: Set Up the Cronjob

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `supabase/cronjob-setup.sql`
4. **Important**: Replace `your-nextjs-app-domain.com` in the URL with your actual Next.js application domain
5. Run the SQL script

### Step 4: Verify Setup

1. Test the API endpoint manually:
   ```bash
   curl -X POST "https://your-nextjs-app-domain.com/api/admin/sync" \
     -H "Content-Type: application/json"
   ```

2. Check if the cronjob is scheduled:
   ```sql
   SELECT * FROM cron.job;
   ```

3. Monitor the API endpoint by checking your hosting platform's function logs

## Environment Variables Required

### For Next.js Application:
- `ASANA_TOKEN` - Your Asana Personal Access Token
- `ASANA_PROJECT_ID` - Your Asana project ID  
- `ASANA_TEAM_ID` - Your Asana team ID
- `RATE_LIMIT` - API rate limit (default: 150 requests/minute)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Your Supabase publishable key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for server-side operations)
- `ADMIN_PWD` - Admin password for authentication

## Monitoring and Troubleshooting

### Check Sync Status
The UI cache status shows:
- Last update timestamp
- Cache age in minutes  
- "อัพเดตอัตโนมัติทุกวัน 02:00 น." (Auto-update daily at 2:00 AM)

### View API Logs
Check your hosting platform's function logs:
- **Vercel**: Go to your project dashboard > Functions tab > View logs for `/api/admin/sync`
- **Netlify**: Check the function logs in your site dashboard
- **Other platforms**: Check the respective logging/monitoring section

### Manual Sync (if needed)
You can manually trigger a sync by calling the API endpoint directly (useful for testing or emergency updates):

```bash
curl -X POST "https://your-nextjs-app-domain.com/api/admin/sync" \
  -H "Content-Type: application/json"
```

Or use the admin interface if available.

### Common Issues

1. **Environment variables missing**: Verify all environment variables are set correctly in your hosting platform
2. **API endpoint not responding**: Check if your Next.js application is deployed and running
3. **Cronjob not running**: Check if pg_cron extension is enabled in Supabase
4. **API rate limits**: Increase delay between requests in the API if needed
5. **No data in UI**: Check if API endpoint ran successfully and data exists in `asana_reports` table
6. **CORS issues**: The API should handle CORS properly for cronjob requests

## Benefits of This Approach

1. **Simplified Architecture**: Everything runs in Next.js, no need for separate Edge Functions
2. **Better Performance**: UI loads instantly from cache
3. **Reduced API Usage**: Only one scheduled API call per day instead of on-demand calls
4. **Consistent Data**: All users see the same data until next sync
5. **Reliability**: Less prone to timeout issues during UI usage
6. **Scalability**: Supports multiple concurrent users without API limits
7. **Easier Deployment**: No need to manage separate Supabase function deployments

## Reverting to Previous Behavior (if needed)

If you need to revert to the old UI-triggered sync:

1. Disable the cronjob:
   ```sql
   SELECT cron.unschedule('daily-asana-sync');
   ```

2. Restore the original `useAsanaDataApi.ts` hook from git history

3. Update the UI components to restore manual refresh functionality

## Data Structure

The API endpoint maintains the same data structure as the previous system:
- Sections with tasks and subtasks
- Team users information
- Timestamps and version tracking
- Cache TTL and metadata

## Security Considerations

- The API endpoint is public but contains business logic for data synchronization only
- Sensitive environment variables (like service role keys) are only accessible server-side
- The cronjob runs from Supabase's trusted network
- Consider adding API rate limiting if needed for additional security