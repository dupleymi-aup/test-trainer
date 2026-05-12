const net = require('net');

function findAvailablePort(startPort, maxAttempts) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    function tryPort(port) {
      const server = net.createServer();

      server.listen(port, '127.0.0.1', () => {
        server.close();
        resolve(port);
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          attempts++;
          if (attempts >= maxAttempts) {
            reject(new Error(`Не удалось найти свободный порт после ${maxAttempts} попыток`));
            return;
          }
          tryPort(port + 1);
        } else {
          reject(err);
        }
      });
    }

    tryPort(startPort);
  });
}

const startPort = parseInt(process.env.PORT || '3000', 10);

findAvailablePort(startPort, 10)
  .then((port) => {
    console.log(port);
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
