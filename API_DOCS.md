# Kinder Connect - API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected endpoints require JWT token in header:
```
Authorization: Bearer <token>
```

---

## 🔑 Authentication Endpoints

### Register User
**POST** `/auth/register`

Request:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+91-9876543210",
  "password": "password123",
  "role": "parent|teacher|admin"
}
```

Response:
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGc...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "role": "parent"
  }
}
```

### Login
**POST** `/auth/login`

Request:
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "firstName": "John",
    "lastName": "Doe",
    "role": "parent"
  }
}
```

### Get Current User
**GET** `/auth/me` *(Protected)*

Response:
```json
{
  "id": "507f1f77bcf86cd799439011",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "role": "parent",
  "school": { }
}
```

---

## 👨‍💼 Admin Endpoints

### Create School
**POST** `/admin/school` *(Protected - Admin)*

Request:
```json
{
  "name": "Tiny Steps Kindergarten",
  "address": "123 Main St",
  "city": "New York",
  "phone": "+1-2125551234",
  "email": "info@tinysteps.com",
  "logo": "image_url"
}
```

Response:
```json
{
  "message": "School created",
  "school": { }
}
```

### Get School Details
**GET** `/admin/school/:schoolId` *(Protected)*

Response:
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "Tiny Steps Kindergarten",
  "address": "123 Main St",
  "city": "New York"
}
```

### Create Class
**POST** `/admin/class` *(Protected - Admin)*

Request:
```json
{
  "name": "Nursery",
  "section": "A",
  "schoolId": "507f1f77bcf86cd799439011",
  "capacity": 25
}
```

### Get Classes in School
**GET** `/admin/classes/:schoolId` *(Protected)*

Response:
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "name": "Nursery",
    "section": "A",
    "teachers": [ { } ],
    "students": [ { } ],
    "capacity": 25
  }
]
```

### Assign Teacher to Class
**POST** `/admin/class/:classId/teacher/:teacherId` *(Protected - Admin)*

Response:
```json
{
  "message": "Teacher assigned to class",
  "class": { }
}
```

### Enroll Student
**POST** `/admin/student/enroll` *(Protected - Admin)*

Request:
```json
{
  "firstName": "Emma",
  "lastName": "Smith",
  "dateOfBirth": "2019-05-15",
  "classId": "507f1f77bcf86cd799439011",
  "schoolId": "507f1f77bcf86cd799439011",
  "parentIds": ["507f1f77bcf86cd799439012"],
  "allergies": ["peanuts"],
  "medicalNotes": "Asthmatic"
}
```

### Get Students in Class
**GET** `/admin/class/:classId/students` *(Protected)*

---

## 👨‍🏫 Teacher Endpoints

### Log Activity
**POST** `/teacher/activity` *(Protected - Teacher)*

Request:
```json
{
  "studentId": "507f1f77bcf86cd799439011",
  "classId": "507f1f77bcf86cd799439012",
  "activityType": "nap|meal|potty|mood|play|learning|incident|photo",
  "napStartTime": "2024-05-01T14:00:00Z",
  "napEndTime": "2024-05-01T15:00:00Z",
  "napDuration": 60,
  "mealType": "lunch",
  "intakeLevel": "full|half|refused",
  "pottyType": "wet|soiled|toilet",
  "moodAtArrival": "happy|sad|clingy|cranky",
  "mediaUrl": "https://your-kinder-connect-bucket.s3.ap-south-1.amazonaws.com/activity/image.jpg",
  "mediaType": "photo|video",
  "caption": "Emma enjoying lunch"
}
```

### Get Student's Activities
**GET** `/teacher/student/:studentId/activities` *(Protected)*

### Mark Attendance
**POST** `/teacher/attendance` *(Protected - Teacher)*

Request:
```json
{
  "studentId": "507f1f77bcf86cd799439011",
  "classId": "507f1f77bcf86cd799439012",
  "status": "present|absent|late|half_day",
  "date": "2024-05-01"
}
```

### Bulk Mark Attendance
**POST** `/teacher/attendance/bulk` *(Protected - Teacher)*

Request:
```json
{
  "classId": "507f1f77bcf86cd799439012",
  "attendanceData": [
    { "studentId": "507f1f77bcf86cd799439011", "status": "present" },
    { "studentId": "507f1f77bcf86cd799439012", "status": "absent" }
  ]
}
```

### Record Milestone
**POST** `/teacher/milestone` *(Protected - Teacher)*

Request:
```json
{
  "studentId": "507f1f77bcf86cd799439011",
  "classId": "507f1f77bcf86cd799439012",
  "domain": "social|emotional|motor|language|cognitive",
  "milestone": "Shares toys with peers",
  "isAchieved": true
}
```

### Create Incident Report
**POST** `/teacher/incident` *(Protected - Teacher)*

Request:
```json
{
  "studentId": "507f1f77bcf86cd799439011",
  "classId": "507f1f77bcf86cd799439012",
  "incidentType": "bump|fall|scratch|fever|allergic_reaction|other",
  "description": "Small bump on forehead during play",
  "severity": "minor|moderate|severe",
  "photo": "https://your-kinder-connect-bucket.s3.ap-south-1.amazonaws.com/incidents/photo.jpg",
  "actionTaken": "Ice pack applied, monitored"
}
```

### Send Message to Parent
**POST** `/teacher/message` *(Protected - Teacher)*

Request:
```json
{
  "recipientId": "507f1f77bcf86cd799439011",
  "studentId": "507f1f77bcf86cd799439012",
  "message": "Emma had a great day!",
  "mediaUrl": "https://your-kinder-connect-bucket.s3.ap-south-1.amazonaws.com/chat/photo.jpg"
}
```

### Get Class Details
**GET** `/teacher/class/:classId` *(Protected - Teacher)*

---

## 👨‍👩‍👧 Parent Endpoints

### Get My Children
**GET** `/parent/children` *(Protected - Parent)*

Response:
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "firstName": "Emma",
    "lastName": "Smith",
    "class": { "name": "Jr. KG", "section": "A" },
    "school": { "name": "Tiny Steps" }
  }
]
```

