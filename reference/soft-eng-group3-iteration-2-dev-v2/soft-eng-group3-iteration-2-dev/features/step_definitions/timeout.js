const { setDefaultTimeout } = require('@cucumber/cucumber');

// Increase the default timeout from 5 seconds to 60 seconds
setDefaultTimeout(60 * 1000);