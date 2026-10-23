import { requestJson } from './http';
import { ticketSchema, validateTicket } from './ticket';
import type { Env, Ticket } from './types';

interface ResponseData { output?: Array<{ content?: Array<{ type: string; text?: string }> }> }

export async function extractTicket(env: Env, bytes: ArrayBuffer, mime: string): Promise<{ ticket: Ticket; review: boolean }> {
  const binary = new Uint8Array(bytes);
  let base64 = '';
  for (let i = 0; i < binary.length; i += 8192) base64 += String.fromCharCode(...binary.subarray(i, i + 8192));
  base64 = btoa(base64);
  const response = await requestJson<ResponseData>('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [{ role: 'user', content: [
        { type: 'input_text', text: 'Extrae los datos visibles de este ticket mexicano. No inventes datos; usa null cuando algo no se vea. Fecha en YYYY-MM-DD. Confianza entre 0 y 1. Categoría según el esquema.' },
        { type: 'input_image', image_url: `data:${mime};base64,${base64}` },
      ] }],
      text: { format: { type: 'json_schema', name: 'ticket', strict: true, schema: ticketSchema } },
    }),
  }, 1);
  const text = response.output?.flatMap(item => item.content ?? []).find(item => item.type === 'output_text')?.text;
  if (!text) throw new Error('OpenAI no devolvió datos del ticket');
  return validateTicket(JSON.parse(text));
}
