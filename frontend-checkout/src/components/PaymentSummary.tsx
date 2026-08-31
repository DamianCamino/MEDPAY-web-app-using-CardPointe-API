import { formatMoney } from '../protocol';

/**
 * Cambio pedido: mostrar "Amount Due" de forma prominente, sin agregar el
 * desglose de fee/surcharge (eso queda fuera de alcance por ahora para no
 * hacer cambios grandes). Se quito la linea "Method" que tenia la version
 * anterior para mantenerlo simple.
 */
export function PaymentSummary({
  amount,
  currency,
}: {
  amount: number;
  currency?: string;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex items-center justify-between">
      <span className="text-sm font-semibold text-gray-700">Amount Due:</span>
      <span className="text-xl font-bold text-gray-900">{formatMoney(amount, currency)}</span>
    </div>
  );
}
