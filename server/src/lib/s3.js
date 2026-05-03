const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const requiredVars = ['AWS_REGION', 'AWS_S3_BUCKET_NAME', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];

const missing = requiredVars.filter((key) => !process.env[key]);
if (missing.length) {
  console.warn(`S3 config missing env vars: ${missing.join(', ')}`);
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const bucketName = process.env.AWS_S3_BUCKET_NAME;

const normalizeKey = (value = '') => value.replace(/^\/+/, '');

const buildPublicUrl = (key) => {
  if (process.env.AWS_S3_PUBLIC_BASE_URL) {
    return `${process.env.AWS_S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`;
  }
  return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

const extractS3Key = (value) => {
  if (!value || typeof value !== 'string') return null;

  if (!/^https?:\/\//i.test(value)) {
    return normalizeKey(value);
  }

  try {
    const parsed = new URL(value);
    const publicBaseUrl = process.env.AWS_S3_PUBLIC_BASE_URL?.replace(/\/$/, '');
    if (publicBaseUrl && value.startsWith(publicBaseUrl)) {
      return normalizeKey(value.slice(publicBaseUrl.length));
    }

    const validHosts = new Set([
      `${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com`,
      `${bucketName}.s3.amazonaws.com`,
    ]);

    if (validHosts.has(parsed.host)) {
      return normalizeKey(parsed.pathname);
    }
  } catch (err) {
    return null;
  }

  return null;
};

const uploadBufferToS3 = async ({ key, buffer, contentType }) => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return { key, url: buildPublicUrl(key) };
};

const deleteFromS3 = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  await s3Client.send(command);
};

const getUploadSignedUrl = async ({ key, contentType, expiresIn = 900 }) => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
  return { signedUrl, key, url: buildPublicUrl(key) };
};

const getReadSignedUrl = async ({ key, expiresIn = 3600 }) => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
};

const resolveStoredS3Url = async (value, expiresIn = 3600) => {
  const key = extractS3Key(value);
  if (!key) return value;

  try {
    return await getReadSignedUrl({ key, expiresIn });
  } catch (err) {
    console.error('Failed to sign read URL for S3 object:', err.message);
    return value;
  }
};

module.exports = {
  s3Client,
  bucketName,
  uploadBufferToS3,
  deleteFromS3,
  getUploadSignedUrl,
  getReadSignedUrl,
  resolveStoredS3Url,
  extractS3Key,
  buildPublicUrl,
};
