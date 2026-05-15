import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import pino from 'pino';

const logger = pino({ level: 'info' });

export class WhatsAppHandler {
    constructor(io) {
        this.io = io;
        this.sock = null;
        this.qr = null;
        this.status = 'DISCONNECTED';
    }

    async init() {
        const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
        
        this.sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            logger: pino({ level: 'silent' })
        });

        this.sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                this.qr = await QRCode.toDataURL(qr);
                this.status = 'QR_READY';
                this.io.emit('status', { status: this.status, qr: this.qr });
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
                this.status = 'DISCONNECTED';
                this.qr = null;
                this.io.emit('status', { status: this.status });
                if (shouldReconnect) {
                    this.init();
                }
            } else if (connection === 'open') {
                console.log('opened connection');
                this.status = 'CONNECTED';
                this.qr = null;
                this.io.emit('status', { status: this.status });
            }
        });

        this.sock.ev.on('creds.update', saveCreds);

        this.sock.ev.on('messages.upsert', async m => {
            console.log('replying to', m.messages[0].key.remoteJid);
            // Example: Auto-reply (optional, for testing)
            // if (m.type === 'notify' && !m.messages[0].key.fromMe) {
            //     await this.sock.sendMessage(m.messages[0].key.remoteJid, { text: 'Hello from WhatsApp Try!' });
            // }
        });
    }

    getStatus() {
        return { status: this.status, qr: this.qr };
    }

    async sendMessage(jid, text) {
        if (this.status !== 'CONNECTED') throw new Error('Not connected');
        // Clean JID if it's just a number
        const formattedJid = jid.includes('@s.whatsapp.net') ? jid : `${jid}@s.whatsapp.net`;
        console.log(`[DEBUG] Tentando enviar mensagem para: ${formattedJid}`);
        const result = await this.sock.sendMessage(formattedJid, { text });
        console.log(`[DEBUG] Resultado do envio:`, result ? 'Sucesso' : 'Falha');
        return result;
    }

    async logout() {
        if (this.sock) {
            await this.sock.logout();
            this.status = 'DISCONNECTED';
            this.qr = null;
            this.io.emit('status', { status: this.status });
            // Remove session files
            if (fs.existsSync('baileys_auth_info')) {
                fs.rmSync('baileys_auth_info', { recursive: true, force: true });
            }
            this.init();
        }
    }
}
