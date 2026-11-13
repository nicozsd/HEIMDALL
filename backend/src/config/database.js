import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Sequelize } from 'sequelize';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databasePath = path.resolve(__dirname, '../../heimdall.db');
const sequelize = new Sequelize({ dialect: 'sqlite', storage: databasePath, logging: false });

export default sequelize;
