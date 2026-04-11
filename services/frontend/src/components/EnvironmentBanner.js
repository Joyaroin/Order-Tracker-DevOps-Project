import { ENVIRONMENT } from '../config';

const isProduction = ['production', 'staging', 'prod'].includes(ENVIRONMENT.toLowerCase());

export default function EnvironmentBanner() {
  return (
    <div
      className={`w-full px-6 py-3 text-center font-semibold tracking-wide ${
        isProduction
          ? 'bg-maroon text-white'
          : 'bg-beige text-warm-gray'
      }`}
    >
      <span className="text-sm uppercase">
        Environment: {ENVIRONMENT}
      </span>
    </div>
  );
}
