# 🚀 SmartQueue - AI-Powered Virtual Queue Optimization System (MERN Stack)

[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)]()
[![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)]()
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)]()
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)]()

A production-ready, full-stack queue management system built with the MERN stack. Features AI-powered wait time predictions, real-time updates via Socket.io, and comprehensive analytics.

## ✨ Features

### 🤖 AI-Powered Intelligence
- **Dynamic Wait Time Prediction** using multi-factor analysis
- **Peak Hour Detection** (10-12 PM, 3-5 PM)
- **Self-Learning System** with accuracy correction
- **Smart Recommendations** for counter management

### 🔄 Real-Time System
- **Socket.io** for instant updates
- **Live token tracking** without refresh
- **Multi-counter support**
- **Priority queueing** (Senior/Urgent)

### 📊 Analytics Dashboard
- Traffic visualization with Recharts
- Hourly/weekly pattern analysis
- Counter utilization metrics
- Prediction accuracy tracking

## 🏗️ Tech Stack

```
Frontend:  React 18 + Tailwind CSS + Recharts + React Query
Backend:   Node.js + Express + Socket.io
Database:  MongoDB + Mongoose
AI Engine: Custom JavaScript algorithms
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/smartqueue-mern.git
cd smartqueue-mern
```

### 2. Setup Backend
```bash
cd server
cp .env.example .env  # Edit with your MongoDB URI
npm install
npm run seed          # Seed database with demo data
npm run dev           # Start server on port 5000
```

### 3. Setup Frontend
```bash
cd ../client
npm install
npm start             # Start React app on port 3000
```

Visit: `http://localhost:3000`

## 📁 Project Structure

```
smartqueue-mern/
├── server/
│   ├── models/          # Mongoose schemas (Queue, Analytics, User)
│   ├── routes/          # API routes (queues, tokens, analytics, ai)
│   ├── utils/           # AI prediction engine
│   ├── scripts/         # Database seeder
│   └── server.js        # Entry point with Socket.io
├── client/
│   ├── src/
│   │   ├── components/  # Navbar, QueueCard, AIInsights
│   │   ├── pages/       # Dashboard, QueueDetail, AdminPanel
│   │   ├── hooks/       # useQueues (React Query)
│   │   └── context/     # SocketContext
│   └── package.json
└── README.md
```

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/queues` | Get all queues |
| POST | `/api/queues` | Create new queue |
| GET | `/api/queues/:id` | Get queue details |
| POST | `/api/tokens/issue` | Issue new token |
| POST | `/api/tokens/serve` | Serve next token |
| GET | `/api/analytics/dashboard/:id` | Get dashboard data |
| GET | `/api/analytics/insights/:id` | Get AI insights |

## 🤖 AI Algorithm

```javascript
Estimated Wait = Base Time × Time Multiplier × Day Multiplier × History Correction

Where:
- Base Time = (Queue Length / Counters) × Avg Service Time
- Time Multiplier = 1.5 (peak), 0.8 (off-peak)
- Day Multiplier = 1.3 (Mon/Fri), 0.6 (weekends)
- History Correction = Actual/Predicted ratio
```

## 🌐 Deployment

### MongoDB Atlas
1. Create free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Get connection string
3. Update `MONGODB_URI` in `.env`

### Heroku (Backend)
```bash
cd server
heroku create smartqueue-api
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set JWT_SECRET=your_secret
git push heroku main
```

### Vercel (Frontend)
```bash
cd client
vercel --prod
```

## 📝 Environment Variables

### Server `.env`
```env
MONGODB_URI=mongodb://localhost:27017/smartqueue
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:3000
```

### Client `.env`
```env
REACT_APP_API_URL=http://localhost:5000
```

## 🧪 Testing

```bash
# Backend
cd server
npm test

# Frontend
cd client
npm test
```

## 🚀 Future Enhancements

- [ ] SMS/WhatsApp notifications
- [ ] Mobile app (React Native)
- [ ] Advanced ML with TensorFlow.js
- [ ] Multi-language support
- [ ] QR code check-in

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your Profile](https://linkedin.com/in/yourprofile)

---

**Built with ❤️ using the MERN Stack**