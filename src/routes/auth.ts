import express from 'express';
import { AuthController } from '../controllers/auth';

const router = express.Router();

router.post('/auth/google', AuthController.googleSignIn);

export default router;