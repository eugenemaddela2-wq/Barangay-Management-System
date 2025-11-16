@echo off
REM Test script for Barangay Management System

echo.
echo ========== TESTING COCKROACHDB CONNECTION ==========
echo.

REM Wait for server to be ready
timeout /t 2 /nobreak

echo [1/8] Testing Admin Login...
curl -X POST http://localhost:3000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}" ^
  -s | findstr "user" && echo ✓ Admin login successful || echo ✗ Admin login failed

echo.
echo [2/8] Testing Fetch Residents...
curl -X GET http://localhost:3000/api/residents ^
  -H "Content-Type: application/json" ^
  -s | findstr "Juan" && echo ✓ Residents fetched || echo ✗ Fetch failed

echo.
echo [3/8] Testing Fetch Officials...
curl -X GET http://localhost:3000/api/officials ^
  -H "Content-Type: application/json" ^
  -s | findstr "Maria" && echo ✓ Officials fetched || echo ✗ Fetch failed

echo.
echo [4/8] Testing Register New Resident...
curl -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"testuser\",\"password\":\"password123\"}" ^
  -s | findstr "testuser" && echo ✓ Registration successful || echo ✗ Registration failed

echo.
echo [5/8] Testing Submit Complaint...
curl -X POST http://localhost:3000/api/complaints ^
  -H "Content-Type: application/json" ^
  -d "{\"title\":\"Broken Street Light\",\"details\":\"Light near my house is broken\"}" ^
  -s | findstr "complaint_id" && echo ✓ Complaint submitted || echo ✗ Complaint failed

echo.
echo [6/8] Testing Fetch Complaints...
curl -X GET http://localhost:3000/api/complaints ^
  -H "Content-Type: application/json" ^
  -s | findstr "complaint_id" && echo ✓ Complaints fetched || echo ✗ Fetch failed

echo.
echo [7/8] Testing Fetch Events...
curl -X GET http://localhost:3000/api/events ^
  -H "Content-Type: application/json" ^
  -s | findstr "event_id" && echo ✓ Events fetched || echo ✗ Fetch failed

echo.
echo [8/8] Testing Health Check...
curl -X GET http://localhost:3000/api/health ^
  -s | findstr "cockroachdb" && echo ✓ Health check passed || echo ✗ Health check failed

echo.
echo ========== TEST COMPLETE ==========
echo Server is ready at: http://localhost:3000/login.html
echo Admin Panel: http://localhost:3000/admin/admin.html
