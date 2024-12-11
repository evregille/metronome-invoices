# SQS queue + DLQ 
resource "aws_sqs_queue" "webhook_queue" {
  name                      = "metronome-webhook-queue"
  delay_seconds             = 0
  receive_wait_time_seconds = 0
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.deadletter_queue.arn
    maxReceiveCount     = 1
  })
}

resource "aws_sqs_queue" "create_invoice_queue" {
  name                      = "metronome-create_invoice-queue"
  delay_seconds             = 0
  visibility_timeout_seconds= 300 # Netsuite call can be long so setting a 5 min message visi timeout
  receive_wait_time_seconds = 0
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.deadletter_queue.arn
    maxReceiveCount     = var.billing_provider_retries
  })
}

resource "aws_sqs_queue" "deadletter_queue" {
  name = "metronome-deadletter-queue"
}

resource "aws_sqs_queue_redrive_allow_policy" "terraform_queue_redrive_allow_policy" {
  queue_url = aws_sqs_queue.deadletter_queue.id

  redrive_allow_policy = jsonencode({
    redrivePermission = "byQueue",
    sourceQueueArns   = [aws_sqs_queue.webhook_queue.arn, aws_sqs_queue.create_invoice_queue.arn]
  })
}

resource "aws_lambda_event_source_mapping" "format_invoice" {
  event_source_arn = aws_sqs_queue.webhook_queue.arn
  function_name    = aws_lambda_function.format_invoice.arn
}

resource "aws_lambda_event_source_mapping" "create_invoice" {
  event_source_arn = aws_sqs_queue.create_invoice_queue.arn
  function_name    = aws_lambda_function.create_invoice.arn
}


resource "aws_lambda_event_source_mapping" "deadletter_queue" {
  event_source_arn = aws_sqs_queue.deadletter_queue.arn
  function_name    = aws_lambda_function.log_errors.arn
}