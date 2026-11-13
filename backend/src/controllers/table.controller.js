import * as repository from '../repositories/table.repository.js';

export async function getNextRecid(req, res, next) {
    try { res.json({ nextRecid: await repository.getNextRecid(req.body.tableid) }); } catch (error) { next(error); }
}

export async function getNextNumber(req, res, next) {
    try {
        const { tableid, const: prefix, code: mask } = req.body;
        res.json({ code: await repository.getNextCode(tableid, prefix, mask) });
    } catch (error) { next(error); }
}

export async function find(req, res, next) {
    try { res.json({ json: await repository.find(req.body.tableid, req.body.query) }); } catch (error) { next(error); }
}

export async function login(req, res, next) {
    try {
        const { email, senha, currentUser } = req.body;
        const { type, user } = await repository.findLogin(email, currentUser);
        if (!user || String(user.acess_key).trim() !== String(senha ?? '').trim()) {
            return res.json({ success: false, infolog: user ? 'Senha incorreta.' : `${type} não localizado.` });
        }
        return res.json({ success: true, user });
    } catch (error) { return next(error); }
}

export async function change(req, res, next) {
    try {
        const { tableid, type, data, query } = req.body;
        const result = await repository.change(tableid, type, data, query);
        if (result.affected === 0) return res.status(404).json({ success: false, message: 'Registro não encontrado.' });
        return res.json({ success: true, ...result, message: 'Transação concluída com sucesso.' });
    } catch (error) { return next(error); }
}
