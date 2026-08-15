import type { NextConfig } from "next";

// Both are inlined into the client bundle at build time, so a loaded page can
// report which deployment it came from. A runtime lookup would defeat the
// purpose: the values have to be frozen alongside the JS actually running.
//
// They answer two different questions. BUILD_ID — Vercel's commit SHA, unique
// per deploy — answers "is this page stale?", and needs no upkeep, so a release
// can never be missed by forgetting to bump something. APP_VERSION answers "how
// urgent is it?", and is the one deliberate, occasional decision.
const APP_VERSION = require("./package.json").version as string;
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || "dev";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },

  // Every AI prompt lives in prompts/ai-prompts.md and is read with fs at
  // runtime. Nothing imports it, so Next's tracer cannot see it and would ship
  // a deployment where every AI call throws ENOENT. Keyed to all routes because
  // the AI helpers are reached from several of them.
  outputFileTracingIncludes: {
    "/*": ["prompts/**/*.md"],
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  /**
   * Deep-link association files.
   *
   * These live here rather than in vercel.json (which carries the site's
   * security headers) for one practical reason: next.config headers apply during
   * `next dev` too, so the content type is verifiable locally. vercel.json
   * headers only take effect on a deployment.
   *
   * The content type matters: /.well-known/apple-app-site-association has no
   * file extension, so it is otherwise served as application/octet-stream and
   * iOS silently refuses to associate the domain — universal links then just
   * open Safari with no error anywhere.
   */
  async headers() {
    return [
      {
        source: '/.well-known/apple-app-site-association',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
      {
        source: '/.well-known/assetlinks.json',
        headers: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    const CopyPlugin = require("copy-webpack-plugin");
    const path = require("path");
    const webpack = require("webpack");
    // Configure alias to ignore swisseph.data
    // This makes require('./swisseph.data') return an empty object
    config.resolve.alias = {
      ...config.resolve.alias,
      [path.join(__dirname, "node_modules/swisseph-wasm/wsam/swisseph.data")]: false,
    };

    if (!isServer) {
      // Drop the Firebase JS SDK from the client graph.
      //
      // @capacitor-firebase/authentication pulls in 'firebase/auth' for its WEB
      // implementation only. We call that plugin exclusively on native (see
      // src/lib/native/phoneAuth.ts), where it proxies to the native Firebase
      // SDKs and never touches the JS one — so bundling it would ship a large
      // dependency that can never execute. Aliasing to false (same trick as
      // swisseph.data above) yields an empty module instead.
      //
      // This is not just size: webpack processing the full SDK made dev-server
      // recompiles heavy enough to OOM.
      config.resolve.alias["firebase/auth"] = false;
    }

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        'fs/promises': false,
        module: false,
        path: false,
      };
    }


    // Copy WASM files to public directory for runtime access
    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: path.join(__dirname, "node_modules/swisseph-wasm/wsam/swisseph.wasm"),
            to: path.join(__dirname, "public/swisseph.wasm"),
            noErrorOnMissing: false,
          },
          {
            from: path.join(__dirname, "node_modules/swisseph-wasm/wsam/swisseph.data"),
            to: path.join(__dirname, "public/swisseph.data"),
            noErrorOnMissing: false,
          },
        ],
      })
    );

    // Don't set webassemblyModuleFilename - let Next.js handle it

    return config;
  },
};

export default nextConfig;
