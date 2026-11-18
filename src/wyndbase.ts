import { wyndbaseSDK } from '@wyndbase/sdk/core'
import { browserSession } from '@wyndbase/sdk/session/browser'
import { Inbox } from '@wyndbase/sdk/plugins/inbox'
import type { WdbTypes } from '../wynhr.wql.gen'

/** The base, addressed through the operator-registered client `wynhr-web`. */
export const url = 'wyndbase://wynhr-web@dev.wyndbase.dev/wynhr'
export const loginPath = '/login'

export const loginUrl = () =>
  `${loginPath}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`

export const session = browserSession()

export const wyndbase = new wyndbaseSDK<WdbTypes>(url, {
  onUnauthorized: () => {
    if (window.location.pathname !== loginPath) window.location.assign(loginUrl())
  },
  session,
}).use(Inbox)

export type Q = WdbTypes['query']
export type Row<S extends keyof Q, N extends keyof Q[S]> = Q[S][N] extends { result: infer R } ? R : never

declare module '@wyndbase/sdk/react' {
  interface Register {
    sdk: typeof wyndbase
  }
}
