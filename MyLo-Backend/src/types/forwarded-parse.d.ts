declare module 'forwarded-parse' {
  interface ForwardedEntry {
    for: string;
    by?: string;
    host?: string;
    proto?: string;
  }
  // eslint-disable-next-line no-unused-vars
  function parseForwarded(header?: string | string[] | undefined): ForwardedEntry[];
  export = parseForwarded;
}
