/**
 * Module Shareable Configuration
 */
class Config {
  constructor() {
    this.config = {};
  }
  getConfig() {
    return this.config;
  }
  setConfig(cfg) {
    this.config = cfg;
  }
}
const config = new Config();

module.exports = config;
