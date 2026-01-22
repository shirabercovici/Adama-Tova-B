# אדממי (Adamami)

A modern participant and volunteer management system built with Next.js and Supabase. This application helps organizations manage participants, volunteers, activities, and tasks with an intuitive Hebrew-language interface.

Link to the app: https://adamami.vercel.app/ (Note: Access is limited to approved users)

## Features

- **Google Authentication** - Secure login with Google OAuth
- **Participant Management** - Add, edit, view, and archive participants
- **Volunteer Management** - Manage volunteer accounts and roles
- **Task Management** - Create and track tasks for participants
- **Activity Logging** - Track phone calls, attendance, and status updates
- **Responsive Design** - Optimized for mobile and desktop
- **RTL Support** - Full right-to-left support for Hebrew interface
- **Modern UI** - Beautiful, accessible interface with custom styling

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (React 18)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Styling**: CSS Modules, Custom CSS
- **Language**: TypeScript

## Key Features Explained

### Participant Management
- View all participants in a searchable list
- Create new participant profiles
- Edit participant information
- Archive/unarchive participants
- View detailed participant cards with activity history

### Volunteer Management
- Manage volunteer accounts
- Assign roles and permissions
- Search and filter volunteers

### Activity Logging
- Track phone calls with participants
- Mark attendance
- Log status updates
- View activity history

### Task Management
- Create tasks for participants
- Mark tasks as complete

## Database Schema

The application uses Supabase with the following main tables:
- `participants` - Participant information
- `users` - Volunteer/managers accounts
- `user_activities` - Activity logs
- `tasks` - Task management


## Credits

Developed as a final project for the Product Jam 2026 course, a collaborative initiative between The Hebrew University of Jerusalem and the Bezalel Academy of Arts and Design
