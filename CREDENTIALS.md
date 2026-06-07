# DCONS - Login Credentials & Features Guide

## 📋 Sample Login Credentials

### 🔐 Admin Account

- **Email:** `dcon@admin.com`
- **Password:** `admindcon1232`
- **Role:** Administrator (full access to admin dashboard)
- **Features:** Create teachers, view all users, approve students, manage system

### 👨‍🏫 Teacher Account

- **Email:** `constitency@teacher.com`
- **Password:** `consistence1232`
- **Role:** Teacher (approved by default)
- **Name:** Prof. James Smith
- **Features:** View classroom, manage students, approve student requests, upload materials

### 👤 Student Accounts (Require Teacher Approval)

- **Self signup:** Only students may sign up through the public form.
- **Admin/teacher accounts:** Must be created by an existing admin user.

1. **Student 1**
   - **Email:** `student1@dcons.local`
   - **Password:** `Student@Dcons123`
   - **Name:** Alice Johnson

2. **Student 2**
   - **Email:** `student2@dcons.local`
   - **Password:** `Student@Dcons123`
   - **Name:** Bob Wilson

3. **Student 3**
   - **Email:** `dcon@student.com`
   - **Password:** `student1232`
   - **Name:** DCONS Student

4. **Student 3**
   - **Email:** `student3@dcons.local`
   - **Password:** `Student@Dcons123`
   - **Name:** Charlie Davis

**Status:** All student accounts start as unapproved. Teachers or admins can approve them in the dashboard.

---

## 🚀 How to Generate Sample Users

Run the seed script to create all sample accounts:

```bash
cd backend
npm run seed:samples
```

This will create:

- Admin account (auto-approved)
- 1 Teacher account (auto-approved)
- 3 Student accounts (pending approval)

---

## 🎯 Current Features

### ✅ Authentication

- Email/password login
- User roles: Admin, Teacher, Student
- Session management with Supabase Auth

### ✅ Admin Dashboard

- **Overview Tab:** System statistics (total users, active rooms, messages, assignments)
- **Teachers Tab:**
  - View all teachers
  - Create new teachers with email/password
  - Enable/disable teacher accounts
  - See teacher status and join date
- **Students Tab:** Placeholder for student management

### ✅ Student Management

- Student signup with teacher assignment
- Approval workflow (students need teacher approval before class access)
- Teacher approval interface
- Join class button disabled until approved

### ✅ Teacher Dashboard

- View and approve pending students
- Manage classroom sessions
- Monitor student access

### ✅ Live Classroom

- Real-time video/audio with MediaSoup
- Socket.IO for communication
- Whiteboard functionality
- Chat system
- Role-based permissions (teacher vs student)

### ✅ Teacher Booking System

- Browse available teachers
- Book lessons by date/subject
- No-teacher messaging when unavailable

---

## 💡 Suggested New Features

### 1. **Assignment Management**

- Create and distribute assignments
- Submit assignments with file upload
- Grade submissions with comments
- Track assignment completion

### 2. **Attendance Tracking**

- Auto-record class attendance
- Generate attendance reports
- Monthly attendance summaries per student

### 3. **Progress Analytics**

- Student performance dashboard
- Class participation metrics
- Assignment grades tracking
- Time spent in classroom

### 4. **Notification System**

- Email notifications for:
  - New assignment
  - Class start reminders
  - Grade posted
  - Student approval status
- In-app notifications

### 5. **Content Management**

- Upload class materials (PDFs, slides, videos)
- Organize by subject/date
- Student access control
- Download history

### 6. **Scheduling & Timetable**

- Teacher weekly schedule
- Student view of available slots
- Calendar integration
- Recurring classes

### 7. **Certificate System**

- Generate completion certificates
- Course certificates with grade
- Download/share certificates

### 8. **Student Performance Reports**

- Monthly progress reports
- Attendance breakdown
- Assignment grades summary
- Teacher comments

### 9. **Instant Chat**

- 1-on-1 messaging between students and teachers
- Group chat for classes
- File sharing in chat
- Chat history

### 10. **Parent Portal** (if applicable)

- Parent accounts to monitor child
- View grades and attendance
- Receive notifications
- Communication with teachers

### 11. **Announcement Board**

- Post class announcements
- Schedule-based announcements
- Important updates for students

### 12. **Rating & Reviews**

- Student rate teachers
- Teacher get feedback
- Public teacher reviews (optional)

### 13. **Two-Factor Authentication**

- Optional 2FA for admin/teachers
- Email OTP verification

### 14. **Session Recording**

- Record classroom sessions
- Playback for absent students
- Download recordings

---

## 📝 Getting Started

### First Time Setup:

1. **Create Admin Account:**

   ```bash
   cd backend
   npm run seed:admin
   ```

2. **Create Sample Users:**

   ```bash
   npm run seed:samples
   ```

3. **Login to Admin Dashboard:**
   - Navigate to `/admin`
   - Use admin credentials
   - Create additional teachers as needed

4. **Teacher Actions:**
   - Login as teacher
   - Go to `/teacher` page
   - Review and approve pending students

5. **Student Flow:**
   - Signup at `/signup`
   - Select a teacher
   - Wait for teacher approval
   - Access classroom at `/student` once approved

---

## 🔄 Development Notes

### Backend API Endpoints:

- `POST /admin/teachers` - Create new teacher
- `GET /admin/teachers` - List all teachers
- `GET /students/pending` - Get pending student approvals
- `PATCH /students/:id/approve` - Approve a student
- `GET /admin/requests` - Get join requests

### Frontend Routes:

- `/login` - Login page
- `/signup` - Student signup
- `/admin` - Admin dashboard
- `/teacher` - Teacher dashboard
- `/student` - Student dashboard
- `/classroom` - Live classroom

---

## 🛠 Recommended Next Steps

1. **Add Assignment Feature** - Core functionality for education platform
2. **Email Notifications** - Keep users informed
3. **Attendance Tracking** - Important for compliance
4. **Chat System** - Better communication between users
5. **Performance Analytics** - Data-driven insights

---

Generated: June 5, 2026
