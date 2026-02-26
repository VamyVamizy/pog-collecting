try {
  require('./backend_data/marketplace/trading_socket.js')(null);
  console.log('Require succeeded');
} catch (e) {
  console.error('Require failed with error:');
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
}
