import { describe, it, expect } from 'vitest';
import { checkEnvironment, type EnvBag } from './envCheck';

/** A JWT-shaped string whose payload carries the given role. Signature is
 *  irrelevant — the check reads claims, it does not verify them. */
function keyWithRole(role: string): string {
    const payload = Buffer.from(JSON.stringify({ role, ref: 'proj1' })).toString('base64');
    return `header.${payload}.signature`;
}

const sane: EnvBag = {
    DATABASE_URL: 'postgresql://postgres.proj1:pw@aws-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    DIRECT_URL: 'postgresql://postgres.proj1:pw@aws-1.pooler.supabase.com:5432/postgres',
    NEXTAUTH_SECRET: 'secret',
    NEXT_PUBLIC_SUPABASE_URL: 'https://proj1.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: keyWithRole('service_role'),
    AI_PROVIDER: 'gemini',
    GOOGLE_AI_API_KEY: 'key',
};

const messages = (env: EnvBag) => checkEnvironment(env).map((p) => p.message).join(' | ');

describe('checkEnvironment', () => {
    it('is quiet when everything is right', () => {
        expect(checkEnvironment(sane)).toEqual([]);
    });

    it('catches an anon key in the service-role slot', () => {
        // The failure that was live in production: present, plausible, and
        // silently non-functional.
        const problems = checkEnvironment({ ...sane, SUPABASE_SERVICE_ROLE_KEY: keyWithRole('anon') });
        expect(problems.some((p) => p.level === 'error')).toBe(true);
        expect(messages({ ...sane, SUPABASE_SERVICE_ROLE_KEY: keyWithRole('anon') }))
            .toMatch(/service_role/);
    });

    it('catches the session-mode port', () => {
        const env = { ...sane, DATABASE_URL: sane.DATABASE_URL!.replace(':6543', ':5432') };
        expect(messages(env)).toMatch(/6543/);
        expect(checkEnvironment(env).some((p) => p.level === 'error')).toBe(true);
    });

    it('catches a missing pgbouncer flag', () => {
        const env = { ...sane, DATABASE_URL: sane.DATABASE_URL!.replace('?pgbouncer=true', '') };
        expect(messages(env)).toMatch(/pgbouncer/);
    });

    it('catches storage and database pointing at different projects', () => {
        const env = { ...sane, NEXT_PUBLIC_SUPABASE_URL: 'https://someotherproject.supabase.co' };
        expect(messages(env)).toMatch(/different projects/);
    });

    it('catches a missing auth secret', () => {
        const env = { ...sane };
        delete env.NEXTAUTH_SECRET;
        expect(messages(env)).toMatch(/AUTH_SECRET/);
    });

    it('accepts AUTH_SECRET as an alternative to NEXTAUTH_SECRET', () => {
        const env: EnvBag = { ...sane, AUTH_SECRET: 'secret' };
        delete env.NEXTAUTH_SECRET;
        expect(messages(env)).not.toMatch(/AUTH_SECRET/);
    });

    it('only asks for the selected AI provider’s key', () => {
        const env: EnvBag = { ...sane, AI_PROVIDER: 'openai', OPENAI_API_KEY: 'k' };
        // Gemini's key is absent here and that is fine.
        delete env.GOOGLE_AI_API_KEY;
        expect(messages(env)).not.toMatch(/GOOGLE_AI_API_KEY/);
    });

    it('notices the selected provider having no key at all', () => {
        const env = { ...sane, AI_PROVIDER: 'deepseek' };
        expect(messages(env)).toMatch(/DEEPSEEK_API_KEY/);
    });

    it('names both storage variables when both are missing', () => {
        const env = { ...sane };
        delete env.NEXT_PUBLIC_SUPABASE_URL;
        delete env.SUPABASE_SERVICE_ROLE_KEY;
        const msg = messages(env);
        expect(msg).toMatch(/NEXT_PUBLIC_SUPABASE_URL/);
        expect(msg).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    });
});
