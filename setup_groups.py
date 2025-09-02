#!/usr/bin/env python3
"""
Setup script for Groups functionality in PreSales Insight Bot
This script helps set up the database and verify the installation.
"""

import os
import sys
import mysql.connector
from mysql.connector import Error

def check_database_connection():
    """Check if we can connect to the database"""
    try:
        # Get database configuration from environment variables
        db_config = {
            "host": os.getenv("DB_HOST", "localhost"),
            "user": os.getenv("DB_USER", "root"),
            "password": os.getenv("DB_PASS", "new_password"),
            "database": os.getenv("DB_NAME", "pptbot"),
        }
        
        connection = mysql.connector.connect(**db_config)
        if connection.is_connected():
            print("✅ Database connection successful!")
            return True
    except Error as e:
        print(f"❌ Database connection failed: {e}")
        return False
    finally:
        if 'connection' in locals() and connection.is_connected():
            connection.close()

def run_sql_script():
    """Run the SQL setup script"""
    try:
        db_config = {
            "host": os.getenv("DB_HOST", "localhost"),
            "user": os.getenv("DB_USER", "root"),
            "password": os.getenv("DB_PASS", "new_password"),
            "database": os.getenv("DB_NAME", "pptbot"),
        }
        
        # Read the SQL script
        script_path = "backend/setup_database.sql"
        if not os.path.exists(script_path):
            print(f"❌ SQL script not found at {script_path}")
            return False
            
        with open(script_path, 'r') as file:
            sql_script = file.read()
        
        # Execute the script
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor()
        
        # Split and execute each statement
        statements = sql_script.split(';')
        for statement in statements:
            statement = statement.strip()
            if statement:
                try:
                    cursor.execute(statement)
                except Error as e:
                    print(f"⚠️ Warning executing statement: {e}")
                    print(f"Statement: {statement[:100]}...")
        
        connection.commit()
        print("✅ Database setup completed!")
        return True
        
    except Error as e:
        print(f"❌ Database setup failed: {e}")
        return False
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

def verify_tables():
    """Verify that all required tables exist"""
    try:
        db_config = {
            "host": os.getenv("DB_HOST", "localhost"),
            "user": os.getenv("DB_USER", "root"),
            "password": os.getenv("DB_PASS", "new_password"),
            "database": os.getenv("DB_NAME", "pptbot"),
        }
        
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor()
        
        required_tables = [
            'users', 'groups', 'user_groups', 'sessions', 
            'files', 'file_groups'
        ]
        
        cursor.execute("SHOW TABLES")
        existing_tables = [table[0] for table in cursor.fetchall()]
        
        print("\n📋 Table Verification:")
        all_tables_exist = True
        for table in required_tables:
            if table in existing_tables:
                print(f"✅ {table}")
            else:
                print(f"❌ {table} - MISSING")
                all_tables_exist = False
        
        return all_tables_exist
        
    except Error as e:
        print(f"❌ Table verification failed: {e}")
        return False
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

def check_sample_data():
    """Check if sample data exists"""
    try:
        db_config = {
            "host": os.getenv("DB_HOST", "localhost"),
            "user": os.getenv("DB_USER", "root"),
            "password": os.getenv("DB_PASS", "new_password"),
            "database": os.getenv("DB_NAME", "pptbot"),
        }
        
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor(dictionary=True)
        
        print("\n📊 Sample Data Check:")
        
        # Check users
        cursor.execute("SELECT COUNT(*) as count FROM users")
        user_count = cursor.fetchone()['count']
        print(f"Users: {user_count}")
        
        # Check groups
        cursor.execute("SELECT COUNT(*) as count FROM groups")
        group_count = cursor.fetchone()['count']
        print(f"Groups: {group_count}")
        
        # Check user groups
        cursor.execute("SELECT COUNT(*) as count FROM user_groups")
        user_group_count = cursor.fetchone()['count']
        print(f"User-Group Assignments: {user_group_count}")
        
        return user_count > 0 and group_count > 0
        
    except Error as e:
        print(f"❌ Sample data check failed: {e}")
        return False
    finally:
        if 'connection' in locals() and connection.is_connected():
            cursor.close()
            connection.close()

def main():
    """Main setup function"""
    print("🚀 PreSales Insight Bot - Groups Setup")
    print("=" * 50)
    
    # Check environment variables
    print("\n🔧 Environment Check:")
    required_env_vars = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME']
    for var in required_env_vars:
        value = os.getenv(var, "NOT SET")
        if value != "NOT SET":
            print(f"✅ {var}: {value}")
        else:
            print(f"⚠️ {var}: {value} (using default)")
    
    # Check database connection
    print("\n🔌 Database Connection:")
    if not check_database_connection():
        print("❌ Cannot proceed without database connection")
        sys.exit(1)
    
    # Run SQL setup
    print("\n📝 Database Setup:")
    if not run_sql_script():
        print("❌ Database setup failed")
        sys.exit(1)
    
    # Verify tables
    if not verify_tables():
        print("❌ Some required tables are missing")
        sys.exit(1)
    
    # Check sample data
    if not check_sample_data():
        print("❌ Sample data not found")
        sys.exit(1)
    
    print("\n🎉 Setup completed successfully!")
    print("\n📋 Next Steps:")
    print("1. Start the backend server: cd backend && python main.py")
    print("2. Start the frontend: cd pptbot-frontend && npm start")
    print("3. Login with sample credentials:")
    print("   - Admin: admin@company.com / admin123")
    print("   - Developer: dev1@company.com / dev123")
    print("   - Employee: emp1@company.com / emp123")
    print("   - Client: client1@company.com / client123")
    print("\n📖 For more information, see SETUP_GROUPS.md")

if __name__ == "__main__":
    main()
