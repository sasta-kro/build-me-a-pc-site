# Build Me a PC — Frontend

A React-based frontend for **Build Me a PC**, a platform connecting PC enthusiasts with verified builders. Features real-time PC part compatibility checks, build customization, and a marketplace for pre-built systems.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Features](#features)
- [User Roles & Permissions](#user-roles--permissions)
- [Key Pages](#key-pages)
- [Contexts & State Management](#contexts--state-management)
- [API Integration](#api-integration)
- [Styling](#styling)
- [Environment Configuration](#environment-configuration)
- [Available Scripts](#available-scripts)
- [Contributing](#contributing)

---

## Overview

**Build Me a PC** is a community-driven platform where:

- **Users** can browse pre-built PCs, create custom builds with real-time compatibility validation, post build requests, and interact with builds through comments, likes, and ratings.
- **Builders** (verified experts) can post showcase pre-built PCs, respond to build requests with offers, and manage their professional profiles.
- **Admins** manage the entire platform: PC parts catalog, user moderation, builder applications review, and compatibility rules configuration.

The frontend provides an intuitive UI for all these features, integrating seamlessly with a RESTful backend API.

---

## Tech Stack

| Category | Technology |
| --- | --- |
| **Runtime** | Node.js |
| **Framework** | React 19 |
| **Router** | React Router v7 |
| **HTTP Client** | Axios |
| **Build Tool** | Vite |
| **Styling** | CSS3 (Custom, no CSS framework) |
| **Linter** | ESLint |
| **Package Manager** | pnpm |

### Key Dependencies

- `react@^19.2.0` — UI framework with React Hooks
- `react-router-dom@^7.13.0` — Client-side routing
- `axios@^1.13.5` — HTTP client with JWT interceptors
- `vite@^7.2.4` — Lightning-fast dev server and build tool

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **pnpm** (or npm/yarn)
- **Backend API** running at `http://localhost:3000/api` (dev) or production URL

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd build-me-a-pc-site

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

The app will be available at `http://localhost:5173` (Vite default).

### Build for Production

```bash
pnpm run build
pnpm run preview  # Preview the production build locally
```

---

## Project Structure

```
src/
├── api/
│   └── axios.js                 # HTTP client with JWT interceptors
├── assets/
│   └── react.svg
├── components/
│   └── layout/
│       ├── Footer.jsx           # App footer
│       ├── Layout.jsx           # Main layout wrapper
│       ├── Navbar.jsx           # Navigation bar with auth links
│       └── ProtectedRoute.jsx   # Route protection (auth & role-based)
├── contexts/
│   ├── AuthContext.jsx          # Authentication state (login, register, user)
│   └── DataContext.jsx          # Data operations (CRUD for all resources)
├── pages/
│   ├── HomePage.jsx             # Home landing page
│   ├── admin/                   # Admin-only pages
│   │   ├── AdminApplicationsPage.jsx   # Review builder applications
│   │   ├── AdminDashboardPage.jsx      # Admin overview & stats
│   │   ├── AdminPartEditPage.jsx       # Edit PC parts
│   │   ├── AdminPartNewPage.jsx        # Add new PC part
│   │   ├── AdminPartsPage.jsx          # Parts catalog management
│   │   ├── AdminRulesPage.jsx          # Compatibility rules config
│   │   └── AdminUsersPage.jsx          # User management & banning
│   ├── auth/
│   │   ├── LoginPage.jsx        # User login
│   │   └── RegisterPage.jsx     # User registration
│   ├── builder/
│   │   ├── BuilderApplyPage.jsx # Apply to become a builder
│   │   └── BuilderDashboardPage.jsx # Builder's workspace
│   ├── builds/
│   │   ├── BuildCreatePage.jsx  # Create a new custom build
│   │   ├── BuildDetailPage.jsx  # View build details & interact
│   │   ├── BuildEditPage.jsx    # Edit existing build
│   │   └── BuildsPage.jsx       # Browse all builds
│   ├── profile/
│   │   ├── ProfileEditPage.jsx  # Edit user/builder profile
│   │   └── ProfilePage.jsx      # View user profile
│   ├── requests/
│   │   ├── RequestDetailPage.jsx    # View build request details
│   │   └── RequestsPage.jsx         # Browse build requests
│   └── showcase/
│       ├── ShowcaseDetailPage.jsx   # View showcase build
│       └── ShowcasePage.jsx         # Browse builder showcase
├── utils/
│   ├── compatibility.js         # PC part compatibility validation
│   └── helpers.js               # Utility functions (currency, dates, etc.)
├── App.jsx                      # Route definitions
├── App.css                      # App-specific styles
├── index.css                    # Global styles & design tokens
├── main.jsx                     # React entry point
└── index.html                   # HTML template

public/
├── _redirects                   # Netlify redirect rules for SPA
└── vite.svg
```

---

## Features

### Authentication

- **Register** with email & password (auto-login on success)
- **Login** with JWT token (7-day expiration)
- **Protected routes** with role-based access control (User, Builder, Admin)
- **Auto-logout** on token expiration with redirect to login
- **Persistent login** via localStorage

### PC Build System

- **Create custom builds** with real-time part selection
- **Drag-and-drop or dropdown** part selection from 8 categories:
    - CPU, GPU, Motherboard, RAM, Storage, PSU, Case, Cooling
- **Real-time compatibility checking** (12 validation rules):
    - CPU socket ↔ motherboard socket matching
    - RAM type & capacity validation
    - GPU length vs case constraints
    - Cooler socket compatibility
    - PSU wattage adequacy (with warnings)
    - And 7 more rules...
- **Visual build summary** with part images and total price
- **Save as draft** or **publish** a build
- **Edit** existing builds with re-validation

### Social Features

- **Rate builds** (1–5 stars with optional written review)
- **Comment on builds** (threaded replies supported)
- **Like builds** (toggle like status)
- **View creator info** (profile link, builder status)

### Build Requests & Offers

- **Post a build request** with budget, purpose, and notes
- **Browse active requests** from other users
- **Builders respond with offers** including fees and contact info
- **Users accept/reject offers** from builders
- **Request status tracking** (open → claimed → in_progress → completed)

### Showcase Pre-builts

- **Builders post showcase builds** (verified, pre-built systems)
- **Browse showcase catalog** with filters
- **Send inquiries** about showcase builds
- **Check availability status** (available, sold out, discontinued)

### User Profiles

- **Public profiles** with bio and avatar
- **Builder profiles** with:
    - Business name, specialization, website
    - Portfolio URL and address
    - Professional credentials
- **Profile editing** for authenticated users

### Builder Applications

- **Apply to become a builder** with application form
- **Submit portfolio & experience** (years of experience, specialization)
- **Admins review applications** with approval/rejection
- **Auto-upgrade to builder role** on approval

### Admin Panel

- **Parts management**: Create, edit, deactivate PC parts
- **Parts specifications**: Dynamic form fields based on part category
- **User management**: Ban/unban users, change roles
- **Builder applications**: Review pending applications
- **Compatibility rules**: Enable/disable/modify validation rules
- **Dashboard**: Platform stats (users, builds, parts, pending apps)

---

## User Roles & Permissions

| Action | User | Builder | Admin |
| --- | :---: | :---: | :---: |
| Register & login | ✅ | ✅ | ✅ |
| Browse pre-built PCs | ✅ | ✅ | ✅ |
| Create custom builds | ✅ | ✅ | ✅ |
| Comment, like & rate | ✅ | ✅ | ✅ |
| Post build request | ✅ | ✅ | ✅ |
| Browse requests | ✅ | ✅ | ✅ |
| Respond to requests (offers) | — | ✅ | ✅ |
| Post showcase pre-builts | — | ✅ | ✅ |
| Apply to become builder | ✅ | ✅ | ✅ |
| Manage PC parts | — | — | ✅ |
| Review applications | — | — | ✅ |
| Modify compatibility rules | — | — | ✅ |
| Ban/unban users | — | — | ✅ |
| Change user roles | — | — | ✅ |

---

## Key Pages

### Public Pages

| Page | Route | Description |
| --- | --- | --- |
| Home | `/` | Landing page with platform overview |
| Login | `/login` | Email/password login form |
| Register | `/register` | New user registration |
| Builds | `/builds` | Browse all personal & builder builds |
| Build Detail | `/builds/:id` | View build specs, comments, ratings |
| Requests | `/requests` | Browse active build requests |
| Request Detail | `/requests/:id` | View request + builder offers |
| Showcase | `/showcase` | Browse builder pre-built systems |
| Showcase Detail | `/showcase/:id` | View showcase build details |
| Profile | `/profile/:id` | View user/builder profile |

### Authenticated Pages

| Page | Route | Role | Description |
| --- | --- | --- | --- |
| Create Build | `/builds/new` | Any | Create custom build with parts |
| Edit Build | `/builds/:id/edit` | Owner/Admin | Modify existing build |
| Edit Profile | `/profile/edit` | Any | Update profile information |
| Apply Builder | `/builder/apply` | User | Submit builder application |

### Builder Pages

| Page | Route | Description |
| --- | --- | --- |
| Builder Dashboard | `/builder/dashboard` | Manage offers, requests, showcase builds |

### Admin Pages

| Page | Route | Description |
| --- | --- | --- |
| Admin Dashboard | `/admin/dashboard` | Platform stats & quick links |
| Parts | `/admin/parts` | Browse, search, filter parts |
| Add Part | `/admin/parts/new` | Create new PC part with specs |
| Edit Part | `/admin/parts/:id/edit` | Modify part details & specifications |
| Users | `/admin/users` | List, search, ban/unban, change roles |
| Applications | `/admin/applications` | Review pending builder applications |
| Rules | `/admin/rules` | Manage compatibility validation rules |

---

## Contexts & State Management

### `AuthContext.jsx`

Manages authentication state and user session.

**State:**
- `user` — Current authenticated user object (or null)
- `loading` — Initial auth check in progress
- `isAuthenticated` — Boolean flag
- `isBuilder` — True if user role is builder/admin
- `isAdmin` — True if user role is admin

**Methods:**
- `login(email, password)` — Login user
- `logout()` — Clear token and user
- `register(email, password, displayName)` — Create new account
- `refreshUser()` — Fetch updated user profile

**Usage:**
```javascript
const { user, isAuthenticated, login, logout } = useAuth();
```

### `DataContext.jsx`

Provides all data operations (CRUD) for platform resources.

**Collections:**
- `parts` — PC components
- `builds` — User & builder builds
- `build_requests` — User build requests
- `builder_offers` — Builder responses to requests
- `users` — User profiles
- `builder_profiles` — Extended builder info
- `applications` — Builder applications
- `showcase_inquiries` — Inquiries about showcase builds

**Generic Methods:**
- `getAll(collection)` — Fetch all items
- `getItemById(collection, id)` — Fetch single item
- `createItem(collection, data)` — Create item
- `editItem(collection, id, updates)` — Update item
- `removeItem(collection, id)` — Delete item

**Specialized Methods:**
- `getParts(categoryId)` — Parts by category
- `getBuilds(filters)` — Builds with filters
- `saveBuild(data, parts)` — Create/update build with compatibility check
- `addRating(buildId, data)` — Rate a build
- `addComment(buildId, data)` — Comment on build
- `toggleLike(buildId)` — Like/unlike a build
- `checkCompatibility(partsMap)` — Validate parts
- And many more...

**Usage:**
```javascript
const { getBuilds, saveBuild, addRating } = useData();
```

---

## API Integration

### Axios Client (`api/axios.js`)

- **Base URL**: Switches between dev (`http://localhost:3000/api`) and production
- **JWT Interceptor**: Automatically attaches token to all requests
- **401 Handler**: Auto-logout on expired/invalid token
- **Error Handling**: Consistent error responses

### Request/Response Flow

1. **Request** — Token attached via interceptor
2. **Response** — Data returned, errors caught
3. **401 Errors** — Token cleared, redirect to login
4. **Network Errors** — Propagated to component

### Error Handling Pattern

```javascript
try {
  const data = await someDataMethod();
  setState(data);
} catch (err) {
  setError(err.response?.data?.error || err.message);
}
```

---

## Styling

### Design System

Global styles defined in `index.css` using CSS custom properties:

**Color Palette:**
```css
--color-primary: #0891b2     /* Cyan */
--color-secondary: #f97316   /* Orange */
--color-success: #16a34a     /* Green */
--color-danger: #dc2626      /* Red */
--color-warning: #d97706     /* Amber */
```

**Spacing & Sizing:**
- Border radius: `--radius-sm` (4px) to `--radius-full` (9999px)
- Shadows: `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- Max width: `--max-width: 1200px`
- Navbar height: `--navbar-height: 64px`

### Component Classes

**Buttons:**
- `.btn` — Base styles
- `.btn--primary` — Cyan primary button
- `.btn--secondary` — Orange action button
- `.btn--success`, `.btn--danger`, `.btn--warning` — Status buttons
- `.btn--outline`, `.btn--ghost` — Alternative styles
- `.btn--small`, `.btn--large`, `.btn--block` — Size variants

**Cards:**
- `.card` — Base container
- `.card--hover` — Hover effect
- `.card__header`, `.card__body`, `.card__footer` — Sections

**Forms:**
- `.form-group` — Input wrapper
- `.form-input`, `.form-select`, `.form-textarea` — Input fields
- `.form-label`, `.form-hint`, `.form-error` — Text helpers

**Layouts:**
- `.grid`, `.grid--2`, `.grid--3`, `.grid--4` — Grid systems
- `.flex`, `.flex--between`, `.flex--center` — Flex utilities
- `.page`, `.page__header` — Page containers
- `.layout`, `.layout__main` — App layout

**Badges & Alerts:**
- `.badge`, `.badge--primary`, `.badge--success` — Status badges
- `.alert`, `.alert--error`, `.alert--success` — Alert messages

### Responsive Design

Mobile-first approach with breakpoint at `768px`:
- Stacked layouts on mobile
- Grid adjustments for smaller screens
- Touch-friendly button sizes

### Animated Background

Subtle floating shapes in the background:
- 6 animated SVG circles/blobs
- Smooth translate and rotation animations
- 15–28 second duration for organic feel

---

## Environment Configuration

### Development (`vite.config.js`)

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',  // Proxy to backend
    },
  },
})
```

### Production Deployment

The `public/_redirects` file ensures SPA routing works on Netlify:
```
/*    /index.html   200
```

### Backend URL

Toggle in `src/api/axios.js`:
```javascript
const USE_PROD_API = true;  // Switch to use production or dev
const PROD_API_BASE_URL = 'https://dbs-db.onrender.com/api';
```

---

## Available Scripts

| Command | Description |
| --- | --- |
| `pnpm run dev` | Start dev server with HMR (Vite) |
| `pnpm run build` | Build for production |
| `pnpm run preview` | Preview production build locally |
| `pnpm run lint` | Run ESLint |

---

## Compatibility Checking

The `utils/compatibility.js` module provides client-side validation (12 rules):

```javascript
checkCompatibility(selectedParts)  // Returns array of issues
// Issues: { rule, severity ('error'|'warning'), message }
```

**Rules Implemented:**
1. CPU socket ↔ motherboard socket
2. RAM type ↔ motherboard RAM type
3. RAM modules ≤ motherboard slots
4. RAM capacity ≤ motherboard max
5. Motherboard form factor ∈ case support
6. GPU length ≤ case max GPU length
7. Cooler socket ∈ CPU socket support
8. Air cooler height ≤ case max height
9. AIO radiator size ∈ case radiator support
10. PSU wattage ≥ (CPU TDP + GPU TDP) × 1.2 (warning)
11. PSU-case form factor compatibility (warning)
12. M.2 storage slots ≤ motherboard M.2 slots

Issues are displayed to users before build submission.

---

## Contributing

### Development Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes following the project structure
3. Test locally: `pnpm run dev`
4. Lint: `pnpm run lint`
5. Commit & push
6. Open PR for code review

### Code Style

- **ESLint rules** enforced (see `eslint.config.js`)
- **React Hooks** preferred over class components
- **Functional components** throughout the project
- **Context API** for state management (no Redux)

### Naming Conventions

- **Pages:** PascalCase, suffix with "Page" (`BuildDetailPage.jsx`)
- **Components:** PascalCase (`Navbar.jsx`, `ProtectedRoute.jsx`)
- **Utilities:** camelCase (`checkCompatibility`, `formatCurrency`)
- **CSS Classes:** kebab-case (`.page__header`, `.btn--primary`)

---

## Performance Considerations

- **Lazy loading** of routes via React Router
- **Conditional rendering** to minimize DOM nodes
- **Axios caching** with interceptors
- **Image optimization** (use `object-fit: contain` for product images)
- **Sticky positioning** for sidebar (build summaries)

---

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ JavaScript support required
- CSS Grid & Flexbox
- localStorage for token persistence

---

## Troubleshooting

### Login redirects to login repeatedly

- Check if `bb_token` in localStorage is valid
- Clear localStorage: `localStorage.clear()`
- Verify backend is running at the API URL

### Parts not loading in build form

- Ensure backend has seeded parts data
- Check network tab for API errors (Status 500/403)
- Verify user is authenticated

### Compatibility check always fails

- Confirm backend compatibility rules are active
- Check selected parts have all required specifications
- Review console for detailed validation errors

---

## Additional Resources

- **Backend API Docs**: See `BACKEND_README_for_reference.md`
- **React Docs**: https://react.dev
- **Vite Docs**: https://vite.dev
- **React Router Docs**: https://reactrouter.com

---

## Contributors

This is a university project for **CSX3006 Database Systems** course, developed by a team of 3 students:

### Team Members

| Name                   | Student ID | GitHub Username (Profile)                   |
|------------------------|------------|---------------------------------------------|
| Min Khaung Kyaw Swar   | 6712164    | [sasta-kro](github.com/sasta-kro)           |
| Sai Aike Shwe Tun Aung | 6712122    | [minkhaung-mkks](github.com/minkhaung-mkks) |
| Ekaterina Kazakova     | 6720065    | [Kari-Nami](github.com/Kari-Nami)           |

---


