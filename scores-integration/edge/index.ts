// PROPOSAL ONLY. No deployment/config/auth changes are made by this file.
import { createProvider } from '../src/provider.mjs';
import { createRPCCache } from '../src/rpc-cache.mjs';
import { createScoreHandler } from '../src/handler.mjs';
const enabled = Deno.env.get('CC_SCORES_ENABLED') === 'true';
const providerKey = Deno.env.get('BALLDONTLIE_API_KEY');
const url = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const configured = enabled && Boolean(providerKey && url && serviceKey);
Deno.serve(createScoreHandler({ enabled: configured,
  provider: configured ? createProvider({ key: providerKey }) : undefined,
  cache: configured ? createRPCCache({ url, serviceKey }) : undefined,
  allowedOrigins: ['https://edoworks.com']
}));
