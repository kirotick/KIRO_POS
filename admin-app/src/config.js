// The only setting the app needs. It is public by design (it is just an address); all secrets stay on the server.
export const API_URL = String(process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');
