# DEV-CHAT

DEV-CHAT is a full-stack real-time chat application built with React, Vite, Node.js, Express, MongoDB, Socket.IO, and Firebase. It supports private messaging, group chats, chat requests, reminders, scheduled messages, calls, and an admin dashboard in a modern, responsive UI.

LIVE : - https://dev-chat-tan.vercel.app/
## Features

- Real-time private and group messaging
- User authentication and profile management
- Chat request flow for connecting with other users
- Group creation and membership management
- Scheduled messages and reminders
- Voice/video calling support
- Admin dashboard with analytics and moderation tools
- Secure API design with rate limiting and input sanitization
- Cloudinary-based media uploads
- Firebase push notifications support

##Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- React Router
- Socket.IO Client
- Firebase
- Framer Motion

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- Socket.IO
- JWT authentication
- Cloudinary
- Nodemailer
- Firebase Admin SDK

## Project Structure

DEV-CHAT/
├── client/          # React frontend
├── server/          # Express backend
└── README.md        # Project documentation

##  Getting Started

### 1. Clone the repository
clone repo 

### 2. Install dependencies

#### Client

cd client
npm install

#### Server

cd ../server
npm install

### 3. Configure environment variables

Create a .env file in the server folder with the following variables:

```env
PORT=5001
CLIENT_URL=http://localhost:5173
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
MESSAGE_SECRET_KEY=your_message_encryption_key

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY=your_firebase_private_key

SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```


### 4. Run the app

#### Start the backend
```bash
cd server
npm run server
```

#### Start the frontend
```bash
cd client
npm run dev
```

Then open:
- Frontend: http://localhost:5173
- Backend: http://localhost:5001

## 📜 Available Scripts

### Client
```bash
npm run dev      # start development server
npm run build    # build for production
npm run preview  # preview production build
npm run lint     # run ESLint
```

### Server
```bash
npm run server   # start server with nodemon
npm start        # start production server
```

## 🔐 Notes

- The backend uses MongoDB for persistence and Socket.IO for real-time communication.
- Firebase is used for push notifications and related features.
- Cloudinary handles profile and media uploads.
- The app includes security middleware such as rate limiting, helmet, and input sanitization.

## 🤝 Contributing

Contributions are welcome. If you would like to improve the project, please open an issue or submit a pull reque
