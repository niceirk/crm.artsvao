/**
 * PM2 Ecosystem Configuration
 * Cluster mode для горизонтального масштабирования
 */
module.exports = {
  apps: [
    {
      name: 'artsvao-backend',
      script: 'dist/src/main.js',

      // Cluster mode: 2 instances (оптимально для 1.5 CPU limit)
      instances: 2,
      exec_mode: 'cluster',

      // Автоматический перезапуск при превышении памяти
      max_memory_restart: '700M',

      // Настройки перезапуска
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',

      // Graceful shutdown (должен быть > app shutdown timeout 30s)
      kill_timeout: 45000,
      wait_ready: true,
      listen_timeout: 10000,

      // Переменные окружения
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Логирование (логи идут в stdout для Docker)
      merge_logs: true,

      // Отключаем watch в production
      watch: false,

      // Отключаем автозапуск (Docker сам управляет контейнером)
      autorestart: true,
    },
  ],
};
