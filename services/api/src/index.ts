import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import dotenv from 'dotenv'

import { authRouter } from './routes/auth.routes'
import { usersRouter } from './routes/users.routes'
import { doctorsRouter } from './routes/doctors.routes'
import { analysisRouter } from './routes/analysis.routes'
import { arRouter } from './routes/ar.routes'
import { appointmentsRouter } from './routes/appointments.routes'
import { errorHandler } from './middleware/errorHandler'
import { authMiddleware } from './middleware/auth'
import { setupWebSocket } from './websocket'

dotenv.config()

const app = express()
const httpServer = createServer(app)

// Socket.IO setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
})

// Make io accessible to routes
app.set('io', io)

setupWebSocket(io)

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes
app.use('/api/auth', authRouter)
app.use('/api/users', authMiddleware, usersRouter)
app.use('/api/doctors', doctorsRouter)
app.use('/api/analysis', authMiddleware, analysisRouter)
app.use('/api/ar', authMiddleware, arRouter)
app.use('/api/appointments', authMiddleware, appointmentsRouter)

// Error handling
app.use(errorHandler)

const PORT = process.env.PORT || 4000

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
