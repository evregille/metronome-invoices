import crypto from 'crypto';
import OAuth from 'oauth-1.0a';
import { QuickbooksInvoice, Invoice, CreateExternalInvoiceType } from './types';


// QUICKBOOKS CONFIGURATION
const QBP_CLIENT_ID = process.env['QBO_CLIENT_ID'] || '';
const QBO_CLIENT_SECRET = process.env['QBO_CLIENT_SECRET'] || '' ;
const QBO_BASE_URL = process.env['QBO_BASE_URL'] || 'https://sandbox-quickbooks.api.intuit.com/v3';
const QBO_REALMID= process.env['QBO_REALMID'] || '' ;

export const createInvoiceQuickbooks = async (invoice: Invoice): Promise<CreateExternalInvoiceType> =>{
    const qboInvoice: QuickbooksInvoice = formatMetronomeInvoiceToQuickbooks(invoice);
    console.log(`invoice formatted to be sent to QBO`, JSON.stringify(qboInvoice));
    const response = await sendQuickbooksRequest(qboInvoice);  
    console.log(`invoice created in QBO with error = ${response.error} and status = ${response.status}`);
    return {
        error: response.error,
        status: response.status,
        external_invoice_id: response.data,
    }
}

const formatMetronomeInvoiceToQuickbooks = function (invoice: Invoice): any {
    return {
        "Line":  invoice.line_items.map(item => {
            return {
              "DetailType": 'SalesItemLineDetail',
              "Amount": item.amount,
              "SalesItemLineDetail": {
                 "ItemRef": {
                    "name": item.name,
                    "value": item.external_item_id
                 }
              }
           }
            }),
        "CustomerRef": {
           "value": invoice.external_customer_id
        }
    }
}

const sendQuickbooksRequest = async function(data: QuickbooksInvoice ): Promise<any> {
    try {
        const response = await fetch( `${QBO_BASE_URL}/company/${QBO_REALMID}/invoice` , {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data) 
        });
        return {
            error: false,
            status: response.status,
            data: response.status < 400 ? response.headers.get('location') : await response.json()
        }
    } catch (e){
        console.log('Exception', e)
        return {
            error: true,
            message: `Exception Netsuite Request - ${JSON.stringify(e)}`,
        };
    }
}