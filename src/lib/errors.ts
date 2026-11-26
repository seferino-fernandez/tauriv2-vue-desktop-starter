/**
 * Tells the user that something they did failed, in their language, and logs the details. The
 * toast only names what failed: the error itself means little to the user, so it goes to the log.
 */
import { toast } from 'vue-sonner'
import i18n from '@/i18n'
import { logError } from '@/lib/log'

/** What failed; each has a message under `errors` in the locale files */
export type FailedAction = 'saveTheme' | 'saveLanguage' | 'saveShortcut' | 'loadSettings' | 'openLogs'

export function notifyError(action: FailedAction, cause: unknown) {
  logError(`${action} failed`, cause)
  // The id keeps one toast per action, however often it fails
  toast.error(i18n.global.t(`errors.${action}`), { id: action })
}
