export interface RatingEngineProps {
  code: string;
  name: string;
  description?: string | null;
  configSchema: Record<string, unknown>;
  defaultConfig: Record<string, unknown>;
  active: boolean;
}

export class RatingEngineEntity {
  constructor(private readonly props: RatingEngineProps) {}

  get code(): string { return this.props.code; }
  get name(): string { return this.props.name; }
  get defaultConfig(): Record<string, unknown> { return this.props.defaultConfig; }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (const [key, schema] of Object.entries(this.props.configSchema)) {
      const s = schema as { type: string; required?: boolean };
      if (s.required && !(key in config)) {
        errors.push(`Missing required config: ${key}`);
      }
      if (key in config && typeof config[key] !== s.type) {
        errors.push(`Config ${key} must be ${s.type}`);
      }
    }
    return { valid: errors.length === 0, errors };
  }
}
