// this is a shim that does nothing to avoid issues when generating
// the ssg files (as node will fail when trying to import cloudflare:workers)
export function waitUntilShim(_promise: Promise<unknown>): void {
  // it is only for SSG bakes, nothing else.
  console.log("waitUntilShim was encountered");
}