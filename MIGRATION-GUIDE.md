# Server Migration Guide

## Overview
This guide will help you migrate the Student Reports App to a new server.

## What You Have

### 1. Database Backup
- **Location**: `backend/database-backup/`
- **Latest backup**: `database-backup-2026-02-10T15-16-32-339Z.json`
- **Total records**: 1,604 records
- **Includes**:
  - 13 users
  - 25 groups
  - 60 students
  - 146 lessons
  - 632 attendance records
  - 313 completed lessons
  - And all other data (grades, criteria, schedule slots, etc.)

### 2. Source Code
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Prisma + PostgreSQL
- **Current deployment**: Vercel (serverless functions)

## Migration Steps

### Step 1: Prepare New Database

1. Create a new PostgreSQL database on your new server or use a cloud provider (Supabase, Railway, etc.)

2. Get your new database connection string in this format:
   ```
   postgresql://username:password@host:port/database?schema=public
   ```

### Step 2: Backend Migration

1. Copy the entire `backend` folder to your new server

2. Create a `.env` file in the backend directory with the following variables:

   ```env
   # Database Connection
   DATABASE_URL="postgresql://username:password@host:port/database?schema=public"

   # JWT Secret (generate a new random string for production)
   JWT_SECRET="your-secret-key-here"

   # Node Environment
   NODE_ENV=production
   ```

3. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

4. Initialize the database schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Import your data:
   ```bash
   node import-database.js database-backup/database-backup-2026-02-10T15-16-32-339Z.json
   ```

6. Verify the import:
   ```bash
   npx prisma studio
   ```
   This will open a web interface to browse your data.

### Step 3: Frontend Migration

1. Copy the entire `frontend` folder to your new server

2. Create a `.env` file in the frontend directory:

   ```env
   # API URL (update with your new backend URL)
   VITE_API_URL=http://your-new-server.com/api
   # Or if running locally: http://localhost:3000/api
   ```

3. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

4. Build the frontend:
   ```bash
   npm run build
   ```
   This creates a `dist` folder with the production build.

### Step 4: Deployment Options

#### Option A: Deploy Both on Same Server (Node.js)

1. Install PM2 for process management:
   ```bash
   npm install -g pm2
   ```

2. Start the backend:
   ```bash
   cd backend
   pm2 start npm --name "student-reports-backend" -- start
   ```

3. Serve frontend with nginx or a static file server

#### Option B: Keep Vercel for Backend

1. Update your backend environment variables in Vercel dashboard with new DATABASE_URL

2. Redeploy backend:
   ```bash
   cd backend
   vercel --prod
   ```

3. Update frontend `.env` with new Vercel backend URL

4. Build and deploy frontend to any static hosting (Netlify, Vercel, etc.)

#### Option C: Full Docker Deployment

1. Use provided Docker configuration (if available)

2. Update environment variables in docker-compose.yml

3. Run:
   ```bash
   docker-compose up -d
   ```

### Step 5: Verify Migration

1. **Test Authentication**: Try logging in with existing user credentials

2. **Check Data**:
   - View groups and students
   - Check homework/lessons (should see all 146 lessons)
   - Verify grades and attendance records
   - Test "Glasses" (Points & Badges) feature

3. **Test Functionality**:
   - Create a new lesson
   - Mark attendance
   - Add grades
   - Create a new student report

## Important Files to Transfer

### Backend
- `schema.prisma` - Database schema
- `prisma/` - Prisma configuration
- `api/` - All API endpoints
- `.env` - Environment variables (create new with new credentials)
- `database-backup/` - Your database export

### Frontend
- `src/` - All source code
- `public/` - Static assets (including badge images like rookie-cat.png)
- `.env` - Environment variables (update API URL)
- `package.json` - Dependencies

## Environment Variables Reference

### Backend `.env`
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
NODE_ENV=production
PORT=3000
```

### Frontend `.env`
```env
VITE_API_URL=http://your-backend-url.com/api
```

## Troubleshooting

### Issue: "Column does not exist" errors
**Solution**: Make sure you ran `npx prisma db push` after copying the schema

### Issue: Frontend can't connect to backend
**Solution**: Check CORS settings in backend and verify VITE_API_URL in frontend

### Issue: Import fails with foreign key errors
**Solution**: The import script respects dependencies. If it fails, check that your schema matches the backup

### Issue: Images not loading
**Solution**: Make sure all files from `frontend/public/` are copied, especially:
- `rookie-cat.png`
- Any other badge or icon images

## Rollback Plan

If something goes wrong:
1. Keep your original database running until migration is verified
2. You have the backup JSON file for emergency restore
3. Keep the old Vercel deployment active until new server is stable

## Security Checklist

- [ ] Generate new JWT_SECRET (don't reuse old one)
- [ ] Use strong database password
- [ ] Enable SSL for database connection
- [ ] Set up firewall rules on new server
- [ ] Use HTTPS for production deployment
- [ ] Back up the database regularly on new server

## Support

If you encounter issues:
1. Check console logs: `pm2 logs student-reports-backend` (if using PM2)
2. Check Prisma Studio: `npx prisma studio`
3. Verify environment variables are set correctly
4. Check database connection with: `npx prisma db pull`

---

## Quick Reference: Full Migration Commands

```bash
# On new server - Backend
cd backend
npm install
npx prisma generate
npx prisma db push
node import-database.js database-backup/database-backup-2026-02-10T15-16-32-339Z.json

# On new server - Frontend
cd frontend
npm install
npm run build

# Verify
cd backend
npx prisma studio  # Browse data in web interface
```

---

**Backup Created**: 2026-02-10
**Total Records**: 1,604
**Status**: Ready for migration
