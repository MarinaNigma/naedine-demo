import { createRoot } from 'react-dom/client';
import { Landing } from './components/landing';
import { initialContent } from './modules/content/defaults';
import { initialPricingRules } from './modules/pricing/defaults';
import { calculateQuote } from './modules/pricing/calculator';
import './style.css';
import { staticPhotos } from './modules/media/static-photos';
// This standalone display has no backend and never submits guest information.
// Reuse the original calculator and rules; replace only its demo transport.
window.fetch = async (input, options) => {
  if (input !== '/api/quote' || options?.method !== 'POST') return Response.json({ error: 'Демонстрация: серверные операции недоступны' }, { status: 503 });
  try {
    const quote = calculateQuote(JSON.parse(String(options.body)), initialPricingRules);
    return Response.json({ quote, demoMode: true, availabilityChecked: false });
  } catch (error) {
    const issues = error && typeof error === 'object' && 'issues' in error ? error.issues : undefined;
    return Response.json({ error: 'Проверьте даты и состав гостей', issues }, { status: 400 });
  }
};
createRoot(document.getElementById('root')!).render(<Landing content={initialContent} photos={staticPhotos} pricing={{ rules: initialPricingRules, capacity: 8, demoMode: true }} />);
