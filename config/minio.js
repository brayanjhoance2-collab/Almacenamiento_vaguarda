const Minio = require('minio');
const dotenv = require('dotenv');

dotenv.config();

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY
});

async function initializeBuckets() {
  const buckets = ['user-files', 'user-trash'];
  
  for (const bucket of buckets) {
    try {
      const exists = await minioClient.bucketExists(bucket);
      if (!exists) {
        await minioClient.makeBucket(bucket, 'us-east-1');
        console.log(`Bucket ${bucket} creado exitosamente`);
      } else {
        console.log(`Bucket ${bucket} ya existe`);
      }
    } catch (err) {
      console.error(`Error inicializando bucket ${bucket}:`, err);
    }
  }
}

initializeBuckets();

module.exports = minioClient;