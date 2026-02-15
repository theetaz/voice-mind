export async function sendExpoPush(
  expoPushToken: string | null,
  title: string,
  body: string,
): Promise<void> {
  if (!expoPushToken?.trim()) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: expoPushToken,
        title,
        body,
        sound: 'default',
      }),
    });
  } catch {
    // Best-effort; don't fail the main flow
  }
}
