# Groups Functionality Setup Guide

This guide explains how to set up the new Groups functionality that replaces the Decks tab in the PreSales Insight Bot.

## Overview

The Groups functionality allows users to:
- Create and manage groups
- Add files to groups
- Control access to files based on group membership
- Support three user roles: employee, developer, and admin

## Database Setup

### 1. Run the Database Setup Script

Execute the SQL script to create the necessary tables and sample data:

```bash
mysql -u your_username -p < backend/setup_database.sql
```

This will create:
- `users` table with role-based access
- `groups` table for group management
- `user_groups` table for user-group relationships
- `sessions` table (updated with user tracking)
- `files` table (updated with user tracking)
- `file_groups` table for file-group relationships

### 2. Sample Data

The script includes sample data:
- **Users**: admin, developers, employees, and clients
- **Groups**: Data & AI, Salesforce, Cloud Solutions, Marketing, Product Development
- **User-Group Assignments**: Based on roles and access levels

## Backend Changes

### New Files Created:
- `backend/routers/groups.py` - Group management API endpoints
- `backend/setup_database.sql` - Database setup script

### Updated Files:
- `backend/database.py` - Added new models and functions for group management
- `backend/main.py` - Added groups router
- `backend/routers/upload.py` - Updated to track user_id for uploaded files

### Key Features:
- Group creation and management
- File-group associations
- User-group membership
- Role-based access control
- File access based on group membership

## Frontend Changes

### New Files Created:
- `pptbot-frontend/src/components/Groups.jsx` - Groups component

### Updated Files:
- `pptbot-frontend/src/api/api.js` - Added group management API functions
- `pptbot-frontend/src/pages/TabsApp.jsx` - Replaced Decks with Groups

### Key Features:
- Group list with creation capability
- File management within groups
- Add/remove files from groups
- Modal for group creation
- Responsive design matching existing UI

## API Endpoints

### Group Management:
- `GET /api/groups` - Get user's groups
- `GET /api/groups/all` - Get all groups (admin only)
- `POST /api/groups` - Create new group
- `GET /api/groups/{group_id}/files` - Get files in a group
- `POST /api/groups/{group_id}/files` - Add file to group
- `DELETE /api/groups/{group_id}/files/{file_id}` - Remove file from group
- `POST /api/groups/{group_id}/users` - Add user to group
- `DELETE /api/groups/{group_id}/users/{user_id}` - Remove user from group
- `GET /api/files/my` - Get user's accessible files

## User Roles and Access

### Admin:
- Can access all groups and files
- Can create new groups
- Can manage user-group assignments
- Can manage file-group assignments

### Developer:
- Can access technical groups (Data & AI, Salesforce, Cloud Solutions, Product Development)
- Can manage files within their groups
- Cannot create new groups

### Employee:
- Can access business groups (Salesforce, Marketing)
- Can manage files within their groups
- Cannot create new groups

### Client:
- Limited access to specific groups (Salesforce only)
- Read-only access to files

## Usage Instructions

### For Users:

1. **Login** with your credentials
2. **Navigate to Groups tab** (replaces the old Decks tab)
3. **View your groups** - you'll see groups you belong to
4. **Select a group** to view its files
5. **Add files to groups** from the available files list
6. **Remove files** from groups as needed
7. **Create new groups** (if you have admin privileges)

### For Admins:

1. **Create groups** using the "Create Group" button
2. **Assign users to groups** through the API
3. **Manage file access** by adding/removing files from groups
4. **Monitor group usage** and file access

## Security Considerations

- File access is controlled by group membership
- Users can only see files in groups they belong to
- Admins have access to all files
- Group creation is restricted to admins
- User-group assignments are managed by admins

## Troubleshooting

### Common Issues:

1. **Database Connection**: Ensure MySQL is running and credentials are correct
2. **Missing Tables**: Run the setup script if tables don't exist
3. **Permission Errors**: Check user roles and group memberships
4. **API Errors**: Verify backend is running and endpoints are accessible

### Testing:

1. **Login as different users** to test role-based access
2. **Create test groups** and add files
3. **Verify file access** based on group membership
4. **Test group management** functions

## Future Enhancements

Potential improvements:
- Group invitation system
- File sharing between groups
- Advanced permission levels
- Group activity logs
- Bulk file operations
- Group templates

## Support

For issues or questions:
1. Check the database setup
2. Verify user roles and group assignments
3. Review API endpoint responses
4. Check browser console for frontend errors
