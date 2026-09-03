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
    <div className="bg-gradient-to-br from-gray-50 to-gray-50/60 rounded-xl p-4 border border-gray-200/60 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-brand" />
        <span className="text-sm font-semibold text-gray-500">Amount Due</span>
      </div>
      <span className="text-xl font-bold text-gray-900 tabular-nums">{formatMoney(amount, currency)}</span>
    </div>
  );
}
