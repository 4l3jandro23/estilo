/* Estilo: iconos propios, todos del mismo trazo (24 px, línea de 1,6), en lugar de emojis. */
'use strict';
const NUBE = 'M7.5 18h9.25a3.75 3.75 0 0 0 .4-7.48A5.5 5.5 0 0 0 6.6 11.2 3.4 3.4 0 0 0 7.5 18Z';
const ICONOS = {
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  solnube: '<path d="M9 5.5V4M4.4 7.4 3.4 6.4M3.5 12H2M13.6 7.4l1-1"/><path d="M5.6 12.2A4 4 0 0 1 12.4 8"/><path d="M9 20h8.5a3.5 3.5 0 0 0 .3-7A5 5 0 0 0 8.2 14a3 3 0 0 0 .8 6Z"/>',
  nube: `<path d="${NUBE}"/>`,
  niebla: '<path d="M4 9h16M3 13h18M5 17h14"/>',
  lluvia: '<path d="M7.5 14.5h9.25a3.75 3.75 0 0 0 .4-7.48A5.5 5.5 0 0 0 6.6 7.7 3.4 3.4 0 0 0 7.5 14.5Z"/><path d="M8.5 17.5 7.5 20M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5"/>',
  nieve: '<path d="M7.5 14.5h9.25a3.75 3.75 0 0 0 .4-7.48A5.5 5.5 0 0 0 6.6 7.7 3.4 3.4 0 0 0 7.5 14.5Z"/><path d="M8 18h.01M12 20h.01M16 18h.01"/>',
  tormenta: '<path d="M7.5 14.5h9.25a3.75 3.75 0 0 0 .4-7.48A5.5 5.5 0 0 0 6.6 7.7 3.4 3.4 0 0 0 7.5 14.5Z"/><path d="m12.5 15-2 3.5h3l-2 3"/>',
  paraguas: '<path d="M3 12a9 9 0 0 1 18 0Z"/><path d="M12 12v6.5a2 2 0 0 0 4 0"/><path d="M12 3V2"/>',
  calzado: '<path d="M3 15.5V10l3.5 1 4-3.5 2 3c2.5 1.6 6.5 1.6 8.5 3.5v1.5Z"/><path d="M3 18.5h18"/>',
  gafas: '<circle cx="6.5" cy="14" r="3.5"/><circle cx="17.5" cy="14" r="3.5"/><path d="M10 13.5c1.2-.8 2.8-.8 4 0M3 14 4.5 8.5M21 14l-1.5-5.5"/>',
  gorra: '<path d="M4 15a8 8 0 0 1 16 0Z"/><path d="M20 15h1.5a.5.5 0 0 1 .3.9L19 18H4"/><path d="M12 7V5.8"/>',
  protector: '<path d="M9 7h6l1 3v9.5a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 19.5V10Z"/><path d="M10 7V4h4v3M8 13h8"/>',
  abrigo: '<path d="M8.5 3 5 5.5 3.5 20h4.2L9 11l3 2 3-2 1.3 9h4.2L19 5.5 15.5 3 12 6.5Z"/><path d="M12 6.5V21"/>',
  bufanda: '<path d="M6 5h12v4H6zM9 9v10l3 1.5 3-1.5V9"/><path d="M9 13h6M9 16.5h6"/>',
  capas: '<path d="m12 3 9 5-9 5-9-5Z"/><path d="m3 12.5 9 5 9-5"/><path d="m3 16.5 9 5 9-5" opacity=".5"/>',
  viento: '<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h7"/>',
  gota: '<path d="M12 3.5c3 3.6 6 7 6 10.5a6 6 0 0 1-12 0c0-3.5 3-6.9 6-10.5Z"/>',
  candado: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  cesta: '<path d="M4 9.5h16l-1.5 10h-13Z"/><path d="m8.5 9.5 3-6M15.5 9.5l-3-6M9 13v3.5M15 13v3.5M12 13v3.5"/>',
  aguja: '<path d="M19.5 4.5 7 17"/><path d="M17.5 4.2a1.6 1.6 0 1 1 2.3 2.3"/><path d="M7 17c-2 1-3.5 2.4-3.5 3.5 1.5 0 3-1.5 3.5-3.5Z"/>',
  caja: '<path d="m12 3 8.5 4.5v9L12 21l-8.5-4.5v-9Z"/><path d="m3.5 7.5 8.5 4.5 8.5-4.5M12 12v9"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  camara: '<path d="M4 8h3l1.6-2.5h6.8L17 8h3a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.3" r="3.6"/>',
  fotos: '<rect x="3" y="5" width="15" height="13" rx="2"/><path d="M21 8v11a2 2 0 0 1-2 2H7"/><path d="m3 15 4-4 4 4 2-2 5 5"/>',
  corazon: '<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10Z"/>',
  estrella: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9Z"/>',
  aviso: '<path d="M12 4 21.5 20h-19Z"/><path d="M12 10v4.5M12 17.4h.01"/>',
  bolsa: '<path d="M5.5 8h13l-1 12.5h-11Z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
  reciclar: '<path d="M7.5 9.5 10 5.2a2.3 2.3 0 0 1 4 0l1.6 2.8"/><path d="m14 8.5 2.1-.6.6 2.1"/><path d="M18.7 12.5 20 15a2.3 2.3 0 0 1-2 3.4h-3.6"/><path d="m15.8 20-1.4-1.6 1.5-1.5"/><path d="M8.6 18.4H6a2.3 2.3 0 0 1-2-3.4l1.4-2.5"/><path d="m3.6 11.7 1.8.8.8-2"/>',
  pregunta: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.5M12 16.8h.01"/>',
  flecha: '<path d="m9 5 7 7-7 7"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>'
};
const IC = (n, cls) => `<svg class="ic ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONOS[n] || ''}</svg>`;
