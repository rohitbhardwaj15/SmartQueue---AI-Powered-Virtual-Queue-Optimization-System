🚦 SmartQueue

AI-Assisted Virtual Queue Optimization System

SmartQueue is a full-stack virtual queue management platform designed for hospitals, banks, and government offices.

It allows users to join a queue remotely, receive a dynamically generated token, view an estimated waiting time, and get a recommended time to visit based on historical queue patterns.

For administrators, SmartQueue provides live queue management and analytics such as current queue size, average predicted wait, daily trends, weekly patterns, and peak-hour heatmaps.

No More Long Queues — join virtually, know your wait, and visit at a better time.

✨ Key Features

👤 User Features

Join a virtual queue without standing physically in line

Support for:

🏥 Hospitals

🏦 Banks

🏛️ Government offices

Automatic token generation:

HSP-0001

BNK-0001

GOV-0001

Predicted waiting time

Traffic/crowd status

Best-time-to-visit suggestion

QR code generated for the queue token

Live queue board

Realtime queue updates through Socket.io

👨‍💼 Admin Features

Admin-protected queue operations

View users currently waiting

Mark queue entries as serving

Mark completed entries as done

View:

Total people in queue

Waiting count

Serving count

Average predicted waiting time

Peak hours

Queue growth chart for the latest 14 days

Weekly traffic trends

24-hour peak-hour heatmap

🤖 What "AI-Powered" Means in SmartQueue

SmartQueue currently uses an algorithmic prediction system rather than a trained machine-learning model.

The core wait-time prediction is a rule-based weighted calculation:

Predicted Wait
    =
Queue Length
×
Average Service Time
×
Historical Factor

Current service-time assumptions

Sector

Average Service Time

Hospital

12 minutes

Bank

8 minutes

Government Office

14 minutes

Other

10 minutes

A historical factor of 1.08 is applied when more than 30 recent records exist for the sector.

The final prediction is rounded and has a minimum value of 2 minutes.

Example

If:

Queue Length = 5
Average Service Time = 12 minutes
Historical Factor = 1.08

Then:

5 × 12 × 1.08 = 64.8

So the predicted wait becomes approximately:

65 minutes

Crowd classification

The prediction is converted into an easy-to-understand traffic message:

Wait < 20 min
      ↓
Low crowd now

20–44 min
      ↓
Moderate traffic

≥ 45 min
      ↓
High traffic expected

Best-time suggestion

The system analyzes historical queue entries by hour of day.

It:

Counts how many users joined during each hour.

Ranks the busiest hours.

Identifies the top 3 peak hours.

Compares the current hour against those peak periods.

Suggests a future non-peak hour when traffic is currently high.

So the current implementation is best described as:

Rule-based queue prediction + historical pattern analysis, not a trained ML model.

🧠 Prediction Architecture

                   Queue Data
                       │
                       ▼
              ┌─────────────────┐
              │ Queue Length    │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Sector          │
              │ Service Time    │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Historical      │
              │ Adjustment      │
              └────────┬────────┘
                       │
                       ▼
             ┌────────────────────┐
             │ Wait-Time Formula  │
             │ Q × S × H          │
             └─────────┬──────────┘
                       │
                       ▼
             ┌────────────────────┐
             │ Traffic Classifier │
             └─────────┬──────────┘
                       │
                       ▼
              User-Friendly ETA
                       │
                       ▼
             Best Visit Suggestion

🏗️ System Architecture

┌─────────────────────────────────────────────────────┐
│                   User / Admin                     │
└────────────────────────┬────────────────────────────
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              Next.js Frontend                       │
│                                                     │
│  Queue Form │ Live Queue │ QR Token │ Dashboard    │
│  Charts     │ Analytics  │ UI Components           │
└───────────────┬───────────────────┬─────────────────┘
                │                   │
             REST API            Socket.io
                │                   │
                ▼                   ▼
┌─────────────────────────────────────────────────────┐
│              Node.js + Express Backend              │
│                                                     │
│  Queue Routes │ Analytics │ Admin Auth              │
│  Repository   │ Prediction Service                  │
└───────────────┬─────────────────────────────────────┘
                │
                ▼
        ┌───────────────────┐
        │     MongoDB       │
        │   Queue Entries   │
        └───────────────────┘

🔄 Queue Workflow

User Opens SmartQueue
        ↓
Selects Sector + Branch
        ↓
Enters Name / Phone
        ↓
Joins Virtual Queue
        ↓
System Counts Waiting Users
        ↓
Token Generated
        ↓
Wait Time Predicted
        ↓
Traffic Message Generated
        ↓
Best Visit Time Calculated
        ↓
QR Token Displayed
        ↓
Realtime Queue Updates

🎟️ Token Generation

Tokens are generated according to the selected sector.

Sector

Prefix

Example

Hospital

HSP

HSP-0001

Bank

BNK

BNK-0001

Government

GOV

GOV-0001

The backend checks the latest token for the sector and increments its number.

