#!/usr/bin/env python3
"""
Database setup script for PPT Bot
"""
import mysql.connector
import os

def setup_database():
    """Set up the database and create tables"""
    
    # Database configuration
    db_config = {
        "host": os.getenv("DB_HOST", "localhost"),
        "user": os.getenv("DB_USER", "root"),
        "password": os.getenv("DB_PASS", ""),
        "database": os.getenv("DB_NAME", "pptbot"),
    }
    
    print("🔧 Setting up PPT Bot Database...")
    print(f"Config: {db_config}")
    
    try:
        # First connect without database to create it if it doesn't exist
        conn = mysql.connector.connect(
            host=db_config["host"],
            user=db_config["user"],
            password=db_config["password"]
        )
        cursor = conn.cursor()
        
        # Create database if it doesn't exist
        cursor.execute("CREATE DATABASE IF NOT EXISTS pptbot")
        print("✅ Database 'pptbot' created/verified")
        
        # Use the database
        cursor.execute("USE pptbot")
        
        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'employee',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ Users table created/verified")
        
        # Create groups table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS groups (
                group_id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by INT,
                FOREIGN KEY (created_by) REFERENCES users(user_id)
            )
        """)
        print("✅ Groups table created/verified")
        
        # Create other tables...
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id VARCHAR(255) PRIMARY KEY,
                last_q TEXT DEFAULT '',
                last_a TEXT DEFAULT '',
                created_by INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(user_id)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS files (
                id VARCHAR(255) PRIMARY KEY,
                session_id VARCHAR(255),
                filename TEXT,
                original_filename TEXT,
                uploaded_by INT,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
            )
        """)
        
        # Check if users exist
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        
        if user_count == 0:
            print("👥 No users found, creating sample users...")
            
            # Insert sample users
            sample_users = [
                ('Admin User', 'admin@company.com', 'admin123', 'admin'),
                ('Developer 1', 'dev1@company.com', 'dev123', 'developer'),
                ('Developer 2', 'dev2@company.com', 'dev123', 'developer'),
                ('Employee 1', 'emp1@company.com', 'emp123', 'employee'),
                ('Employee 2', 'emp2@company.com', 'emp123', 'employee'),
                ('Client 1', 'client1@company.com', 'client123', 'client')
            ]
            
            for user in sample_users:
                cursor.execute("""
                    INSERT INTO users (username, email, password_hash, role) 
                    VALUES (%s, %s, %s, %s)
                """, user)
            
            # Create sample groups
            cursor.execute("""
                INSERT INTO groups (name, description, created_by) VALUES
                ('Data & AI', 'Group for Data Science and AI related presentations', 1),
                ('Salesforce', 'Group for Salesforce related presentations', 1),
                ('Cloud Solutions', 'Group for cloud infrastructure presentations', 1)
            """)
            
            print(f"✅ Created {len(sample_users)} sample users and 3 sample groups")
        else:
            print(f"✅ Found {user_count} existing users")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("🎉 Database setup completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        print("\n🔍 Troubleshooting tips:")
        print("1. Make sure MySQL is running")
        print("2. Check if MySQL credentials are correct")
        print("3. Try running: mysql -u root -p")
        return False

if __name__ == "__main__":
    setup_database()
