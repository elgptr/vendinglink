-- AlterTable
ALTER TABLE "ai_configurations" ADD COLUMN     "customChatApiKey" TEXT,
ADD COLUMN     "customChatBaseUrl" TEXT,
ADD COLUMN     "customChatModel" TEXT,
ADD COLUMN     "customDescriptionApiKey" TEXT,
ADD COLUMN     "customDescriptionBaseUrl" TEXT,
ADD COLUMN     "customDescriptionModel" TEXT;
