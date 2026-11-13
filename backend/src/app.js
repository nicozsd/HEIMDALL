import cors from 'cors';
import express from 'express';
import apiRoutes from './routes/api.routes.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(apiRoutes);
app.use((error, req, res, next) => {
    console.error(error);
    res.status(error.status ?? 500).json({ success: false, message: error.message ?? 'Erro interno do servidor.' });
});

export default app;
