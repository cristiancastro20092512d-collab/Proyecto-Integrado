const { createReadStream } = require('node:fs');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { GoogleGenAI } = require('@google/genai');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, 'Solvi.env') });

const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const MAX_BODY_BYTES = 20 * 1024;
const MAX_MESSAGES = 10;
const MAX_MESSAGE_LENGTH = 1400;
const MAX_PROMPT_FILE_CHARS = 30000;
const INSTRUCTIONS_FILE = path.join(__dirname, 'solvi-instrucciones.txt');
const PERSONALITY_FILE = path.join(__dirname, 'solvi-personalidad.txt');
const PUBLIC_TYPES = new Map([
    ['.avif', 'image/avif'],
    ['.css', 'text/css; charset=utf-8'],
    ['.html', 'text/html; charset=utf-8'],
    ['.jpeg', 'image/jpeg'],
    ['.jpg', 'image/jpeg'],
    ['.js', 'text/javascript; charset=utf-8'],
    ['.png', 'image/png'],
    ['.webp', 'image/webp']
]);

function sendJson(response, status, data) {
    response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff'
    });
    response.end(JSON.stringify(data));
}

function httpError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

async function readJsonBody(request) {
    if (!request.headers['content-type']?.startsWith('application/json')) {
        throw httpError(415, 'El contenido debe ser JSON.');
    }

    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) {
            request.resume();
            throw httpError(413, 'La solicitud es demasiado grande.');
        }
        chunks.push(chunk);
    }

    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        throw httpError(400, 'El JSON de la solicitud no es válido.');
    }
}

function validateMessages(value) {
    if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MESSAGES) {
        throw httpError(400, 'Envía entre 1 y 10 mensajes.');
    }

    const valid = value.every((message) =>
        message &&
        (message.role === 'user' || message.role === 'model') &&
        typeof message.text === 'string' &&
        message.text.trim().length > 0 &&
        message.text.length <= MAX_MESSAGE_LENGTH
    );

    if (!valid || value[value.length - 1].role !== 'user') {
        throw httpError(400, 'Los mensajes enviados no tienen un formato válido.');
    }

    return value;
}

async function loadSystemInstruction() {
    const [instructions, personality] = await Promise.all([
        fs.readFile(INSTRUCTIONS_FILE, 'utf8'),
        fs.readFile(PERSONALITY_FILE, 'utf8')
    ]);

    if (!instructions.trim() || !personality.trim()) {
        throw new Error('Los archivos de instrucciones y personalidad no pueden estar vacíos.');
    }
    if (
        instructions.length > MAX_PROMPT_FILE_CHARS ||
        personality.length > MAX_PROMPT_FILE_CHARS
    ) {
        throw new Error('Cada archivo de configuración debe tener 30,000 caracteres o menos.');
    }

    return `${instructions.trim()}\n\n${personality.trim()}`;
}

async function handleChat(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return sendJson(response, 405, { error: 'Usa POST para enviar una pregunta.' });
    }

    if (!process.env.GEMINI_API_KEY) {
        return sendJson(response, 503, {
            error: 'Falta GEMINI_API_KEY en el archivo Solvi.env.'
        });
    }

    let messages;
    try {
        const body = await readJsonBody(request);
        messages = validateMessages(body.messages);
    } catch (error) {
        return sendJson(response, error.statusCode || 400, { error: error.message });
    }

    let systemInstruction;
    try {
        systemInstruction = await loadSystemInstruction();
    } catch (error) {
        console.error('No se pudo cargar la configuración de Solvi:', error.message);
        return sendJson(response, 500, {
            error: 'Revisa que solvi-instrucciones.txt y solvi-personalidad.txt existan, tengan contenido y no superen 30,000 caracteres cada uno.'
        });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const result = await ai.models.generateContent({
            model: MODEL,
            contents: messages.map(({ role, text }) => ({
                role,
                parts: [{ text }]
            })),
            config: {
                maxOutputTokens: 512,
                systemInstruction
            }
        });

        if (typeof result.text !== 'string' || !result.text.trim()) {
            return sendJson(response, 502, { error: 'La API no devolvió una respuesta de texto.' });
        }

        return sendJson(response, 200, { reply: result.text });
    } catch (error) {
        const status = error.status || error.statusCode;
        console.error(
            'Falló la solicitud a Gemini:',
            status || error.code || error.name || 'Error desconocido',
            error.message || ''
        );
        let message = 'No se pudo consultar Gemini. Revisa la clave, el modelo y tu conexión.';
        if (status === 401 || status === 403) {
            message = 'Gemini rechazó la clave API. Verifica GEMINI_API_KEY en Solvi.env.';
        } else if (status === 404) {
            message = `Gemini no reconoce el modelo "${MODEL}". Revisa GEMINI_MODEL en Solvi.env.`;
        } else if (status === 429) {
            message = 'Gemini rechazó la solicitud por límite de uso o cuota.';
        }
        return sendJson(response, 502, {
            error: message
        });
    }
}

