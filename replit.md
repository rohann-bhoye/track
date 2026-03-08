# Task Tracker Application

A beautiful, secure daily task tracking application where you can log your work across different companies, track status, and generate professional work reports.

## Features

### ✅ Daily Task Logging
- Add tasks for any company with date of join, task date, and detailed work description
- **Auto-timestamps**: Date and time automatically recorded when task is created
- Requires a secret code for authorization (prevents unauthorized additions)
- Default secret code: `task123`

### ✅ Task Status Tracking
- **Two Status Options**: "In Progress" or "Completed"
- **Auto-completion date**: When you mark a task as complete, the completion timestamp is automatically recorded
- **Change status anytime**: Use the secret code to update status at any time
- Click the status badge to toggle or update the status

### ✅ Task Viewing - Multiple Views
- **Grid View** (Home): Cards showing all tasks with company, dates, and descriptions
- **Checklist View** (`/tasks`): Row-based list view perfect for daily tracking
  - One task per row for easy scanning
  - Status badge shows "In Progress" or "Completed"
  - See creation date/time and completion date/time if applicable
  - Quick status toggle with secret code
- **List View**: Compact view with toggle between grid and list
- Tasks sorted by date (newest first)

### ✅ Work Report
- **Company-based Summary**: View all tasks organized by company
- **Statistics Dashboard**: Shows total tasks, number of companies, and average tasks per company
- **Daily Breakdown**: Each company section shows tasks sorted by date
- Shows completion dates for completed tasks
- Perfect to share with managers/stakeholders when asked "What did you work on?"

## Database Schema

### tasks table
- `id`: Serial primary key
- `companyName`: Company name (text)
- `dateOfJoin`: When you joined the company (text/date)
- `taskDate`: Date when the task was completed (text/date)
- `description`: Detailed work description (text)
- `createdAt`: When the task was logged (timestamp)

## Pages

- `/` (Home): Task tracker with add/view/toggle view modes
- `/report`: Professional work report grouped by company

## Security

Tasks can only be added with the correct secret code. Current default is `task123` (can be changed via `SECRET_CODE` environment variable).

## Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Framer Motion
- **Backend**: Express, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **UI Components**: Shadcn/ui (Cards, Buttons, Dialogs, etc.)
- **Date Handling**: date-fns
- **Form Validation**: Zod

## Adding Tasks Daily

1. Click "Log Daily Work" button on home page
2. Fill in company, dates, work description
3. Enter the secret code
4. Submit

## Viewing Your Work Report

1. Click "View Report" button (visible when you have tasks)
2. See all your tasks organized by company
3. Perfect for sharing with managers or clients!

## Future Enhancements (Ideas)

- Export report as PDF
- Filter by date range
- Search functionality
- Edit/delete existing tasks
- Task categories/tags
- Team collaboration features
