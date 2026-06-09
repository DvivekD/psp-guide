module.exports = {
  apps: [
    {
      name: 'cloudmedia',
      script: 'server.js',
      cwd: './cloudmedia',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '300M',
      restart_delay: 3000
    },
    {
      name: 'spotiflac',
      script: 'server.js',
      cwd: './spotiflac',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '200M',
      restart_delay: 3000
    },
    {
      name: 'yt2009',
      script: 'back/backend.js',
      cwd: './yt2009',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '400M',
      restart_delay: 3000
    }
  ]
};
