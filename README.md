# Kinder Connect - Kindergarten/Toddler Care Management System

A comprehensive digital platform for managing kindergarten and toddler care facilities, connecting parents, teachers, and administrators in real-time.

## 🎯 Project Overview

Kinder Connect is built specifically for **Toddler Care, Nursery, Jr. KG, and Sr. KG** parents who are highly engaged users. The platform provides:

- **Real-time activity updates** (nap, meal, potty, learning activities, photos)
- **Daily activity feed** for parents to stay connected throughout the day
- **Development tracking** with milestone assessments
- **Secure incident reporting** with parent notifications
- **Parent-teacher messaging** to replace WhatsApp chaos
- **Monthly development reports** auto-generated based on milestones
- **PTM (Parent-Teacher Meeting) slot booking**
- **Multi-child management** for siblings in the same school

## 📁 Project Structure

```
kinder-connect/
├── server/                 # Node.js + Express backend
│   ├── models/            # MongoDB schemas
│   ├── routes/            # API routes
│   ├── middleware/        # Authentication & authorization
│   ├── server.js          # Main server file
│   ├── package.json
│   └── .env.example
│
├── client/                # React frontend
│   ├── src/
│   │   ├── pages/         # Page components (admin, teacher, parent)
│   │   ├── components/    # Reusable components
│   │   ├── api/           # API call utilities
│   │   ├── store/         # State management (Zustand)
│   │   ├── App.js         # Main app with routing
│   │   └── index.js       # React entry point
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
└── README.md
```

## 🚀 Tech Stack

### Backend
- **Node.js** + Express.js
- **MongoDB** with Mongoose
- **JWT** for authentication
- **Bcryptjs** for password hashing
- **AWS S3** for media storage
- **Multer** for file uploads

### Frontend
- **React 18**
- **React Router v6** for routing
- **Tailwind CSS** for styling
- **Axios** for API calls
- **Zustand** for state management
- **React Icons** for UI icons

## 📦 Installation & Setup

### Backend Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/kinder-connect
JWT_SECRET=your_jwt_secret_key_change_in_production
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=your-kinder-connect-bucket
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
```

5. Start MongoDB:
```bash
# Make sure MongoDB is running
mongod
```

6. Start the server:
```bash
npm run dev
```

The server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## 🔐 Authentication

The system has role-based access control for three user types:

### Admin
- Create and manage schools
- Set up classes and sections
- Enroll students
- Assign teachers to classes
- Manage circulars and announcements
- View system reports

### Teacher
- Mark attendance
- Log daily activities (nap, meal, potty, mood)
- Post photos/videos of activities
- Track milestones
- Report incidents with photo documentation
- Generate monthly development reports
- Send messages to parents
- Manage PTM slots

### Parent
- View real-time activity feed
- See daily photo updates
- Track child's development
- View monthly development reports
- Check attendance records
- Receive incident notifications
- Chat directly with teachers
- Book PTM slots

## 📊 MongoDB Collections

### Core Collections
- **User** - Admins, Teachers, Parents
- **School** - School information
- **Class** - Class/Section management
- **Student** - Student profiles with parent links
- **ActivityLog** - Daily activity tracking (nap, meal, potty, mood, photos)
- **Milestone** - Developmental milestones (social, emotional, motor, language, cognitive)
- **Report** - Monthly development reports
- **IncidentReport** - Health & safety incidents
- **Attendance** - Daily attendance tracking
- **Message** - Parent-teacher conversations
- **PTMBooking** - Parent-teacher meeting slots
- **Circular** - School announcements and notices

## 🔄 API Routes Overview

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Admin Routes
- `POST /api/admin/school` - Create school
- `POST /api/admin/class` - Create class
- `POST /api/admin/student/enroll` - Enroll student
- `POST /api/admin/class/:classId/teacher/:teacherId` - Assign teacher

### Teacher Routes
- `POST /api/teacher/activity` - Log activity
- `POST /api/teacher/attendance` - Mark attendance
- `POST /api/teacher/milestone` - Record milestone
- `POST /api/teacher/incident` - Create incident report
- `POST /api/teacher/message` - Send message to parent
- `GET /api/teacher/class/:classId` - Get class details

### Parent Routes
- `GET /api/parent/children` - Get my children
- `GET /api/parent/child/:studentId/feed` - Get activity feed
- `GET /api/parent/child/:studentId/report/:month/:year` - Get monthly report
- `POST /api/parent/message` - Send message to teacher
- `POST /api/parent/ptm/book` - Book PTM slot

### Activities & Reports
- `POST /api/activities` - Log activity
- `POST /api/reports` - Create report
- `POST /api/reports/generate` - Auto-generate report from milestones

## 📱 Key Features by Age Group

| Feature | Toddler | Nursery | Jr. KG | Sr. KG |
|---------|---------|---------|--------|--------|
| Diaper/Potty Log | Critical | Important | Optional | No |
| Nap Tracker | Critical | Critical | Optional | No |
| Meal Log | Critical | Critical | Important | Useful |
| Milestone Tracker | Critical | Critical | Critical | Critical |
| Activity Photos | Critical | Critical | Critical | Critical |
| Homework | No | No | Light | Light |
| Development Report | Simple | Simple | Detailed | Detailed |

## 🎨 Frontend Pages

### Admin Pages
- Dashboard (Overview of school stats)
- School Management
- Class Management
- Student Enrollment
- Circular Management

### Teacher Pages
- Dashboard (Quick action links)
- Attendance Marker
- Activity Logger (nap, meal, potty, mood, photos)
- Milestone Tracker
- Incident Reporter
- Report Builder
- Parent Chat
- PTM Slot Management

### Parent Pages
- Dashboard (My children)
- Child Profile
- Activity Feed
- Development Report
- Attendance View
- Teacher Chat
- PTM Slot Booking

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Role-based access control (RBAC)
- Protected routes on frontend
- Server-side authorization checks
- Input validation and sanitization

## 📝 Development Roadmap

**Week 1-2:** Authentication + Student enrollment + Class setup
**Week 3:** Daily activity logger + Photo posting
**Week 4:** Attendance + Milestone tracker + Parent feed view
**Week 5:** Incident report + Parent-teacher chat + Notifications
**Week 6:** Monthly report generation + Polish + Testing

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

## 📧 Support

For questions or support, contact: support@kinderconnect.app

---

**Built with ❤️ for engaged kindergarten parents and caring educators**
