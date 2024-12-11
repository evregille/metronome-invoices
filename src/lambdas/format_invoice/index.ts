
import Metronome from '@metronome/sdk';
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

const sqsClient = new SQSClient({});
const SQS_INVOICES_QUEUE_URL = process.env['SQS_INVOICES_QUEUE_URL'] || '';
const metronomeClient = new Metronome({ bearerToken: process.env['METRONOME_API_KEY'] });

const INVOICES_TYPES : string[] = (process.env['METRONOME_INVOICES_TYPES'] || "").split(',').map(el => el.trim()) ;
const CUSTOMER_INVOICE_DESTINATION = process.env['CUSTOMER_INVOICE_DESTINATION'] || '';
const CUSTOMER_EXTERNAL_FIELD_NAME =process.env['CUSTOMER_EXTERNAL_FIELD_NAME'] || '';
const PRODUCT_EXTERNAL_FIELD_NAME = process.env['PRODUCT_EXTERNAL_FIELD_NAME'] || '';
const SEPARATOR_LINE_ITEM_KEYS = process.env['SEPARATOR_LINE_ITEM_KEYS'] || '';

type WebhookEvent = {
    type: string,
    properties: {
        customer_id: string,
        invoice_id: string,
    }
}

type Response = {
    error?: boolean,
    data?: Metronome.CustomerRetrieveResponse | any, // Metronome.InvoiceRetrieve does not exist in the SDK
    message?: string,
}

type Invoice = {
    id: string,
    destination: string,
    metronome_customer_id: string,
    external_customer_id: string,
    start_date: string,
    end_date: string,
    issue_date: string,
    line_items: LineItem[],
}

type LineItem = {
    quantity: number,
    name: string, 
    amount: number,
    external_item_id: string,
}

export const handler = async function (message: any) {
    try{
        const event: WebhookEvent = JSON.parse(message.Records[0].body);
        if(validateFormatWebhookEvent(event) === true){
            const fetchInvoiceResponse: Response = await fetchMetronomeInvoice(
                event.properties.customer_id, 
                event.properties.invoice_id);
            if(!fetchInvoiceResponse || fetchInvoiceResponse && fetchInvoiceResponse.error)
                await logError(fetchInvoiceResponse);
            else{
                console.log(`Metronome invoice ${event.properties.invoice_id} for customer ${event.properties.customer_id} fetched successfuly`)
                if(validateInvoice(fetchInvoiceResponse.data)){
                    console.log(`Metronome invoice valid for being created to billing provider`);
                    const formattedInvoice = formatInvoice(fetchInvoiceResponse.data);
                    console.log(`Metronome invoice being queued to be created with ${formattedInvoice.destination}`)
                    const sendMessageResponse: Response = await sendMessageToQueue(
                        formattedInvoice, 
                        SQS_INVOICES_QUEUE_URL);
                    if(sendMessageResponse.error) 
                        await logError(sendMessageResponse);
                    console.log(`Invoice sent to queue to be processed by billing provider.`);
                }
                else console.log('Invalid Invoice - request ignored.')
            }
        }
        else {
            console.log('Invalid webhook event format')
        }
    } catch(e){
        await logError({
            error: true,
            message: `Exception handling the invoice formatting: ${JSON.stringify(message)} - ${JSON.stringify(e)}`
        })
    }
    
}

const validateFormatWebhookEvent = function(event: WebhookEvent) : boolean {
    if(event.type === 'invoice.finalized' && event.properties && event.properties.customer_id && event.properties.invoice_id )
        return true
    return false;
}

const fetchMetronomeInvoice = async function(
    customer_id: string, 
    invoice_id: string): Promise<Response>{
    try {
        const invoice = await metronomeClient.customers.invoices.retrieve(customer_id, invoice_id);
        return {
            error: false,
            data: invoice.data,
        }
    } catch (err) {
        return {
            error: true,
            message: `Exception fetching metronome invoice ${invoice_id} for customer ${customer_id}`,
        }
    }
}

const validateInvoice = function(invoice: any): boolean {
    if(invoice && invoice.customer_custom_fields && invoice.customer_custom_fields[CUSTOMER_EXTERNAL_FIELD_NAME] && invoice.customer_custom_fields[CUSTOMER_INVOICE_DESTINATION]){
        if(invoice.type){
            if(INVOICES_TYPES.length > 0){
                if(INVOICES_TYPES.filter( (e: string) => e === invoice.type).length > 0 )
                    return true;
                else {
                    console.log(`Invalid invoice: invoice type ${invoice.type} not configured to be created in billing provider (${JSON.stringify(INVOICES_TYPES)}`)
                    return false;
                }
            } 
            else return true;
        } else return false;
    } else {
        console.log(`Invoice Invalid: missing custom field ${CUSTOMER_EXTERNAL_FIELD_NAME} or ${CUSTOMER_INVOICE_DESTINATION}.`)
        return false;
    }
}

const formatInvoice = function(invoice: any): Invoice {
    let line_items: LineItem[] = [];
    if(invoice && invoice.line_items && invoice.line_items.length > 0 ) {
        invoice.line_items.forEach((item: any) => {
            if(item.product_custom_fields && item.product_custom_fields[PRODUCT_EXTERNAL_FIELD_NAME]){
                let name: string = item.name;
                if(item.pricing_group_values && Object.keys(item.pricing_group_values).length > 0 ) {
                    Object.keys(item.pricing_group_values).forEach((key: string) => {
                        name += `${SEPARATOR_LINE_ITEM_KEYS} ${key}=${item.pricing_group_values[key]}`
                    })
                }
                if(item.presentation_group_values && Object.keys(item.presentation_group_values).length > 0 ) {
                    Object.keys(item.presentation_group_values).forEach((key: string) => {
                        name += `${SEPARATOR_LINE_ITEM_KEYS} ${key}=${item.presentation_group_values[key]}`
                    })
                }
                line_items.push({
                    name: name,
                    quantity: item.quantity,
                    amount: item.total / 100,
                    external_item_id: item.product_custom_fields[PRODUCT_EXTERNAL_FIELD_NAME],
                })
            }
        })
    }
    return {
        id: invoice.id,
        destination: invoice.customer_custom_fields[CUSTOMER_INVOICE_DESTINATION],
        metronome_customer_id: invoice.customer_id,
        external_customer_id:invoice.customer_custom_fields[CUSTOMER_EXTERNAL_FIELD_NAME],
        start_date: invoice.start_timestamp,
        end_date: invoice.end_timestamp,
        issue_date: invoice.issued_at ? invoice.issued_at : invoice.end_timestamp,
        line_items: line_items,
    }
}

const sendMessageToQueue = async function(message: object, queueUrl: string): Promise<Response> {
    try {
        const response = await sqsClient.send(new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify(message),
        }));
        if(response && response["$metadata"] && response["$metadata"].httpStatusCode && response["$metadata"].httpStatusCode < 399)
            return {error: false}
        else return {error: true, message: `Log failed to publish to SQS ${response}`}
    } catch (e) {
        return { error: true, message: `Exception in sending message to queue ${JSON.stringify(e)}`}
    }
}

const logError = async function(log: any): Promise<void>{
    console.log('ERROR', log);
    throw new Error('Error - something wrong happened')
}