export const LOGGER_CONFIG = {
  LEVEL: 'debug',
  LOG_OUTDIR_FILE_NAME: 'logs/auth-service-%DATE%.log',
  MAXSIZE: '20m',
  MAXFILES: '14d',
  DATE: {
    TIMESTAMP: 'DD-MM-YYYY h:mm:ss a',
    DATEPATTERN: 'DD-MM-YYYY',
  },
};
