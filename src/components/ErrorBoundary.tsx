import { Component, type ErrorInfo, type ReactNode } from 'react';
import { FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID } from '../firebase';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Ett oväntat fel uppstod.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isQuotaError = this.state.errorMessage.includes('Quota exceeded');
    const isDailyReadLimit = this.state.errorMessage.includes(
      "Free daily read units per project (free tier database)"
    );

    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full space-y-4">
          <div className="text-xs font-mono font-semibold text-red-600">
            sverigesehandel.se · Felhantering
          </div>
          <h1 className="font-display text-2xl font-extrabold text-[#040B16]">
            {isQuotaError
              ? 'Firestore-kvoten har nåtts för idag'
              : 'Något gick fel vid hämtning eller lagring av data'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {isQuotaError
              ? 'Projektets dagliga gratiskvot i Firestore har överskridits. Kvoten återställs automatiskt nästa dygn.'
              : 'Applikationen fångade ett databas- eller behörighetsfel. Försök ladda om sidan eller logga in med ett verifierat konto.'}
          </p>
          {isDailyReadLimit && (
            <a
              href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/databases/${FIRESTORE_DATABASE_ID}/data?openUpgradeDialog=true`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs font-semibold text-[#006AA7] underline"
            >
              Öppna Firestore-kvot & uppgradering i Firebase Console &rarr;
            </a>
          )}
          <pre className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-700 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
            {this.state.errorMessage}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2.5 rounded-xl bg-[#040B16] hover:bg-[#006AA7] text-white text-xs font-bold cursor-pointer"
          >
            Ladda om sidan
          </button>
        </div>
      </div>
    );
  }
}
