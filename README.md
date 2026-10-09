# MERN Auth & File Manager

A MERN stack application with secure authentication and file management.

## Features

- User Signup and Login
- JWT Authentication
- Forgot and Reset Password via Email
- Protected Dashboard
- Upload TXT, JSON, and HTML Files
- Convert File Formats
- View and Edit Files
- Rename, Download, and Delete Files
- Secure User-Specific File Access

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Authentication:** JWT, bcrypt

## Installation

**1. Clone the repository**

```bash
git clone YOUR_REPOSITORY_URL
cd mern-auth-file-manager
```

**2. Install backend dependencies**

```bash
cd backend
npm install
```

**3. Install frontend dependencies**

```bash
cd ../frontend
npm install
```

Configure the required environment variables in the backend `.env` file and start the frontend and backend using their configured npm scripts.

## Security

- Passwords are hashed.
- Protected routes require authentication.
- Users can access only their own files.
- File uploads are limited to supported formats and sizes.
