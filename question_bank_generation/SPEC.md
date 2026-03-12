# Faculty Assessment System - Specification

## 1. Project Overview
- **Project Name**: Faculty Assessment System
- **Type**: Web Application (React + Firebase)
- **Core Functionality**: Authentication system for faculty with course selection dashboard
- **Target Users**: Faculty members (Professors) for assessment/question bank generation

## 2. UI/UX Specification

### Layout Structure
- **Authentication Page**: Centered card-based layout with toggle between Sign In/Sign Up
- **Selection Dashboard**: Full-page layout with centered card containing three dependent dropdowns
- **Responsive Breakpoints**: Mobile-first design (640px, 768px, 1024px)

### Visual Design
- **Color Palette**:
  - Primary: Indigo (#4F46E5)
  - Secondary: Slate (#64748B)
  - Background: Slate-50 (#F8FAFC)
  - Card Background: White (#FFFFFF)
  - Error: Red (#EF4444)
  - Success: Green (#10B981)
- **Typography**: 
  - Font: Inter (from Google Fonts)
  - Headings: Bold, Indigo
  - Body: Regular, Slate
- **Spacing**: 8px base unit (Tailwind default)
- **Visual Effects**: 
  - Card shadows: shadow-xl
  - Hover transitions: 200ms ease-in-out
  - Loading spinner: Animated indigo ring

### Components
1. **AuthForm**
   - Toggle switch (Sign In / Sign Up)
   - Email input with validation
   - Password input (Sign Up only)
   - Submit button with loading state
   - Error message display
   - Passwordless sign-in option (send verification link)

2. **SelectionDashboard**
   - Header with user email display
   - Branch dropdown (CSE, ECE, etc.)
   - Semester dropdown (1-8, filtered by branch)
   - Subject dropdown (filtered by branch and semester)
   - Proceed button (disabled until all selected)
   - Sign Out button

3. **LoadingSpinner**
   - Centered animated spinner
   - Used during auth and data loading

## 3. Functionality Specification

### Authentication Features
- Firebase Email/Password authentication
- Passwordless sign-in with email verification link
- Toggle between Sign In and Sign Up modes
- Loading spinner during authentication
- Error handling for invalid emails and failed auth
- Persistent auth state (auto-login on refresh)

### Selection Dashboard Features
- Three dependent dropdowns:
  - **Branch**: CSE, ECE (extensible)
  - **Semester**: 1-8 (filtered by selected branch)
  - **Subject**: Dynamic list from Firestore (filtered by branch + semester)
- Proceed button disabled until all fields selected
- Store user selection in local state

### Data Schema (Firestore)
```
Collection: branches
  Document: CSE
    - name: "Computer Science & Engineering"
    - semesters: [1, 2, 3, 4, 5, 6, 7, 8]

Collection: subjects
  Document: {branch}_{sem} (e.g., "CSE_6")
    - branch: "CSE"
    - semester: 6
    - subjects: ["Deep Learning", "NLP", "ML", ...]

Collection: faculty
  Document: {uid}
    - email: "professor@college.edu"
    - branch: "CSE"
    - role: "Professor"
```

## 4. Acceptance Criteria

### Authentication
- [ ] User can toggle between Sign In and Sign Up
- [ ] Valid email format is required
- [ ] Loading spinner appears during authentication
- [ ] Error messages display for invalid credentials
- [ ] Successful auth redirects to Selection Dashboard
- [ ] User can sign out

### Selection Dashboard
- [ ] Branch dropdown shows all available branches
- [ ] Semester dropdown populates based on selected branch
- [ ] Subject dropdown populates based on branch + semester
- [ ] Proceed button is disabled until all selections made
- [ ] User email displayed in header

### UI/UX
- [ ] Clean, professional EdTech appearance
- [ ] White/Indigo/Slate color scheme
- [ ] Card-based centered layout
- [ ] Responsive on all screen sizes
- [ ] Smooth transitions and hover effects
