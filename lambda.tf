## LAMBDA webhook listener ----------
# transpiler typescript 
resource "terraform_data" "transpile_webhook_listener" {
  triggers_replace = [local.lambda_webhook_listener__md5]
  provisioner "local-exec" {
    command     = "npm run build"
    working_dir = "./src/lambdas/webhook_listener"
  }
}
locals {
  lambda_webhook_listener__md5 = filemd5("./src/lambdas/webhook_listener/index.ts")
}

# create the zip file
data "archive_file" "webhook_listener" {
    type = "zip"
    source_dir = "./src/lambdas/webhook_listener"
    output_path = "./src/lambdas/webhook_listener.zip"

    depends_on = [terraform_data.transpile_webhook_listener]
}

# create lambda
resource "aws_lambda_function" "webhook_listener" {
  filename         = data.archive_file.webhook_listener.output_path
  function_name    = "metronome-webhook_listener-function"
  handler          = "index.handler"
  runtime          = var.lambda_node_version
  role             = aws_iam_role.default_role.arn
  memory_size      = "128"
  timeout          = "15"
  source_code_hash = data.archive_file.webhook_listener.output_base64sha256
  environment {
    variables = {
        SQS_INVOICES_QUEUE_URL=aws_sqs_queue.webhook_queue.url
        METRONOME_WEBHOOK_SECRET = var.metronome_webhook_secret
    }
  }
}

# public HTTPS endpoint
resource "aws_lambda_function_url" "lambda_webhook_url" {
  function_name      = aws_lambda_function.webhook_listener.arn
  authorization_type = "NONE"
}

# A Cloudwatch Log Group
resource "aws_cloudwatch_log_group" "webhook_listener" {
  name = "/aws/lambda/${aws_lambda_function.webhook_listener.function_name}"
  retention_in_days = var.cloud_watch_retention_days
}

## LAMBDA format_invoice ----------
# transpiler typescript 
resource "terraform_data" "transpile_format_invoice" {
  triggers_replace = [local.lambda_format_invoice__md5]
  provisioner "local-exec" {
    command     = "npm run build"
    working_dir = "./src/lambdas/format_invoice"
  }
}
locals {
  lambda_format_invoice__md5 = filemd5("./src/lambdas/format_invoice/index.ts")
}

# create the zip file
data "archive_file" "format_invoice" {
    type = "zip"
    source_dir = "./src/lambdas/format_invoice"
    output_path = "./src/lambdas/format_invoice.zip"

    depends_on = [terraform_data.transpile_format_invoice]
}

# create lambda
resource "aws_lambda_function" "format_invoice" {
  filename         = data.archive_file.format_invoice.output_path
  function_name    = "metronome-format_invoice-function"
  handler          = "index.handler"
  runtime          = var.lambda_node_version
  role             = aws_iam_role.default_role.arn
  memory_size      = "128"
  timeout          = "15"
  source_code_hash = data.archive_file.format_invoice.output_base64sha256
  environment {
    variables = {
      SQS_INVOICES_QUEUE_URL=aws_sqs_queue.create_invoice_queue.url
      METRONOME_API_KEY=var.metronome_api_key
      METRONOME_INVOICES_TYPES=join(", ", var.metronome_invoices_types)
      CUSTOMER_EXTERNAL_FIELD_NAME = var.metronome_billing_provider_customer_id
      PRODUCT_EXTERNAL_FIELD_NAME = var.metronome_billing_provider_item_id
      SEPARATOR_LINE_ITEM_KEYS = var.line_item_name_separator
      CUSTOMER_INVOICE_DESTINATION = var.metronome_billing_provider_destination
    }
  }
}

# A Cloudwatch Log Group
resource "aws_cloudwatch_log_group" "format_invoice" {
  name = "/aws/lambda/${aws_lambda_function.format_invoice.function_name}"
  retention_in_days = var.cloud_watch_retention_days
}


## LAMBDA create Invoice ----------
# transpiler typescript 
resource "terraform_data" "transpile_create_invoice" {
  triggers_replace = [local.lambda_create_invoice__md5]
  provisioner "local-exec" {
    command     = "npm run build"
    working_dir = "./src/lambdas/create_invoice"
  }
}
locals {
  lambda_create_invoice__md5 = filemd5("./src/lambdas/create_invoice/index.ts")
}

# create the zip file
data "archive_file" "create_invoice" {
    type = "zip"
    source_dir = "./src/lambdas/create_invoice"
    output_path = "./src/lambdas/create_invoice.zip"

    depends_on = [terraform_data.transpile_create_invoice]
}

# create lambda
resource "aws_lambda_function" "create_invoice" {
  filename         = data.archive_file.create_invoice.output_path
  function_name    = "metronome-create_invoice-function"
  handler          = "index.handler"
  runtime          = var.lambda_node_version
  role             = aws_iam_role.default_role.arn
  memory_size      = "128"
  timeout          = "300"
  source_code_hash = data.archive_file.create_invoice.output_base64sha256
  environment {
    variables = {
        NS_ACCOUNT_ID = var.ns_account_id 
        NS_CONSUMER_KEY = var.ns_consumer_key  
        NS_CONSUMER_SECRET = var.ns_consumer_secret 
        NS_TOKEN_ID = var.ns_token_id 
        NS_TOKEN_SECRET = var.ns_token_secret 
        NS_INVOICE_CUSTOM_FORM_ID = var.ns_invoice_custom_form_id
        NS_INVOICE_CUSTOM_FORM_REF_NAME = var.ns_invoice_custom_form_ref_name
        METRONOME_API_KEY = var.metronome_api_key
        RAZORPAY_API_KEY_ID = var.razorpay_apikey_id
        RAZORPAY_API_KEY_SECRET = var.razorpay_apikey_secret
    }
  }
}

# A Cloudwatch Log Group
resource "aws_cloudwatch_log_group" "create_invoice" {
  name = "/aws/lambda/${aws_lambda_function.create_invoice.function_name}"
  retention_in_days = var.cloud_watch_retention_days
}

## LAMBDA log-errors-s3 ----------
# transpiler typescript 
resource "terraform_data" "transpile_log_errors" {
  triggers_replace = [local.lambda_log_errors__md5]
  provisioner "local-exec" {
    command     = "npm run build"
    working_dir = "./src/lambdas/log_errors"
  }
}
locals {
  lambda_log_errors__md5 = filemd5("./src/lambdas/log_errors/index.ts")
}

# create the zip file
data "archive_file" "log_errors" {
    type = "zip"
    source_dir = "./src/lambdas/log_errors"
    output_path = "./src/lambdas/log_errors.zip"

    depends_on = [terraform_data.transpile_log_errors]
}

# create lambda
resource "aws_lambda_function" "log_errors" {
  filename         = data.archive_file.log_errors.output_path
  function_name    = "metronome-log-errors-function"
  handler          = "index.handler"
  runtime          = var.lambda_node_version
  role             = aws_iam_role.default_role.arn
  memory_size      = "128"
  timeout          = "15"
  source_code_hash = data.archive_file.log_errors.output_base64sha256
  environment {
    variables = {
        S3_BUCKET_LOGS=var.log_errors_bucket_name_s3
    }
  }
}

# A Cloudwatch Log Group
resource "aws_cloudwatch_log_group" "log_errors" {
  name = "/aws/lambda/${aws_lambda_function.log_errors.function_name}"
  retention_in_days = var.cloud_watch_retention_days
}