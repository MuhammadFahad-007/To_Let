import { Readable } from "node:stream";
import { prisma } from "../../lib/prisma.js";
import { cloudinary } from "../../config/cloudinary.js";
import { AppError } from "../../utils/AppError.js";

export async function upload(listingId: string, file: Express.Multer.File) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true },
  });
  if (!listing) throw new AppError(404, "NOT_FOUND", "Listing not found");

  const result = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "to-let/listings",
          resource_type: "image",
        },
        (error, result) => {
          if (error || !result) {
            reject(new AppError(500, "UPLOAD_FAILED", "Failed to upload image"));
          } else {
            resolve({ secure_url: result.secure_url, public_id: result.public_id });
          }
        }
      );
      Readable.from(file.buffer).pipe(uploadStream);
    }
  );

  const count = await prisma.listingImage.count({ where: { listingId } });

  return prisma.listingImage.create({
    data: {
      listingId,
      imageUrl: result.secure_url,
      isPrimary: count === 0,
      orderIndex: count,
    },
  });
}

export async function remove(listingId: string, imageId: string) {
  const image = await prisma.listingImage.findUnique({
    where: { id: imageId },
    select: { id: true, imageUrl: true },
  });
  if (!image) throw new AppError(404, "NOT_FOUND", "Image not found");

  const publicId = image.imageUrl.split("/").pop()?.split(".").shift();
  if (publicId) {
    await cloudinary.uploader.destroy(`to-let/listings/${publicId}`);
  }

  await prisma.listingImage.delete({ where: { id: imageId } });
}
