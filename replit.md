# The Waypoint Church Management System

## Overview

The Waypoint is a comprehensive church management web application designed to streamline member database management, first-timer tracking, and Sunday service attendance recording. Built as a mobile-responsive full-stack application, it provides church administrators with tools to efficiently manage their congregation through intuitive interfaces for data entry, filtering, and reporting.

The system manages three core data entities: Members (with detailed demographic and engagement tracking), First Timers (new visitors with conversion workflows), and Attendance (service participation history). The application supports CSV import/export functionality and provides real-time statistics dashboards.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Tooling**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server with HMR (Hot Module Replacement)
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management with automatic caching and refetching

**UI Component System**
- shadcn/ui component library built on Radix UI primitives
- "New York" style variant configured in components.json
- Tailwind CSS for styling with custom design tokens
- Material Design principles for data-intensive administrative interfaces
- Responsive layouts using Tailwind's breakpoint system (mobile-first approach)

**Design System**
- Typography: Inter/Roboto fonts via Google Fonts CDN
- Spacing: Consistent Tailwind units (2, 4, 6, 8)
- Color system: HSL-based CSS custom properties supporting light/dark modes
- Component patterns: Sidebar navigation (desktop), bottom tabs (mobile), data tables with sticky headers, multi-column forms

**Form Handling**
- React Hook Form for form state management
- Zod schemas for validation (shared between client and server)
- @hookform/resolvers for integrating Zod with React Hook Form

### Backend Architecture

**Server Framework**
- Express.js on Node.js for HTTP server
- Separate entry points for development (index-dev.ts) and production (index-prod.ts)
- Development mode integrates Vite middleware for SSR and HMR
- Production mode serves static built files

**API Design**
- RESTful API structure with resource-based endpoints
- Routes organized by entity: /api/members, /api/first-timers, /api/attendance, /api/stats
- Standard HTTP methods: GET (list/retrieve), POST (create/action), PUT/PATCH (update), DELETE (remove)
- Query parameters for filtering (status, gender, occupation, cluster)

**File Upload Handling**
- Multer middleware for CSV import processing
- In-memory storage strategy for file uploads
- CSV parsing via csv-parse library
- CSV export via csv-stringify library

### Data Storage Solution

**Database**
- PostgreSQL as the primary database (via Neon serverless)
- Drizzle ORM for type-safe database queries
- WebSocket-based connection pooling via @neondatabase/serverless
- Schema-first approach with migrations stored in /migrations directory

**Schema Design**
- Three main tables: members, firstTimers, attendance
- UUID primary keys generated via PostgreSQL's gen_random_uuid()
- Timestamp columns for created_at/updated_at tracking
- Foreign key relationship: firstTimers.memberId references members when converted
- Computed fields on members: lastAttended, timesAttended, timeSinceAttended (calculated from attendance table)

**Data Types**
- Text fields for names, contact info, notes
- Date fields for dateOfBirth, joinDate, serviceDate
- Enum-like text fields for categorical data (status, gender, occupation, archive)
- Array fields for multi-select data (enjoyedAboutService in firstTimers)
- Nullable fields for optional data (email, followUpWorker, etc.)

### Authentication & Authorization

**Current Implementation**
- No authentication system currently implemented
- Application assumes single-tenant usage within trusted network
- Session management infrastructure present (connect-pg-simple) but not actively used

**Security Considerations**
- CORS not explicitly configured (assumes same-origin deployment)
- No role-based access control
- Future enhancement opportunity for multi-church or multi-user scenarios

### External Dependencies

**Database Service**
- Neon PostgreSQL (serverless) - DATABASE_URL environment variable required
- WebSocket connection protocol for efficient serverless database access

**CDN Resources**
- Google Fonts CDN for typography (Inter, Roboto, Architects Daughter, DM Sans, Fira Code, Geist Mono)

**Build-time Dependencies**
- TypeScript compiler for type checking
- esbuild for server-side bundling in production
- Vite for client-side bundling and development server
- PostCSS with Tailwind CSS and Autoprefixer for styling

**Runtime Libraries**
- date-fns for date formatting and manipulation
- class-variance-authority (CVA) for component variant management
- clsx and tailwind-merge for className composition
- nanoid for unique ID generation in development mode

**Development Tools**
- Replit-specific plugins: cartographer, dev-banner, runtime-error-modal
- tsx for TypeScript execution in development
- drizzle-kit for database migrations and schema management

**Key Architectural Decisions**

1. **Monorepo Structure**: Client and server code in same repository with shared types via /shared directory
2. **Type Safety**: End-to-end TypeScript with Zod schemas shared between frontend validation and backend API contracts
3. **Serverless Database**: Neon PostgreSQL chosen for scalability and WebSocket support
4. **Component Library**: shadcn/ui over pre-built libraries for customization control and smaller bundle size
5. **State Management**: React Query for server state, React Hook Form for form state, React Context for UI state
6. **Build Strategy**: Vite for fast development with HMR, separate production build pipeline for optimal deployment