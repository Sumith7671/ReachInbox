import { getHourKey, getMsUntilNextHour } from '../workers/email.worker';

describe('Rate Limiter Helper Tests', () => {
  it('should generate consistent UTC hour key', () => {
    const fixedDate = new Date('2026-08-19T14:25:00Z');
    const key = getHourKey(fixedDate, 'senderA');

    expect(key).toBe('email_rate_limit:senderA:2026-08-19-14');
  });

  it('should calculate remaining milliseconds until next UTC clock hour', () => {
    const fixedDate = new Date('2026-08-19T14:45:00.000Z');
    const msUntilNextHour = getMsUntilNextHour(fixedDate);

    // 15 minutes = 15 * 60 * 1000 = 900,000 ms
    expect(msUntilNextHour).toBe(900000);
  });
});
