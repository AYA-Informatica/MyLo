/* eslint-disable no-undef */
module.exports = {
  apps: [
    {
      name: 'server',
      script: '/usr/src/app/dist/src/server.js',
      exec_mode: 'cluster',
      instances:2,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
