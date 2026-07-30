import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { authenticate, authorize } from "../../middleware/auth.js";
import { isOwner } from "../../middleware/isOwner.js";
import {
  createListingSchema,
  updateListingSchema,
  listingQuerySchema,
  updateStatusSchema,
} from "./listing.schema.js";
import * as listingController from "./listing.controller.js";

const router = Router();

/**
 * @swagger
 * /listings/landlord/{landlordId}:
 *   get:
 *     summary: Get all listings by a landlord
 *     tags: [Listings]
 *     parameters:
 *       - in: path
 *         name: landlordId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Array of listings }
 */
router.get("/landlord/:landlordId", listingController.findByLandlord);

/**
 * @swagger
 * /listings:
 *   get:
 *     summary: Browse listings with filters and pagination
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: bedrooms
 *         schema: { type: integer }
 *       - in: query
 *         name: bathrooms
 *         schema: { type: integer }
 *       - in: query
 *         name: area
 *         schema: { type: string }
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [AVAILABLE, RENTED, INACTIVE] }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [price_asc, price_desc, newest, oldest], default: newest }
 *     responses:
 *       200:
 *         description: Paginated listing results
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Pagination'
 *                 - type: object
 *                   properties:
 *                     items: { type: array, items: { $ref: '#/components/schemas/Listing' } }
 */
router.get("/", validate(listingQuerySchema, "query"), listingController.findAll);

/**
 * @swagger
 * /listings:
 *   post:
 *     summary: Create a new listing (landlord only)
 *     tags: [Listings]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, price, sizeSqft, bedrooms, bathrooms, address, area, city, latitude, longitude]
 *             properties:
 *               title: { type: string, minLength: 3 }
 *               description: { type: string, minLength: 10 }
 *               price: { type: number, minimum: 0 }
 *               sizeSqft: { type: number, minimum: 0 }
 *               bedrooms: { type: integer, minimum: 0, maximum: 50 }
 *               bathrooms: { type: integer, minimum: 0, maximum: 50 }
 *               floorNumber: { type: integer }
 *               address: { type: string }
 *               area: { type: string }
 *               city: { type: string }
 *               latitude: { type: number, minimum: -90, maximum: 90 }
 *               longitude: { type: number, minimum: -180, maximum: 180 }
 *               amenities: { type: array, items: { type: string } }
 *     responses:
 *       201: { description: Listing created }
 *       400: { $ref: '#/components/schemas/Error' }
 *       403: { $ref: '#/components/schemas/Error' }
 */
router.post("/", authenticate, authorize("LANDLORD"), validate(createListingSchema), listingController.create);

/**
 * @swagger
 * /listings/{id}:
 *   get:
 *     summary: Get a single listing by ID
 *     tags: [Listings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Listing object }
 *       404: { $ref: '#/components/schemas/Error' }
 */
router.get("/:id", listingController.findById);

/**
 * @swagger
 * /listings/{id}:
 *   put:
 *     summary: Update a listing (owner only)
 *     tags: [Listings]
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
 *             properties:
 *               title: { type: string }
 *               price: { type: number }
 *               bedrooms: { type: integer }
 *     responses:
 *       200: { description: Updated listing }
 *       403: { $ref: '#/components/schemas/Error' }
 *       404: { $ref: '#/components/schemas/Error' }
 */
router.put("/:id", authenticate, authorize("LANDLORD"), isOwner, validate(updateListingSchema), listingController.update);

/**
 * @swagger
 * /listings/{id}:
 *   delete:
 *     summary: Delete a listing (owner only)
 *     tags: [Listings]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Listing deleted }
 *       403: { $ref: '#/components/schemas/Error' }
 *       404: { $ref: '#/components/schemas/Error' }
 */
router.delete("/:id", authenticate, authorize("LANDLORD"), isOwner, listingController.remove);

/**
 * @swagger
 * /listings/{id}/status:
 *   patch:
 *     summary: Update listing status (owner only)
 *     tags: [Listings]
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
 *               status: { type: string, enum: [AVAILABLE, RENTED, INACTIVE] }
 *     responses:
 *       200: { description: Status updated }
 *       403: { $ref: '#/components/schemas/Error' }
 *       404: { $ref: '#/components/schemas/Error' }
 */
router.patch("/:id/status", authenticate, authorize("LANDLORD"), validate(updateStatusSchema), listingController.updateStatus);

export default router;
