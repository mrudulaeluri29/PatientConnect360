# PatientConnect360

## Project Overview
PatientConnect360 is a full stack web and mobile patient portal designed for the home healthcare domain. The project demonstrates how modern health technology platforms can securely support patients, caregivers, clinicians, and administrators through role based digital workflows.

The system is built as a unified platform consisting of a React web application, a React Native mobile application, and a Node.js and Express backend written entirely in TypeScript. It is designed with security, access control, and scalability as core principles, reflecting real world healthcare application requirements.

This project serves as a flagship portfolio application showcasing end to end full stack development with a strong emphasis on health tech systems, data protection, and real world application design.

## Problem Statement
Home healthcare organizations often rely on fragmented tools for patient access, caregiver coordination, and clinician communication. These disconnected systems lead to inefficiencies, limited transparency for patients, and challenges in managing secure access across multiple user roles.

PatientConnect360 addresses this challenge by providing a centralized patient portal that models realistic healthcare workflows and demonstrates how a single secure platform can serve multiple stakeholders within a healthcare ecosystem.

## Key Features
- Role based authentication and authorization supporting Patients, Caregivers, Clinicians, and Admin users
- Secure login and registration using JWT based authentication
- Encrypted password storage using industry standard hashing techniques
- Password reset functionality with email OTP verification via Twilio Verify
- Separate web and mobile applications connected to a shared backend API
- Messaging endpoints to support secure communication between users
- Appointment scheduling flows with admin review (request/approve/deny), plus reschedule and cancel
- Clinician availability gating for scheduling, including a structured `availabilityHint` payload on conflicts
- In-app notification center (visit lifecycle + reminders) backed by `/api/notifications`
- Visit reminder scheduler with outbound delivery (Twilio SMS + SendGrid email), using per-user reminder preferences
- Message center upgrades (conversation starring + role-based conversation filtering endpoints)
- Administrative utilities for managing users and access levels
- Admin audit log viewer with pagination and date filtering
- Database seeding scripts for creating admin and test users
- Environment based configuration for secure credential management

## User Roles and Permissions
PatientConnect360 is built around clearly defined user roles to reflect real world home healthcare workflows. Each role has specific permissions enforced through role based authorization at the backend level.

### Patient
Patients represent individuals receiving home healthcare services.

Patients can:
- View and manage their personal profile information
- Authenticate securely using encrypted credentials and password reset workflows
- Access patient specific views in both web and mobile applications
- Send and receive messages through supported communication endpoints

Patients are restricted from accessing administrative or clinician specific functionality.

### Caregiver
Caregivers represent family members or assigned aides involved in patient support.

Caregivers can:
- Authenticate and access caregiver specific application views
- View limited patient related information within permitted scope
- Participate in messaging workflows where applicable

Caregivers do not have access to administrative controls or clinician level operations.

### Clinician
Clinicians represent healthcare professionals involved in patient care.

Clinicians can:
- Authenticate and access clinician specific dashboards
- View patient related information as permitted by role based access
- Participate in messaging workflows related to patient care

Clinicians are restricted from system level administration features.

### Administrator
Administrators manage system level configuration and access.

Administrators can:
- Create and manage user accounts
- Assign and manage user roles
- Access administrative utilities and protected routes
- Perform system level operations required for application management

Administrative access is protected through backend role based middleware to prevent unauthorized use.

## Role Based Access Control
Role based permissions are enforced at the backend API level using authorization middleware. Each protected route validates the authenticated user role before allowing access.

This approach ensures that sensitive healthcare data and system operations are accessible only to appropriate users, reinforcing security, reliability, and scalability.

## Skills Demonstrated

### Full Stack Development
- Designing and implementing a complete application across frontend, backend, and database layers
- Building shared APIs consumed by both web and mobile clients

### Frontend Engineering
- Developing a responsive web application using React, TypeScript, and Vite
- Structuring reusable components and managing application state
- Building a cross platform mobile application using React Native and Expo

### Backend Engineering
- Designing RESTful APIs using Node.js, Express, and TypeScript
- Implementing authentication, authorization, and middleware patterns
- Handling secure credential storage and token based authentication

### Database and Data Modeling
- Designing relational data models using Prisma ORM
- Managing schema migrations and database seeding
- Ensuring type safe data access across the application
- it follows referential integration

### Security and Access Control
- Encrypting all user passwords using secure hashing algorithms
- Managing environment based secrets and credentials
- Designing secure login, authentication, and password reset workflows

### Health Tech System Design
- Modeling real world healthcare roles and workflows
- Designing systems aligned with HIPAA security and privacy principles
- Building a foundation that supports compliance driven healthcare applications

## Tech Stack

### Frontend Web
- React
- TypeScript
- Vite

### Mobile Application
- React Native
- Expo

### Backend
- Node.js
- Express
- TypeScript

### Database and ORM
- Prisma ORM
- Relational database support through Prisma schema

### Authentication and Security
- JWT based authentication
- Role based authorization middleware
- Encrypted password storage and secure credential handling

### Tooling and Utilities
- Nodemon and ts node for development
- Environment variable management using dotenv
- Twilio Verify for OTP and password reset email verification
- SendGrid for appointment-related transactional emails (reminders + visit status updates)

## System Architecture Overview
PatientConnect360 follows a client server architecture with a shared backend API.

The backend server is built using Express and TypeScript and exposes endpoints for authentication, user management, messaging, and role validation. Role based middleware ensures that users can only access resources appropriate to their assigned role.

Both the web and mobile applications consume the same API, demonstrating a scalable architecture where multiple clients interact with a centralized backend service.

Prisma acts as the data access layer, providing a strongly typed interface to the database and supporting schema migrations and seed scripts.

