
import { RazorpayInvoice, Invoice, CreateExternalInvoiceType } from './types';
import Razorpay from 'razorpay';

// QUICKBOOKS CONFIGURATION
const RAZORPAY_API_KEY_ID = process.env['RAZORPAY_API_KEY_ID'] || '';
const RAZORPAY_API_KEY_SECRET = process.env['RAZORPAY_API_KEY_SECRET'] || '';

export const createInvoiceRazorpay = async (invoice: Invoice): Promise<CreateExternalInvoiceType> =>{
    const razorpayInvoice: RazorpayInvoice = formatMetronomeInvoiceToRazopayInvoice(invoice);
    console.log(`invoice formatted to be sent to Razorpay`, JSON.stringify(razorpayInvoice));
    const response = await sendRazorpayRequest(razorpayInvoice);  
    console.log(`invoice created in Razorpay with error = ${response.error} and status = ${response.status}`);
    return response;
}

const formatMetronomeInvoiceToRazopayInvoice = function (invoice: Invoice): RazorpayInvoice {
    return {
        "type": "invoice",
        "date": Math.floor(Date.parse(invoice.start_date) / 1000 ),
        "customer_id": invoice.external_customer_id,
        "line_items": invoice.line_items.map(item => {
            return {
                "name": item.name,
                "amount": item.amount,
                "quantity": item.quantity,
            }
        })
    }
}

const sendRazorpayRequest = async function(data: RazorpayInvoice ): Promise<CreateExternalInvoiceType> {
    if(RAZORPAY_API_KEY_ID.length > 0 && RAZORPAY_API_KEY_SECRET.length > 0){
        const razoprpay_instance = new Razorpay({ key_id: RAZORPAY_API_KEY_ID, key_secret: RAZORPAY_API_KEY_SECRET })
        try {
            const result:any = await razoprpay_instance.invoices.create(data);
            if(result.error)
                return {
                    error: `${result.error.code} - ${result.error.description}`,
                    status: 400,
                    external_invoice_id: undefined,
                }
            return {
                error:undefined,
                status: 200,
                external_invoice_id: result.id
            }
        } catch (e){
            console.log('Exception', e)
            return {
                error: `Exception Razorpay Invoice create request - ${JSON.stringify(e)}`,
                status: 500 ,
                external_invoice_id: undefined,
            };
        }
    } else return {
        error: `Exception Razorpay service not configured properly`,
        status: 500 ,
        external_invoice_id: undefined,
    }
}