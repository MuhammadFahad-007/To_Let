import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.js";
import { isOwner } from "../../middleware/isOwner.js";
import { upload as uploadMiddleware } from "../../middleware/upload.js";
import * as imageController from "./image.controller.js";

const router = Router();

/**
 * @swagger
 * /listings/{id}/images:
 *   post:
 *     summary: Upload an image to a listing (owner only)
 *     tags: [Listing Images]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image: { type: string, format: binary }
 *     responses:
 *       201: { description: Image uploaded }
 *       400: { $ref: '#/components/schemas/Error' }
 *       403: { $ref: '#/components/schemas/Error' }
 *       404: { $ref: '#/components/schemas/Error' }
 */
router.post("/:id/images", authenticate, authorize("LANDLORD"), isOwner, uploadMiddleware.single("image"), imageController.upload);

/**
 * @swagger
 * /listings/{id}/images/{imageId}:
 *   delete:
 *     summary: Delete an image from a listing (owner only)
 *     tags: [Listing Images]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Image deleted }
 *       403: { $ref: '#/components/schemas/Error' }
 *       404: { $ref: '#/components/schemas/Error' }
 */
router.delete("/:id/images/:imageId", authenticate, authorize("LANDLORD"), isOwner, imageController.remove);

export default router;
