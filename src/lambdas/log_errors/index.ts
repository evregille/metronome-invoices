import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({});

exports.handler = async function(msg: any) {
  const log = JSON.parse(msg.Records[0].body);
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env["S3_BUCKET_LOGS"],
      Key: `${new Date().toISOString()} - ${log.id}`,
      Body: JSON.stringify(log),
      ContentType: "application/json"
    }));
    console.log(`Message stored in s3`)
    return ;
  } catch (err) {
    console.error("ERROR exeption storing log:", err, log);
    throw new Error('ERROR exeption storing log:');
  }
};