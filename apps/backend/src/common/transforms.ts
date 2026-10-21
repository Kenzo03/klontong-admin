type Arg = { value: unknown };
export const trim = ({ value }: Arg) => (typeof value === 'string' ? value.trim() : value);
export const trimLower = ({ value }: Arg) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
export const trimUpper = ({ value }: Arg) => (typeof value === 'string' ? value.trim().toUpperCase() : value);
/** Empty text becomes null, so "clear the description" stores NULL, not "". */
export const trimToNull = ({ value }: Arg) => (typeof value === 'string' ? value.trim() || null : value);