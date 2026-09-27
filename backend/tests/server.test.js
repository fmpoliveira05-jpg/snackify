/**
 * Tempos máximos do servidor HTTP e encerramento ordenado (SIGTERM).
 */
const http = require('http');
const mongoose = require('mongoose');
const { config } = require('../config/env');
const { applyServerTimeouts, createShutdown, mongoOptions } = require('../server');

afterEach(() => jest.restoreAllMocks());

test('o servidor HTTP tem tempos máximos para pedidos, cabeçalhos e keep-alive', () => {
  const server = applyServerTimeouts(http.createServer());
  expect(server.requestTimeout).toBe(config.timeouts.request);
  expect(server.keepAliveTimeout).toBe(config.timeouts.keepAlive);
  expect(server.headersTimeout).toBeGreaterThan(server.keepAliveTimeout);
});

test('a ligação ao MongoDB falha depressa quando o servidor não está disponível', () => {
  const options = mongoOptions();
  expect(options.serverSelectionTimeoutMS).toBeGreaterThan(0);
  expect(options.serverSelectionTimeoutMS).toBeLessThanOrEqual(30000);
  expect(options.socketTimeoutMS).toBeGreaterThan(0);
  expect(options.maxPoolSize).toBeGreaterThan(0);
});

test('o encerramento fecha o servidor, pára as tarefas e desliga o MongoDB (uma só vez)', async () => {
  const server = http.createServer((req, res) => res.end('ok'));
  await new Promise((resolve) => server.listen(0, resolve));
  const disconnect = jest.spyOn(mongoose, 'disconnect').mockResolvedValue();
  const stopJobs = jest.fn();
  const exit = jest.fn();

  const shutdown = createShutdown(server, { stopJobs, exit, log: () => {} });
  await Promise.all([shutdown('SIGTERM'), shutdown('SIGTERM')]);

  expect(stopJobs).toHaveBeenCalledTimes(1);
  expect(disconnect).toHaveBeenCalledTimes(1);
  expect(exit).toHaveBeenCalledWith(0);
  expect(server.listening).toBe(false);
});
