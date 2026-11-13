import { Router } from 'express';
import * as controller from '../controllers/table.controller.js';

const router = Router();
router.post('/get_nextRecid', controller.getNextRecid);
router.post('/get_nextnum', controller.getNextNumber);
router.post('/find', controller.find);
router.post('/get_existlogin', controller.login);
router.post('/table_States', controller.change);

export default router;
