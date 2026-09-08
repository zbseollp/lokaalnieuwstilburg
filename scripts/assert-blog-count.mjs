#!/usr/bin/env node
/**
 * Breekt de build af als de blogmap onder de vastgelegde ondergrens zakt.
 *
 * Jenkins draait `tenant-cli sync` met clean=true: de blogmap wordt geleegd en
 * opnieuw gevuld uit Payload. Staat die tenant (bijna) leeg — of faalt de sync
 * halverwege — dan zou er een vrijwel lege site live gaan zonder dat iemand het
 * merkt. Deze controle draait vlak voor `astro build` en laat de build dan
 * mislukken, zodat de vorige deploy gewoon blijft staan.
 *
 * De ondergrens staat in `.blog-count-floor` en ligt bewust onder het huidige
 * aantal, zodat normale redactie (een artikel weghalen) niet meteen de build
 * breekt. Verlaag dat getal alleen na een bewuste, gecontroleerde opschoning.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'

const BLOG_DIR = 'src/content/blog'
const FLOOR_FILE = '.blog-count-floor'

if (!existsSync(BLOG_DIR)) {
  console.log(`[assert-blog-count] geen ${BLOG_DIR}/ — niets te bewaken`)
  process.exit(0)
}

const count = readdirSync(BLOG_DIR).filter((f) => /\.mdx?$/i.test(f)).length

if (!existsSync(FLOOR_FILE)) {
  console.log(`[assert-blog-count] geen ${FLOOR_FILE} — ${count} artikel(en), niets te vergelijken`)
  process.exit(0)
}

const floor = Number.parseInt(readFileSync(FLOOR_FILE, 'utf8').trim(), 10)
if (!Number.isFinite(floor) || floor <= 0) {
  console.log(`[assert-blog-count] ${FLOOR_FILE} bevat geen bruikbaar getal — overgeslagen`)
  process.exit(0)
}

if (count < floor) {
  console.error(
    `\n[assert-blog-count] BUILD AFGEBROKEN — ${count} artikel(en) in ${BLOG_DIR}, ` +
      `ondergrens is ${floor}.\n` +
      `Waarschijnlijk heeft een Payload-sync de map geleegd. Controleer eerst hoeveel\n` +
      `posts de tenant in Payload heeft voor je opnieuw publisht; de huidige live site\n` +
      `blijft zolang ongemoeid.\n` +
      `Klopt het lagere aantal wel, verlaag dan ${FLOOR_FILE} in een aparte commit.\n`,
  )
  process.exit(1)
}

console.log(`[assert-blog-count] ${count} artikel(en), ondergrens ${floor} — in orde`)
