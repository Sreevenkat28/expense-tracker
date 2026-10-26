import { describe, it, expect } from 'vitest';
import { solveMath } from '../services/calculator';

const v = (q: string) => solveMath(q)?.value;

describe('Assistant calculator', () => {
  it('does plain arithmetic with the right order of operations', () => {
    expect(v('25*4')).toBe(100);
    expect(v('what is 2+2?')).toBe(4);
    expect(v('100 + 50 * 2')).toBe(200);
    expect(v('(100+50)*2')).toBe(300);
    expect(v('what is 10 - 3 - 2')).toBe(5);
    expect(v('2^10')).toBe(1024);
    expect(v('2^3^2')).toBe(512);
    expect(v('-5 + 8')).toBe(3);
    expect(v('7 / 2')).toBe(3.5);
    expect(v('$1,250 * 3')).toBe(3750);
    expect(v('calculate 1.5 x 4')).toBe(6);
  });

  it('understands words', () => {
    expect(v('what is 12 plus 30')).toBe(42);
    expect(v('50 minus 8')).toBe(42);
    expect(v('6 times 7')).toBe(42);
    expect(v('6 multiplied by 7')).toBe(42);
    expect(v('1200 divided by 4')).toBe(300);
    expect(v('square root of 144')).toBe(12);
    expect(v('sqrt(81)')).toBe(9);
    expect(v('the square of 12')).toBe(144);
    expect(v('5 cubed')).toBe(125);
    expect(v('2 to the power of 8')).toBe(256);
  });

  it('handles percentages the way people say them', () => {
    expect(v('what is 15% of 2000')).toBe(300);
    expect(v('20 percent of 450')).toBe(90);
    expect(v('1000 + 18%')).toBe(1180);
    expect(v('1000 - 10%')).toBe(900);
    expect(v('increase 500 by 10%')).toBe(550);
    expect(v('decrease 500 by 10%')).toBe(450);
    expect(v('add 18% tax to 1000')).toBe(1180);
    expect(v('discount 20% on 1500')).toBe(1200);
    expect(v('1500 with 20% discount')).toBe(1200);
    expect(v('what percent is 50 of 200')).toBe(25);
    expect(v('50 is what percent of 200')).toBe(25);
    expect(solveMath('tip 15% on 800')?.text).toContain('**120**');
  });

  it('splits bills', () => {
    expect(v('split 1200 between 4')).toBe(300);
    expect(v('1200 split 4 ways')).toBe(300);
    expect(solveMath('split 100 between 3')?.text).toContain('**33.333333**');
  });

  it('writes a readable answer', () => {
    expect(solveMath('15% of 2000')?.text).toBe('15% of 2,000 = **300**');
    expect(solveMath('25*4')?.text).toBe('25 × 4 = **100**');
    expect(solveMath('1/3')?.text).toContain('**0.333333**');
  });

  it('refuses to divide by zero politely', () => {
    expect(solveMath('10 / 0')?.text).toContain("can't divide by zero");
    expect(solveMath('split 100 between 0')?.text).toContain("can't divide by zero");
  });

  it('does not treat other things as maths', () => {
    for (const q of ['2026-10-25', '25-10-2026', 'hello', '5', 'how much did I spend', 'my 3 expenses', 'what is my name', 'show 3 transactions', 'rent 5000', 'process.exit(1)', 'alert(1)', '2 + banana'])
      expect(solveMath(q), q).toBeNull();
  });
});
