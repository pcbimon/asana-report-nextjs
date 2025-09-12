# Supabase Setup Guide

This guide will help you set up Supabase for the Asana Dashboard application with automated daily data synchronization.

## Prerequisites

- A Supabase account (https://supabase.com)
- Asana API credentials (token, project ID, team ID)
- Supabase CLI installed (`npm install -g supabase`)

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Choose your organization
4. Enter a project name (e.g., "asana-dashboard")
5. Enter a database password (save this for later)
6. Select a region close to your users
7. Click "Create new project"

## Step 2: Get Supabase Credentials

1. In your Supabase dashboard, go to Settings > API
2. Copy the following values:
   - **Project URL** (looks like `https://xxxxxxxxxx.supabase.co`)
   - **Publishable key** (starts with `eyJ...`)
   - **Service Role key** (starts with `eyJ...`) - **Keep this secret!**

## Step 3: Set Up the Database

1. In your Supabase dashboard, go to the SQL Editor
2. Copy the contents of `database-setup.sql` from this repository
3. Paste it into the SQL Editor and click "Run"
4. This will create the necessary tables and security policies

## Step 4: Deploy the Edge Function for Automated Sync

1. Link to your Supabase project:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

2. Deploy the automated sync function:
   ```bash
   supabase functions deploy asana-sync
   ```

3. Set environment variables for the function:
   ```bash
   supabase secrets set ASANA_TOKEN=your_asana_personal_access_token
   supabase secrets set ASANA_PROJECT_ID=your_asana_project_id
   supabase secrets set ASANA_TEAM_ID=your_asana_team_id
   supabase secrets set RATE_LIMIT=150
   ```

## Step 5: Set Up Daily Cronjob

1. In your Supabase dashboard, go to the SQL Editor
2. Copy the contents of `supabase/cronjob-setup.sql` from this repository
3. **Important**: Replace `your-project-ref` in the URL with your actual project reference
4. Replace `YOUR_SERVICE_ROLE_KEY` with your actual service role key
5. Paste it into the SQL Editor and click "Run"
6. This sets up a daily cronjob at 2:00 AM to sync data automatically

## Step 6: Configure Environment Variables

1. Create a `.env.local` file in your project root (copy from `.env.example`)
2. Add your configuration:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Admin Authentication
ADMIN_PWD=your_secure_admin_password
```

**Note**: The Asana credentials are now set as Supabase secrets for the Edge Function, not in the Next.js environment variables.

## Step 7: Create Admin User

1. In your Supabase dashboard, go to Authentication > Users
2. Click "Add user"
3. Use email: `admin@example.com`
4. Use password: (same as your `ADMIN_PWD` environment variable)
5. Click "Add user"

## Step 8: Test the Application

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. You should be redirected to the login page
4. Log in with `admin@example.com` and your admin password
5. You should be redirected to the dashboard

## New Automated Sync System

### How It Works

The application now uses **automated daily synchronization** instead of manual UI-triggered sync:

1. **Supabase Edge Function**: A scheduled function runs daily at 2:00 AM
2. **Automatic Data Sync**: The function fetches fresh data from Asana API and stores it in Supabase
3. **Read-Only UI**: The dashboard only reads data from Supabase cache
4. **No Manual API Calls**: Users can no longer trigger manual refresh from Asana API

### Benefits

- **Consistent Performance**: UI loads instantly from cache
- **Reduced API Usage**: Only one API call per day instead of on-demand
- **Better Reliability**: Less prone to timeout issues
- **Scalability**: Supports multiple concurrent users

### Manual Sync (Testing/Emergency)

You can manually trigger a sync for testing:

```bash
curl -X POST "https://your-project-ref.supabase.co/functions/v1/asana-sync" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Or use the admin API endpoint (if authenticated as admin):
```bash
curl -X POST "http://localhost:3000/api/admin/sync"
```

## Database Schema

The application uses two main tables:

### `asana_reports`
Stores cached Asana report data with TTL functionality.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| data | JSONB | Serialized Asana report data |
| timestamp | TIMESTAMPTZ | When the data was fetched |
| version | VARCHAR(20) | Data format version |
| created_at | TIMESTAMPTZ | Record creation time |
| updated_at | TIMESTAMPTZ | Record update time |

### `user_preferences`
Stores user-specific dashboard preferences.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| user_id | UUID | Reference to auth.users |
| selected_assignee | VARCHAR(255) | Last selected team member |
| time_range | VARCHAR(50) | Preferred time range filter |
| project_filter | VARCHAR(255) | Preferred project filter |
| status_filter | VARCHAR(50) | Preferred status filter |
| created_at | TIMESTAMPTZ | Record creation time |
| updated_at | TIMESTAMPTZ | Record update time |

## Security Features

- **Row Level Security (RLS)** enabled on all tables
- **Authentication required** for all data access
- **Route protection** via middleware
- **Environment variable validation** with graceful fallback
- **Secure Edge Function** with service role authentication

## Monitoring

### Check Sync Status
- The UI shows cache age and last update time
- Displays "อัพเดตอัตโนมัติทุกวัน 02:00 น." (Auto-update daily at 2:00 AM)

### View Function Logs
1. Go to Supabase Dashboard
2. Navigate to Edge Functions > asana-sync
3. Click on Logs tab
4. Check for successful execution or errors

### Verify Cronjob
```sql
-- View all scheduled jobs
SELECT * FROM cron.job;

-- Check job execution history
SELECT * FROM cron.job_run_details WHERE jobname = 'daily-asana-sync' ORDER BY start_time DESC LIMIT 10;
```

## Troubleshooting

### "Missing Supabase environment variables" error
- Ensure all required environment variables are set in `.env.local`
- Restart your development server after changing environment variables

### "Authentication Error" on login
- Verify your admin user exists in Supabase Auth
- Check that the password matches your `ADMIN_PWD` environment variable
- Ensure your Supabase project is active and not paused

### Data not updating automatically
- Check Edge Function logs for errors
- Verify cronjob is scheduled correctly
- Check if Asana API credentials are valid in Supabase secrets
- Ensure `pg_cron` extension is enabled

### Manual sync not working
- Verify service role key is correct
- Check Edge Function deployment status
- Verify Asana API credentials in Supabase secrets

### Build/deployment issues
- Ensure all environment variables are set in your deployment platform
- For Vercel: add variables in Project Settings > Environment Variables
- For other platforms: consult their documentation for environment variables

## Migration from Manual Sync

If you're upgrading from the previous manual sync system:

1. The UI will automatically switch to read-only mode
2. Existing cache data will be preserved
3. Manual refresh now only refreshes from cache
4. No changes needed to user data or preferences