# אדממי (Adamami)

A modern participant and volunteer management system built with Next.js and Supabase. This application helps organizations manage participants, volunteers, activities, and tasks with an intuitive Hebrew-language interface.

## Features

- 🔐 **Google Authentication** - Secure login with Google OAuth
- 👥 **Participant Management** - Add, edit, view, and archive participants
- 🤝 **Volunteer Management** - Manage volunteer accounts and roles
- 📋 **Task Management** - Create and track tasks for participants
- 📊 **Activity Logging** - Track phone calls, attendance, and status updates
- 📱 **Responsive Design** - Optimized for mobile and desktop
- 🌐 **RTL Support** - Full right-to-left support for Hebrew interface
- 🎨 **Modern UI** - Beautiful, accessible interface with custom styling

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (React 18)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Styling**: CSS Modules, Custom CSS
- **Data Fetching**: SWR
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Email**: Nodemailer
- **Language**: TypeScript

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- npm or yarn package manager
- A Supabase account and project
- Google OAuth credentials (for authentication)

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd Adama-Tova-B
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
PRIVATE_SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id

# Email Configuration (Optional)
EMAIL_ADDRESS=your_email@example.com
EMAIL_PASSWORD=your_email_password
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587

# Optional Features
DEMOS_ENABLED=false
NASA_API_KEY=your_nasa_api_key
```

### 4. Database Setup

Run the Supabase migration files to set up your database schema:

1. Execute `supabase_migration.sql` in your Supabase SQL editor
2. Execute `supabase_migration_add_read_at.sql` if needed

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Create a production build
- `npm run start` - Run the production server
- `npm run lint` - Run ESLint to check for code issues
- `npm run info` - Display Next.js system information

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── participants/      # Participant management pages
│   ├── participant-card/  # Individual participant view
│   ├── manage-volunteers/ # Volunteer management
│   ├── add-volunteer/     # Add new volunteers
│   ├── new-participant/   # Add new participants
│   ├── edit-participant/  # Edit participant details
│   ├── login/             # Authentication pages
│   ├── profile/           # User profile
│   ├── api/               # API routes
│   └── ...
├── components/            # Reusable React components
├── lib/                   # Utility functions and helpers
│   ├── supabase/         # Supabase client configuration
│   ├── components/       # Shared components
│   ├── hooks/            # Custom React hooks
│   └── ...
├── public/                # Static assets (images, fonts, etc.)
├── styles/               # Global styles
└── ...
```

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
- Filter by task status

## Database Schema

The application uses Supabase with the following main tables:
- `participants` - Participant information
- `users` - Volunteer/user accounts
- `activities` - Activity logs
- `tasks` - Task management

Refer to the migration files for the complete schema.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is part of the Digital Product Jam 2025 course.

## Credits

Developed as part of the Product Jam 2025 course.

---

For questions or support, please open an issue in the repository.
