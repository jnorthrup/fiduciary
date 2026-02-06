export function createLogger(scope = 'APP') {
  const prefix = (level) => `[${level}] [${scope}]`;

  return {
    info: (message, ...args) => console.info(`${prefix('INFO')} ${message}`, ...args),
    error: (message, ...args) => console.error(`${prefix('ERROR')} ${message}`, ...args),
    debug: (message, ...args) => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`${prefix('DEBUG')} ${message}`, ...args);
      }
    },
  };
}
