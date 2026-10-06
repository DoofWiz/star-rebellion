/* The text tool: node tools/text-smoke.js (needs NODE_PATH=$(npm root -g) for typescript, and python3 with openpyxl).
   tools/text/text.py finds the game's text with its own small JavaScript lexer. Here TypeScript's parser reads the
   same files and must find exactly the same string and template literals, at the same places, with the same values.
   Then the tool's self-test edits every line of text at once in a copy of the game, writes it back, and checks every
   file still parses and every line reads back as written, and that a workbook export and import changes one line. */
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'),tool=path.join(root,'tools/text/text.py');
const fails=[];
const py=args=>execFileSync('python3',[tool,...args],{cwd:root,encoding:'utf8',maxBuffer:1<<28});

let ts=null;try{ts=require('typescript');}catch(e){console.log('typescript not found: lexer cross-check skipped');}
if(ts){
  const spans=JSON.parse(py(['spans']));
  for(const [file,mine] of Object.entries(spans)){
    const src=fs.readFileSync(path.join(root,file),'utf8');
    const sf=ts.createSourceFile(file,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    const theirs=[];
    const K=ts.SyntaxKind;
    (function walk(n){
      if(n.kind===K.StringLiteral||n.kind===K.NoSubstitutionTemplateLiteral)theirs.push([n.getStart(sf),n.end,n.text]);
      else if(n.kind===K.TemplateHead||n.kind===K.TemplateMiddle||n.kind===K.TemplateTail)theirs.push([n.getStart(sf),n.end,n.text]);
      ts.forEachChild(n,walk);
    })(sf);
    theirs.sort((a,b)=>a[0]-b[0]);
    const key=x=>x[0]+':'+x[1]+':'+x[2];
    const a=new Set(mine.map(key)),b=new Set(theirs.map(key));
    const onlyMine=mine.filter(x=>!b.has(key(x))),onlyTheirs=theirs.filter(x=>!a.has(key(x)));
    if(onlyMine.length||onlyTheirs.length)
      fails.push(file+': lexer disagrees with TypeScript on '+(onlyMine.length+onlyTheirs.length)+' literal(s), first: '+
        JSON.stringify((onlyMine[0]||onlyTheirs[0])).slice(0,160));
    else console.log(file+': '+mine.length+' literals match TypeScript');
  }
}

try{process.stdout.write(py(['selftest']));}
catch(e){fails.push('selftest failed:\n'+(e.stdout||'')+(e.stderr||''));}

// the tool's own commands run
try{
  const rep=py(['report']);
  const all=+(rep.match(/^All\s+(\d+)/m)||[])[1];
  if(!(all>1000))fails.push('report found only '+all+' lines');
  const hit=py(['find','Sheriff’s law is Hegemony law']);
  if(!/ground\.js:\d+ +\[Dialog REB_LINES\.dax\[0\]\]/.test(hit))fails.push('find did not place a known bark: '+hit.slice(0,200));
}catch(e){fails.push('report/find failed: '+(e.stderr||e.message));}

if(fails.length){console.log('FAIL\n'+fails.join('\n'));process.exit(1);}
console.log('text smoke: ok');
