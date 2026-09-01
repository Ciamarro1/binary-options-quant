"use strict";

class AuditLogger {
  constructor() {
    this.events = [];
  }

  log(event, details = {}) {
    this.events.push({
      event,
      details,
      timestamp: new Date().toISOString()
    });
  }

  hasEvent(eventName) {
    return this.events.some(e => e.event === eventName);
  }

  getEvents() {
    return [...this.events];
  }
}

module.exports = { AuditLogger };
