import axios from 'axios';
import db from '../db/sqlite';

export async function syncTaskToExternal(taskId: number, description: string, dueBy?: string | null) {
  const todoistToken = process.env.TODOIST_API_TOKEN;
  const webhookUrl = process.env.EXTERNAL_TASK_WEBHOOK_URL;

  let synced = false;

  // 1. Sync to Todoist REST API
  if (todoistToken) {
    try {
      console.log(`Syncing task #${taskId} to Todoist...`);
      await axios.post(
        'https://api.todoist.com/rest/v2/tasks',
        {
          content: description,
          due_string: dueBy || undefined
        },
        {
          headers: {
            Authorization: `Bearer ${todoistToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      synced = true;
      console.log(`Task #${taskId} successfully synced to Todoist.`);
    } catch (err: any) {
      console.error(`Failed to sync task #${taskId} to Todoist:`, err.message);
    }
  }

  // 2. Sync to Generic Webhook / Notion bridge
  if (webhookUrl) {
    try {
      console.log(`Syncing task #${taskId} to webhook/Notion...`);
      await axios.post(webhookUrl, {
        id: taskId,
        description,
        dueBy,
        source: 'WhatsApp Assistant'
      });
      synced = true;
      console.log(`Task #${taskId} successfully synced to webhook.`);
    } catch (err: any) {
      console.error(`Failed to sync task #${taskId} to webhook:`, err.message);
    }
  }

  const status = synced ? 'synced' : 'none';
  try {
    db.prepare('UPDATE tasks SET externalSyncStatus = ? WHERE id = ?').run(status, taskId);
  } catch (e) {}
}

export async function syncAllPendingTasks() {
  try {
    const pendingTasks = db.prepare("SELECT * FROM tasks WHERE externalSyncStatus = 'pending'").all() as any[];
    for (const t of pendingTasks) {
      await syncTaskToExternal(t.id, t.description, t.dueBy);
    }
  } catch (e) {}
}
