import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import listingRoutes from "../modules/listings/listing.routes.js";
import imageRoutes from "../modules/listingImages/image.routes.js";
import favoriteRoutes from "../modules/favorites/favorite.routes.js";
import inquiryRoutes from "../modules/inquiries/inquiry.routes.js";
import aiRoutes from "../modules/ai/ai.routes.js";
import reviewRoutes from "../modules/reviews/review.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/listings", listingRoutes);
router.use("/listings", imageRoutes);
router.use("/favorites", favoriteRoutes);
router.use("/inquiries", inquiryRoutes);
router.use("/ai", aiRoutes);
router.use("/reviews", reviewRoutes);

export default router;
//checking branches
