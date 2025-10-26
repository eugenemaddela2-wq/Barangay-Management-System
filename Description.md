# Barangay Management System

## Overview
A comprehensive web-based management system for Barangay (village) administration. This system allows managing residents, documents, events, officials, complaints, and users through an intuitive web interface.

**Status:** Fully operational and running on Replit
**Last Updated:** October 25, 2025

## Features
- **Resident Management:** Add, edit, view, and delete resident records
- **Document Management:** Track and manage barangay documents (clearances, certificates, permits)
- **Event Management:** Schedule and manage community events
- **Officials Management:** Maintain records of barangay officials
- **Complaints Management:** Track and handle resident complaints
- **User Management:** Admin can manage user accounts and roles
- **Data Import/Export:** Backup and restore system data
- **Role-Based Access:** Separate user and admin interfaces

## Project Structure
```
.
├── public/                    # Frontend static files
│   ├── css/                  # Stylesheets
│   ├── js/                   # JavaScript files
│   ├── admin/                # Admin panel
│   │   ├── admin.html
│   │   └── admin.js
│   ├── Javascript_User_&_admin/  # Shared scripts
│   │   └── script.js
│   ├── index.html            # Main landing page
│   ├── login.html            # Login page
│   ├── home.html             # User dashboard
│   ├── residents.html        # Residents management
│   ├── documents.html        # Documents management
│   ├── events.html           # Events management
│   ├── officials.html        # Officials management
│   ├── complaints.html       # Complaints management
│   └── profile.html          # User profile
├── src/                      # Original source files (backup)
│   └── db/
│       └── create_tables.sql # Database schema
├── server.js                 # Express backend server
├── package.json              # Node.js dependencies
└── .gitignore               # Git ignore rules

```

## Technology Stack
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** Node.js, Express.js
- **Data Storage:** Browser localStorage (with backend API ready for database integration)
- **Server:** Express static file server
- **Icons:** Font Awesome 6.5.0
- **Fonts:** Google Fonts (Roboto)

## Database Schema
The project includes SQL schema for PostgreSQL database with the following tables:
- `residents` - Resident information
- `documents` - Document records
- `officials` - Barangay officials
- `events` - Community events
- `complaints` - Resident complaints (future feature)
- `users` - User authentication and roles

*Note: Currently using in-memory storage on the backend. The database schema is available in `src/db/create_tables.sql` for future PostgreSQL integration.*

## Default Users
For testing purposes, the following default users are available:

**Admin Users:**
- Username: `admin1`, Password: `adminpass1`
- Username: `admin2`, Password: `adminpass2`

**Regular User:**
- Username: `demo`, Password: `demopass`

*You can also register new users through the login page.*

## Recent Changes
### October 25, 2025
- Initial setup and import from GitHub repository
- Reorganized project structure for Replit environment
- Created Express.js backend server
- Configured static file serving from `/public` directory
- Fixed asset path references in HTML files
- Set up workflow to run on port 5000
- Added REST API endpoints for future database integration
- Created comprehensive documentation

## Running the Application
The application runs automatically on Replit. The server is configured to:
- Listen on `0.0.0.0:5000`
- Serve static files from the `public/` directory
- Provide REST API endpoints at `/api/*`

**Command:** `npm start`

## API Endpoints (Ready for Database Integration)
- `GET /api/:collection` - Get all items from a collection
- `GET /api/:collection/:id` - Get a specific item
- `POST /api/:collection` - Create a new item
- `PUT /api/:collection/:id` - Update an item
- `DELETE /api/:collection/:id` - Delete an item
- `POST /api/login` - User login
- `POST /api/register` - User registration
- `GET /api/export` - Export all data
- `POST /api/import` - Import data

*Currently, these endpoints use in-memory storage. They are ready to be connected to PostgreSQL when database is set up.*

## User Preferences
None specified yet.

## Future Enhancements
- Connect backend API to PostgreSQL database
- Add password hashing with bcrypt
- Implement session management
- Add search and filtering functionality
- Implement pagination for large datasets
- Add file upload for documents
- Create mobile-responsive design improvements
- Add data validation and error handling
- Implement real-time notifications
- Add reporting and analytics features

## Deployment
The application is configured for Replit deployment using:
- **Deployment Type:** Autoscale (stateless web application)
- **Build Command:** None required (static files + Node.js runtime)
- **Run Command:** `npm start`
- **Port:** 5000

## Notes
- The application uses browser localStorage for data persistence
- Data is stored per browser session and will reset on cache clear
- Admin access requires logging in with an admin account
- Import/Export functionality allows data backup and migration
- The system is designed to be easily upgraded to use PostgreSQL database
