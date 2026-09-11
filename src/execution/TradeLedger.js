"use strict";

const fs = require('fs');
const path = require('path');

class TradeLedger {
  /**
   * Initializes the append-only Trade Ledger.
   * @param {string} ledgerPath - Absolute or relative path to the JSONL ledger file.
   */
  constructor(ledgerPath) {
    this.ledgerPath = ledgerPath;
    const dir = path.dirname(ledgerPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Appends an immutable trade event to the ledger.
   * @param {Object} event - Event payload. Must include eventType and timestamp.
   */
  recordEvent(event) {
    if (!event || typeof event !== 'object') {
      throw new Error('LEDGER ERROR: Invalid event object');
    }
    if (!event.eventType || typeof event.eventType !== 'string') {
      throw new Error('LEDGER ERROR: Event must contain a valid eventType string');
    }
    if (!event.tradeId || typeof event.tradeId !== 'string') {
      throw new Error('LEDGER ERROR: Event must contain a valid tradeId string');
    }

    const payload = {
      ...event,
      recordedAtUtc: new Date().toISOString()
    };

    const line = JSON.stringify(payload) + '\n';
    fs.appendFileSync(this.ledgerPath, line, 'utf-8');
    return payload;
  }

  /**
   * Reads all events from the ledger.
   * @returns {Array<Object>}
   */
  readAllEvents() {
    if (!fs.existsSync(this.ledgerPath)) return [];
    const content = fs.readFileSync(this.ledgerPath, 'utf-8').trim();
    if (!content) return [];
    return content.split('\n').map(line => JSON.parse(line));
  }

  /**
   * Computes ledger summary statistics.
   */
  getSummary() {
    const events = this.readAllEvents();
    const trades = new Map();

    for (const ev of events) {
      if (!trades.has(ev.tradeId)) {
        trades.set(ev.tradeId, []);
      }
      trades.get(ev.tradeId).push(ev);
    }

    let settledCount = 0;
    let wins = 0;
    let losses = 0;
    let pushes = 0;
    let totalPnl = 0;

    for (const [tradeId, evList] of trades.entries()) {
      const settledEvent = evList.find(e => e.eventType === 'SETTLED');
      if (settledEvent) {
        settledCount++;
        if (settledEvent.outcome === 'WIN') {
          wins++;
          totalPnl += settledEvent.payoutProfit || 0.88;
        } else if (settledEvent.outcome === 'LOSS') {
          losses++;
          totalPnl -= settledEvent.stake || 1.0;
        } else if (settledEvent.outcome === 'PUSH') {
          pushes++;
        }
      }
    }

    const nonPush = wins + losses;
    const winRate = nonPush > 0 ? wins / nonPush : 0;

    return {
      totalEvents: events.length,
      totalTrades: trades.size,
      settledTrades: settledCount,
      wins,
      losses,
      pushes,
      winRate,
      totalPnl
    };
  }
}

module.exports = TradeLedger;
