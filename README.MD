# Automatically create your Metronome invoices in your 3rd Party Billing Provider
Supported Billing Provider:
- Netsuite
- QBO (coming soon)


To deploy the connectore, you need:
- a AWS account 
- Terraform
- Metronome account with the right custom fields set up on Customers and Products

# Configure
## 1. set up Metronome and Netsuite
1. Make sure that all Metronome customers and products are properly mapped via custom_fields. For example, in the case of Netsuite, each Metronome Customer should have a reference to Netsuite internal customer ID and each Metronome Product should be mapped to a Netsuite internal item ID.

2. Authentication: you need a Metronome API Token as well as Netsuite OAuth1.0 consumer and tokens. 

## 2. set your secret keys
Create in the root folder a `terraform.tfvars` with the following content:
```bash
metronome_api_key="YOUR_METRONOME_API_KEY"
metronome_webhook_secret="YOUR_METRONOME_WEBHOOK_SECRET"
# if you use Netsuite a billing provider
ns_account_id="TSTDRVxxxx"
ns_consumer_key="NETSUITE_CONSUMER_KEY"
ns_consumer_secret="NS_CONSUMER_SECRET"
ns_token_id="NS_TOKEN_ID"
ns_token_secret="NS_TOKEN_SECRET"
# if you use Razorpay as billing provider
razorpay_apikey_id="RAZORPAY_API_KEY_ID"
razorpay_apikey_secret="RAZORPAY_API_KEY_SECRET"
```

## 3. set your integration settings
In the `variables.tf` files, you can update the default settings values:
| variable name                           | description                                    | examples               |
| ----------------------------------------|------------------------------------------------| -----------------------|
| metronome_invoices_types                | Metronome Invoices types to create in Billing Provider | ["USAGE", "SCHEDULED"] |
| metronome_billing_provider_customer_id  | Metronome custom field key name on Customer with the Billing Provider internal customer ID reference      |   "netsuite_internal_item_id" |
| metronome_billing_provider_destination  | Metronome custom field key name on Customer with the Billing Provider name: 'netsuite' | "billing_provider_destination" |
| metronome_billing_provider_item_id | Metronome custom field key name on Product for the Billing Provider internal Item ID| "netsuite_internal_item_id"|
| line_item_name_separator | In case of presentation/pricing grouping keys, it is the string used as a separator in the NS invoice line item description field | " / " |
| billing_provider_retries | how many times the creation invoice request to retry in case of failure| 1 |
| ns_invoice_custom_form_id & ns_invoice_custom_form_ref_name | reference name and id of the NS invoice template | |

## 4. deploy

you can choose how to configure your AWS authentication for Terraform, one way to deploy:
```bash
terraform init
AWS_ACCESS_KEY=YOURKEY AWS_SECRET_ACCESS_KEY=YOURSECRET terraform apply
```

## 5. configure metronome webhook
once you have deployed, you should see your webhook URL: go into Metronome and set it up to receive notifications when invoices are finalized.

# How it works

The main components of the connector are:
- **a webhook listener** to get notified when a Metronome `invoice.finalized` is triggered. The listener (lambda function) puts the event on a queue (SQS)
- a **invoice format function** (lambda) that pulls the events from the queue, fetch the details of the invoice and format it with all the mandatory custom fields like external customer ID and external item ID. The result is put on another queue (SQS)
- a **create invoice function** (lambda) that pulls events from the queue and create the invoice in the invoice billing provider (today Netsuite but we could easily add QBO and other providers).
- a **log error function** that record any error in an S3 bucket with each invoice creation that has failed. Note that the errors are logged if exceptions: we don't log errors in S3 if format invalide for example.


![overview](./overview.png?raw=true "overview")