## Database and Data Management
PatientConnect360 uses a relational database accessed through Prisma ORM to manage application data in a structured, type safe, and scalable manner.

### Prisma Schema and ORM
The Prisma schema defines core entities such as users and roles and supports authentication and role based workflows through clearly defined relationships.

### Migrations and Schema Management
Database schema changes are managed using Prisma migrations, allowing the system to evolve in a controlled and repeatable manner.

### Seeding and Test Data
Database seeding scripts are included to create initial admin users and test accounts, enabling quick setup and role based testing without manual configuration.

### Security and Data Access
All database interactions occur through the backend API. Clients never access the database directly. Authorization middleware ensures database operations are executed only when the authenticated user has appropriate permissions.

### Health Tech Considerations
The data layer prioritizes integrity, access control, and security, aligning with HIPAA security and privacy principles for healthcare applications. While this project is a prototype, the database design supports future enhancements such as audit logging and compliance tracking.

## Project Structure Overview

### Client
- Web application built with React and Vite
- Mobile application built with React Native and Expo

### Server
- Express API written in TypeScript
- Authentication routes and role based middleware
- Messaging routes
- Prisma schema and database configuration
- Scripts for creating admin and test users

### Repository root (`package.json`)
- Unified npm scripts for **Server** and **Client/web** using **`concurrently`** for local dev
- **Vercel** uses `npm run setup` from the root as the install step for the monorepo frontend build

## Monorepo scripts (run from repository root)

The root `package.json` orchestrates both backend and web. **First-time setup:** install root dev dependencies (including `concurrently`) with `npm install` at the repo root once, then install subprojects:

| Script | What it does |
|--------|----------------|
| `npm run setup` | Installs dependencies for **Server** and **Client/web** (includes devDependencies such as Vite, needed for CI and Vercel) |
| `npm run dev` | Runs **backend + frontend** together (Express dev server + Vite) |
| `npm run build` | Builds **Server** then **Client/web** (Prisma generate + `tsc`, then Vite production build) |
| `npm run start` | Starts the **backend** production server (`node dist/index.js` under `Server`) |
| `npm run lint` | Runs the **web** ESLint (`Client/web`) |

**Typical workflow**

1. From repo root: `npm install` (root, for `concurrently`)
2. First time (or after clone): `npm run setup`
3. Daily development: `npm run dev`
4. Full production build check: `npm run build` (verified from repo root for both server and web)

You can still run commands inside `Server/` or `Client/web/` directly when you only need one side.

## Setup and Local Development Overview

### Backend Setup
- Clone the repository and navigate to the Server directory (or use root scripts above)
- Install backend dependencies (`npm install` or `yarn`)
- Create an environment configuration file containing database connection details, authentication secrets, and Twilio credentials for OTP/email verification
    - Required variables: `DATABASE_URL`, `JWT_SECRET`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`
    - The `TWILIO_ACCOUNT_SID` must start with `AC` (Twilio will emit a warning otherwise and OTP routes will be disabled)
    - **Important**: if you are sending OTPs via the email channel you must configure an email integration (SendGrid) for the Verify service in the Twilio console. Without it you'll see error 60217 and the backend will return a 500 response.  Alternatively, switch the code to use SMS or remove the email requirement.
- Additionally, appointment reminders / visit status emails require SendGrid:
  - `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL` (verified sender in SendGrid)
  - `ENABLE_APPOINTMENT_EMAILS` (default enabled; set to `false` to disable appointment lifecycle emails)
  - `ENABLE_OUTBOUND_REMINDERS` (set to `true` to enqueue/send reminder jobs)
- Initialize the database using Prisma by applying the schema and running migrations (`npx prisma migrate dev`)
- Optionally run seed scripts to create admin and test users (`npm run seed:admin`)
- Start the backend server in development mode using nodemon and ts-node (`npm run dev`)

### Web Application Setup
- Navigate to the Client web directory (or use `npm run dev` from the repository root)
- Install frontend dependencies (`npm run setup` from root installs both Server and Client/web)
- Configure the API base URL to point to the locally running backend server (`VITE_API_URL` for production builds; dev defaults to `http://localhost:4000`)
- Start the Vite development server and access the application through the browser

### Mobile Application Setup
- Navigate to the Client mobile directory
- Install mobile dependencies
- Start the Expo development server
- Run the application on an emulator or physical device using Expo Go

This setup enables full end to end testing of application workflows across web and mobile platforms using a shared backend.


## Current Status and Limitations
- Several user interface pages are implemented as placeholders to prioritize backend architecture and authentication flows
- The application is not yet deployed to a public production environment
- Audit logging is implemented for core appointment/messaging actions; extended regulatory/compliance reporting is still being built

## Health Tech and HIPAA Alignment
PatientConnect360 is intentionally designed with healthcare security and privacy considerations in mind.

The application follows HIPAA aligned best practices, including encrypted password storage, strict role based access control, backend enforced authorization, and environment based secret management.

While this project is not a certified HIPAA compliant system, its architecture and security practices reflect the foundational requirements expected of healthcare software systems and can be extended to meet formal compliance standards.

## Future Enhancements
- Containerized deployment using Docker
- Automated testing and continuous integration pipelines
- Expanded messaging and notification workflows
- Care plan management and expanded scheduling communication (beyond current visit notifications/reminders)
- Improved UI polish, accessibility, and usability
- Public demo deployment for recruiter and revieweraccess

## Why This Project Matters
PatientConnect360 was built as a flagship portfolio project to demonstrate the ability to design and implement a realistic, scalable, and secure full stack application within the health tech domain.

It highlights hands on experience with modern frontend and backend technologies, mobile development, authentication and security, database modeling, and system architecture, all within a domain that demands reliability, privacy, and thoughtful design.



