# EcoRoute AI

<div align="center">

![EcoRoute AI](https://img.shields.io/badge/EcoRoute-AI-green?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=for-the-badge&logo=typescript)

**Sustainable Travel Planner Powered by AI**

Plan your trips while minimizing your carbon footprint. Compare route options by cost, time, and CO₂ emissions with AI-powered recommendations.

[Features](#features) • [Getting Started](#getting-started) • [Tech Stack](#tech-stack) • [API Documentation](#api-documentation)

</div>

---

## ✨ Features

- 🚄 **AI-Powered Route Planning** - Get intelligent route suggestions using OpenAI GPT-4
- 🌱 **EcoScore System** - Visual badges showing environmental impact (0-100 scale)
- 📊 **Route Comparison** - Compare cost, duration, and CO₂ emissions across different transport modes
- 🔍 **Smart Search** - AI-powered search with real-time suggestions and recommendations
- 📱 **Mobile Responsive** - Fully optimized for all device sizes
- 🔐 **Authentication** - Secure user accounts with session persistence
- 💾 **Trip Management** - Save and organize your sustainable travel plans
- ⚡ **Real-time Updates** - Loading states and error handling throughout

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/pnpm/yarn
- PostgreSQL (optional, SQLite used by default for local development)
- OpenAI API key (optional, for AI features)

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd ecoroute-ai
```

2. **Install dependencies**

```bash
npm install
# or
pnpm install
# or
yarn install
```

3. **Set up environment variables**

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
DATABASE_URL="file:./prisma/dev.db"
OPENAI_API_KEY=your-openai-api-key
```

**Generate a secure NextAuth secret:**

```bash
openssl rand -base64 32
```

4. **Set up the database**

```bash
# Run migrations
npm run db:migrate

# Generate Prisma client
npm run db:generate

# Seed demo data (optional)
npm run db:seed
```

5. **Start the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Credentials

After running `npm run db:seed`, you can sign in with:

- **Email:** `demo@ecoroute.ai`
- **Password:** `password123`

## 📁 Project Structure

```
ecoroute-ai/
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API Routes (with error handling)
│   │   ├── auth/
│   │   │   ├── [...nextauth]/    # NextAuth handler
│   │   │   └── signup/           # User registration
│   │   ├── plan/                 # Trip planning with AI
│   │   ├── search-suggestions/   # AI search suggestions
│   │   └── trips/                # Trip CRUD operations
│   ├── auth/                     # Authentication pages
│   │   ├── signin/               # Sign in page
│   │   └── signup/               # Sign up page
│   ├── dashboard/                # User dashboard
│   ├── trip/[id]/                # Trip detail pages
│   ├── layout.tsx                # Root layout with ErrorBoundary
│   ├── page.tsx                  # Home page
│   └── providers.tsx             # SessionProvider wrapper
│
├── components/                   # React components
│   ├── ui/                       # ✨ Reusable UI components
│   │   ├── LoadingSpinner.tsx    # Loading spinner
│   │   ├── LoadingState.tsx      # Full loading state
│   │   ├── EmptyState.tsx        # Empty state component
│   │   └── ErrorDisplay.tsx      # Error message component
│   ├── ErrorBoundary.tsx         # React error boundary
│   ├── Header.tsx                # Navigation header
│   ├── TripForm.tsx              # Trip creation form
│   ├── ChatPanel.tsx             # Quick trip planner
│   ├── RouteCard.tsx             # Route option display
│   └── ...                       # Other components
│
├── lib/                          # Utility libraries
│   ├── auth.ts                   # NextAuth configuration
│   ├── db.ts                     # Prisma client singleton
│   ├── errors.ts                 # ✨ Error handling utilities
│   └── validators.ts             # Zod validation schemas
│
├── prisma/                       # Database
│   ├── schema.prisma             # Database schema
│   └── migrations/               # Database migrations
│
├── scripts/                      # Utility scripts
│   └── seed.ts                   # Database seeding
│
├── styles/                       # Global styles
│   └── globals.css               # Tailwind CSS imports
│
├── types/                        # TypeScript types
│   └── next-auth.d.ts           # NextAuth type extensions
│
├── middleware.ts                # Next.js middleware (auth)
├── .env.example                  # Environment variables template
├── README.md                     # This file
└── PROJECT_STRUCTURE.md          # Detailed structure documentation
```

> 💡 See `PROJECT_STRUCTURE.md` for detailed folder organization and best practices.

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Prisma ORM** - Database toolkit
- **SQLite/PostgreSQL** - Database (SQLite for dev, PostgreSQL for prod)
- **NextAuth.js** - Authentication
- **bcryptjs** - Password hashing

### AI & External Services
- **OpenAI GPT-4** - AI-powered route recommendations
- **Rate Limiting** - In-memory rate limiting for API protection

## 📡 API Documentation

### Authentication

#### `POST /api/auth/signup`
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe" // optional
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Trips

#### `GET /api/trips`
Get all trips for the authenticated user.

**Response:**
```json
{
  "trips": [
    {
      "id": "trip-id",
      "origin": "New York",
      "destination": "Boston",
      "budget": 200,
      "dateStart": "2024-01-01T00:00:00.000Z",
      "dateEnd": "2024-01-05T00:00:00.000Z",
      "options": [...]
    }
  ]
}
```

#### `POST /api/trips`
Create a new trip.

**Request Body:**
```json
{
  "origin": "New York",
  "destination": "Boston",
  "budget": 200,
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-01-05"
  }
}
```

### Trip Planning

#### `POST /api/plan`
Get AI-powered route suggestions for a trip.

**Request Body:**
```json
{
  "origin": "New York",
  "destination": "Boston",
  "budget": 200
}
```

**Response:**
```json
{
  "options": [
    {
      "mode": "train",
      "cost": 85,
      "durationMins": 420,
      "co2Kg": 41.2,
      "ecoScore": 85,
      "notes": "Eco-friendly high-speed rail with scenic views"
    }
  ]
}
```

### Search Suggestions

#### `GET /api/search-suggestions?q=query`
Get AI-powered search suggestions.

**Query Parameters:**
- `q` (required): Search query (min 2 characters)

**Response:**
```json
{
  "suggestions": [
    {
      "id": "suggestion-id",
      "label": "New York → Boston (train)",
      "origin": "New York",
      "destination": "Boston",
      "description": "Eco-friendly high-speed rail"
    }
  ]
}
```

## 🧪 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run db:migrate` | Run database migrations |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:seed` | Seed database with demo data |

## 🔒 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXTAUTH_URL` | Application URL | Yes | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Secret for JWT signing | Yes | - |
| `DATABASE_URL` | Database connection string | Yes | `file:./prisma/dev.db` |
| `OPENAI_API_KEY` | OpenAI API key for AI features | No | `sk-placeholder` |
| `NODE_ENV` | Environment mode | No | `development` |

## 🐛 Troubleshooting

### Database Connection Issues

**Problem:** Prisma cannot connect to database

**Solution:**
- Verify `DATABASE_URL` is correct
- For PostgreSQL: Ensure the database exists and is running
- For SQLite: Ensure the file path is correct and writable
- Run `npm run db:generate` after changing schema

### Authentication Issues

**Problem:** Sessions not persisting

**Solution:**
- Verify `NEXTAUTH_SECRET` is set and not empty
- Ensure `NEXTAUTH_URL` matches your application URL
- Check browser console for errors
- Clear cookies and try again

### OpenAI API Issues

**Problem:** AI features not working

**Solution:**
- Verify `OPENAI_API_KEY` is set correctly
- Check API key has sufficient credits
- Review rate limiting logs
- Application will fallback to mock data if API fails

### Build Errors

**Problem:** TypeScript or build errors

**Solution:**
- Run `npm run db:generate` to regenerate Prisma types
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check `tsconfig.json` configuration

## 🎨 Error Handling

The application includes comprehensive error handling throughout:

### Backend Error Handling
- **Custom Error Classes** (`lib/errors.ts`) - `AppError`, `ValidationError`, `AuthenticationError`, `NotFoundError`
- **Consistent API Responses** - All API routes use `handleApiError()` for uniform error formatting
- **Input Validation** - Zod schemas validate all inputs with clear error messages
- **Error Logging** - All errors logged to console for debugging
- **Status Codes** - Proper HTTP status codes (400, 401, 404, 500, 503)

### Frontend Error Handling
- **Error Boundaries** - `ErrorBoundary` component catches React errors
- **ErrorDisplay Component** - Consistent error UI with retry functionality
- **Loading States** - Visual feedback during async operations
- **Empty States** - Helpful messages when no data exists
- **Timeout Protection** - Request timeouts with AbortController (30s for planning, 15s for saving)
- **Network Error Detection** - Handles connection issues gracefully

### Error Handling Coverage
- ✅ API route error handling
- ✅ Form validation errors
- ✅ Network errors and timeouts
- ✅ Authentication errors
- ✅ Database errors
- ✅ OpenAI API errors (rate limits, auth failures)
- ✅ React component errors
- ✅ Loading states for all async operations
- ✅ Empty states for all data views

See `PROJECT_STRUCTURE.md` for detailed error handling patterns and best practices.

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

<div align="center">

Made with ❤️ for sustainable travel

</div>
