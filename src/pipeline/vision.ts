import { downloadMediaMessage, WAMessage } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);
const LLAMA_DIR = process.env.LLAMA_DIR || 'D:\\llama';
const OMNI_MODEL_PATH = process.env.OMNI_MODEL_PATH || 'D:\\models\\Qwen2.5-Omni-3B-UD-Q4_K_XL.gguf';
const LLAMA_SERVER_URL = process.env.LLAMA_SERVER_URL || 'http://localhost:8080';

export async function downloadMedia(msg: WAMessage, chatId: string): Promise<string> {
  const buffer = await downloadMediaMessage(
    msg,
    'buffer',
    {},
    {
      logger: null as any,
      reuploadRequest: async (m: WAMessage) => m
    }
  );

  const mediaDir = path.resolve(process.cwd(), 'data', 'media', chatId.replace(/[@:]/g, '_'));
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }

  const fileExt = msg.message?.imageMessage ? 'jpg' : msg.message?.videoMessage ? 'mp4' : 'bin';
  const filePath = path.join(mediaDir, `${msg.key.id}.${fileExt}`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export async function analyzeImage(imagePath: string, prompt: string = 'Describe this image in concise detail for a WhatsApp conversation reply.'): Promise<string> {
  // Option A: CLI execution with Qwen2.5 Omni / Qwen2-VL binary
  const qwenCli = path.join(LLAMA_DIR, 'llama-qwen2vl-cli.exe');
  if (fs.existsSync(qwenCli) && fs.existsSync(OMNI_MODEL_PATH)) {
    try {
      console.log(`Running Qwen Omni Vision model on ${imagePath}...`);
      const command = `"${qwenCli}" -m "${OMNI_MODEL_PATH}" --image "${imagePath}" -p "${prompt}" --temp 0.2 -n 256`;
      const { stdout } = await execAsync(command, { timeout: 45000 });
      return stdout.trim();
    } catch (err: any) {
      console.warn('Qwen CLI vision execution failed, attempting server endpoint fallback:', err.message);
    }
  }

  // Option B: Server multimodal endpoint
  try {
    const base64Data = fs.readFileSync(imagePath).toString('base64');
    const res = await axios.post(`${LLAMA_SERVER_URL}/v1/chat/completions`, {
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Data}` } }
          ]
        }
      ],
      max_tokens: 256
    }, { timeout: 30000 });

    const reply = res.data?.choices?.[0]?.message?.content;
    if (reply) return reply.trim();
  } catch (e: any) {
    console.warn('Multimodal server endpoint unavailable. Returning vision fallback description.');
  }

  return '[Image received: Visual content could not be analyzed]';
}
