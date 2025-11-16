# CockroachDB Setup Guide

Your system is now configured to use **CockroachDB** for data storage. This guide shows how to initialize and test your connection.

## Your CockroachDB Details

**Connection String (in `.env`):**
```
postgresql://eugene:27m8P_yAypqR4I_2xKbsEQ@pond-hyena-18485.j77.aws-ap-southeast-1.cockroachlabs.cloud:26257/BMS_db?sslmode=verify-full
```

- **Cluster:** pond-hyena-18485.j77.aws-ap-southeast-1.cockroachlabs.cloud
- **Database:** BMS_db
- **User:** eugene
- **Region:** AWS AP Southeast 1

## Step 1: Test Connection

Before initializing the database, verify you can connect:

```powershell
node db/test-connection.js
```

**Expected Output:**
```
✓ Connection successful!
✓ Query successful! Current time: 2025-11-17 10:30:45.123456
✓ Tables found:
  - (will be empty if database is new)
✓ All tests passed!
```

**If it fails:**
- Check your internet connection
- Verify `.env` has `DATABASE_URL`
- Ensure CockroachDB cluster is running (check CockroachDB console)
- Verify your IP is whitelisted in CockroachDB (Settings → SQL User → Networking)

## Step 2: Initialize Database Schema

Once connection is verified, create all tables:

```powershell
node db/setup.js
```

**Expected Output:**
```
✓ Connected to CockroachDB
Executing: CREATE TYPE user_role AS ENUM...
✓ OK
Executing: CREATE TABLE IF NOT EXISTS users...
✓ OK
... (more tables)
✓ Admin user created/verified (username: admin, password: admin123)
Users in database: [ { user_id: 1, username: 'admin', role: 'admin' } ]
✓ Database setup complete!
```

## Step 3: Start the Server

Now your server can connect to CockroachDB:

```powershell
npm install
node server.js
```

**Expected Output:**
```
Server started on port 3000
```

## Step 4: Test Admin Login

Use this PowerShell command to test the login endpoint:

```powershell
$body = @{ username = "admin"; password = "admin123" }
$response = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method Post -ContentType 'application/json' -Body ($body | ConvertTo-Json)
$response | Format-List
```

**Expected Output:**
```
user : @{user_id=1; username=admin; role=admin; created_at=2025-11-17T10:30:45Z}
token : eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 5: Access the Admin Panel

1. Open browser: `http://localhost:3000`
2. Go to `login.html`
3. Login with:
   - **Username:** admin
   - **Password:** admin123
4. You'll have access to the **Admin Panel** at `http://localhost:3000/admin/admin.html`

## Admin Panel Features

- **Manage Residents:** Add, edit, delete residents
- **Manage Officials:** Add, edit, delete officials
- **Manage Events:** Create and manage events
- **Manage Documents:** Manage resident documents
- **Manage Complaints:** Handle resident complaints
- **Manage Users:** Create/delete users with different roles

## Data Flow

```
Frontend (HTML/JS)
     ↓
[login.html] → admin credentials
     ↓
[server.js] → /api/auth/login → verify in CockroachDB
     ↓
[CockroachDB] → returns admin user record
     ↓
[server.js] → generates JWT token
     ↓
[login.html] → stores token in localStorage
     ↓
[admin/admin.html] → authenticated API calls with token
     ↓
[server.js] → protected endpoints check role='admin'
     ↓
[CockroachDB] → CREATE/READ/UPDATE/DELETE operations
```

## API Endpoints (Admin Use)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/login` | POST | Admin login |
| `/api/residents` | GET/POST/PUT/DELETE | Manage residents |
| `/api/officials` | GET/POST/PUT/DELETE | Manage officials |
| `/api/events` | GET/POST/PUT/DELETE | Manage events |
| `/api/documents` | GET/POST/PUT/DELETE | Manage documents |
| `/api/complaints` | GET/POST/PUT/DELETE | Manage complaints |
| `/api/users` | GET/POST/DELETE | Admin: manage users |

## Resident Flow

1. Resident visits `http://localhost:3000`
2. Goes to `login.html` and registers/logs in
3. Gets redirected to dashboard
4. Can view residents, officials, events, documents
5. Can submit complaints
6. Cannot access admin panel (role check blocks them)

## Troubleshooting

### Issue: "Connection refused"
- Check if server is running: `node server.js`
- Check if port 3000 is available

### Issue: "DATABASE_URL not found"
- Verify `.env` file exists in project root
- Ensure `DATABASE_URL` is set correctly

### Issue: "Invalid credentials" on admin login
- Verify admin user was created: `node db/setup.js`
- Default credentials:
  - Username: `admin`
  - Password: `admin123`

### Issue: "Table already exists" during setup
- This is normal if you run setup.js multiple times
- Tables are created with `IF NOT EXISTS`

## Next Steps

1. ✅ Test connection: `node db/test-connection.js`
2. ✅ Setup database: `node db/setup.js`
3. ✅ Start server: `node server.js`
4. ✅ Test admin login at `http://localhost:3000/login.html`
5. Access admin panel: `http://localhost:3000/admin/admin.html`

---

**Your database is now connected to CockroachDB and ready for admin and resident data management!**
