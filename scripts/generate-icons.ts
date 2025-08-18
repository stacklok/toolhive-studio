#!/usr/bin/env ts-node

import { copyFile } from 'node:fs'
import { join } from 'node:path'
import * as iconGenModule from 'icon-gen'

const INPUT_PATH = './icons/source-files/app-icons'
const OUTPUT_PATH = './icons'

const iconGen =
  'default' in iconGenModule ? iconGenModule.default : iconGenModule

async function main() {
  // Mac
  await iconGen(join(INPUT_PATH, 'mac'), OUTPUT_PATH, {
    report: false,
    icns: { name: 'icon' },
  })
    .then((results) => {
      ;(results as string[]).forEach((r) =>
        console.info(`✅ ${r.split('/').pop()}`)
      )
    })
    .catch((err) => {
      console.error(err)
    })

  // Windows
  await iconGen(join(INPUT_PATH, 'windows-linux'), OUTPUT_PATH, {
    report: false,
    ico: { name: 'icon' },
  })
    .then((results) => {
      ;(results as string[]).forEach((r) =>
        console.info(`✅ ${r.split('/').pop()}`)
      )
    })
    .catch((err) => {
      console.error(err)
    })

  // Linux
  await copyFile(
    join(join(INPUT_PATH, 'windows-linux'), '512.png'),
    join(OUTPUT_PATH, 'icon.png'),
    () => console.info('✅ icon.png')
  )
  await copyFile(
    join(join(INPUT_PATH, 'windows-linux'), '1024.png'),
    join(OUTPUT_PATH, 'icon@2x.png'),
    () => console.info('✅ icon@1x.png')
  )
}

main()
