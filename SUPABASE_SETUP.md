# Supabase Setup Guide

This guide will help you set up Supabase for the Asana Dashboard application.

## Prerequisites

- A Supabase account (https://supabase.com)
- Asana API credentials (token, project ID, team ID)

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

## Step 3: Set Up the Database

1. In your Supabase dashboard, go to the SQL Editor
2. Copy the contents of `database-setup.sql` from this repository
3. Paste it into the SQL Editor and click "Run"
4. This will create the necessary tables and security policies

## Step 4: Configure Environment Variables

1. Create a `.env.local` file in your project root (copy from `.env.example`)
2. Add your configuration:

```env
# Asana API Configuration
NEXT_ASANA_TOKEN=your_asana_personal_access_token
NEXT_ASANA_PROJECT_ID=your_asana_project_id
NEXT_ASANA_TEAM_ID=your_asana_team_id

# Rate limiting configuration
RATE_LIMIT=150

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Admin Authentication
NEXT_ADMIN_PWD=your_secure_admin_password
```

## Step 5: Create Admin User

1. In your Supabase dashboard, go to Authentication > Users
2. Click "Add user"
3. Use email: `admin@example.com`
4. Use password: (same as your `NEXT_ADMIN_PWD` environment variable)
5. Click "Add user"

## Step 6: Test the Application

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. You should be redirected to the login page
4. Log in with `admin@example.com` and your admin password
5. You should be redirected to the dashboard

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

## Migration from localStorage

The application automatically handles the migration from localStorage to Supabase:

1. If Supabase is not configured, the app falls back to localStorage
2. When Supabase is configured, new data is stored in Supabase
3. User preferences are now persisted across devices when authenticated
4. Cache data has proper TTL and can be shared across sessions

## Troubleshooting

### "Missing Supabase environment variables" error
- Ensure all required environment variables are set in `.env.local`
- Restart your development server after changing environment variables

### "Authentication Error" on login
- Verify your admin user exists in Supabase Auth
- Check that the password matches your `NEXT_ADMIN_PWD` environment variable
- Ensure your Supabase project is active and not paused

### Data not persisting
- Check that your database tables were created successfully
- Verify RLS policies are enabled
- Check the browser console and server logs for error messages

### Build/deployment issues
- Ensure all environment variables are set in your deployment platform
- For Vercel: add variables in Project Settings > Environment Variables
- For other platforms: consult their documentation for environment variables

## Features

### Authentication
- Secure login with Supabase Auth
- Session management and automatic logout
- Route protection for sensitive pages

### Data Storage
- Persistent cache across sessions
- Automatic cache expiration (12 hours default)
- Real-time cache status display
- User preference persistence

### Performance
- Efficient data caching reduces API calls
- Graceful fallback when Supabase is unavailable
- Client-side error handling

### Security
- Environment variable validation
- SQL injection protection via Supabase
- Row-level security policies
- Secure authentication flow