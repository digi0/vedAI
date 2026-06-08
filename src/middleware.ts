// Next.js middleware entry point.
// Auth logic lives in proxy.ts (session refresh + route protection).
// This file just re-exports it so Next picks it up automatically.
export { proxy as middleware, config } from "./proxy";
