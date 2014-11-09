var config = {
  cgate: {
    host: '192.168.11.40',
    contolport: 20023,
    eventport: 20024,
    statusport: 20025,
    cbusname: 'WEBB',
    network: 254,
    application: 56
  },
  webserver: {
    port: 8080,
    host: '0.0.0.0'
  },
  location: {
    latitude: '43.4667',
    longitude: '-112.0333',
    timezone: 'America/Denver'
  }
};

module.exports = config;
