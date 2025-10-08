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