### Get Child's Activity Feed
**GET** `/parent/child/:studentId/feed` *(Protected - Parent)*

Response:
```json
{
  "activities": [
    {
      "id": "507f1f77bcf86cd799439011",
      "activityType": "photo",
      "caption": "Emma playing",
      "mediaUrl": "https://...",
      "date": "2024-05-01T10:30:00Z",
      "teacher": { "firstName": "Sarah", "lastName": "Johnson" }
    }
  ],
  "todayAttendance": {
    "status": "present",
    "checkInTime": "2024-05-01T09:00:00Z"
  }
}
```

### Get Monthly Report
**GET** `/parent/child/:studentId/report/:month/:year` *(Protected - Parent)*

Response:
```json
{
  "id": "507f1f77bcf86cd799439011",
  "studentId": "507f1f77bcf86cd799439012",
  "month": 5,
  "year": 2024,
  "domains": [
    {
      "domain": "social",
      "milestones": [
        { "milestone": "Shares toys", "isAchieved": true }
      ],
      "overallRating": "proficient"
    }
  ],
  "highlights": ["Great progress in social skills"],
  "areasForImprovement": ["Fine motor skills"],
  "reportStatus": "completed"
}
```

### Get Attendance Records
**GET** `/parent/child/:studentId/attendance` *(Protected - Parent)*

### Get Incident Reports
**GET** `/parent/child/:studentId/incidents` *(Protected - Parent)*

### Get Messages with Teacher
**GET** `/parent/messages/:teacherId` *(Protected - Parent)*

Response:
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "senderId": "507f1f77bcf86cd799439012",
    "message": "Emma is doing great!",
    "createdAt": "2024-05-01T10:30:00Z",
    "isRead": true
  }
]
```

### Send Message to Teacher
**POST** `/parent/message` *(Protected - Parent)*

Request:
```json
{
  "recipientId": "507f1f77bcf86cd799439011",
  "studentId": "507f1f77bcf86cd799439012",
  "message": "Can you check if Emma finished her lunch?",
  "mediaUrl": null
}
```

### Book PTM Slot
**POST** `/parent/ptm/book` *(Protected - Parent)*

Request:
```json
{
  "ptmBookingId": "507f1f77bcf86cd799439011"
}
```

### Get Available PTM Slots
**GET** `/parent/ptm/slots/:teacherId` *(Protected - Parent)*

### Update Authorized Pickup
**PUT** `/parent/child/:studentId/authorized-pickup` *(Protected - Parent)*

Request:
```json
{
  "authorizedPickup": [
    {
      "name": "Grandmother",
      "phone": "+1-2125559876",
      "relation": "grandmother",
      "isApproved": true
    }
  ]
}
```

---

## 📊 Student Endpoints

### Get Student Profile
**GET** `/students/:studentId` *(Protected)*

### Update Student Profile
**PUT** `/students/:studentId` *(Protected)*

Request:
```json
{
  "allergies": ["peanuts", "dairy"],
  "medicalNotes": "Requires EpiPen for allergies",
  "authorizedPickup": [ ]
}
```

---

## 📋 Activity Endpoints

### Log Activity
**POST** `/activities` *(Protected - Teacher)*

### Get Activities by Date
**GET** `/activities/class/:classId/date/:date` *(Protected)*

### Get Student Activities by Type
**GET** `/activities/student/:studentId/type/:activityType` *(Protected)*

---

## 📈 Report Endpoints

### Create Report
**POST** `/reports` *(Protected - Teacher)*

### Generate Report (Auto-compile from Milestones)
**POST** `/reports/generate` *(Protected - Teacher)*

Request:
```json
{
  "studentId": "507f1f77bcf86cd799439011",
  "classId": "507f1f77bcf86cd799439012",
  "month": 5,
  "year": 2024
}
```

### Get Report
**GET** `/reports/:reportId` *(Protected)*

### Get Student's Reports
**GET** `/reports/student/:studentId/all` *(Protected)*

### Update Report Status
**PUT** `/reports/:reportId/status` *(Protected - Teacher)*

Request:
```json
{
  "reportStatus": "draft|completed|sent_to_parent"
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Authorization token required"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Server Error
```json
{
  "error": "Internal Server Error"
}
```

---

## Rate Limiting

Coming soon: API rate limiting (100 requests per 15 minutes per IP)

---

## Pagination

Coming soon: Pagination support with `?page=1&limit=20`

---

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error

---

## Testing Endpoints

Use Postman or similar tools to test:

1. **Import collection** from API docs
2. **Set environment variables** (token, IDs)
3. **Run requests** in sequence
4. **Check responses** for correct format

---

Last Updated: May 2, 2024
