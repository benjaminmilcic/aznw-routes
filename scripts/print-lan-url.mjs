/**
 * Zeigt vor dem Start des Dev-Servers die Netzwerk-Adressen dieses Rechners an.
 *
 * Hintergrund: Dieses Projekt nutzt den webpack-Dev-Server
 * (@angular-builders/custom-webpack). Der meldet immer nur
 * "open your browser on http://localhost:4200/" – auch mit --host 0.0.0.0.
 * Die Liste der Netzwerk-Adressen ("Network: …") gibt es nur beim neueren
 * Vite-basierten Dev-Server des Angular-Application-Builders.
 */
import os from 'node:os';

const port = process.env.PORT ?? '4200';

const urls = [];
for (const [iface, addresses] of Object.entries(os.networkInterfaces())) {
  for (const address of addresses ?? []) {
    // 169.254.x.x sind Link-Local-Adressen (z. B. von Tailscale) – nutzlos zum Öffnen.
    if (address.family === 'IPv4' && !address.internal && !address.address.startsWith('169.254.')) {
      urls.push(`  http://${address.address}:${port}/   (${iface})`);
    }
  }
}

console.log('\n  Lokal:      http://localhost:' + port + '/');
if (urls.length) {
  console.log('  Im Netzwerk:');
  console.log(urls.join('\n'));
  console.log(
    '\n  Hinweis: Beim ersten Zugriff von einem anderen Gerät muss die\n' +
      '  Windows-Firewall Node.js im privaten Netzwerk erlauben.\n',
  );
} else {
  console.log('  (keine Netzwerk-Adresse gefunden – ist WLAN/LAN verbunden?)\n');
}
