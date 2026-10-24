import type { ExportLabels } from '@retroboard/exporters'
import { t } from '~/i18n'

export { toCsv, toJson, toMarkdown } from '@retroboard/exporters'

/** Export labels in the current UI language. */
export const exportLabels: ExportLabels = (key, params) => t(key, params)

/** FilePort adapter: saves text content as a download. */
export function download(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
