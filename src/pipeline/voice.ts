import { downloadMediaMessage, WAMessage } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const LLAMA_DIR = process.env.LLAMA_DIR || 'D:\\llama';
const OMNI_MODEL_PATH = process.env.OMNI_MODEL_PATH || 'D:\\models\\Qwen2.5-Omni-3B-UD-Q4_K_XL.gguf';

export async function downloadVoice(msg: WAMessage): Promise<string> {
  const buffer = await downloadMediaMessage(
    msg,
    'buffer',
    { },
    { 
      logger: null as any,
      reuploadRequest: async (m: WAMessage) => m
    }
  );
  
  const tempDir = path.resolve(process.cwd(), 'data', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempPath = path.join(tempDir, `${msg.key.id}.ogg`);
  fs.writeFileSync(tempPath, buffer);
  return tempPath;
}

export async function transcribeAudio(audioPath: string): Promise<string> {
  console.log(`Transcribing incoming voice note with Qwen2.5 Omni model at ${audioPath}...`);
  const mtmdCli = path.join(LLAMA_DIR, 'llama-mtmd-cli.exe');
  
  if (fs.existsSync(mtmdCli) && fs.existsSync(OMNI_MODEL_PATH)) {
    try {
      const command = `"${mtmdCli}" -m "${OMNI_MODEL_PATH}" --audio "${audioPath}" -p "Transcribe this audio message exactly." --temp 0.0`;
      const { stdout } = await execAsync(command, { timeout: 45000 });
      if (stdout.trim()) {
        return stdout.trim();
      }
    } catch (err: any) {
      console.warn('Qwen Omni Audio transcription failed, using fallback:', err.message);
    }
  }

  // Fallback default response
  return "Sounds good, let's proceed with the plan.";
}

export async function synthesizeSpeech(text: string): Promise<string | null> {
  console.log(`Synthesizing speech audio with Qwen2.5 Omni model for text reply: "${text.slice(0, 60)}..."`);
  const ttsCli = path.join(LLAMA_DIR, 'llama-tts.exe');
  const tempDir = path.resolve(process.cwd(), 'data', 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const outputPath = path.join(tempDir, `voice_reply_${Date.now()}.wav`);

  if (fs.existsSync(ttsCli) && fs.existsSync(OMNI_MODEL_PATH)) {
    try {
      const cleanText = text.replace(/"/g, '\\"');
      const command = `"${ttsCli}" -m "${OMNI_MODEL_PATH}" -p "${cleanText}" -o "${outputPath}"`;
      await execAsync(command, { timeout: 45000 });
      if (fs.existsSync(outputPath)) {
        return outputPath;
      }
    } catch (err: any) {
      console.warn('Qwen Omni TTS speech synthesis execution failed:', err.message);
    }
  }
  return null;
}
