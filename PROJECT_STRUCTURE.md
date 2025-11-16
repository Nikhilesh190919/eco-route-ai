# EcoRoute AI - Project Structure

## 📁 Folder Organization

```
ecoroute-ai/
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API Routes
│   │   ├── auth/
│   │   │   ├── [...nextauth]/    # NextAuth handler
│   │   │   │   └── route.ts
│   │   │   └── signup/           # User registration endpoint
│   │   │       └── route.ts
│   │   ├── plan/                 # Trip planning endpoint
│   │   │   └── route.ts
│   │   ├── search-suggestions/   # AI search suggestions
│   │   │   └── route.ts
│   │   └── trips/                # Trip CRUD operations
│   │       └── route.ts
│   ├── auth/                     # Authentication pages
│   │   ├── signin/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── dashboard/                # User dashboard
│   │   └── page.tsx
│   ├── trip/                     # Trip detail pages
│   │   └── [id]/
│   │       └── page.tsx
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout with ErrorBoundary
│   ├── page.tsx                  # Home page
│   └── providers.tsx             # SessionProvider wrapper
│
├── components/                   # React components
│   ├── ui/                       # Reusable UI components
│   │   ├── EmptyState.tsx        # Empty state component
│   │   ├── ErrorDisplay.tsx      # Error message component
│   │   ├── LoadingSpinner.tsx    # Loading spinner
│   │   └── LoadingState.tsx      # Full loading state
│   ├── ErrorBoundary.tsx         # React error boundary
│   ├── Header.tsx                # Navigation header
│   ├── TripForm.tsx              # Trip creation form
│   ├── ChatPanel.tsx             # Quick trip planner
│   ├── RouteCard.tsx             # Route option display
│   ├── EcoScoreBadge.tsx         # EcoScore visual badge
│   ├── DashboardClient.tsx       # Dashboard client component
│   ├── SearchBar.tsx             # Search component
│   ├── TripSearchBar.tsx         # AI-powered search bar
│   ├── TripSearchBarWrapper.tsx  # Search bar wrapper
│   ├── HomePageClient.tsx        # Home page client wrapper
│   └── HomePageWrapper.tsx       # Home page form wrapper
│
├── lib/                          # Utility libraries
│   ├── auth.ts                   # NextAuth configuration
│   ├── db.ts                     # Prisma client singleton
│   ├── errors.ts                 # Error handling utilities
│   └── validators.ts             # Zod validation schemas
│
├── prisma/                       # Database
│   ├── schema.prisma             # Database schema
│   ├── migrations/               # Database migrations
│   └── dev.db                    # SQLite database (dev)
│
├── scripts/                      # Utility scripts
│   └── seed.ts                   # Database seeding script
│
├── styles/                       # Global styles
│   └── globals.css               # Tailwind CSS imports
│
├── types/                        # TypeScript type definitions
│   └── next-auth.d.ts           # NextAuth type extensions
│
├── middleware.ts                 # Next.js middleware (auth)
├── .env.example                  # Environment variables template
├── README.md                     # Project documentation
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── next.config.mjs               # Next.js configuration
└── postcss.config.js             # PostCSS configuration
```

## 🎯 Component Organization

### UI Components (`components/ui/`)
Reusable, presentational components used throughout the app:
- **LoadingSpinner** - Animated spinner with size options
- **LoadingState** - Full-page or section loading state
- **EmptyState** - Empty state with icon, title, description, and action
- **ErrorDisplay** - Error message with retry functionality

### Feature Components (`components/`)
Business logic components:
- **TripForm** - Trip creation with planning and saving
- **ChatPanel** - Quick trip planner
- **RouteCard** - Route option display with EcoScore
- **DashboardClient** - Dashboard with search functionality
- **Header** - Navigation with session management

## 🔧 Library Organization

### Error Handling (`lib/errors.ts`)
Centralized error handling system:
- `AppError` - Base error class
- `ValidationError` - Validation failures
- `AuthenticationError` - Auth failures
- `NotFoundError` - Resource not found
- `handleApiError()` - Consistent API error formatting

### Validation (`lib/validators.ts`)
Zod schemas for all form inputs:
- `signinSchema` - Sign in form
- `signupSchema` - Sign up form
- `planSchemaEnhanced` - Trip planning
- `createTripSchemaEnhanced` - Trip creation

## 🛡️ Error Handling Strategy

### Backend (API Routes)
1. **Input Validation** - Zod schemas validate all inputs
2. **Custom Error Classes** - Use `lib/errors.ts` utilities
3. **Consistent Responses** - `handleApiError()` formats all errors
4. **Error Logging** - Console errors for debugging
5. **Status Codes** - Proper HTTP status codes (400, 401, 404, 500, 503)

### Frontend (Components)
1. **Error Boundaries** - Catch React component errors
2. **Loading States** - Visual feedback during operations
3. **ErrorDisplay Component** - Consistent error UI
4. **Empty States** - Helpful messages when no data
5. **Timeout Handling** - Request timeouts with AbortController
6. **Network Error Detection** - Handle connection issues

### Pages
1. **Try-Catch Blocks** - Wrap all async operations
2. **ErrorDisplay Component** - Show user-friendly errors
3. **Loading States** - Show loading indicators
4. **Empty States** - Show when no data exists

## 📝 API Route Error Handling

All API routes follow this pattern:
```typescript
export async function POST(req: NextRequest) {
  try {
    // Validation
    // Business logic
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
```

## 🎨 Component Error Handling

All components follow this pattern:
```typescript
try {
  // API call with timeout
  const res = await fetch('/api/endpoint', {
    signal: controller.signal,
  });
  // Handle response
} catch (error) {
  // Show ErrorDisplay with retry option
}
```

## 📊 Error Handling Coverage

### ✅ Covered Areas
- [x] API route error handling
- [x] Form validation errors
- [x] Network errors
- [x] Timeout errors
- [x] Authentication errors
- [x] Database errors
- [x] OpenAI API errors
- [x] React component errors (ErrorBoundary)
- [x] Loading states
- [x] Empty states

### 📍 Error Handling Locations

**API Routes:**
- `/api/trips` - Full error handling with custom errors
- `/api/plan` - Validation, OpenAI errors, timeouts
- `/api/search-suggestions` - Rate limiting, OpenAI errors
- `/api/auth/signup` - Validation, duplicate email handling

**Pages:**
- `/dashboard` - Try-catch, ErrorDisplay, EmptyState
- `/trip/[id]` - Try-catch, ErrorDisplay, EmptyState
- `/auth/signin` - Form validation errors
- `/auth/signup` - Form validation errors

**Components:**
- `TripForm` - Planning errors, saving errors, timeouts
- `ChatPanel` - Planning errors, timeouts
- `DashboardClient` - Search errors, loading states
- `SearchBar` - Network errors, API errors
- `TripSearchBar` - Network errors, API errors

## 🚀 Best Practices

1. **Always use try-catch** for async operations
2. **Use custom error classes** for consistent error handling
3. **Show user-friendly messages** - Never expose internal errors
4. **Provide retry options** - Allow users to retry failed operations
5. **Log errors** - Console.error for debugging
6. **Handle timeouts** - Prevent hanging requests
7. **Validate inputs** - Use Zod schemas
8. **Show loading states** - Give visual feedback
9. **Use ErrorBoundary** - Catch React errors
10. **Empty states** - Guide users when no data exists

