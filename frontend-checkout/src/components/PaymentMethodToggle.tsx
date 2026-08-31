import { PaymentMethod } from '../protocol';

interface Props {
  method: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  showBank: boolean;
  showFinance: boolean;
}

export function PaymentMethodToggle({ method, onChange, showBank, showFinance }: Props) {
  const cols = 1 + (showBank ? 1 : 0) + (showFinance ? 1 : 0);

  return (
    <div
      className="grid gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      <button
        type="button"
        onClick={() => onChange('card')}
        className={`flex flex-col items-center justify-center py-4 px-3 rounded-lg transition-all ${
          method === 'card'
            ? 'bg-white text-gray-900 border border-gray-100 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <div className="text-2xl mb-2">💳</div>
        <div className="text-xs sm:text-sm font-bold leading-tight text-center">Credit / Debit Card</div>
      </button>

      {showBank && (
        <button
          type="button"
          onClick={() => onChange('bank')}
          className={`flex flex-col items-center justify-center py-4 px-3 rounded-lg transition-all ${
            method === 'bank'
              ? 'bg-white text-gray-900 border border-gray-100 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="text-2xl mb-2">🏦</div>
          <div className="text-xs sm:text-sm font-bold leading-tight text-center">Bank Transfer</div>
        </button>
      )}

      {showFinance && (
        <button
          type="button"
          onClick={() => onChange('alphaeon')}
          className={`flex flex-col items-center justify-center py-4 px-3 rounded-lg transition-all ${
            method === 'alphaeon'
              ? 'bg-white text-gray-900 border border-gray-100 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="text-2xl mb-2">🩺</div>
          <div className="text-[11px] sm:text-xs font-bold leading-tight text-center text-gray-700">
            Finance with Alphaeon
          </div>
        </button>
      )}
    </div>
  );
}
