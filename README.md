# 💬 ChatApp

A full-stack real-time chat application built with the MERN stack that enables users to communicate through private and group conversations. The application provides secure authentication, real-time messaging using Socket.IO, group management, file sharing, and an intuitive modern user interface.

---

##  Features

### Authentication
- Google OAuth Login
- JWT Authentication
- Persistent Login using Cookies

### 💬 Messaging
- One-to-One Chat
- Real-time Messaging with Socket.IO
- Typing Indicators
- Online/Offline Status
- Read Receipts
- Message Time Stamps

### 👥 Group Chat
- Create Groups
- Edit Group Name & Description
- Add Members
- Remove Members
- Leave Group
- Transfer Admin Rights
- Delete Group
- Real-time Group Updates

### 📂 Media Sharing
- Upload Images
- Upload Files
- Download Attachments

### 🎨 User Interface
- Responsive Design
- Modern Chat Interface
- Group Information Panel
- Scrollable Chat History

---

## 🛠 Tech Stack

### Frontend
- React.js
- Vite
- React 
- Socket.IO Client

### Backend
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- Socket.IO

### Authentication
- JWT
- Passport.js
- Google OAuth 2.0
- bcrypt

### Other Libraries
- Multer
- Cookie Parser
- dotenv
- CORS

---

## 📁 Project Structure

```
ChatApp/
│
├── chatapp/                 # Frontend (React + Vite)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── server/                  # Backend (Express + MongoDB)
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── uploads/
│   ├── config/
│   ├── index.js
│   └── package.json
│
└── README.md
```

---


## 📡 Socket Events

### Client → Server

- send_message
- typing
- stop_typing
- create_group
- update_group_info
- add_group_member
- remove_group_member

### Server → Client

- receive_message
- typing
- stop_typing
- group_created
- group_info_updated
- group_member_added
- group_member_removed
- group_deleted

---

 project is licensed under the MIT License.
