import db from '../db/sqlite';
import { generateChatReply } from '../pipeline/llmClient';

export function startBriefCron() {
  console.log('Daily Brief cron scheduled.');
  
  // Run every 24 hours (86400000 ms)
  setInterval(async () => {
    try {
      console.log('Generating Daily Brief...');
      
      const tasks = db.prepare("SELECT description, dueBy FROM tasks WHERE status != 'completed'").all();
      const escalations = db.prepare("SELECT chatId, reason FROM escalations").all();
      
      const systemPrompt = `You are an AI assistant managing the user's WhatsApp. Generate a concise, friendly daily briefing.
Provide a short summary in markdown. Don't invent tasks that aren't listed. If both are empty, say "You have no pending tasks or alerts today!"`;

      const userMessage = `Pending Tasks: ${JSON.stringify(tasks)}
Active Alerts/Escalations: ${JSON.stringify(escalations)}`;

      const summary = await generateChatReply(systemPrompt, userMessage);
      
      db.prepare("INSERT INTO briefs (date, contentJson) VALUES (date('now'), ?)").run(summary);
      console.log('Generated daily brief successfully.');
      
      // Optional: self-delivery if MY_NUMBER is set in .env
      // if (process.env.MY_NUMBER) {
      //   const { sendMessage } = await import('../baileys/client');
      //   await sendMessage(process.env.MY_NUMBER, { text: `*Daily Brief*\n\n${summary}` });
      // }
    } catch (e) {
      console.error('Brief generation failed', e);
    }
  }, 24 * 60 * 60 * 1000);
}