async function serveStatic(request, response, pathname) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.setHeader('Allow', 'GET, HEAD');
        return sendJson(response, 405, { error: 'Método no permitido.' });
    }

    const requestedPath = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.resolve(__dirname, `.${requestedPath}`);
    const relativePath = path.relative(__dirname, filePath);
    const segments = relativePath.split(path.sep);
    const contentType = PUBLIC_TYPES.get(path.extname(filePath).toLowerCase());

    if (
        path.isAbsolute(relativePath) ||
        relativePath === '..' ||
        relativePath.startsWith(`..${path.sep}`) ||
        segments.some((segment) => segment.startsWith('.') || segment.toLowerCase() === 'node_modules') ||
        relativePath.toLowerCase() === 'server.js' ||
        !contentType
    ) {
        return sendJson(response, 404, { error: 'No encontrado.' });
    }

    try {
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) {
            return sendJson(response, 404, { error: 'No encontrado.' });
        }

        response.writeHead(200, {
            'Content-Length': stat.size,
            'Content-Type': contentType,
            'X-Content-Type-Options': 'nosniff'
        });
        if (request.method === 'HEAD') {
            return response.end();
        }
        return createReadStream(filePath).pipe(response);
    } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
            return sendJson(response, 404, { error: 'No encontrado.' });
        }
        throw error;
    }
}

async function handleRequest(request, response) {
    let pathname;
    try {
        pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
        return sendJson(response, 400, { error: 'La ruta de la solicitud no es válida.' });
    }

    if (pathname === '/api/health') {
        if (request.method !== 'GET') {
            response.setHeader('Allow', 'GET');
            return sendJson(response, 405, { error: 'Usa GET para consultar el estado.' });
        }
        try {
            await loadSystemInstruction();
        } catch (error) {
            console.error('La configuración de Solvi no está lista:', error.message);
            return sendJson(response, 503, {
                ok: false,
                error: 'Revisa los archivos de instrucciones y personalidad de Solvi.'
            });
        }
        return sendJson(response, 200, {
            ok: true,
            model: MODEL,
            instructionsReady: true
        });
    }

    if (pathname === '/api/chat') {
        return handleChat(request, response);
    }

    if (pathname.startsWith('/api/')) {
        return sendJson(response, 404, { error: 'Endpoint no encontrado.' });
    }

    return serveStatic(request, response, pathname);
}

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error('PORT debe ser un número entre 1 y 65535.');
}

http.createServer((request, response) => {
    handleRequest(request, response).catch((error) => {
        console.error('Error al procesar la solicitud:', error.name || 'Error desconocido');
        if (!response.headersSent) {
            sendJson(response, 500, { error: 'Ocurrió un error interno en el servidor.' });
        } else {
            response.destroy();
        }
    });
}).listen(PORT, '0.0.0.0', () => {
    console.log(`Solvanta está escuchando en el puerto ${PORT}`);
});
