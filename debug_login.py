#!/usr/bin/env python3
"""
Debug script to test login functionality and database connection
"""
import requests
import json
import mysql.connector
import os

def test_database_connection():
    """Test if we can connect to the database"""
    try:
        db_config = {
            "host": os.getenv("DB_HOST", "localhost"),
            "user": os.getenv("DB_USER", "root"),
            "password": os.getenv("DB_PASS", "pass"),
            "database": os.getenv("DB_NAME", "pptbot"),
        }
        
        print(f"🔍 Testing database connection with config: {db_config}")
        
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        # Test if users table exists and has data
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print(f"✅ Database connected! Tables: {[t[0] for t in tables]}")
        
        # Check if users table exists
        cursor.execute("SELECT COUNT(*) as count FROM users")
        user_count = cursor.fetchone()
        print(f"👥 Users in database: {user_count['count']}")
        
        # Show sample users
        cursor.execute("SELECT user_id, username, email, role FROM users LIMIT 3")
        users = cursor.fetchall()
        print("📋 Sample users:")
        for user in users:
            print(f"   - {user['username']} ({user['email']}) - {user['role']}")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

def test_login_endpoint():
    """Test the login endpoint"""
    try:
        print("\n🔍 Testing login endpoint...")
        
        # Test with sample user credentials
        test_credentials = [
            {"email": "admin@company.com", "password": "admin123"},
            {"email": "dev1@company.com", "password": "dev123"},
            {"email": "emp1@company.com", "password": "emp123"}
        ]
        
        for creds in test_credentials:
            print(f"\n📝 Testing login with: {creds['email']}")
            
            response = requests.post(
                "http://localhost:8000/login",
                json=creds,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Success! Response: {data}")
            else:
                print(f"   ❌ Failed: {response.text}")
                
    except Exception as e:
        print(f"❌ Login endpoint test failed: {e}")

def main():
    print("🚀 PPT Bot Login Debug Script")
    print("=" * 40)
    
    # Test database connection
    db_ok = test_database_connection()
    
    if db_ok:
        # Test login endpoint
        test_login_endpoint()
    else:
        print("\n⚠️  Cannot test login without database connection")
        print("Please ensure MySQL is running and database is set up")

if __name__ == "__main__":
    main()
