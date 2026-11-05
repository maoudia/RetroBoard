// Which epic and task-group issues are finished, from the OpenSpec files alone (change quality-gates-v2).
// A task group is finished when it has tasks and none is open; an epic when all its groups are finished or its
// change is archived. Titles follow sync-issues: `[epic] <change>` and `[<change>] <n>. <title>`.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/** Parses tasks.md into groups with their open and done counts. */
export function groupsOf(tasks) {
  const groups = []
  let cur = null
  for (const line of tasks.split('\n')) {
    const h = line.match(/^## (\d+)\. (.+)$/)
    if (h) { cur = { n: h[1], title: h[2].trim(), open: 0, done: 0 }; groups.push(cur); continue }
    if (line.startsWith('## ')) { cur = null; continue }
    if (!cur) continue
    if (/^- \[ \] /.test(line)) cur.open++
    else if (/^- \[[xX]\] /.test(line)) cur.done++
  }
  return groups.filter((g) => g.open + g.done > 0)
}

/** Titles of the issues to close. `changesDir` holds the open changes and an `archive/` folder of finished ones. */
export function finishedTitles(changesDir) {
  const titles = []
  const take = (name, tasksFile, archived) => {
    const groups = groupsOf(readFileSync(tasksFile, 'utf8'))
    const finished = groups.filter((g) => g.open === 0)
    for (const g of finished) titles.push(`[${name}] ${g.n}. ${g.title}`)
    if (groups.length && (archived || finished.length === groups.length)) titles.push(`[epic] ${name}`)
  }
  for (const name of readdirSync(changesDir)) {
    const file = join(changesDir, name, 'tasks.md')
    if (name !== 'archive' && existsSync(file)) take(name, file, false)
  }
  const archive = join(changesDir, 'archive')
  if (existsSync(archive)) {
    for (const dir of readdirSync(archive)) {
      const file = join(archive, dir, 'tasks.md')
      if (existsSync(file)) take(dir.replace(/^\d{4}-\d{2}-\d{2}-/, ''), file, true)
    }
  }
  return titles
}
