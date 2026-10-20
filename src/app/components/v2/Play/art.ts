"use client";

/**
 * Shared canvas art for the arcade: the drawn Cubear (the mascot re-imagined
 * as a soft vector bear in a green tophat, in the style of the reference
 * boards), plus the background props each mode composes. Everything is drawn
 * with paths on the logical 480×640 canvas the cabinet already scales — no
 * image assets, so every mode's look stays consistent and sharp.
 */

/** Ink for outlines: soft forest ink, never pure black. */
export const OUTLINE = "#1F3B2C";

function circle(context: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  context.beginPath();
  context.arc(x, y, r, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}


/** The green tophat: a bright cylinder, a deeper brim, and a white band. */
export function drawTopHat(context: CanvasRenderingContext2D, cx: number, baseY: number, scale: number): void {
  const brim = 46 * scale;
  const cylinder = 34 * scale;
  const height = 32 * scale;
  context.fillStyle = "#3FA83C";
  // cylinder first, sitting above the brim
  context.beginPath();
  context.roundRect(cx - cylinder / 2, baseY - height, cylinder, height + 4, 5);
  context.fill();
  context.stroke();
  context.fillStyle = "#57C74F";
  context.beginPath();
  context.roundRect(cx - cylinder / 2 + 4, baseY - height + 3, cylinder * 0.3, height * 0.66, 3);
  context.fill();
  // the band, wrapping the cylinder just above the brim
  context.fillStyle = "#F4FFFC";
  context.beginPath();
  context.roundRect(cx - cylinder / 2, baseY - 9, cylinder, 7, 3);
  context.fill();
  context.stroke();
  // brim, the widest line of the hat
  context.fillStyle = "#3FA83C";
  context.beginPath();
  context.roundRect(cx - brim / 2, baseY - 5, brim, 8, 4);
  context.fill();
  context.stroke();
}

/** The Cubear: round head, ears, muzzle, dot eyes and blush cheeks. */
export function drawCubear(context: CanvasRenderingContext2D, cx: number, baseY: number, scale = 1): void {
  const body = 52 * scale;
  context.save();
  context.lineWidth = Math.max(2.4, 3 * scale);
  context.strokeStyle = OUTLINE;
  context.fillStyle = "#FFFFFF";
  // ears, peeking above the head line
  const earR = 10 * scale;
  circle(context, cx - 21 * scale, baseY - body * 0.88, earR);
  circle(context, cx + 21 * scale, baseY - body * 0.86, earR);
  // inner ear blush
  context.fillStyle = "#FBAAAA";
  circle(context, cx - 21 * scale, baseY - body * 0.86, earR * 0.5);
  circle(context, cx + 21 * scale, baseY - body * 0.86, earR * 0.5);
  // the head
  context.fillStyle = "#FFFFFF";
  context.beginPath();
  context.roundRect(cx - body / 2, baseY - body, body, body, 17 * scale);
  context.fill();
  context.stroke();
  // muzzle
  context.fillStyle = "#F6EFE6";
  circle(context, cx, baseY - body * 0.36, 13 * scale);
  // nose
  context.fillStyle = OUTLINE;
  circle(context, cx, baseY - body * 0.42, 3.4 * scale);
  // eyes
  circle(context, cx - 12 * scale, baseY - body * 0.64, 3.2 * scale);
  circle(context, cx + 12 * scale, baseY - body * 0.64, 3.2 * scale);
  // blush cheeks
  context.fillStyle = "#FBAAAA";
  circle(context, cx - 18 * scale, baseY - body * 0.4, 5 * scale);
  circle(context, cx + 18 * scale, baseY - body * 0.4, 5 * scale);
  context.restore();
}

/**
 * Draw the full Cubear-with-hat: face first, then the hat sitting on the
 * head. `scale` is about 1 at the arcade's standard character size.
 */
export function drawCubearHatted(context: CanvasRenderingContext2D, cx: number, baseY: number, scale = 1): void {
  drawCubear(context, cx, baseY, scale);
  drawTopHat(context, cx, baseY - 52 * scale, scale);
}

/** A soft white cloud: three overlapping circles, flat base. */
export function drawCloud(context: CanvasRenderingContext2D, x: number, y: number, scale: number, alpha = 1): void {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = "#FFFFFF";
  const r = 15 * scale;
  context.beginPath();
  context.arc(x, y, r, 0, Math.PI * 2);
  context.arc(x + r * 0.85, y + r * 0.24, r * 0.76, 0, Math.PI * 2);
  context.arc(x - r * 0.9, y + r * 0.2, r * 0.72, 0, Math.PI * 2);
  context.fill();
  context.restore();
}
