import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { createFavoriteSchema, favoriteQuerySchema } from "./favorite.schema.js";
import * as favoriteController from "./favorite.controller.js";

const router = Router();

/**
 * @swagger
 * /favorites:
 *   post:
 *     summary: Save a listing as favorite (tenant only)
 *     tags: [Favorites]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [listingId]
 *             properties:
 *               listingId: { type: string, format: uuid }
 *     responses:
 *       201: { description: Favorited }
 *       400: { $ref: '#/components/schemas/Error' }
 *       409: { description: Already favorited }
 */
router.post("/", authenticate, authorize("TENANT"), validate(createFavoriteSchema), favoriteController.create);

/**
 * @swagger
 * /favorites:
 *   get:
 *     summary: Get current tenant's saved listings
 *     tags: [Favorites]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated favorites with listing details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Pagination'
 *                 - type: object
 *                   properties:
 *                     items: { type: array }
 */
router.get("/", authenticate, authorize("TENANT"), validate(favoriteQuerySchema, "query"), favoriteController.findAll);

/**
 * @swagger
 * /favorites/{id}:
 *   delete:
 *     summary: Remove a saved listing (owner only)
 *     tags: [Favorites]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Favorite removed }
 *       403: { $ref: '#/components/schemas/Error' }
 *       404: { $ref: '#/components/schemas/Error' }
 */
router.delete("/:id", authenticate, authorize("TENANT"), favoriteController.remove);

export default router;
