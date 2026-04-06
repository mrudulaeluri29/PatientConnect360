import {
  BlobSASPermissions,
  BlobServiceClient,
  SASProtocol,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";

function connectionString(): string | undefined {
  return process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
}

export function isAzureBlobConfigured(): boolean {
  return Boolean(connectionString());
}

export async function uploadBufferToBlob(params: {
  containerName: string;
  blobPath: string;
  buffer: Buffer;
  contentType: string;
}): Promise<{ blobUrl: string }> {
  const conn = connectionString();
  if (!conn) throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");

  const service = BlobServiceClient.fromConnectionString(conn);
  const container = service.getContainerClient(params.containerName);
  await container.createIfNotExists({ access: undefined });
  const blob = container.getBlockBlobClient(params.blobPath);
  await blob.uploadData(params.buffer, {
    blobHTTPHeaders: { blobContentType: params.contentType },
  });
  return { blobUrl: blob.url };
}

function parseAccountFromConnectionString(conn: string): { name: string; key: string } {
  const map: Record<string, string> = {};
  for (const part of conn.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    map[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  const name = map.AccountName;
  const key = map.AccountKey;
  if (!name || !key) throw new Error("Connection string must include AccountName and AccountKey for SAS");
  return { name, key };
}

/** Short-lived read SAS for private container blobs. */
export function getBlobReadSasUrl(params: {
  containerName: string;
  blobPath: string;
  expiresMinutes: number;
}): string {
  const conn = connectionString();
  if (!conn) throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");

  const { name, key } = parseAccountFromConnectionString(conn);
  const cred = new StorageSharedKeyCredential(name, key);
  const service = BlobServiceClient.fromConnectionString(conn);
  const blobClient = service.getContainerClient(params.containerName).getBlobClient(params.blobPath);

  const startsOn = new Date(Date.now() - 2 * 60 * 1000);
  const expiresOn = new Date(Date.now() + params.expiresMinutes * 60 * 1000);
  const sas = generateBlobSASQueryParameters(
    {
      containerName: params.containerName,
      blobName: params.blobPath,
      permissions: BlobSASPermissions.parse("r"),
      startsOn,
      expiresOn,
      protocol: SASProtocol.Https,
    },
    cred
  ).toString();

  return `${blobClient.url}?${sas}`;
}
