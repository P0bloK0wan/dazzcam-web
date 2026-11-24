import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';

const {values} = parseArgs({
  options: {
    host:{type:'string',default:'127.0.0.1'},
    port:{type:'string',default:'5173'},
    strictPort:{type:'boolean'}
  }
});
const server = spawnSync('python3',['-m','http.server','--bind',values.host,'--directory','dist',values.port],{stdio:'inherit'});
if (server.error) throw server.error;
process.exitCode = server.status ?? 1;
