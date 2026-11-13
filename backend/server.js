import app from './src/app.js';
import sequelize from './src/config/database.js';
import { initializeModels } from './src/models/index.js';

const port = Number(process.env.PORT ?? 3001);

async function start() {
    await sequelize.authenticate();
    await initializeModels();
    app.listen(port, () => console.log(`Servidor rodando em http://localhost:${port}`));
}

start().catch((error) => {
    console.error('Falha ao inicializar o banco:', error);
    process.exit(1);
});
