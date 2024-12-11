
# S3 Bucket for Event ingested
resource "aws_s3_bucket" "log_errors" {
  bucket = var.log_errors_bucket_name_s3
  force_destroy = true
}
resource "aws_s3_bucket_ownership_controls" "log_errors" {
    bucket = aws_s3_bucket.log_errors.id
    rule {
        object_ownership = "BucketOwnerEnforced"
    }
}
