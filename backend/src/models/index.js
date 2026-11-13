import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const models = {};
const aliases = new Map();

function dataTypeFromSql(type = '') {
    const normalized = type.toUpperCase();
    if (normalized.includes('INT') || normalized.includes('BOOL')) return DataTypes.INTEGER;
    if (normalized.includes('REAL') || normalized.includes('FLOAT') || normalized.includes('DOUBLE') || normalized.includes('DECIMAL')) return DataTypes.FLOAT;
    if (normalized.includes('BLOB')) return DataTypes.BLOB;
    if (normalized.includes('DATE') || normalized.includes('TIME')) return DataTypes.DATE;
    return DataTypes.TEXT;
}

function aliasesFor(tableName) {
    const names = new Set([tableName]);
    if (tableName.endsWith('ies')) names.add(`${tableName.slice(0, -3)}y`);

    const [first, ...remaining] = tableName.split('_');
    if (remaining.length && !first.endsWith('s')) names.add(`${first}s_${remaining.join('_')}`);
    return names;
}

export async function initializeModels() {
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();

    for (const table of tables) {
        const tableName = typeof table === 'string' ? table : table.tableName ?? table.name;
        if (!tableName || tableName.startsWith('sqlite_')) continue;

        const columns = await queryInterface.describeTable(tableName);
        const attributes = Object.fromEntries(Object.entries(columns).map(([name, column]) => [name, {
            type: dataTypeFromSql(column.type),
            allowNull: column.allowNull,
            primaryKey: column.primaryKey,
            autoIncrement: column.autoIncrement,
        }]));
        const model = sequelize.define(tableName, attributes, { tableName, timestamps: false });
        models[tableName] = model;
        for (const alias of aliasesFor(tableName)) aliases.set(alias, model);
    }
}

export function getModel(tableId) {
    const model = aliases.get(tableId);
    if (!model) {
        const error = new Error(`Tabela '${tableId}' não é permitida.`);
        error.status = 400;
        throw error;
    }
    return model;
}

export function getModelWithColumns(columns) {
    return Object.values(models).find((model) => columns.every((column) => Object.hasOwn(model.rawAttributes, column)));
}
