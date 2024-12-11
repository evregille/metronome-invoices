// https://www.notion.so/teammetronome/Updating-Invoice-Status-API-30f446648102410eb281f9df4a310d0c

import { createInvoiceInNetsuite } from "./netsuite";
import { createInvoiceRazorpay } from './razorpay';
import { Invoice, CreateExternalInvoiceType } from "./types";

const METRONOME_API_KEY = process.env['METRONOME_API_KEY'] || '';
const METRONOME_STATUS = ["DRAFT",
    "FINALIZED",
    "PAID",
    "UNCOLLECTIBLE",
    "VOID",
    "DELETED",
    "PAYMENT_FAILED",
    "INVALID_REQUEST_ERROR"]

export const handler = async function(message: any){
    const invoice: Invoice = JSON.parse(message?.Records[0]?.body);
    if(!invoice) throw new Error(`Error fetching the Metronome Invoice`);
    try{
        console.log(`message received to process invoice ${invoice.id} for customer ${invoice.metronome_customer_id} to be sent to ${invoice.destination}`);
        let response: CreateExternalInvoiceType = {status: 0, error: undefined, external_invoice_id: undefined,} ;
        switch(invoice.destination.toLowerCase()){
            case 'netsuite':
                response = await createInvoiceInNetsuite(invoice);
                break;
            case 'razorpay':
                response = await createInvoiceRazorpay(invoice);
                break;
            default:
                break;
        }
        const responseStatusMetronome = await updateInvoiceStatusInMetronome(
            response.error || response.status >= 400 ?  METRONOME_STATUS[7] :METRONOME_STATUS[1] , 
            invoice.id,
            invoice.issue_date,
            invoice.destination,
            response.external_invoice_id,
        )
        console.log(`metronome invoice billing provider created with error = ${responseStatusMetronome.error} and status = ${responseStatusMetronome.status}`);
        if(response.error || response.status >= 400) throw Error('Error creating the invoice');
    } catch(error){
        console.log('exception', error)
        const responseStatusMetronome = await updateInvoiceStatusInMetronome(
            METRONOME_STATUS[7] , 
            invoice.id,
            invoice.issue_date,
            invoice.destination,
            undefined,
        )
        throw error;
    }
}


const updateInvoiceStatusInMetronome = async function(
    status: string, 
    metronomeInvoiceId: string | undefined, 
    issued_at: string | undefined, 
    destination: string | undefined,
    billing_provider_invoice_id: string | undefined): Promise<any> {
    const url = `https://api.metronome.com/v1/invoices/billingProvider`;
    const BILLING_PROVIDER_NAME = (destination === 'razorpay') ? 'custom' : destination
    
    try {
        const response = await fetch( url , {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${METRONOME_API_KEY}`
            },
            body: JSON.stringify([
                {
                  "billing_provider_invoice_id": billing_provider_invoice_id,
                  "invoice_id": metronomeInvoiceId,
                  "billing_provider": BILLING_PROVIDER_NAME,
                  "issued_at": issued_at,
                  "external_status": status
                }
              ])
        });
        return {
            error: response.status < 400 ? false : true,
            status: response.status,
            message: '',
            data: await response.json()
        }
    } catch (e){
        console.log('Exception', e)
        return {
            error: true,
            message: `Exception Metronome request to update the invoice status - ${JSON.stringify(e)}`,
        };
    }
}