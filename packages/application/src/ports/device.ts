/** Device capabilities used by use cases. Adapters live in the apps. */
export interface ClockPort { now(): number }
export interface IdPort { newId(): string }
export interface ClipboardPort { writeText(text: string): Promise<void> }
export interface FilePort { save(filename: string, content: string, mime: string): void }
export type NotifierTone = 'info' | 'warn' | 'ok'
export interface NotifierPort { notify(text: string, tone: NotifierTone): void }
