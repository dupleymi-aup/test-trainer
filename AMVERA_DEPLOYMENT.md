# Deploy to Amvera Cloud

## Quick Start

1. Create an account at [Amvera Cloud](https://cloud.amvera.com)
2. Create a new application (Node.js or Docker)
3. Set environment variables (see below)
4. Push to your Git repository — Amvera auto-deploys

## Option 1: PaaS Deployment (Recommended)

Amvera's native Node.js platform. Uses `amvera.yaml` for configuration.

### Environment Variables

Set these in Amvera Cloud Console → Application → Environment Variables:

```
DB_TYPE=postgres
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<dbname>?schema=public
NEXTAUTH_SECRET=<random-64-char-string>
NEXTAUTH_URL=https://<your-app>.amvera.app
NODE_ENV=production
LOG_LEVEL=warn
```

Optional (for email notifications):
```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your-password
SMTP_FROM=TestTrainer <noreply@your-domain.com>
```

### How It Works

- `amvera.yaml` tells Amvera to use Node.js 22 with npm
- `npm run build` generates Prisma client, builds Next.js standalone output
- `npm run start` runs the production server on port 3000
- `/data` mount persists SQLite database (if using SQLite instead of PostgreSQL)

### Database

**PostgreSQL (recommended for production):**
- Amvera provides managed PostgreSQL
- Set `DB_TYPE=postgres` and `DATABASE_URL` accordingly
- Migrations run automatically on startup

**SQLite (simple setup):**
- Set `DB_TYPE=sqlite`
- Data persists via `/data` mount
- Good for small deployments and testing

## Option 2: Docker Deployment

For full control over the runtime environment.

### Setup

1. In Amvera Cloud Console, create a new application with **Docker** type
2. Point to your Git repository
3. Amvera will use the `Dockerfile` in the repo root

### Environment Variables

Same as Option 1, plus:

```
MONGODB_URI=mongodb://<host>:27017/<dbname>
```

### How It Works

The `Dockerfile` uses multi-stage build:
1. **deps** — installs npm dependencies
2. **builder** — generates Prisma client, runs `next build`
3. **runner** — minimal production image with standalone output

## Database Setup

### PostgreSQL on Amvera

1. Create a PostgreSQL instance in Amvera Console
2. Copy the connection string to `DATABASE_URL`
3. The app runs migrations automatically on first start

### Initial Seed (optional)

After first deploy, seed the database:

```bash
# Connect to your app's container via Amvera Console terminal
npm run db:seed
```

This creates:
- Admin: `admin@testtrainer.local` / `Admin123!`
- Teacher: `teacher@testtrainer.local` / `Teacher123!`
- Student: `student@testtrainer.local` / `Student123!`

## Generating NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Or use any random string generator — minimum 32 characters.

## Custom Domain

1. In Amvera Console → Application → Domain Settings
2. Add your custom domain
3. Update `NEXTAUTH_URL` to match: `https://your-domain.com`
4. SSL certificates are provisioned automatically

## Troubleshooting

### Build fails with Prisma errors
- Ensure `DB_TYPE` is set before build
- Check that PostgreSQL is accessible from the build environment

### Application crashes on start
- Check logs in Amvera Console → Application → Logs
- Verify all required environment variables are set
- Ensure `NEXTAUTH_SECRET` is at least 32 characters

### Database connection refused
- Verify `DATABASE_URL` format: `postgresql://user:pass@host:port/dbname?schema=public`
- Check that the PostgreSQL instance is running and accessible

### Static assets not loading
- The build script copies `public/` and `.next/static/` to the standalone output
- If assets are missing, rebuild with `npm run build`
