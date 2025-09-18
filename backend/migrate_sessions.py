#!/usr/bin/env python3
"""
Migration script to add new columns to sessions table for chat history persistence.
Run this script to update existing database schema.
"""

import os
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database import SessionLocal, engine
from sqlalchemy import text

def migrate_sessions():
    """Add new columns to sessions table."""
    db = SessionLocal()
    try:
        # Check if columns already exist
        result = db.execute(text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'sessions' 
            AND COLUMN_NAME IN ('name', 'chat_history', 'updated_at')
        """))
        existing_columns = [row[0] for row in result.fetchall()]
        
        print(f"Existing columns: {existing_columns}")
        
        # Add name column if it doesn't exist
        if 'name' not in existing_columns:
            print("Adding 'name' column...")
            db.execute(text("ALTER TABLE sessions ADD COLUMN name VARCHAR(255) NULL"))
            print("✓ Added 'name' column")
        else:
            print("✓ 'name' column already exists")
            
        # Add chat_history column if it doesn't exist
        if 'chat_history' not in existing_columns:
            print("Adding 'chat_history' column...")
            db.execute(text("ALTER TABLE sessions ADD COLUMN chat_history TEXT"))
            print("✓ Added 'chat_history' column")
        else:
            print("✓ 'chat_history' column already exists")
            
        # Add updated_at column if it doesn't exist
        if 'updated_at' not in existing_columns:
            print("Adding 'updated_at' column...")
            db.execute(text("ALTER TABLE sessions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"))
            print("✓ Added 'updated_at' column")
        else:
            print("✓ 'updated_at' column already exists")
            
        db.commit()
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("🔄 Starting sessions table migration...")
    migrate_sessions()
