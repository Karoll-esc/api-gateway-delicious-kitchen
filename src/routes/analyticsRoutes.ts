import { Router } from 'express';
import { getAdminAnalytics, postAdminAnalyticsExport } from '../controllers/analyticsController';
import { verifyFirebaseToken } from '../middleware/verifyFirebaseToken';
import { requireRole } from '../middleware/requireRole';

const router = Router();

// Aplicar autenticación y autorización a todas las rutas de analytics
// Solo los administradores pueden acceder a analytics
router.use(verifyFirebaseToken);
router.use(requireRole(['ADMIN']));

router.get('/admin/analytics', getAdminAnalytics);
router.post('/admin/analytics/export', postAdminAnalyticsExport);

export default router;