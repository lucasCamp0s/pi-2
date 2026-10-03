import { Router } from 'express';
import { geocodingController } from '../controllers/geocodingController.js';
import { placeController } from '../controllers/placeController.js';

const router = Router();
router.get('/geocoding/search', geocodingController.search);
router.get('/accessibility-features', placeController.getAccessibilityCatalog);
router.get('/places', placeController.list);
router.get('/places/:id', placeController.getById);
router.post('/places', placeController.create);
router.put('/places/:id', placeController.update);
router.delete('/places/:id', placeController.remove);

export default router;



