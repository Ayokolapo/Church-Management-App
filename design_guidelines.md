# Design Guidelines: The Waypoint Church Management System

## Design Approach

**Selected Approach:** Design System-Based (Material Design principles)
**Justification:** This is a data-intensive administrative application requiring clear hierarchy, efficient workflows, and consistent patterns across member management, attendance tracking, and data entry forms. Material Design provides proven patterns for tables, forms, and data visualization.

## Core Design Elements

### Typography
- **Primary Font:** Inter or Roboto via Google Fonts CDN
- **Headings:** Font weight 600-700, size scale: text-2xl (page titles), text-xl (section headers), text-lg (subsection headers)
- **Body Text:** Font weight 400, text-base for primary content, text-sm for table data and secondary information
- **Labels:** Font weight 500, text-sm, slightly elevated tracking for form labels and table headers
- **Monospace:** Use for phone numbers and dates (font-mono)

### Layout System
**Spacing Primitives:** Use Tailwind units of 2, 4, 6, and 8 primarily
- Component padding: p-4 to p-6
- Section spacing: gap-6 to gap-8
- Card spacing: p-6
- Form field spacing: gap-4
- Table cell padding: px-4 py-3

**Container Strategy:**
- Max width: max-w-7xl for main content areas
- Sidebar width: w-64 on desktop, full-width drawer on mobile
- Form containers: max-w-2xl for optimal readability

### Component Library

#### Navigation
- **Sidebar Navigation (Desktop):** Fixed left sidebar with icon + label navigation items, collapsible sections for Members/First Timers/Attendance modules
- **Mobile Navigation:** Bottom tab bar with icons for primary sections, hamburger menu for secondary functions
- **Top Bar:** Contains page title, quick actions (Add Member, Export CSV), and user profile access

#### Data Tables
- **Structure:** Sticky header row, alternating row backgrounds for readability, fixed action column on right
- **Column Controls:** Floating control panel above table with "Columns" dropdown for show/hide toggles, "Select All" checkbox functionality
- **Filters:** Collapsible filter panel above table with search input, dropdown filters for Status/Gender/Occupation/Cluster
- **Row Actions:** Icon buttons (Edit, Delete) aligned right, hover reveals full button labels
- **Pagination:** Bottom-aligned with rows-per-page selector (25, 50, 100)

#### Forms
- **Layout:** Single column on mobile, two-column grid on desktop (grid-cols-1 md:grid-cols-2)
- **Input Fields:** Full-width inputs with floating labels or top-aligned labels, clear focus states with border emphasis
- **Field Groups:** Related fields grouped with subtle background containers (e.g., Contact Info, Demographics)
- **Radio/Checkboxes:** Large touch targets (min 44px), clear visual selection states
- **Submit Actions:** Sticky footer on mobile with primary CTA, inline on desktop

#### Cards
- **Member Cards:** Used for mobile list view, includes photo placeholder, name, status badge, last attended info
- **Metric Cards:** Dashboard overview cards showing total members, attendance rate, new first-timers (3-column grid on desktop, stacked on mobile)
- **First Timer Cards:** Preview cards in first-timer list with key info and "Convert to Member" action

#### Attendance Interface
- **Member List:** Compact list view with toggle switches for Present/Absent (default Absent)
- **Status Filter Tabs:** Horizontal pill navigation for Crowd/Potential/Committed/Worker/Leader with count badges
- **Bulk Actions:** "Mark All Present" button appears when status filter is active
- **Search:** Persistent search bar at top with real-time filtering

#### Buttons & Actions
- **Primary Actions:** Elevated buttons for main CTAs (Add Member, Mark Present, Submit)
- **Secondary Actions:** Outlined buttons for Cancel, Export
- **Icon Buttons:** Used in tables and compact views, Material Icons via CDN
- **FAB (Mobile):** Floating Action Button for primary action (Add Member) on mobile list views

#### Data Visualization
- **Status Badges:** Pill-shaped badges with clear labeling for member status (use subtle backgrounds with appropriate contrast)
- **Attendance Indicators:** Toggle switches with clear on/off states
- **Metrics:** Large number displays with descriptive labels for dashboard statistics

#### Import/Export
- **CSV Upload:** Drag-and-drop zone with file browser fallback, shows preview table before confirming import
- **Template Download:** Clear link to download CSV template with example data row
- **Export Options:** Dropdown menu with format options and field selection checkboxes

### Public First Timer Form
- **Layout:** Clean, welcoming single-page form with progress indicator (not stepped, just visual progress bar)
- **Mobile-First:** Large touch targets, single column layout, generous spacing (gap-6)
- **Field Presentation:** One question per screen section on mobile, grouped logically
- **Visual Hierarchy:** Welcome header with church name/logo placeholder, clear section separations
- **Submission:** Large, prominent Submit button with success confirmation page

### Responsive Behavior
- **Breakpoints:** Mobile-first with md: (768px) and lg: (1024px) breakpoints
- **Tables:** Horizontal scroll on mobile with sticky first column, full table on desktop
- **Navigation:** Bottom tabs on mobile, sidebar on desktop (lg:block)
- **Forms:** Stack to single column on mobile, two-column grid on desktop where appropriate

### Icons
**Library:** Material Icons via CDN
- Navigation: Home, People, PersonAdd, EventAvailable, Upload, Download
- Actions: Edit, Delete, Check, Close, MoreVert
- Status: CheckCircle, RadioButtonUnchecked, PersonOutline
- Forms: Phone, Email, LocationOn, Work, DateRange

### Accessibility
- Minimum touch target size: 44x44px for all interactive elements
- Clear focus indicators on all form inputs and buttons
- Proper label associations for all form fields
- ARIA labels for icon-only buttons
- Keyboard navigation support for table interactions and filters

### Animation
Use minimally and purposefully:
- Subtle fade-in for modal overlays (duration-200)
- Smooth transitions for toggle switches (transition-all duration-150)
- Page transitions: Simple fade or slide (no elaborate animations)

### Images
**No hero images needed** for this administrative application. Use placeholder circles/squares for member photos in tables and cards. The public first-timer form can include a simple logo/wordmark at the top but no decorative imagery.