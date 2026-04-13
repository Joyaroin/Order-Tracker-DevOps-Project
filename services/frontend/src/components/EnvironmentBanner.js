import { ENVIRONMENT } from '../config';

export default function EnvironmentBanner() {
  const isProduction = ['production', 'staging', 'prod'].includes(ENVIRONMENT.toLowerCase());

  return (
    <div
      className={`w-full px-6 py-3 text-center font-semibold tracking-wide ${
        isProduction
          ? 'bg-maroon text-white'
          : 'bg-beige text-warm-gray'
      }`}
    >
      <span className="text-sm uppercase">
        Environment: {ENVIRONMENT.toUpperCase()}
      </span>
    </div>
  );
}
