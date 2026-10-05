"""Loopback-only, in-memory static release swap. Never a production server."""
import argparse,http.server,pathlib,mimetypes,urllib.parse,time
p=argparse.ArgumentParser();p.add_argument('--baseline',required=True);p.add_argument('--candidate',required=True);p.add_argument('--port',type=int,default=5196);p.add_argument('--prefix',default='/');a=p.parse_args()
def snapshot(root):
 root=pathlib.Path(root).resolve();data={}
 for file in root.rglob('*'):
  if '.git' in file.parts or not file.is_file():continue
  data[file.relative_to(root).as_posix()]=file.read_bytes()
 return data
old=snapshot(a.baseline);new=snapshot(a.candidate);state={'files':old,'stall':False}
class Handler(http.server.BaseHTTPRequestHandler):
 def do_GET(self):
  path=urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
  if not path.startswith(a.prefix):self.send_error(404);return
  name=path[len(a.prefix):]
  if name in ['legacy','mnf-2026-10-05']:
   self.send_response(301);self.send_header('Location',path+'/');self.end_headers();return
  if not name or name.endswith('/'):name+='index.html'
  body=state['files'].get(name)
  if body is None:self.send_error(404);return
  self.send_response(200);self.send_header('Content-Type',mimetypes.guess_type(name)[0] or 'application/octet-stream');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)));self.end_headers()
  if state['stall'] and name=='legacy/index.html':
   self.wfile.write(body[:1]);self.wfile.flush();time.sleep(8)
   try:self.wfile.write(body[1:])
   except (BrokenPipeError,ConnectionResetError):pass
  else:self.wfile.write(body)
 def do_POST(self):
  if self.path==a.prefix+'__test__/stall':state['stall']=True;self.send_response(204);self.end_headers();return
  if self.path not in [a.prefix+'__test__/switch',a.prefix+'__test__/reset']:self.send_error(404);return
  state['stall']=False;state['files']=snapshot(a.candidate) if self.path.endswith('/switch') else old;self.send_response(204);self.end_headers()
 def log_message(self,*args):pass
print('Loaded release snapshots',len(old),len(new),flush=True)
http.server.ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()
