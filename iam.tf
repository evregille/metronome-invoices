resource "aws_iam_role" "default_role" {
  name = "metronome-lambda-default-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
        Action = "sts:AssumeRole",
        Effect = "Allow",
        Principal = {
          Service = "lambda.amazonaws.com"
        }
    }]
  })
}

resource "aws_iam_policy_attachment" "lambda_basic_execution" {
  name       = "basic-execution-role-metronome-netsuite"
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  roles      = [ aws_iam_role.default_role.name ]
}

data "aws_iam_policy_document" "sqs" {
  statement {
    sid       = "SQSRole"
    actions   = [
      "sqs:SendMessage",
      "sqs:ChangeMessageVisibility",
      "sqs:GetQueueAttributes",
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes"
    ]
    resources = [
      aws_sqs_queue.deadletter_queue.arn,
      aws_sqs_queue.webhook_queue.arn,
      aws_sqs_queue.create_invoice_queue.arn
    ]
  }
}

resource "aws_iam_policy" "sqs" {
  name   = "policy-sqs-metronome"
  policy = data.aws_iam_policy_document.sqs.json
}

resource "aws_iam_role_policy_attachment" "sqs" {
  role       = aws_iam_role.default_role.name
  policy_arn = aws_iam_policy.sqs.arn
}


# S3 - write access to the s3 bucket
resource "aws_s3_bucket_policy" "log_errors" {
  bucket = var.log_errors_bucket_name_s3

  policy = jsonencode({
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "AWS": "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${aws_iam_role.default_role.name}"
        },
        "Action": [
          "s3:PutObject"
        ],
        "Resource": [
          "arn:aws:s3:::${var.log_errors_bucket_name_s3}",
          "arn:aws:s3:::${var.log_errors_bucket_name_s3}/*"
        ]
      }
    ]
  })
}
