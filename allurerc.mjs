// Allure 3 configuration (change allure-report-aggregation). The CI aggregates the raw results of
// the unit job and of every Playwright shard into one report and keeps a run history on GitHub Pages.
import { defineConfig } from 'allure'

export default defineConfig({
  name: 'RetroBoard quality',
  output: './reports/allure',
  historyPath: './reports/allure-history.jsonl',
  appendHistory: true,
  historyLimit: 50,
  plugins: {
    awesome: {
      options: {
        reportName: 'RetroBoard quality',
        singleFile: false,
        reportLanguage: 'en',
        groupBy: ['parentSuite', 'suite'],
      },
    },
  },
})
