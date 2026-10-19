const TRAY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAcElEQVR4nO3OwQ3AIAxDUcZAYv852wVKwMROUBVLPv/XWg1c7+OxnhaWQdAwFeKNuxCs+BGCHYcQqvg2IhWgji8RqYCo+BRRgAIUIB0QifiMXwGIQJjxKwBKxFZchYDibMRRnIVwxT0QWhiFyMK/3QtiwBo+Q4nxNQAAAABJRU5ErkJggg==';

export function trayIconDataUrl(): string {
  return `data:image/png;base64,${TRAY_PNG_BASE64}`;
}
