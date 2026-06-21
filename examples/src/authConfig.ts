function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing ${name}. Copy examples/.env.example to examples/.env and set your Jira credentials.`,
    );
  }

  return value;
}

export const host = requireEnv('HOST');
export const email = requireEnv('EMAIL');
export const apiToken = requireEnv('API_TOKEN');
