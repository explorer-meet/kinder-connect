# Quick Start Guide - Kinder Connect

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or cloud connection)
- npm or yarn
- Git

## 🚀 Quick Start (5 minutes)

### Terminal 1: Start Backend

```bash
# Navigate to server directory
cd server

# Install dependencies (first time only)
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

Server will run on: `http://localhost:5000`

### Terminal 2: Start Frontend

```bash
# Navigate to client directory
cd client

# Install dependencies (first time only)
npm install

# Start React development server
npm start
```

Frontend will run on: `http://localhost:3000`

---

## 📝 Demo Credentials

### Admin Account
- **Email:** admin@school.com
- **Password:** password
- **Role:** Admin

### Teacher Account
- **Email:** teacher@school.com
- **Password:** password
- **Role:** Teacher

### Parent Account
- **Email:** parent@example.com
- **Password:** password
- **Role:** Parent

---

## 📊 MongoDB Setup

### Local MongoDB
```bash
# Start MongoDB service
mongod

# Verify connection
mongo --eval "db.adminCommand('ping')"
```

### MongoDB Connection String
Update in `.env`:
```
MONGODB_URI=mongodb://localhost:27017/kinder-connect
```

---

## 🔧 Environment Variables

### Server (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/kinder-connect
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
NODE_ENV=development
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=your-kinder-connect-bucket
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
```

### Client (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

---

## 📂 Project Structure

```
kinder-connect/
├── server/
│   ├── models/        # MongoDB schemas (User, Student, ActivityLog, etc.)
│   ├── routes/        # API endpoints (auth, admin, teacher, parent)
│   ├── middleware/    # Authentication and authorization
│   └── server.js      # Express app
├── client/
│   ├── src/
│   │   ├── pages/     # Role-based pages (admin, teacher, parent)
│   │   ├── components/# Reusable components (Header, ProtectedRoute)
│   │   ├── api/       # API utilities
│   │   ├── store/     # Zustand state management
│   │   └── App.js     # Main app with routing
│   └── public/
└── README.md
```

---

## 🎯 What's Implemented

✅ **Authentication**
- Login/Register with JWT
- Role-based access control (Admin, Teacher, Parent)
- Protected routes

✅ **Database**
- 10+ MongoDB models for all features
- User, Student, School, Class management
- Activity logging, milestones, incident reports
- Messages, PTM bookings, attendance, reports

✅ **API Endpoints**
- Authentication (login, register, me)
- Admin routes (school, class, student enrollment)
- Teacher routes (activity, attendance, incidents, messages)
- Parent routes (children, feed, reports, chat, PTM)
- Reports and activities management

✅ **Frontend**
- Login/Register pages
- Role-based navigation
- Dashboard for each role (Admin, Teacher, Parent)
- Stub pages for all features (ready for implementation)

---

## 🚧 Next Steps (Implementation)

### Week 1: Core Features
1. **Admin Dashboard** - Statistics and quick actions
2. **Student Enrollment** - Full form with validation
3. **Class Management** - Create/edit classes and assign teachers

### Week 2: Teacher Features
1. **Attendance Marking** - Single-tap per child with bulk options
2. **Activity Logger** - Nap, meal, potty, mood logging with timestamps
3. **Photo Upload** - Image/video posting to parent feed

### Week 3: Parent Features
1. **Activity Feed** - Real-time updates in chronological order
2. **Child Profile** - Medical notes, allergies, authorized pickups
3. **Monthly Reports** - Auto-generated from milestones

### Week 4: Communication
1. **Parent-Teacher Chat** - Real-time messaging
2. **PTM Booking** - Calendar-based slot booking
3. **Notifications** - SMS/email alerts for important events

### Week 5: Advanced Features
1. **Incident Reporting** - Photo documentation + parent alerts
2. **Milestone Tracking** - Interactive checklist per domain
3. **Report Generation** - Auto-compile milestones into reports

### Week 6: Polish & Deploy
1. Mobile responsiveness testing
2. Performance optimization
3. Security audit
4. Production deployment

---

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Check if port 5000 is in use
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or change PORT in .env
```

### MongoDB Connection Error
```bash
# Verify MongoDB is running
mongod --version

# Check connection
mongo --eval "db.adminCommand('ping')"
```

### Frontend API Errors
- Check `REACT_APP_API_URL` in `.env`
- Make sure backend server is running
- Check browser console for CORS errors

### Node Modules Issues
```bash
# Remove and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 API Documentation

All API routes return JSON responses:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { }
}
```

### Authentication Header
All protected endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 🎨 Tailwind CSS Classes

Custom components available:
- `.btn` - Base button
- `.btn-primary` - Primary button
- `.btn-secondary` - Secondary button
- `.card` - Card container
- `.input` - Form input
- `.badge` - Badge label

---

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Touch-friendly buttons (min 44px)
- Readable font sizes on all devices

---

## 🔐 Security Checklist

- [ ] Change JWT_SECRET in production
- [ ] Use HTTPS in production
- [ ] Set up CORS properly
- [ ] Validate all inputs server-side
- [ ] Use environment variables for secrets
- [ ] Enable MongoDB authentication
- [ ] Set strong password requirements
- [ ] Implement rate limiting on APIs
- [ ] Add logging and monitoring

---

## 💡 Tips

1. **Use Redux DevTools** for debugging Zustand state
2. **Check API responses** in browser DevTools Network tab
3. **Use Postman** to test API endpoints
4. **Enable ESLint** in VS Code for code quality
5. **Use git branches** for features: `git checkout -b feature/activity-logger`

---

## 📞 Need Help?

- Check the README.md for detailed information
- Review the API routes in `/server/routes/`
- Check component structure in `/client/src/pages/`
- Look at model schemas in `/server/models/`

---

**Happy Coding! 🎉**
