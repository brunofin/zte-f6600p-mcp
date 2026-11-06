import { Agent } from 'node:https';
import { connect, type ConnectionOptions } from 'node:tls';
import { sha256 } from './crypto.js';
import { RouterError } from './errors.js';

/** Withhold the socket from HTTP until the TLS certificate pin is validated. */
export function pinnedAgent(pin: string, timeoutMs: number): Agent {
  const expected = pin.replace(/:/g, '').toLowerCase();
  if (!/^[a-f\d]{64}$/.test(expected)) throw new RouterError('CONFIGURATION', 'Certificate pin must contain 64 hexadecimal digits.');
  const agent = new Agent({ keepAlive: true });
  agent.createConnection = (options, callback) => {
    if (!callback) throw new RouterError('CONFIGURATION', 'Asynchronous TLS agent requires a callback.');
    const socket = connect({ ...options, rejectUnauthorized: false } as ConnectionOptions);
    let complete = false;
    const finish = (error: Error | null) => {
      if (complete) return;
      complete = true;
      if (error) { callback(error, socket); socket.destroy(); }
      else { socket.setTimeout(0); callback(null, socket); }
    };
    socket.setTimeout(timeoutMs, () => finish(new Error('TLS handshake timed out.')));
    socket.once('error', () => finish(new Error('TLS handshake failed.')));
    socket.once('secureConnect', () => {
      const raw = socket.getPeerCertificate().raw;
      finish(raw && sha256(raw) === expected ? null : new Error('Router certificate pin mismatch.'));
    });
    return undefined;
  };
  return agent;
}
