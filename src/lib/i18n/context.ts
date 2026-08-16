import { AsyncLocalStorage } from 'node:async_hooks';
import { DEFAULT_LANGUAGE, isLanguage } from './terms';
import type { Language } from './terms';

/**
 * The language for the current request, without threading it through nine
 * function signatures.
 *
 * There are twelve renderPrompt call sites across nine generate* functions, and
 * every one of them is several frames below the route that knows who the user
 * is. Adding a parameter to each would touch every signature and every caller,
 * and the first flow anyone forgot to update would silently keep answering in
 * English — a failure that looks like the feature not working rather than like
 * a missed edit.
 *
 * AsyncLocalStorage is the right shape for this: set once at the top of a
 * request, read wherever it is needed, and correctly isolated between
 * concurrent requests in a way a module-level variable would not be. That
 * isolation is the whole reason not to use a simple `let` here — one server
 * handling an English and a Hindi request at once would otherwise have them
 * overwrite each other.
 *
 * NODE ONLY. `node:async_hooks` does not exist on the Edge runtime. This module
 * must never be imported, directly or transitively, by src/proxy.ts or
 * src/auth.ts — see the landmine in CLAUDE.md about what a Node-only import
 * does to the proxy. It is imported by the AI service, which is Node-only
 * already.
 */
/**
 * Held on globalThis, not in a module-level `const`.
 *
 * A module can be instantiated more than once in the same process — Next builds
 * separate bundles per route and per runtime, and a tsx script resolving the
 * same file through a path alias does it too. Each instance would get its OWN
 * AsyncLocalStorage, so the request setting the language and the prompt reading
 * it back would be talking to different stores. That failed exactly this way
 * when first written: withLanguage and currentLanguage agreed with each other,
 * languageInstruction produced the right block, and the prompt still came out
 * in English, because promptStore held a second copy.
 *
 * One object on globalThis is the standard fix and the only thing that survives
 * duplication.
 */
const GLOBAL_KEY = Symbol.for('askchetna.i18n.languageStore');

type GlobalWithStore = typeof globalThis & {
    [GLOBAL_KEY]?: AsyncLocalStorage<Language>;
};

const globalRef = globalThis as GlobalWithStore;
const store: AsyncLocalStorage<Language> =
    globalRef[GLOBAL_KEY] ?? (globalRef[GLOBAL_KEY] = new AsyncLocalStorage<Language>());

/** Run `fn` with the language attached to everything it awaits. */
export function withLanguage<T>(language: unknown, fn: () => T): T {
    return store.run(isLanguage(language) ? language : DEFAULT_LANGUAGE, fn);
}

/**
 * The current request's language, or English.
 *
 * Falls back rather than throwing: a prompt rendered outside a request — a
 * script, a test, the prompts check — should still produce something valid.
 */
export function currentLanguage(): Language {
    return store.getStore() ?? DEFAULT_LANGUAGE;
}

/**
 * Set the language for the rest of this request, without wrapping the handler.
 *
 * `enterWith` rather than `run` because these nine route handlers already have
 * their bodies written; wrapping each in a callback would reindent every one of
 * them and turn a two-line change into nine large diffs for no behavioural
 * gain. It is the documented tool for exactly this — attaching context to an
 * already-running async scope — and the scope here is one request handler,
 * which is where it is well-behaved.
 *
 * Never throws. A seeker whose language cannot be read gets English, which is
 * what they had before this existed.
 */
export async function applyUserLanguage(userId: string): Promise<Language> {
    try {
        const { default: prisma } = await import('@/lib/prisma');
        const user = await prisma.user.findUnique({
            where: { id: userId },
            // One column. This runs before a paid model call on the same
            // request, so it must not drag the whole row across.
            select: { language: true },
        });

        const language = isLanguage(user?.language) ? user.language : DEFAULT_LANGUAGE;
        store.enterWith(language);
        return language;
    } catch (error) {
        console.error('Could not resolve language for request:', error);
        store.enterWith(DEFAULT_LANGUAGE);
        return DEFAULT_LANGUAGE;
    }
}
