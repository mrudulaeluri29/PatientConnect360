# PatientConnect360
Evolve HealthTech Solutions - PatientConnect360: Building a Web &amp; Mobile Patient Portal for Home Healthcare

Completed Features
- **Welcome Page**: Professional landing page with PatientConnect360 branding
- **Authentication System**: 
  - Login with email/password
  - User registration with role selection
  - Password reset functionality
- **User Roles**: 
  - Patient
  - Caregiver  
  - Clinician
  - Admin
- **Dashboard**: Role-specific dashboards with relevant features
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Backend API**: Complete REST API with SQLite database


## Project Structure

PatientConnect360/
├── App.tsx                 # Main application component
├── backend/
│   ├── server.js          # Express API server
│   ├── package.json       # Backend dependencies
│   └── database.sqlite    # SQLite database (auto-generated)
├── package.json           # Frontend dependencies
├── app.json              # Expo configuration
└── README.md             # This file

## Development Guidelines

### Code Style
Use TypeScript for type safety
Follow React Native best practices
Implement responsive design patterns
Use semantic component naming

### Security Considerations
All passwords are hashed using bcrypt
JWT tokens for authentication
Input validation on both frontend and backend
CORS enabled for cross-origin requests

### Database Schema
The SQLite database includes:
users table for user accounts
password_reset_tokens table for password reset functionality
Automatic timestamping for created/updated records

## Contributing

1. Fork the repository
2. Create a feature branch (git checkout -b feature/amazing-feature)
3. Commit your changes (git commit -m 'Add amazing feature')
4. Push to the branch (git push origin feature/amazing-feature)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please contact the development team or create an issue in the repository.

---

In Development
Advanced appointment scheduling
Medical records management
Secure messaging system
Medication management
Analytics and reporting

## Technology Stack

### Frontend
**React Native** with Expo
**TypeScript** for type safety
**Cross-platform** support (Web, Android, iOS)
**Responsive design** with adaptive layouts

### Backend
**Node.js** with Express
**SQLite** database
**JWT** authentication
**bcrypt** password hashing
**Nodemailer** for email services

---
## Getting Started

### Prerequisites
Node.js (v16 or higher)
npm or yarn
Expo CLI (npm install -g @expo/cli)
For mobile development: Expo Go app on your device

### Installation

1. **Clone the repository**
bash
   git clone <repository-url>
   cd PatientConnect360
  

2. **Install frontend dependencies**
bash
   npm install
  

3. **Install backend dependencies**
bash
   cd backend
   npm install
  

### Running the Application

#### Backend Server
bash
cd backend
npm run dev
The API server will start on http://localhost:3000

#### Frontend Application

**Web Development**
bash
npm run web

**Mobile Development (iOS)**
bash
npm run ios

**Mobile Development (Android)**
bash
npm run android

**Expo Development Build**
bash
npx expo start

## Default Login Credentials

For testing purposes, you can use these default accounts:

**Admin**: admin@patientconnect360.com / admin123
**Test Patient**: patient@example.com / password123
**Test Clinician**: clinician@example.com / password123
**Test Caregiver**: caregiver@example.com / password123

## API Endpoints

### Authentication
POST /api/register - User registration
POST /api/login - User login
POST /api/forgot-password - Request password reset
POST /api/reset-password - Reset password with token

### User Management
GET /api/profile - Get current user profile
GET /api/users - Get all users (admin only)
PUT /api/users/:id - Update user (admin only)
DELETE /api/users/:id - Delete user (admin only)

### Health Check
GET /api/health - API health status

## User Roles & Permissions

### Patient
View personal health information
Schedule appointments
Access medical records
Message healthcare providers
Manage medications

### Caregiver
Manage care recipients
Schedule appointments for patients
Update care plans
Communicate with care team

### Clinician
View patient list
Manage appointments
Update patient records
Communicate with patients

### Admin
Full system access
User management
System configuration
Analytics and reporting
