# Convex App

Convex is a full-stack event discovery mobile application built with React Native CLI, Express, and MongoDB. The core feature of Convex is its **Dynamic Category Theming**, which adapts the UI based on the event category (e.g., Tech, Social, Corporate, Arts).

## Features

- **Full Auth Flow:** JWT-based access and refresh tokens, persisted securely.
- **Role-based Access:** Standard users and Admin users.
- **Event Discovery:** Filter events by category and see dynamic themes.
- **Geospatial Queries:** "Explore" feature uses MongoDB `2dsphere` index to fetch nearby events.
- **Admin Workflow:** Users can create events that remain "pending" until an Admin approves or rejects them.
- **Capacity Management:** Real-time event joining with capacity caps.

## Technologies Used

### Frontend
- React Native CLI (not Expo)
- TypeScript
- React Navigation (Bottom Tabs + Stack)
- Zustand (Global State)
- Tanstack React Query (Server Cache + optimistic UI updates)
- React Native FastImage, React Native Reanimated, FlashList
- Axios (with interceptors)

### Backend
- Node.js + Express
- TypeScript
- MongoDB + Mongoose (GeoJSON)
- JWT (jsonwebtoken)
- bcryptjs
- Zod Validation

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB connection string
- React Native environment set up for Android/iOS

### Backend Setup

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   **Crucial:** Ensure you enter a valid `MONGODB_URI` in the `.env` file.
4. Start the server:
   ```bash
   npm run dev
   ```
5. Seed an admin user (optional):
   ```bash
   npm run seed:admin admin@test.com
   ```

### Frontend Setup

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. For iOS (macOS only):
   ```bash
   cd ios && pod install && cd ..
   ```
4. Run the Metro bundler:
   ```bash
   npm start
   ```
5. Run on Android or iOS:
   ```bash
   npm run android
   # OR
   npm run ios
   ```

## Folder Structure

- `/backend/src/features` - Express domain-driven routes, controllers, and services.
- `/backend/src/shared` - Middlewares, config, and utilities.
- `/frontend/src/features` - React Native domain-driven screens and components.
- `/frontend/src/shared` - Reusable UI, hooks, and API clients.
- `/frontend/src/navigation` - React Navigation configuration.

## Design Philosophy

This app adheres to high aesthetic standards. By leveraging `CategoryThemeProvider`, the user interface transforms seamlessly depending on what the user is browsing, eliminating the generic "cookie-cutter" app feel and leaning into specialized aesthetics.
