# Asana Individual Dashboard

A comprehensive individual dashboard for analyzing personal work performance from Asana project data, built with Next.js, TypeScript, and ECharts.

![Dashboard Configuration Screen](https://github.com/user-attachments/assets/edfdb2b8-bd2d-4d29-b52d-cf8dda265666)

## Features

### 📊 Key Performance Indicators (KPIs)
- **Total Tasks**: All tasks assigned to you
- **Completed Tasks**: Number of completed tasks with completion trend
- **Completion Rate**: Overall performance percentage with quality indicators
- **Overdue Tasks**: Tasks requiring immediate attention
- **Average Time per Task**: Time tracking and efficiency metrics

### 📈 Interactive Charts & Analytics
- **Weekly Task Summary**: Line chart showing task assignment and completion trends over time
- **Task Distribution**: Pie charts showing distribution by project/section and status
- **Performance Comparison**: Radar chart comparing individual performance with team averages
- **Calendar View**: Visual representation of task distribution across dates
- **Workload Analysis**: Bar and line charts for workload trends and forecasting

### 📋 Task Management
- **Current Tasks Table**: Sortable and filterable table with search functionality
- **Advanced Filtering**: Filter by status, project, date range, and more
- **Pagination**: Efficient handling of large task lists
- **Task Details**: Comprehensive task information including due dates, priorities, and assignees

### 🔄 Data Management
- **Local Storage Caching**: Intelligent caching with configurable TTL (Time To Live)
- **Auto-refresh**: Background data synchronization
- **Manual Refresh**: On-demand data updates
- **Cache Status**: Real-time cache information and statistics

### 📤 Export Options
- **PDF Export**: Generate printable reports
- **Excel Export**: Export filtered data to Excel format
- **Chart Images**: Export individual charts as images

## Technology Stack

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS for responsive design
- **Charts**: ECharts with React wrapper for interactive visualizations
- **API Integration**: Axios for Asana API communication
- **Data Processing**: Custom TypeScript classes for data modeling
- **Storage**: Browser Local Storage with automatic caching
- **Date Handling**: Day.js for date manipulation

## Prerequisites

1. **Node.js**: Version 18 or higher
2. **Asana Account**: Access to an Asana workspace
3. **Asana Personal Access Token**: Generate from [Asana Developer Console](https://app.asana.com/0/my-apps)
4. **Project Access**: Read permission to the Asana project you want to analyze

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd asana-report-nextjs
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env.local` file in the project root:
   ```env
   # Asana API Configuration
   NEXT_PUBLIC_ASANA_BASE_URL=https://app.asana.com/api/1.0
   NEXT_ASANA_TOKEN=your_personal_access_token_here
   NEXT_ASANA_PROJECT_ID=your_project_id_here

   # Optional: Dashboard Configuration
   NEXT_PUBLIC_CACHE_TTL_HOURS=12
   NEXT_PUBLIC_APP_NAME=Asana Individual Dashboard
   ```

4. **Get your Asana credentials**:
   
   **Personal Access Token:**
   - Go to [Asana Developer Console](https://app.asana.com/0/my-apps)
   - Click "Create New Personal Access Token"
   - Copy the generated token to `NEXT_ASANA_TOKEN`

   **Project ID:**
   - Open your Asana project in the browser
   - The URL will look like: `https://app.asana.com/0/PROJECT_ID/board`
   - Copy the `PROJECT_ID` to `NEXT_ASANA_PROJECT_ID`

5. **Start the development server**:
   ```bash
   npm run dev
   ```

6. **Open the dashboard**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### First Time Setup
1. When you first open the dashboard, you'll see a configuration screen if environment variables are missing
2. Follow the setup instructions to configure your Asana API credentials
3. Restart the development server after adding credentials

### Dashboard Navigation
1. **Assignee Selection**: If multiple team members are found, use the dropdown to select whose dashboard to view
2. **Data Refresh**: Click the "Refresh Data" button to fetch the latest information from Asana
3. **Filtering**: Use the various filters in the tasks table to focus on specific data
4. **Export**: Use the export dropdown to download reports in different formats

### Caching Behavior
- Data is automatically cached in Local Storage for 12 hours (configurable)
- Cache status is displayed in the header
- Manual refresh clears cache and fetches fresh data
- Cache automatically expires and refreshes when needed

## Data Model

The application uses a structured TypeScript data model:

```typescript
class AsanaReport {
    sections: Section[];
}

class Section {
    gid: string;
    name: string;
    tasks: Task[];
}

class Task {
    gid: string;
    name: string;
    assignee?: Assignee;
    completed: boolean;
    completed_at?: string;
    created_at?: string;
    due_on?: string;
    priority?: string;
    project?: string;
    subtasks: Subtask[];
}

class Subtask {
    gid: string;
    name: string;
    assignee?: Assignee;
    completed: boolean;
    created_at?: string;
    completed_at?: string;
}

class Assignee {
    gid: string;
    name: string;
    email?: string;
}
```

## Architecture

### Component Structure
```
src/
├── components/
│   ├── Header.tsx                 # Dashboard header with navigation
│   ├── KpiCards.tsx              # Key performance indicator cards
│   ├── WeeklySummaryChart.tsx    # Weekly task summary line chart
│   ├── DistributionPieCharts.tsx # Task distribution pie charts
│   └── CurrentTasksTable.tsx     # Sortable tasks table
├── lib/
│   ├── asanaApi.ts               # Asana API client and utilities
│   ├── dataProcessor.ts          # Data aggregation and calculations
│   ├── storage.ts                # Local Storage management
│   └── hooks/
│       └── useAsanaData.ts       # React hook for data management
└── models/
    └── asanaReport.ts            # TypeScript data model classes
```

### Data Flow
1. **API Integration**: Fetch data from Asana API using structured endpoints
2. **Data Processing**: Transform raw API data into structured TypeScript classes
3. **Caching**: Store processed data in Local Storage with TTL
4. **State Management**: Use React hooks for component state and data flow
5. **Visualization**: Render data using ECharts and custom React components

## API Endpoints Used

The dashboard integrates with the following Asana API endpoints:

1. **Get Sections**: `GET /projects/{project_id}/sections`
2. **Get Tasks**: `GET /sections/{section_id}/tasks`
3. **Get Subtasks**: `GET /tasks/{task_id}/subtasks`

## Development

### Building for Production
```bash
npm run build
npm start
```

### Linting and Type Checking
```bash
npm run lint
```

### Project Structure
- **App Router**: Uses Next.js App Router for file-based routing
- **TypeScript**: Strict TypeScript configuration for type safety
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **ESLint**: Code quality and consistency enforcement

## Configuration Options

### Environment Variables
- `NEXT_PUBLIC_ASANA_BASE_URL`: Asana API base URL (default: https://app.asana.com/api/1.0)
- `NEXT_ASANA_TOKEN`: Your Asana Personal Access Token (required)
- `NEXT_ASANA_PROJECT_ID`: Target Asana project ID (required)
- `NEXT_PUBLIC_CACHE_TTL_HOURS`: Cache expiration time in hours (default: 12)
- `NEXT_PUBLIC_APP_NAME`: Dashboard title (default: Asana Individual Dashboard)

### Customization
- **Chart Colors**: Modify color schemes in component files
- **Cache TTL**: Adjust cache expiration time via environment variable
- **Data Refresh**: Configure automatic refresh intervals
- **Export Formats**: Extend export functionality for additional formats

## Troubleshooting

### Common Issues

1. **Environment Variables Not Set**:
   - Ensure `.env.local` file exists in project root
   - Verify all required variables are set
   - Restart development server after changes

2. **API Connection Issues**:
   - Verify Personal Access Token is valid
   - Check project ID is correct
   - Ensure you have read access to the project

3. **No Data Displayed**:
   - Check if project has assigned tasks
   - Verify assignees exist in the project
   - Try manual refresh to clear cache

4. **Performance Issues**:
   - Large projects may take time to load
   - Consider reducing cache TTL for more frequent updates
   - Use browser dev tools to monitor network requests

### Debug Mode
Enable debug logging by opening browser developer console to see detailed API requests and data processing logs.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and ensure tests pass
4. Commit your changes: `git commit -am 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
1. Check the troubleshooting section above
2. Review Asana API documentation
3. Open an issue on GitHub with detailed description and error logs
