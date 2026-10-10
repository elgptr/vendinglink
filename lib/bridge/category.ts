import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "bridge-category" });

export type CategoryUpdateResult =
  | { status: 200; productId: string; categoryId: string; categorySlug: string }
  | { status: 404; code: "PRODUCT_NOT_FOUND" | "CATEGORY_NOT_FOUND"; message: string }
  | { status: 500; code: "INTERNAL_ERROR"; message: string };

export async function updateProductCategory(
  vlProductId: string,
  categorySlug: string
): Promise<CategoryUpdateResult> {
  try {
    // 1. Resolve product
    const product = await prisma.product.findUnique({
      where: { id: vlProductId },
      select: { id: true },
    });

    if (!product) {
      log.warn("Product not found for category update", {
        vlProductId,
        categorySlug,
      });
      return {
        status: 404,
        code: "PRODUCT_NOT_FOUND",
        message: `Product "${vlProductId}" not found.`,
      };
    }

    // 2. Resolve category by slug (taxonomy is editorial — never auto-create)
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { id: true },
    });

    if (!category) {
      log.warn("Category slug not found", {
        vlProductId,
        categorySlug,
      });
      return {
        status: 404,
        code: "CATEGORY_NOT_FOUND",
        message: `Category "${categorySlug}" not found.`,
      };
    }

    // 3. Persist
    await prisma.product.update({
      where: { id: product.id },
      data: { categoryId: category.id },
    });

    log.info("Product category updated", {
      vlProductId: product.id,
      categoryId: category.id,
      categorySlug,
    });

    return {
      status: 200,
      productId: product.id,
      categoryId: category.id,
      categorySlug,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log.error("Failed to update product category", {
      error: errMsg,
      vlProductId,
      categorySlug,
    });
    return {
      status: 500,
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    };
  }
}
