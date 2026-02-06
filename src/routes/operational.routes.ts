import { Router } from 'express';
import { readiness, liveness, metrics } from '../controllers/operational.controller.js';

const router = Router();

// Health check endpoints - Kubernetes standard convention
router.get('/health/ready', readiness as any); // Standard path
router.get('/health/live', liveness as any); // Standard path for Docker HEALTHCHECK
router.get('/metrics', metrics as any);

export default router;
