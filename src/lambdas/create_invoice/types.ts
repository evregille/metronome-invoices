
export type Invoice = {
    id: string,
    destination: string
    metronome_customer_id: string,
    external_customer_id: string,
    start_date: string,
    end_date: string,
    issue_date: string,
    line_items: LineItem[],
}

export type LineItem = {
    quantity: number,
    name: string, 
    amount: number,
    external_item_id: string,
}

export type QuickbooksInvoice = {
    CustomerRef: {
        value: string,
    },
    Line: Array<any>
}

export type NetsuiteInvoice = {
    entity: {
        id: string
    },
    item: Array<any>,
    externalId: string,
    startDate: string,
    endDate: string,
    customForm: {
        id: string,
        refName: string,
    },
}

export type RazorpayInvoice = {
    type: 'invoice',
    date: number,
    customer_id: string,
    line_items: Array<{
        name: string,
        amount: number,
        quantity: number,
    }>
}

export type CreateExternalInvoiceType = {
    status: number,
    error: string | undefined,
    external_invoice_id: string | undefined,
}

export type AuthParameters = any;