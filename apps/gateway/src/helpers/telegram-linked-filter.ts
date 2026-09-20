export function isOwnTelegramLinkedEvent(
  payload: { userId?: string },
  _variables: unknown,
  context: { req?: { user?: { userId?: string } } },
): boolean {
  const viewerId = context.req?.user?.userId;
  const eventUserId = payload.userId;
  return Boolean(viewerId && eventUserId && viewerId === eventUserId);
}
