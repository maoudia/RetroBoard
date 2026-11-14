/**
 * The part of the File System Access API the folder adapter uses (change user-drive-storage). A browser's directory handle
 * satisfies it, and so does the testkit's fake, so the adapter is tested without a browser. Declared here because neither
 * the DOM types of every TypeScript version nor an application layer without DOM types can name it.
 */
export interface FileLike {
  readonly size: number
  readonly lastModified: number
  arrayBuffer(): Promise<ArrayBuffer>
}

export interface WritableLike {
  write(data: Uint8Array): Promise<void>
  close(): Promise<void>
  abort?(): Promise<void>
}

export interface FileHandleLike {
  readonly kind: 'file'
  readonly name: string
  getFile(): Promise<FileLike>
  /** Without `keepExistingData` the browser writes a swap file and replaces the file on `close()`. */
  createWritable(options?: { keepExistingData?: boolean }): Promise<WritableLike>
}

export type PermissionStateLike = 'granted' | 'denied' | 'prompt'

export interface DirectoryHandleLike {
  readonly kind: 'directory'
  readonly name: string
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandleLike>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandleLike>
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>
  entries(): AsyncIterable<[string, FileHandleLike | DirectoryHandleLike]>
  queryPermission?(descriptor: { mode: 'readwrite' }): Promise<PermissionStateLike>
  requestPermission?(descriptor: { mode: 'readwrite' }): Promise<PermissionStateLike>
}
