#  OTP Authentication System

A full-stack OTP-based authentication system built with Node.js, Express, KeystoneJS, and React Native (Expo).

This project demonstrates secure phone authentication using SMS OTP, optional 4-digit PIN setup, and JWT-based session handling. The architecture is designed to be scalable and production-ready.

---

##  Features

- Phone number login
- One-Time Password (OTP) verification
- Optional 4-digit PIN setup
- Login via OTP even if PIN exists
- Secure PIN hashing with bcrypt
- JWT authentication
- Clean modular backend structure
- Secure token storage on client

---

##  Architecture

```
Client (React Native)
        ↓
Express API (Node.js)
        ↓
Keystone 6 (GraphQL)
        ↓
Database (SQLite / PostgreSQL)
```

---

## 🧠 System Mind Map

```
OTP Authentication System
│
├── Authentication
│   ├── OTP Login
│   ├── PIN Setup
│   ├── PIN Verification
│   └── Skip PIN
│
├── Backend
│   ├── Express Server
│   ├── GraphQL (Keystone)
│   ├── JWT Tokens
│   └── bcrypt Hashing
│
├── Frontend
│   ├── Login Screen
│   ├── OTP Input Screen
│   ├── PIN Setup Modal
│   └── Secure Token Storage
│
└── Security
    ├── Token Expiration
    ├── OTP Expiry
    ├── Input Validation
    └── Error Handling
```

---

## 🛠 Tech Stack

### Backend
- Node.js
- Express
- Keystone 6
- GraphQL
- bcryptjs
- JSON Web Tokens (JWT)

### Frontend
- React Native (Expo)
- Axios
- Expo SecureStore

---

# ⚙️ Installation Guide

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/dorsasalimi/otp-authentication.git
cd otp-authentication
```

---

## 2️⃣ Install Dependencies

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd mobile
npm install
```

---

## 3️⃣ Setup Environment Variables

Create a `.env` file inside the `backend` folder:

```
PORT=3004
JWT_SECRET=your_super_secret_key
DATABASE_URL=file:./keystone.db
```

If using an SMS provider:

```
SMS_API_KEY=your_key
SMS_API_SECRET=your_secret
```

---

## 4️⃣ Run the Backend

```bash
cd backend
npm run dev
```

Keystone will run on:

```
http://localhost:3000
```

Express API will run on:

```
http://localhost:3004
```

---

## 5️⃣ Run the Frontend

```bash
cd mobile
npx expo start
```

Scan the QR code with Expo Go or run on emulator.

---

# 🔐 Authentication Flow

## OTP Login Flow

1. User enters phone number
2. Server generates OTP
3. OTP sent via SMS
4. User enters OTP
5. Server verifies OTP
6. JWT token generated
7. Token stored securely

---

## PIN Flow

- After OTP verification:
  - User can create a 4-digit PIN
  - PIN is hashed using bcrypt
  - Stored in database
- On next login:
  - User may login via OTP
  - OR verify using PIN

---

# 📁 Project Structure

```
root/
│
├── backend/
│   ├── api/
│   │   ├── otp.ts
│   │   ├── pin.ts
│   │   └── auth.ts
│   ├── keystone/
│   └── server.ts
│
├── mobile/
│   ├── app/
│   ├── components/
│   └── screens/
│
└── README.md
```

---

# 🧪 Testing API

You can test endpoints using Postman or Thunder Client.

Example OTP request:

```http
POST /api/otp
Content-Type: application/json

{
  "phoneNumber": "09123456789"
}
```

---

# 🛡 Security Considerations

- PINs hashed using bcrypt
- JWT signed with secret key
- OTP expiration enforced
- Input validation
- Secure client-side token storage

---

# 🚀 Production Recommendations

Before deploying:

- Use PostgreSQL instead of SQLite
- Enable HTTPS
- Add rate limiting to OTP endpoint
- Implement refresh tokens
- Add monitoring & logging
- Secure environment variables

---

# ⭐ Project Purpose

This project showcases:

- Real-world authentication architecture
- Secure credential handling
- Backend modular design
- Production-grade authentication flow
- Full-stack development skills

---

If you find this project useful, feel free to star the repository.
