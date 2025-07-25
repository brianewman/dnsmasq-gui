import express from 'express';
import cors from 'cors';
import { config } from './config/config';
import { authRoutes } from './routes/auth';
import { dnsmasqRoutes } from './routes/dnsmasq';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

const app = express();

// CORS configuration
app.use(cors({
  origin: config.allowedOrigins,
  
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));

// Routes
app.use('/api/auth', authRoutes);

// Add comprehensive request logging
app.use('/api/dnsmasq', (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - User-Agent: ${req.get('User-Agent')}`);
  console.log(`Headers:`, JSON.stringify(req.headers, null, 2));
  next();
});

app.use('/api/dnsmasq', authMiddleware, dnsmasqRoutes);

// Error handling
app.use(errorHandler);

// Start server
const PORT = config.port || 3000;
app.listen(PORT, () => {
  console.log(`DNSmasq GUI server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
});
