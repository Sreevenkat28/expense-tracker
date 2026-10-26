import { describe, it, expect } from 'vitest';
import { clampAnchor } from '../utils/useDraggableAnchor';

const view = { w: 1000, h: 800 };

describe('Dragging the assistant', () => {
  it('leaves a position that fits exactly as it is', () => {
    expect(clampAnchor({ right: 100, bottom: 120 }, { w: 390, h: 580 }, view)).toEqual({ right: 100, bottom: 120 });
  });

  it('never lets it leave the screen', () => {
    // dragged far past the right/bottom edge
    expect(clampAnchor({ right: -500, bottom: -500 }, { w: 390, h: 580 }, view)).toEqual({ right: 8, bottom: 8 });
    // dragged far past the left/top edge: right = 1000 - 390 - 8 = 602, bottom = 800 - 580 - 8 = 212
    expect(clampAnchor({ right: 5000, bottom: 5000 }, { w: 390, h: 580 }, view)).toEqual({ right: 602, bottom: 212 });
  });

  it('copes with a window smaller than the chat', () => {
    expect(clampAnchor({ right: 50, bottom: 50 }, { w: 390, h: 580 }, { w: 300, h: 500 })).toEqual({ right: 8, bottom: 8 });
  });

  it('keeps the small button anywhere inside the window', () => {
    expect(clampAnchor({ right: 940, bottom: 20 }, { w: 120, h: 48 }, view)).toEqual({ right: 872, bottom: 20 });
  });
});
