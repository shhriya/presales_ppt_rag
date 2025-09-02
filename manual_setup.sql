-- Manual Setup Script for PreSales Insight Bot Groups
-- Run this directly in MySQL command line or MySQL Workbench

-- Step 1: Create and use database
CREATE DATABASE IF NOT EXISTS pptbot;
USE pptbot;

-- Step 2: Drop existing tables (if any) in correct order
DROP TABLE IF EXISTS file_groups;
DROP TABLE IF EXISTS user_groups;
DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS `groups`;
DROP TABLE IF EXISTS users;

-- Step 3: Create users table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'employee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Create groups table (with backticks for reserved word)
CREATE TABLE `groups` (
    group_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Step 5: Create user_groups table
CREATE TABLE user_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    group_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES `groups`(group_id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_group (user_id, group_id)
);

-- Step 6: Create sessions table
CREATE TABLE sessions (
    id VARCHAR(255) PRIMARY KEY,
    last_q TEXT,
    last_a TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Step 7: Create files table
CREATE TABLE files (
    id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255),
    filename TEXT,
    original_filename TEXT,
    uploaded_by INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
);

-- Step 8: Create file_groups table
CREATE TABLE file_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_id VARCHAR(255) NOT NULL,
    group_id INT NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES `groups`(group_id) ON DELETE CASCADE,
    UNIQUE KEY unique_file_group (file_id, group_id)
);

-- Step 9: Insert sample users
INSERT INTO users (username, email, password_hash, role) VALUES
('Admin User', 'admin@company.com', 'admin123', 'admin'),
('Developer 1', 'dev1@company.com', 'dev123', 'developer'),
('Developer 2', 'dev2@company.com', 'dev123', 'developer'),
('Employee 1', 'emp1@company.com', 'emp123', 'employee'),
('Employee 2', 'emp2@company.com', 'emp123', 'employee'),
('Client 1', 'client1@company.com', 'client123', 'client');

-- Step 10: Insert sample groups
INSERT INTO `groups` (name, description, created_by) VALUES
('Data & AI', 'Group for Data Science and AI related presentations', 1),
('Salesforce', 'Group for Salesforce related presentations', 1),
('Cloud Solutions', 'Group for cloud infrastructure presentations', 1),
('Marketing', 'Group for marketing and sales presentations', 1),
('Product Development', 'Group for product development presentations', 1);

-- Step 11: Assign users to groups
INSERT INTO user_groups (user_id, group_id) VALUES
-- Admin is in all groups
(1, 1), (1, 2), (1, 3), (1, 4), (1, 5),
-- Developers are in technical groups
(2, 1), (2, 2), (2, 3), (2, 5),
(3, 1), (3, 2), (3, 3), (3, 5),
-- Employees are in business groups
(4, 2), (4, 4),
(5, 2), (5, 4),
-- Client has limited access
(6, 2);

-- Step 12: Create indexes for performance
CREATE INDEX idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX idx_user_groups_group_id ON user_groups(group_id);
CREATE INDEX idx_file_groups_file_id ON file_groups(file_id);
CREATE INDEX idx_file_groups_group_id ON file_groups(group_id);
CREATE INDEX idx_files_uploaded_by ON files(uploaded_by);
CREATE INDEX idx_files_session_id ON files(session_id);
CREATE INDEX idx_sessions_created_by ON sessions(created_by);

-- Step 13: Verify setup
SELECT 'Setup completed successfully!' as status;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as group_count FROM `groups`;
SELECT COUNT(*) as user_group_count FROM user_groups;
