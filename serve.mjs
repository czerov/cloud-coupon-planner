import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const allowed=new Set(['index.html','style.css','app.mjs','planner.mjs']);
const port=Number(process.env.PORT||4173);
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const name=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';if(!allowed.has(name)){res.writeHead(404).end('Not found');return;}const data=await fs.readFile(path.join(root,name));res.writeHead(200,{'Content-Type':name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8','X-Content-Type-Options':'nosniff'});res.end(data);}catch{res.writeHead(400).end('Bad request');}}).listen(port,'127.0.0.1',()=>console.log(`Open http://127.0.0.1:${port}`));
