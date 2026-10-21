type Arg = { value: unknown };
export const trim = ({ value }: Arg) => (typeof value === 'string' ? value.trim() : value);
export const trimLower = ({ value }: Arg) => (typeof value === 'string' ? value.trim().toLowerCase() : value);