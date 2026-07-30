import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { inquiryLimiter } from "../../middleware/rateLimiter.js";
import { createInquirySchema, inquiryQuerySchema, updateStatusSchema } from "./inquiry.schema.js";
import * as inquiryController from "./inquiry.controller.js";

const router = Router();

/**
 * @swagger
 * /inquiries:
 *   post:
 *     summary: Send an inquiry about a listing (tenant only)
 *     tags: [Inquiries]
 *     security: [{ bearerAuth: [] }]
 *     rateLimit: 10/min + 5/day per tenant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [listingId, message]
 *             properties:
 *               listingId: { type: string, format: uuid }
 *               message: { type: string, minLength: 10, maxLength: 1000 }
 *     responses:
 *       201: { description: Inquiry sent }
 *       400: { $ref: '#/components/schemas/Error' }
 *       429: { $ref: '#/components/schemas/Error' }
 */
router.post("/", inquiryLimiter, authenticate, authorize("TENANT"), validate(createInquirySchema), inquiryController.create);

/**
 * @swagger
 * /inquiries/sent:
 *   get:
 *     summary: Get inquiries sent by the current tenant
 *     tags: [Inquiries]
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
 *         description: Paginated sent inquiries
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Pagination'
 *                 - type: object
 *                   properties:
 *                     items: { type: array }
 */
router.get("/sent", authenticate, authorize("TENANT"), validate(inquiryQuerySchema, "query"), inquiryController.findSent);

/**
 * @swagger
 * /inquiries/received:
 *   get:
 *     summary: Get inquiries received on your listings (landlord only)
 *     tags: [Inquiries]
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
 *         description: Paginated received inquiries
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Pagination'
 *                 - type: object
 *                   properties:
 *                     items: { type: array }
 */
router.get("/received", authenticate, authorize("LANDLORD"), validate(inquiryQuerySchema, "query"), inquiryController.findReceived);

/**
 * @swagger
 * /inquiries/{id}/status:
 *   patch:
 *     summary: Update inquiry status (landlord only)
 *     tags: [Inquiries]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [PENDING, RESPONDED, CLOSED] }
 *     responses:
 *       200: { description: Status updated }
 *       403: { $ref: '#/components/schemas/Error' }
 *       404: { $ref: '#/components/schemas/Error' }
 */
router.patch("/:id/status", authenticate, authorize("LANDLORD"), validate(updateStatusSchema), inquiryController.updateStatus);

export default router;
