import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { decryptAPIKey } from "@/lib/encryption";
import { createLogger } from "@/lib/logger";
import stream from "stream";

const log = createLogger({ module: "gdrive" });

export async function uploadCsvToDrive(filename: string, csvContent: string) {
  try {
    const config = await prisma.googleDriveConfig.findFirst();
    if (!config?.isActive || !config.clientEmail || !config.privateKey || !config.folderId) {
      return null;
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: config.clientEmail,
        private_key: decryptAPIKey(config.privateKey),
      },
      scopes: ["https://www.googleapis.com/auth/drive.file"],
    });

    const drive = google.drive({ version: "v3", auth });

    const fileMetadata = {
      name: filename,
      parents: [config.folderId],
    };

    const bufferStream = new stream.PassThrough();
    bufferStream.end(Buffer.from(csvContent, 'utf-8'));

    const media = {
      mimeType: "text/csv",
      body: bufferStream,
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id, webViewLink",
    });

    log.info("Uploaded to Google Drive", { fileId: file.data.id });
    return file.data;
  } catch (error: any) {
    log.error("Failed to upload to Google Drive", { error: String(error) });
    throw new Error(error?.message || String(error));
  }
}
