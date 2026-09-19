export function paymentReturnUrl(base: string, paymentId: string): string {
  const id = paymentId.trim();
  if (!id) {
    throw new RangeError('Payment id is required');
  }

  const url = new URL(base);
  url.pathname = `/payments/${id}`;
  url.search = '';
  url.hash = '';
  return url.toString();
}
