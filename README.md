# Persona AI Link

A modern AI-powered chat application with flexible database deployment options.

## Project info

**URL**: https://lovable.dev/projects/2ebd4d66-faf6-4784-aa07-e0d52fbb6bba

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/2ebd4d66-faf6-4784-aa07-e0d52fbb6bba) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Database Deployment Options

Persona AI Link supports multiple database deployment scenarios:

### 1. Containerized Database (Default)
**Best for**: Complete containerized solution with no external dependencies

```bash
# Start with containerized SQL Server
docker-compose up -d
```

### 2. External Database
**Best for**: Using existing SQL Server instances

```bash
# 1. Configure external database settings in .env
EXTERNAL_DB_HOST=your-sql-server-host
EXTERNAL_DB_USER=your-username
EXTERNAL_DB_PASSWORD=your-password

# 2. Initialize database schema (if needed)
node scripts/setup-external-database.js

# 3. Start application with external database
docker-compose -f docker-compose.external-db.yml up -d
```

### 3. Local Development
**Best for**: Direct development without containers

```bash
# Backend
cd backend
npm install
npm start

# Frontend (in another terminal)
npm install
npm run dev
```

📖 **Detailed Guide**: See [Database Deployment Options](docs/database-deployment-options.md) for comprehensive setup instructions.

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js & npm (for local development)
- SQL Server (for external database option)

### Environment Setup

1. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Configure database settings** in `.env`:
   - For containerized: Use default `DB_*` variables
   - For external: Update `EXTERNAL_DB_*` variables

3. **Start the application**:
   ```bash
   # Containerized database
   docker-compose up -d
   
   # OR External database
   docker-compose -f docker-compose.external-db.yml up -d
   ```

4. **Access the application**:
   - Frontend: http://localhost:8090
- Backend API: http://localhost:3006

## How can I deploy this project?

### Docker Deployment

**Production with containerized database**:
```bash
docker-compose up -d
```

**Production with external database**:
```bash
docker-compose -f docker-compose.external-db.yml up -d
```

### Lovable Platform

Simply open [Lovable](https://lovable.dev/projects/2ebd4d66-faf6-4784-aa07-e0d52fbb6bba) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
