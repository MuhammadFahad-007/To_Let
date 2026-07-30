import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { createReviewSchema } from "./review.schema.js";
import * as reviewController from "./review.controller.js";

const router = Router();

/**
 * @swagger
 * /reviews:
 *   post:
 *     summary: Create a review for a listing (tenant only)
 *     tags: [Reviews]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [listingId, rating, comment]
 *             properties:
 *               listingId: { type: string, format: uuid }
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               comment: { type: string, minLength: 5, maxLength: 1000 }
 *     responses:
 *       201: { description: Review created }
 *       400: { $ref: '#/components/schemas/Error' }
 *       409: { description: Already reviewed this listing }
 */
router.post("/", authenticate, authorize("TENANT"), validate(createReviewSchema), reviewController.create);

/**
 * @swagger
 * /reviews/listing/{listingId}:
 *   get:
 *     summary: Get all reviews for a listing
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of reviews with tenant name
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   rating: { type: integer }
 *                   comment: { type: string }
 *                   tenant: { type: object, properties: { id: { type: string }, name: { type: string } } }
 *       404: { $ref: '#/components/schemas/Error' }
 */
router.get("/listing/:listingId", reviewController.findByListing);

export default router;
