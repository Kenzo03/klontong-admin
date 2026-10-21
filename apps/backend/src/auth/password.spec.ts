import {hashPassword,verifyPassword} from './password.ts';

describe('password',() => {
  it('check for correct and wrong password', async () => {
    const hash = await hashPassword('IniRahasia123');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).not.toContain('IniRahasia123');
    expect(await verifyPassword('IniRahasia123', hash)).toBe(true);
    expect(await verifyPassword('salah', hash)).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('sama')).not.toBe(await hashPassword('sama'));
  });
})