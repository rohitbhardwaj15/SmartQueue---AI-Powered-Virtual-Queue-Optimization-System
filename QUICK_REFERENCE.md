# 🚀 SmartQueue - Quick Reference

## 📦 Project Files

### Server (Backend)
```
server/
├── models/
│   ├── Queue.js          # Queue & Token schema
│   ├── Analytics.js      # Time-series data
│   └── User.js           # Admin users
├── routes/
│   ├── queues.js         # Queue CRUD operations
│   ├── tokens.js         # Token issue/serve/complete
│   ├── analytics.js      # Dashboard & insights
│   └── ai.js             # AI predictions
├── utils/
│   └── aiPredictor.js    # AI algorithm
├── scripts/
│   └── seedData.js       # Database seeder
├── server.js             # Entry point
├── package.json          # Dependencies
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules
└── Procfile              # Heroku config
```

### Client (Frontend)
```
client/
├── src/
│   ├── components/
│   │   ├── Navbar.js     # Navigation bar
│   │   ├── QueueCard.js  # Queue display card
│   │   └── AIInsights.js # AI metrics display
│   ├── pages/
│   │   ├── Dashboard.js  # Main dashboard
│   │   ├── QueueDetail.js # Queue management
│   │   └── AdminPanel.js # Admin controls
│   ├── hooks/
│   │   └── useQueues.js  # React Query hooks
│   ├── context/
│   │   └── SocketContext.js # Real-time connection
│   ├── App.js            # Main app component
│   ├── index.js          # Entry point
│   └── index.css         # Tailwind styles
├── package.json          # Dependencies
├── tailwind.config.js    # Tailwind config
├── postcss.config.js     # PostCSS config
└── .gitignore            # Git ignore rules
```

## 🚀 Quick Commands

### Setup
```bash
# Backend
cd server
cp .env.example .env
npm install
npm run seed
npm run dev

# Frontend
cd client
npm install
npm start
```

### GitHub Upload
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/smartqueue-mern.git
git push -u origin main
```

### Deployment
```bash
# Heroku (Backend)
cd server
heroku create smartqueue-api
heroku config:set MONGODB_URI=your_uri
heroku config:set JWT_SECRET=your_secret
git push heroku main

# Vercel (Frontend)
cd client
vercel --prod
```

## 🔧 Key Features

- ✅ AI-powered wait time prediction
- ✅ Real-time updates via Socket.io
- ✅ Multi-queue management
- ✅ Priority queueing
- ✅ Analytics dashboard
- ✅ Admin panel
- ✅ Responsive design
- ✅ Production-ready

## 💡 Tech Stack

- **Frontend**: React 18, Tailwind CSS, Recharts
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB, Mongoose
- **AI**: Custom JavaScript algorithms

## 📞 Support

For issues or questions, please open a GitHub issue.

---
**Built with ❤️ using the MERN Stack**
