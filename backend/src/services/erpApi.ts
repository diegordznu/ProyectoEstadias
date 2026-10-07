import { requiredEnv } from '../config/env';

// Todavía no conocemos bien la API del ERP: por ahora solo verificamos que responda.
const TIMEOUT_MS = 10_000;

export interface ErpResponse {
    status: number;
    ok: boolean;
    body: string;
}

async function erpGet(path: string): Promise<ErpResponse> {
    const baseUrl = requiredEnv('ERP_API_URL').replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/${path}`, {
        method: 'GET',
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    // Se lee como texto porque aún no sabemos qué formato devuelve (JSON, XML, HTML...).
    const body = await response.text();
    return { status: response.status, ok: response.ok, body };
}

export function pingErp(): Promise<ErpResponse> {
    const deviceId = requiredEnv('ERP_DEVICE_ID');
    return erpGet(`ciclosserviceproc.aspx?${deviceId}`);
}
