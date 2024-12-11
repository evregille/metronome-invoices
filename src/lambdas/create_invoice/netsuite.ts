import crypto from 'crypto';
import OAuth from 'oauth-1.0a';
import { NetsuiteInvoice, Invoice, AuthParameters, CreateExternalInvoiceType } from './types';


// NETSUITE CONFIGURATION
const NS_ACCOUNT_ID = process.env['NS_ACCOUNT_ID'] || '';
const NS_CONSUMER_KEY = process.env['NS_CONSUMER_KEY'] || '';
const NS_CONSUMER_SECRET = process.env['NS_CONSUMER_SECRET'] || '';
const NS_TOKEN_ID = process.env['NS_TOKEN_ID'] || '';
const NS_TOKEN_SECRET = process.env['NS_TOKEN_SECRET'] || '';
const NS_INVOICE_CUSTOM_FORM = (process.env['NS_INVOICE_CUSTOM_FORM_ID'] && process.env['NS_INVOICE_CUSTOM_FORM_REF_NAME']) ? {
    id: process.env['NS_INVOICE_CUSTOM_FORM_ID'],
    refName: process.env['NS_INVOICE_CUSTOM_FORM_REF_NAME'],
} : undefined;

const NS_REST_URL = `https://${NS_ACCOUNT_ID.toLowerCase().replace(/_/g, '-')}.suitetalk.api.netsuite.com/services/rest/`;
const path = 'record/v1/invoice';
const method = 'POST';
const url = `${NS_REST_URL}${path}`;

const ALGORITHM = 'HMAC-SHA256';

export const createInvoiceInNetsuite = async (invoice: Invoice): Promise<CreateExternalInvoiceType> =>{
    const netsuiteInvoice: NetsuiteInvoice = formatMetronomeInvoiceToNetsuite(invoice);
    console.log(`invoice formatted to be sent to NS`, JSON.stringify(netsuiteInvoice));
    const response = await sendNetsuiteRequest(netsuiteInvoice);  
    console.log(`invoice created in NS with error = ${response.error} and status = ${response.status}`);
    return response;
}

const formatMetronomeInvoiceToNetsuite = function (invoice: Invoice): any {
    return {
        "entity": {
            "id": invoice.external_customer_id
        },
        "item": {
            "items": invoice.line_items.map(item => {
                return {
                    "item": {
                        "id": item.external_item_id
                    },
                    "description": item.name,
                    "quantity": item.quantity,
                    "amount": item.amount
                }
            })
        },
        "externalId":invoice.id,
        "startDate": invoice.start_date,
        "endDate": invoice.end_date,
        "customForm": NS_INVOICE_CUSTOM_FORM
    }
}

const sendNetsuiteRequest = async function(data: NetsuiteInvoice ): Promise<CreateExternalInvoiceType> {
    const parameters = {
        realm: NS_ACCOUNT_ID.toUpperCase(),
        consumer_key: NS_CONSUMER_KEY,
        consumer_secret : NS_CONSUMER_SECRET,
        token: NS_TOKEN_ID,
        token_secret: NS_TOKEN_SECRET,
        url: url,
        method: method
    };
    const headers = getAuthorizationHeader(parameters);
    try {
        const response = await fetch( url , {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: JSON.stringify(data) 
        });
        return {
            error: response.status < 400 ? undefined : await response.json(),
            status: response.status,
            external_invoice_id: response.status < 400 ? response.headers.get('location') || undefined : undefined,
        }
    } catch (e){
        console.log('Exception', e)
        return {
            error: `Exception Netsuite Request - ${JSON.stringify(e)}`,
            status: 500 ,
            external_invoice_id: undefined,
        };
    }
}

const getAuthorizationHeader = function(parameters: AuthParameters) : any {
    const oauth = new OAuth({
      consumer: {
        key: parameters.consumer_key,
        secret: parameters.consumer_secret,
      },
      realm: parameters.realm,
      signature_method: ALGORITHM,
      hash_function(base_string, key) {
        return crypto
          .createHmac("sha256", key)
          .update(base_string)
          .digest("base64");
      },
    });
    return oauth.toHeader(
      oauth.authorize(
        {
          url: parameters.url,
          method: parameters.method,
        },
        {
          key: parameters.token,
          secret: parameters.token_secret,
        }
      )
    );
}