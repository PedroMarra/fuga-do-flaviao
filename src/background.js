import { W, H, WORLD } from './config.js';
export class Background {
  invalidate() {} setCountry() {} update() {}
  draw(ctx, wx) { ctx.fillStyle = '#7cc8ff'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#5bbf4a'; ctx.fillRect(0, WORLD.groundY, W, H); ctx.fillStyle = '#3d8f34'; for (let x = -(wx % 80); x < W; x += 80) ctx.fillRect(x, WORLD.groundY + 18, 40, 6); }
  drawThumb(ctx, i, x, y, w, h) { ctx.fillStyle = '#7cc8ff'; ctx.fillRect(x, y, w, h); }
  drawVan() {}
}
