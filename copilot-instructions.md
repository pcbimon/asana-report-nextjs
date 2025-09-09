# Copilot Instructions for Individual Dashboard (Next.js + TypeScript + ECharts)

Purpose
- Implement an Individual Dashboard to analyze per-assignee work from Asana Project data.
- Tech stack: Next.js (TypeScript), ECharts, Tailwind CSS. Store fetched data in Local Storage. Use env for BASE_URL, TOKEN (PAT), PROJECT_ID.

Repository layout (recommended)
- /src
  - /components
    - Header.tsx
    - KpiCards.tsx
    - WeeklySummaryChart.tsx
    - DistributionPie.tsx
    - CalendarView.tsx
    - WorkloadChart.tsx
    - TimeTrackingChart.tsx
    - CurrentTasksTable.tsx
    - PerformanceRadar.tsx
    - FiltersPanel.tsx
    - ExportButtons.tsx
  - /lib
    - asanaApi.ts
    - dataProcessor.ts
    - storage.ts
  - /models
    - asanaReport.ts
  - /pages
    - /dashboard/[assignee].tsx
  - /styles
    - tailwind.css

Data model (TypeScript)
- class AsanaReport { sections: Section[]; }
- class Section { gid: string; name: string; tasks: Task[]; }
- class Task { gid: string; name: string; assignee?: Assignee; completed: boolean; completed_at?: string; subtasks?: Subtask[]; due_on?: string; priority?: string; project?: string; }
- class Assignee { gid: string; name: string; email?: string; }
- class Subtask { gid: string; name: string; assignee?: Assignee; completed: boolean; created_at?: string; completed_at?: string; }

Asana API helpers (/lib/asanaApi.ts)
- fetchSections(): GET {{BASE_URL}}/projects/{{PROJECT_ID}}/sections
- fetchTasksInSection(sectionGid): GET {{BASE_URL}}/sections/{{sectionGid}}/tasks?opt_fields=name,assignee,completed,completed_at,due_on,projects,custom_fields
- fetchSubtasks(taskGid): GET {{BASE_URL}}/tasks/{{taskGid}}/subtasks?opt_fields=name,assignee,completed,created_at,completed_at
- Use Authorization: Bearer {{TOKEN}}. Retry + backoff and handle rate limits.

Data processing (/lib/dataProcessor.ts)
- Merge sections -> tasks -> subtasks into AsanaReport instance.
- Normalize assignees (map by gid).
- Compute derived fields per task: overdue (due_on < today && not completed), lead time (completed_at - created_at).
- Produce per-assignee aggregates: total, completed, overdue, avgTime, weekly timeseries.

Local Storage and sync (/lib/storage.ts)
- saveReport(report: AsanaReport): store JSON + timestamp.
- loadReport(): return cached if fresh (configurable TTL e.g., 12h), otherwise null.
- background sync: on app load, if no fresh cache, fetch and save. Provide manual refresh button.

Pages & routing
- /dashboard/[assignee] — server-side render minimal skeleton; fetch cached data on client and hydrate charts.
- Authentication: protect route with middleware (JWT/session). On auth success, show only data for authenticated assignee.

UI & Components
- Header: assignee name, quick stats, refresh, export buttons.
- KpiCards: total tasks, completed, completion rate, overdue, avg time.
- Charts: use ECharts React wrapper, responsive. Provide props for data, color theme, tooltip, legend.
  - Weekly Line: tasks assigned vs completed per week; overlay team average.
  - Distribution Pie(s): by project/section, by status, by priority.
  - Workload Bar/Line: weekly/monthly counts + forecast (simple linear projection).
  - Time Tracking: bar by task type/category and trend line.
  - Performance Radar: metrics vs team averages.
- Calendar: month view with counts per day and colored badges by project/priority.
- CurrentTasksTable: columns: Task, Project/Section, Due date, Status, Priority. Support sort, filter, search, pagination.
- FiltersPanel: time-range, project, status, priority. Persist filters in URL query params.

Export & Print
- Export to PDF: render printable page and use window.print() or html2pdf.
- Export to Excel: generate CSV/XLSX from current filtered data (SheetJS).
- Export chart image: ECharts getDataURL and trigger download.

Styling
- Tailwind CSS for responsive layout. Use CSS variables for theme colors. Ensure accessible contrast and keyboard nav.

Testing & quality
- Unit tests for dataProcessor functions (Jest).
- Integration tests for API helpers (msw to mock Asana).
- Linting: ESLint + Prettier. Type-check CI step.

Environment & setup
1. Create .env.local:
   - NEXT_PUBLIC_ASANA_BASE_URL=https://app.asana.com/api/1.0
   - NEXT_PUBLIC_ASANA_TOKEN=your_pat_here
   - NEXT_PUBLIC_ASANA_PROJECT_ID=your_project_id
2. Install:
   - npm install
   - npm install echarts echarts-for-react tailwindcss axios dayjs js-cookie xlsx html2canvas jspdf
3. Tailwind init:
   - npx tailwindcss init -p, configure content paths.
4. Run:
   - npm run dev
5. Build:
   - npm run build && npm run start

Performance considerations
- Paginate API calls if many tasks.
- Debounce filter/search operations.
- Cache computed aggregates to avoid reprocessing on UI-only changes.

Security
- Do not expose PAT in client builds. Prefer server-side proxy or Next.js API routes that read PAT from server env and proxy requests. If PAT is client-side, limit scope and rotate regularly.

Deployment
- Vercel or any Node host. Keep secrets in provider env settings. Enable HTTPS.

Maintenance
- Provide a cron or webhook-based refresh to keep Local Storage sync up to date.
- Document rate limit behavior and error handling.

Notes
- Prioritize server-side proxy for sensitive tokens.
- Start with core pages (Header, KpiCards, WeeklySummaryChart, CurrentTasksTable), then add advanced charts and exports iteratively.
