/**
 * Facade kept for the module name the tests and route already import.
 * The real implementation lives in src/lib/arcade/server.ts, which serves
 * every arcade mode; rally remains one of them.
 */
export { serveRally, serveArcade, verifyRun, ArcadeError, RallyError, ArcadePlayer, ArcadeRun } from "../arcade/server";
