import { getGatewayOrigin } from '@/lib/graphql/url';

export const OAUTH_CANCELLED_MESSAGE =
  'Вход через провайдера отменён. Попробуйте ещё раз.';

const outlineClassName =
  'flex w-full items-center justify-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800';

export function OauthButtons() {
  const gatewayOrigin = getGatewayOrigin();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
        <span className="text-sm text-zinc-500 dark:text-zinc-400">или</span>
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-700" />
      </div>
      <a className={outlineClassName} href={`${gatewayOrigin}/auth/google`}>
        Google
      </a>
      <a className={outlineClassName} href={`${gatewayOrigin}/auth/github`}>
        GitHub
      </a>
    </div>
  );
}
