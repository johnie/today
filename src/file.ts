function formatDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function readTodayFile(outputFile: string): Promise<string> {
  const file = Bun.file(outputFile);
  const exists = await file.exists();

  if (!exists) {
    return "";
  }

  return await file.text();
}

export async function writeTodayFile(
  refinedText: string,
  outputFile: string
): Promise<void> {
  const existing = await readTodayFile(outputFile);
  const date = formatDate();

  const newEntry = `## ${date}\n${refinedText}\n\n`;
  const content = existing ? newEntry + existing : newEntry.trim();

  await Bun.write(outputFile, content);
}