Duplicate-token conflicts are retried up to three times.

⚡ Realtime Updates

SmartQueue uses Socket.io to keep the queue interface synchronized.

Events include:

queue:joined
queue:updated

When a user joins or an admin changes a queue status, connected clients can refresh their queue data without manually refreshing the browser.

📊 Admin Analytics

The dashboard provides operational insights from queue history.

Overview

┌────────────────┬────────────────┬────────────────┬─────────────────┐
│ Total in Queue │    Waiting     │    Serving     │ Avg Wait Time   │
├────────────────┼────────────────┼────────────────┼─────────────────┤
│       25       │       20       │       5        │      31.4m      │
└────────────────┴────────────────┴────────────────┴─────────────────┘

Available analytics

Current queue size

Waiting users

Users being served

Average predicted wait

Top 3 peak hours

14-day queue growth

Sunday–Saturday traffic distribution

Hour-by-hour queue heatmap

🗄️ Data Model

The main MongoDB collection is QueueEntry.

QueueEntry
│
├── tokenNumber
├── userName
├── phone
├── sector
├── branchName
├── priority
├── status
├── predictedWaitMinutes
├── estimatedServiceMinutes
├── joinedAt
├── servedAt
├── completedAt
├── createdAt
└── updatedAt

Status lifecycle

waiting
   │
   ▼
serving
   │
   ▼
done

🔌 API Documentation

Base URL:

http://localhost:4000

Queue APIs

Join Queue

POST /api/queue/join

Example request:

{
  "userName": "Rohit",
  "phone": "9876543210",
  "sector": "hospital",
  "branchName": "City Center"
}

Response contains:

Queue entry

Token number

Predicted wait

Traffic message

Best-time suggestion

Peak hours

Get Queue

GET /api/queue/list

Optional query parameters:

sector
branchName
status

Example:

GET /api/queue/list?sector=hospital&branchName=City%20Center&status=waiting

Predict Current Wait

GET /api/queue/predict

Optional parameters:

sector
branchName

Example:

GET /api/queue/predict?sector=hospital&branchName=City%20Center

Mark Entry as Serving

PATCH /api/queue/:id/serve

Admin protected.

Mark Entry as Done

PATCH /api/queue/:id/done

Admin protected.

📈 Analytics APIs

All analytics routes use the admin middleware.

Overview

GET /api/analytics/overview

Returns:

totalInQueue
waiting
serving
avgWaitingTime
peakHours

Trends

GET /api/analytics/trends

Returns:

dailyTrend
weeklyBuckets
hourlyHeatmap

🔐 Admin Authentication

Admin endpoints use an API key.

Request header:

x-admin-key: YOUR_ADMIN_API_KEY

If ADMIN_API_KEY is not configured, the current middleware allows the request through. For deployment, configure the variable and use a strong secret.

For a production system, static API-key authentication should be replaced with proper authentication and role-based access control.

🛠️ Tech Stack

Frontend

Next.js 16

React 18

TypeScript

Tailwind CSS

Recharts

Axios

Socket.io Client

Lucide React

QRCode React

Backend

Node.js

Express.js

MongoDB

Mongoose

Socket.io

CORS

Morgan

dotenv

Database

MongoDB Atlas

MongoDB Local

Deployment

Vercel-compatible frontend

Render-compatible backend

Environment-based configuration

📂 Project Structure

SmartQueue/
│
├── backend/
│   ├── api/
│   │   └── index.js
│   │
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── middleware/
│   │   │   └── adminAuth.js
│   │   ├── models/
│   │   │   └── QueueEntry.js
│   │   ├── routes/
│   │   │   ├── queue.routes.js
│   │   │   └── analytics.routes.js
│   │   ├── services/
│   │   │   ├── queueRepo.js
│   │   │   └── prediction.js
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── tests/
│   │   └── prediction.test.js
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── about/
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── join-queue-form.tsx
│   │   ├── queue-list.tsx
│   │   ├── navbar.tsx
│   │   └── loading-skeleton.tsx
│   │
│   ├── lib/
│   │   ├── api.ts
│   │   └── types.ts
│   │
│   ├── scripts/
│   │   ├── prebuild-clean.mjs
│   │   └── copy-out.mjs
│   │
│   ├── .env.example
│   └── package.json
│
├── render.yaml
├── .gitignore
└── README.md

⚙️ Getting Started

Prerequisites

Install:

Node.js 18+

npm

MongoDB or MongoDB Atlas

1. Clone the repository

git clone https://github.com/rohitbhardwaj15/SmartQueue---AI-Powered-Virtual-Queue-Optimization-System.git
cd SmartQueue---AI-Powered-Virtual-Queue-Optimization-System

If your GitHub repository uses a different name, replace the URL and directory name accordingly.

2. Backend Setup

cd backend
npm install

Create:

backend/.env

Use:

PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/smartqueue
CLIENT_ORIGIN=http://localhost:3000
ADMIN_API_KEY=change-this-admin-key

