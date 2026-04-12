import { fmtDisplay } from './formatters';
import { toCSV, downloadCSV } from './csv';

const fmtCSVDate = (iso) => iso ? fmtDisplay(iso.slice(0, 10)) : '';

const cardLabelCSV = (card) =>
    card ? `${card.bank_name} - ${card.last_four_digit}` : '';

// Column spec shared between OrdersPage and SellerLedgerPage exports.
// Dates use dd-MM-yyyy so Excel doesn't auto-convert them to date serials
// and collapse the column to ########.
const orderColumns = [
    { header: 'Order Date', value: o => fmtCSVDate(o.order_date) },
    { header: 'Model', value: o => o.model_ordered },
    { header: 'Variant', value: o => o.variant },
    { header: 'Quantity', value: o => o.quantity },
    { header: 'Order Amount', value: o => o.order_amount },
    { header: 'Return Amount', value: o => o.return_amount },
    { header: 'Cashback', value: o => o.cashback || 0 },
    { header: 'Profit', value: o => (o.return_amount - o.order_amount) + (o.cashback || 0) },
    { header: 'Delivery Status', value: o => o.delivery_status },
    { header: 'Delivered Date', value: o => fmtCSVDate(o.delivered_date) },
    { header: 'Buyer', value: o => o.seller_id?.name || '' },
    { header: 'Location', value: o => o.seller_id?.city || '' },
    { header: 'E-comm Site', value: o => o.ecomm_site },
    { header: 'Card', value: o => cardLabelCSV(o.card_id) },
    { header: 'ID Used', value: o => o.id_used },
    { header: 'Cleared', value: o => o.is_cleared ? 'Yes' : 'No' },
    { header: 'Remark', value: o => o.remark || '' },
];

export const exportOrdersCSV = (orders, filename) => {
    const csv = toCSV(orders, orderColumns);
    downloadCSV(filename, csv);
};
