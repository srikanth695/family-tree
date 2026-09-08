const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const pkgRoot = path.resolve(__dirname, '..')
const nestedClient = path.join(pkgRoot, 'node_modules', '@prisma', 'client')
const rootClient = path.resolve(pkgRoot, '..', '..', 'node_modules', '@prisma', 'client')

try {
  if (!fs.existsSync(nestedClient) && fs.existsSync(rootClient)) {
    fs.mkdirSync(path.dirname(nestedClient), { recursive: true })
    if (process.platform === 'win32') {
      execSync(`cmd /c mklink /J "${nestedClient}" "${rootClient}"`)
    } else {
      fs.symlinkSync(rootClient, nestedClient, 'dir')
    }
  }
} catch (error) {
  console.warn('Prisma client link skipped:', error.message)
}