Start the backend:

npm run dev

Backend:

http://localhost:4000

Health check:

http://localhost:4000/health

3. Frontend Setup

Open another terminal:

cd frontend
npm install

Create:

frontend/.env.local

Add:

NEXT_PUBLIC_API_URL=http://localhost:4000

Start the frontend:

npm run dev

Frontend:

http://localhost:3000

🧪 Testing

The backend includes unit tests for the prediction logic.

Run:

cd backend
npm test

The prediction tests cover the core calculation and related prediction behavior.

🏭 Production Build

Build the frontend:

cd frontend
npm run build

Start the production frontend:

npm start

Backend production start:

cd backend
npm start

☁️ Deployment

Frontend — Vercel

Configure:

NEXT_PUBLIC_API_URL=https://your-backend-url

Then deploy the frontend directory.

Backend — Render

The repository includes render.yaml configured for the backend.

Configure:

MONGODB_URI=your_mongodb_connection_string
CLIENT_ORIGIN=your_frontend_url
PORT=4000

For production, also configure:

ADMIN_API_KEY=your_secure_admin_key

📱 User Experience

User flow

Home
 │
 ├── Select Sector
 │
 ├── Enter Name
 │
 ├── Enter Branch
 │
 └── Get Token
        │
        ▼
   Token Receipt
        │
        ├── Token Number
        ├── Predicted Wait
        ├── Traffic Status
        ├── Best Visit Time
        └── QR Code

Admin flow

Admin Login
     │
     ▼
Dashboard
     │
     ├── Current Queue
     ├── Queue Metrics
     ├── 14-Day Growth
     ├── Weekly Trends
     └── Peak-Hour Heatmap

🎯 Use Cases

🏥 Hospitals

Useful for:

OPD queues

Diagnostics

Registration desks

Non-emergency services

🏦 Banks

Useful for:

Customer service counters

Account services

Loan/documentation desks

🏛️ Government Offices

Useful for:

Certificates

Licenses

ID-related services

Citizen service counters

💡 Why SmartQueue?

Traditional physical queues create:

Long waiting times

Crowding

Poor visibility into expected wait

Inefficient customer flow

SmartQueue provides:

Physical Queue
      ↓
Virtual Queue
      ↓
Predictive ETA
      ↓
Crowd Insight
      ↓
Better Visit Timing

The system is designed to help organizations move from reactive queue handling toward data-informed queue management.

🔮 Future Improvements

The current prediction engine is intentionally lightweight and deterministic. A production-grade intelligent queue platform could evolve toward:

🤖 Machine Learning

Train regression models using historical wait-time data

Predict service time per branch and service type

Include day-of-week and time-of-day features

Incorporate holidays and special events

Learn branch-specific queue behavior

Possible future models:

Linear Regression
Random Forest
XGBoost
Gradient Boosting
Time-Series Models

🔐 Security

JWT authentication

Role-Based Access Control

User accounts

Refresh tokens

Audit logs

API rate limiting

Request validation

📲 Notifications

SMS

WhatsApp

Email

Push notifications

🏢 Multi-Branch / Multi-Tenant Architecture

Support:

Organization
   ├── Branch A
   ├── Branch B
   ├── Branch C
   └── Branch D

with organization-level and branch-level analytics.

📍 Advanced Queue Intelligence

Service-counter availability

Real-time branch capacity

Dynamic service-time estimation

Priority queue optimization

Appointment integration

Geo-aware branch recommendations

⚠️ Current Limitations

SmartQueue is a working project prototype, not a production insurance/healthcare/government service.

Current limitations include:

Wait prediction is algorithmic rather than ML-trained

Average service times are predefined by sector

Historical adjustment is currently a simple factor

Admin authentication uses an API key

Queue priority is stored but the current prediction formula does not dynamically optimize around priority

Notifications are not integrated with external providers

No production-grade multi-tenant authorization layer

These limitations provide clear paths for future development.

📊 Technical Highlights

SmartQueue demonstrates:

Full-stack Next.js + Express architecture

REST API design

MongoDB/Mongoose data modeling

Realtime communication with Socket.io

Algorithmic wait-time prediction

Historical data analysis

Queue state management

Admin-protected operations

Data visualization with Recharts

QR-code generation

Environment-driven deployment

Backend unit testing

👨‍💻 Developer

Rohit Bhardwaj

Computer Science & Engineering

Profiles

GitHub: @rohitbhardwaj15

LinkedIn: Rohit Bhardwaj

Portfolio: Bloom Tech Works

⭐ Project Summary

SmartQueue is a full-stack virtual queue optimization system that combines realtime queue management, algorithmic wait-time prediction, historical traffic analysis, and admin analytics to reduce physical waiting and improve service-center operations.

Built with

Next.js · React · TypeScript · Tailwind CSS · Node.js · Express.js · MongoDB · Mongoose · Socket.io · Recharts

📄 License

This project is developed for educational, portfolio, and demonstration purposes.
