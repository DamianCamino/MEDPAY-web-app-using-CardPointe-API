import { PaymentMethod } from '../protocol';

interface Props {
  method: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  showBank: boolean;
  showFinance: boolean;
}

export function PaymentMethodToggle({ method, onChange, showBank, showFinance }: Props) {
  const cols = 1 + (showBank ? 1 : 0) + (showFinance ? 1 : 0);

  // Build the ordered list of visible methods
  const methods: { key: PaymentMethod; icon: string; label: string }[] = [
    { key: 'card', icon: '💳', label: 'Credit / Debit' },
  ];
  if (showBank) methods.push({ key: 'bank', icon: '🏦', label: 'Bank (ACH)' });
  if (showFinance) methods.push({ key: 'alphaeon', icon: '🩺', label: 'Finance' });

  const activeIndex = methods.findIndex((m) => m.key === method);

  // Pure CSS transform: translate the pill by (activeIndex * 100)% of its own width.
  // The pill width is exactly 1/cols of the container (via percentage),
  // and translateX(N%) is relative to the element's own width — so we
  // translate by (activeIndex * 100)% to land on the Nth column.
  const pillTranslateX = activeIndex * 100;

  return (
    <div className="relative bg-gray-100/80 p-1.5 rounded-xl border border-gray-200/60">
      {/* Sliding pill indicator — hardware-accelerated via translate-x */}
      <div
        className="absolute top-1.5 bottom-1.5 rounded-[10px] bg-white shadow-md border border-gray-200/50 will-change-transform transition-transform duration-300 ease-out"
        style={{
          width: `calc(${100 / cols}% - ${cols > 1 ? '4px' : '0px'})`,
          left: cols > 1 ? '2px' : '0px',
          transform: `translateX(${pillTranslateX}%)`,
        }}
        aria-hidden="true"
      />

      {/* Button row */}
      <div
        className="relative grid"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {methods.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange(m.key)}
            className={`relative z-10 flex flex-col items-center justify-center py-3 px-2 rounded-[10px] transition-colors duration-300 ${
              method === m.key
                ? 'text-gray-900'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className={`text-xl mb-1 transform transition-transform duration-300 ${method === m.key ? 'scale-110' : 'scale-100'}`}>
              {m.icon}
            </div>
            <div className={`text-[11px] sm:text-xs font-semibold leading-tight text-center transition-colors duration-300 ${
              method === m.key ? 'text-gray-900' : 'text-gray-400'
            }`}>
              {m.label}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
