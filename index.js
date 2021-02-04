#!/usr/bin/env node

const fs = require('fs');
const { createSocket } = require('dgram');
const { promisify } = require('util');
const Koa = require('koa');
const portfinder = require('portfinder');
const execa = require('execa');
const cli = require('cac')();
const chalk = require('chalk');
const clipboardy = require('clipboardy');

const fsPromises = fs.promises;

cli.command('<source_dir> <target_dir>', 'Send directory via direct HTTP').action(handleSend);
cli.help();
try {
  cli.parse();
} catch {
  cli.outputHelp();
}

function getUniqueName() {
  return `/tmp/${Math.random().toString(32).slice(2)}.tgz`;
}

function createShellScript(host, target) {
  const filename = getUniqueName();
  return `\
set -e

filename=${filename}
curl -fsSo $filename ${host}/bundle.tgz
mkdir -p ${target}
tar xvf $filename -C ${target}
rm $filename
`;
}

async function getPrivateIpForFamily(family = 4) {
  const socket = createSocket({ type: `udp${family}` });
  await promisify(socket.connect.bind(socket))(53, family === 4 ? '8.8.8.8' : '2001:4860:4860::8888');
  const { address } = socket.address();
  socket.close();
  return address;
}

async function handleSend(sourceDir, targetDir) {
  const stat = sourceDir && await fsPromises.stat(sourceDir);
  if (!stat || !stat.isDirectory()) {
    console.error(`A source directory is required but got: ${sourceDir || '<null>'}`);
    process.exit(1);
  }
  const bundlePath = getUniqueName();
  await execa('tar', ['cvf', bundlePath, '-C', sourceDir, '.']);
  const ip = await getPrivateIpForFamily();
  const port = await portfinder.getPortPromise();
  const app = new Koa();
  app.use(async (ctx, next) => {
    if (ctx.path === '/bundle.tgz') {
      const stream = fs.createReadStream(bundlePath);
      stream.on('end', handleEnd);
      ctx.body = stream;
    } else if (ctx.path === '/fetch.sh') {
      const shellScript = createShellScript(`http://${ctx.host}`, targetDir);
      ctx.body = shellScript;
    }
  });
  const server = app.listen(port, () => {
    const command = `curl -fsS http://${ip}:${port}/fetch.sh | sh`;
    console.log([
      'Run the following command at your target machine (already copied to clipboard):',
      '',
      chalk.green(`  ${command}`),
      '',
    ].join('\n'));
    clipboardy.write(command);
  });

  function handleEnd() {
    console.log(chalk.yellow('Directory sent successfully'));
    server.close();
    fsPromises.rm(bundlePath);
  }
}
