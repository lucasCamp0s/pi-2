import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/apiRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import './config/database.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;




