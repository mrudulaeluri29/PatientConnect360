"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAzureBlobConfigured = isAzureBlobConfigured;
exports.uploadBufferToBlob = uploadBufferToBlob;
exports.getBlobReadSasUrl = getBlobReadSasUrl;
const storage_blob_1 = require("@azure/storage-blob");
function connectionString() {
    return process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
}
function isAzureBlobConfigured() {
    return Boolean(connectionString());
}
async function uploadBufferToBlob(params) {
    const conn = connectionString();
    if (!conn)
        throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
    const service = storage_blob_1.BlobServiceClient.fromConnectionString(conn);
    const container = service.getContainerClient(params.containerName);
    await container.createIfNotExists({ access: undefined });
    const blob = container.getBlockBlobClient(params.blobPath);
    await blob.uploadData(params.buffer, {
        blobHTTPHeaders: { blobContentType: params.contentType },
    });
    return { blobUrl: blob.url };
}
function parseAccountFromConnectionString(conn) {
    const map = {};
    for (const part of conn.split(";")) {
        const idx = part.indexOf("=");
        if (idx === -1)
            continue;
        map[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
    }
    const name = map.AccountName;
    const key = map.AccountKey;
    if (!name || !key)
        throw new Error("Connection string must include AccountName and AccountKey for SAS");
    return { name, key };
}
/** Short-lived read SAS for private container blobs. */
function getBlobReadSasUrl(params) {
    const conn = connectionString();
    if (!conn)
        throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
    const { name, key } = parseAccountFromConnectionString(conn);
    const cred = new storage_blob_1.StorageSharedKeyCredential(name, key);
    const service = storage_blob_1.BlobServiceClient.fromConnectionString(conn);
    const blobClient = service.getContainerClient(params.containerName).getBlobClient(params.blobPath);
    const startsOn = new Date(Date.now() - 2 * 60 * 1000);
    const expiresOn = new Date(Date.now() + params.expiresMinutes * 60 * 1000);
    const sas = (0, storage_blob_1.generateBlobSASQueryParameters)({
        containerName: params.containerName,
        blobName: params.blobPath,
        permissions: storage_blob_1.BlobSASPermissions.parse("r"),
        startsOn,
        expiresOn,
        protocol: storage_blob_1.SASProtocol.Https,
    }, cred).toString();
    return `${blobClient.url}?${sas}`;
}
