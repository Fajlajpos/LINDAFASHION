import { odhlasit } from '@/lib/auth';
import { odpovedChyba, odpovedOk, jeStejnyPuvod } from '@/lib/api';

export async function POST(request: Request) {
  if (!jeStejnyPuvod(request)) {
    return odpovedChyba('Neplatný požadavek.', 403);
  }

  odhlasit();

  return odpovedOk({ presmerovat: '/' });
}
