import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { getModel, getModelWithColumns } from '../models/index.js';

function badRequest(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}

function assertAllowedFields(model, values, label) {
    if (!values || typeof values !== 'object' || Array.isArray(values)) throw badRequest(`${label} deve ser um objeto.`);
    for (const field of Object.keys(values)) {
        if (!Object.hasOwn(model.rawAttributes, field) || field === 'id') throw badRequest(`Campo '${field}' não é permitido.`);
    }
}

function buildWhere(model, query = {}) {
    assertAllowedFields(model, query, 'query');
    const operators = { '>=': Op.gte, '<=': Op.lte, '!=': Op.ne, '>': Op.gt, '<': Op.lt, '=': Op.eq };
    return Object.fromEntries(Object.entries(query).map(([field, condition]) => {
        const match = typeof condition === 'string' && condition.match(/^(>=|<=|!=|>|<|=)(.+)$/);
        return [field, match ? { [operators[match[1]]]: match[2].trim() } : { [Op.eq]: condition }];
    }));
}

function withoutInternalId(row) {
    const { id, ...result } = row;
    return result;
}

export async function find(tableId, query) {
    const model = getModel(tableId);
    const rows = await model.findAll({ where: buildWhere(model, query ?? {}), raw: true });
    return rows.map(withoutInternalId);
}

export async function getNextRecid(tableId) {
    const model = getModel(tableId);
    if (!Object.hasOwn(model.rawAttributes, 'Recid')) return 1;
    return Number(await model.max('Recid') ?? 0) + 1;
}

export async function getNextCode(tableId, requestedPrefix, requestedMask) {
    const model = getModel(tableId);
    const isUserCode = Object.hasOwn(model.rawAttributes, 'user');
    const field = isUserCode ? 'user' : 'ticketId';
    const parameterColumns = isUserCode
        ? ['UserSequence', 'UserCode']
        : ['TicketSequence', 'TicketCode'];
    const parameterModel = getModelWithColumns(parameterColumns);
    const parameters = parameterModel ? await parameterModel.findOne({ raw: true }) : null;
    const prefix = requestedPrefix ?? parameters?.[parameterColumns[0]];
    const mask = requestedMask ?? parameters?.[parameterColumns[1]];
    if (!prefix || !mask || !Object.hasOwn(model.rawAttributes, field)) throw badRequest('Parâmetros ou tabela inválidos para gerar o código.');

    const rows = await model.findAll({ attributes: [field], raw: true });
    const maxNumber = rows.reduce((maximum, row) => {
        const number = Number.parseInt(String(row[field] ?? '').replace(prefix, ''), 10);
        return Number.isFinite(number) ? Math.max(maximum, number) : maximum;
    }, 0);
    return `${prefix}${String(maxNumber + 1).padStart(mask.length, '0')}`.trim();
}

export async function findLogin(login, currentUser) {
    const type = currentUser === 'cliente' ? 'company' : 'employee';
    const usersModel = getModelWithColumns(['user', 'user_name', 'email', 'acess_key', 'register_type']);
    if (!usersModel) throw badRequest('Tabela de usuários não encontrada no banco.');
    const user = await usersModel.findOne({
        where: { [Op.and]: [{ [Op.or]: [{ user: login }, { user_name: login }, { email: login }] }, { register_type: type }] },
        raw: true,
    });
    return { type, user: user ? withoutInternalId(user) : null };
}

export async function change(tableId, type, data = {}, query = {}) {
    const model = getModel(tableId);
    if (!['insert', 'update', 'delete'].includes(type)) throw badRequest("type deve ser 'insert', 'update' ou 'delete'.");
    if (type !== 'delete') assertAllowedFields(model, data, 'data');
    if (type !== 'insert') assertAllowedFields(model, query, 'query');
    if (type !== 'insert' && Object.keys(query).length === 0) throw badRequest('query é obrigatória para update e delete.');

    return sequelize.transaction(async (transaction) => {
        if (type === 'insert') {
            const created = await model.create(data, { transaction });
            return { affected: 1, row: withoutInternalId(created.get({ plain: true })) };
        }
        const where = buildWhere(model, query);
        if (type === 'update') {
            const [affected] = await model.update(data, { where, transaction });
            return { affected };
        }
        return { affected: await model.destroy({ where, transaction }) };
    });
}
