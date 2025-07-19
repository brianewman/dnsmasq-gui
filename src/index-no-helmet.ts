import express from 'express';
import cors from 'cors';
// import helmet from 'helmet';  // Temporarily disabled for troubleshooting
import { config } from './config/config';
import { authRoutes } from './routes/auth';
import { dnsmasqRoutes } from './routes/dnsmasq';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';

const app = express();

// Security middleware - TEMPORARILY DISABLED FOR TROUBLESHOOTING
// app.use(helmet({
//   contentSecurityPolicy: {
//     directives: {
//       defaultSrc: ["'self'"],
//       scriptSrc: [
//         "'self'",
//         "'unsafe-inline'", // Allow inline scripts for Bootstrap functionality
//         "'unsafe-hashes'", // Allow inline event handlers
//         "https://cdn.jsdelivr.net"
//       ],
//       scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers like onclick
//       styleSrc: [
//         "'self'",
//         "'unsafe-inline'", // Allow inline styles for Bootstrap
//         "https://cdn.jsdelivr.net"
//       ],
//       fontSrc: [
//         "'self'",
//         "https://cdn.jsdelivr.net"
//       ],
//       connectSrc: ["'self'"],
//       imgSrc: ["'self'", "data:", "https:"],
//       objectSrc: ["'none'"]
//     }
//   },
//   // Disable problematic headers for local network HTTP deployment
//   crossOriginOpenerPolicy: false,
//   originAgentCluster: false,
//   crossOriginEmbedderPolicy: false,
//   // Disable HTTPS enforcement headers
//   hsts: false,
//   noSniff: true,
//   frameguard: { action: 'deny' },
//   xssFilter: true
// }));

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
app.use('/api/dnsmasq', authMiddleware, dnsmasqRoutes);

// Error handling
app.use(errorHandler);

// Start server
const PORT = config.port || 3000;
app.listen(PORT, () => {
  console.log(`DNSmasq GUI server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log('TROUBLESHOOTING: Helmet.js disabled');
});
