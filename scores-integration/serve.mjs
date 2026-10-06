// Local preview only. --mock explicitly enables fictional scores; no real key.
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createProvider} from './src/provider.mjs';
import {createScoreHandler} from './src/handler.mjs';
import {fixture,TestCache} from './tests/support.mjs';
const mock=process.argv.includes('--mock'),root=import.meta.dirname;
const handler=createScoreHandler({enabled:mock,cache:new TestCache(),provider:createProvider({key:'mock-only',kind:'mock',fetcher:async()=>new Response(JSON.stringify(fixture()))})});
const server=createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/scores'){const r=await handler(new Request(u,{method:req.method}));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());return;}
 if(u.pathname==='/'){res.writeHead(302,{Location:'/preview/'});res.end();return;}
 if(u.pathname==='/ui/config.mjs'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(`export const scoreConfig={enabled:${mock},endpoint:'/scores'};`);return;}
 const file=path.resolve(root,'.'+decodeURIComponent(u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname));
 if(!file.startsWith(root+path.sep)||!(['preview','ui'].includes(path.relative(root,file).split(path.sep)[0])||['src/transport.mjs','src/dto.mjs'].includes(path.relative(root,file))))throw Error();
 const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream'});res.end(body);
}catch{res.writeHead(404);res.end('Not found');}});
server.listen(5210,'127.0.0.1',()=>console.log(`Local ${mock?'FICTIONAL MOCK':'disabled/manual'} preview: http://127.0.0.1:5210/`));
