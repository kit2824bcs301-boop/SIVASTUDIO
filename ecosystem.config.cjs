/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

module.exports = {
  apps: [
    {
      name: 'photography-studio-portal',
      script: 'dist/server.cjs',
      instances: 'max', // Utilizes all available CPUs for extreme responsiveness
      exec_mode: 'cluster', // Enables round-robin load-balancing across cores
      watch: false, // Don't reload on runtime code changes in production
      max_memory_restart: '1G', // Guard against server memory leaks
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
