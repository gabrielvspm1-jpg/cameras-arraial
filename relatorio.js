/* Gerador de relatório em PDF (sem bibliotecas externas). Fontes padrão do PDF: Helvetica. */
(function(){
const W=595.28,H=841.89,MX=42,TOP=96,BOT=58;
const HW={' ':278,'!':278,'"':355,'#':556,'$':556,'%':889,'&':667,"'":191,'(':333,')':333,'*':389,'+':584,',':278,'-':333,'.':278,'/':278,':':278,';':278,'<':584,'=':584,'>':584,'?':556,'@':1015,'A':667,'B':667,'C':722,'D':722,'E':667,'F':611,'G':778,'H':722,'I':278,'J':500,'K':667,'L':556,'M':833,'N':722,'O':778,'P':667,'Q':778,'R':722,'S':667,'T':611,'U':722,'V':667,'W':944,'X':667,'Y':667,'Z':611,'[':278,'\\':278,']':278,'^':469,'_':556,'`':333,'a':556,'b':556,'c':500,'d':556,'e':556,'f':278,'g':556,'h':556,'i':222,'j':222,'k':500,'l':222,'m':833,'n':556,'o':556,'p':556,'q':556,'r':333,'s':500,'t':278,'u':556,'v':500,'w':722,'x':500,'y':500,'z':500,'{':334,'|':260,'}':334,'~':584};
const BW={' ':278,'A':722,'B':722,'C':722,'D':722,'E':667,'F':611,'G':778,'H':722,'I':278,'J':556,'K':722,'L':611,'M':833,'N':722,'O':778,'P':667,'Q':778,'R':722,'S':667,'T':611,'U':722,'V':667,'W':944,'X':667,'Y':667,'Z':611,'a':556,'b':611,'c':556,'d':611,'e':556,'f':333,'g':611,'h':611,'i':278,'j':278,'k':556,'l':278,'m':889,'n':611,'o':611,'p':611,'q':611,'r':389,'s':556,'t':333,'u':611,'v':556,'w':778,'x':556,'y':556,'z':500,'-':333,'.':278,',':278,':':278,'/':278,'(':333,')':333};
const CP={'–':'\x96','—':'\x97','’':'\x92','‘':'\x91','“':'\x93','”':'\x94','…':'\x85','•':'\x95','°':'\xB0','→':'->','✓':'v'};
function base(ch){const n=ch.normalize('NFD').charAt(0);return n}
function cp(s){let o='';for(const ch of String(s)){if(CP[ch]!==undefined)o+=CP[ch];else{const c=ch.charCodeAt(0);o+=c<256?ch:'?'}}return o}
function tw(s,size,bold){let w=0;for(const ch of String(s)){const b=base(ch);const t=bold?(BW[b]!==undefined?BW[b]:(HW[b]||556)*1.04):(HW[b]!==undefined?HW[b]:556);w+=t}return w*size/1000}
function esc(s){return cp(s).replace(/[\\()]/g,'\\$&').replace(/\r|\n/g,' ')}
function fit(s,w,size,bold){if(tw(s,size,bold)<=w)return s;let t=String(s);while(t.length>1&&tw(t+'…',size,bold)>w)t=t.slice(0,-1);return t+'…'}
function wrap(s,w,size,bold){const out=[];let line='';String(s).split(/\s+/).forEach(word=>{const t=line?line+' '+word:word;if(tw(t,size,bold)<=w||!line)line=t;else{out.push(line);line=word}});if(line)out.push(line);return out}
const hex=h=>[1,3,5].map(i=>(parseInt(h.slice(i,i+2),16)/255).toFixed(3)).join(' ');

function Doc(){this.pages=[];this.cur=null;this.newPage()}
Doc.prototype.newPage=function(){this.cur=[];this.pages.push(this.cur);this.y=TOP};
Doc.prototype.text=function(x,y,s,o){o=o||{};const size=o.size||10,bold=!!o.bold;let xx=x;const w=tw(s,size,bold);if(o.align==='right')xx=x-w;else if(o.align==='center')xx=x-w/2;
  this.cur.push('BT /'+(bold?'F2':'F1')+' '+size+' Tf '+hex(o.color||'#111111')+' rg '+xx.toFixed(2)+' '+(H-y).toFixed(2)+' Td ('+esc(s)+') Tj ET')};
Doc.prototype.rect=function(x,y,w,h,fill,stroke){const op=[];if(fill)op.push(hex(fill)+' rg');if(stroke)op.push(hex(stroke)+' RG 0.6 w');op.push(x.toFixed(2)+' '+(H-y-h).toFixed(2)+' '+w.toFixed(2)+' '+h.toFixed(2)+' re '+(fill&&stroke?'B':fill?'f':'S'));this.cur.push(op.join(' '))};
Doc.prototype.line=function(x1,y1,x2,y2,color,wd){this.cur.push(hex(color||'#999999')+' RG '+(wd||.6)+' w '+x1.toFixed(2)+' '+(H-y1).toFixed(2)+' m '+x2.toFixed(2)+' '+(H-y2).toFixed(2)+' l S')};
Doc.prototype.need=function(h){if(this.y+h>H-BOT)this.newPage()};
Doc.prototype.para=function(s,o){o=o||{};const size=o.size||10.5,lh=size*1.5;wrap(s,W-2*MX-(o.indent||0),size,o.bold).forEach(l=>{this.need(lh);this.text(MX+(o.indent||0),this.y+size,l,o);this.y+=lh});this.y+=o.after===undefined?6:o.after};
Doc.prototype.h=function(s){this.need(80);this.y+=8;this.text(MX,this.y+12,s,{size:12,bold:true,color:'#0B3D5C'});this.line(MX,this.y+18,W-MX,this.y+18,'#22A6C8',1);this.y+=28};
Doc.prototype.table=function(cols,rows,o){o=o||{};const size=o.size||8.5,rh=o.rh||17,tot=cols.reduce((a,c)=>a+c.w,0);
  const head=()=>{this.need(rh*2);this.rect(MX,this.y,tot,rh,'#0B3D5C');let x=MX;cols.forEach(c=>{this.text(c.al==='r'?x+c.w-6:x+6,this.y+rh-5.5,c.t,{size,bold:true,color:'#FFFFFF',align:c.al==='r'?'right':'left'});x+=c.w});this.y+=rh};
  head();rows.forEach((r,i)=>{if(this.y+rh>H-BOT){this.newPage();head()}
    if(i%2)this.rect(MX,this.y,tot,rh,'#F1F6F9');let x=MX;
    cols.forEach((c,j)=>{const v=r.cells[j],st=(r.styles&&r.styles[j])||{};const s=fit(v,c.w-12,size,st.bold);this.text(c.al==='r'?x+c.w-6:x+6,this.y+rh-5.5,s,{size,bold:st.bold,color:st.color||'#222222',align:c.al==='r'?'right':'left'});x+=c.w});
    this.y+=rh});
  this.line(MX,this.y,MX+tot,this.y,'#B7C4CC');this.y+=10};

Doc.prototype.build=function(meta){
  const N=this.pages.length,objs=[];
  const add=s=>{objs.push(s);return objs.length};
  add('<< /Type /Catalog /Pages 2 0 R >>');add('');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const kids=[];
  this.pages.forEach((c,i)=>{
    const pre=[];
    // cabeçalho
    pre.push(hex('#0B3D5C')+' rg 0 '+(H-6)+' '+W+' 6 re f '+hex('#22D3EE')+' rg 0 '+(H-9)+' '+W+' 3 re f');
    const tx=(x,y,s,sz,b,col,al)=>{const w=tw(s,sz,b);const xx=al==='r'?x-w:x;return 'BT /'+(b?'F2':'F1')+' '+sz+' Tf '+hex(col)+' rg '+xx.toFixed(2)+' '+(H-y).toFixed(2)+' Td ('+esc(s)+') Tj ET'};
    pre.push(tx(MX,40,'PREFEITURA MUNICIPAL DE ARRAIAL DO CABO',13,true,'#0B3D5C'));
    pre.push(tx(MX,55,'Mobilidade Urbana · Monitoramento por câmeras',9.5,false,'#555555'));
    pre.push(tx(W-MX,40,meta.dataCurta,9.5,true,'#0B3D5C','r'));
    pre.push(tx(W-MX,55,meta.hora,9.5,false,'#555555','r'));
    pre.push(hex('#22A6C8')+' RG 1 w '+MX+' '+(H-68)+' m '+(W-MX)+' '+(H-68)+' l S');
    pre.push(hex('#999999')+' RG .5 w '+MX+' '+(H-H+42)+' m '+(W-MX)+' '+(H-H+42)+' l S');
    pre.push(tx(MX,H-28,meta.rodape,8,false,'#666666'));
    pre.push(tx(W-MX,H-28,'Página '+(i+1)+' de '+N,8,true,'#444444','r'));
    const stream=pre.join('\n')+'\n'+c.join('\n');
    const cid=add('<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream');
    const pid=add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W.toFixed(2)+' '+H.toFixed(2)+'] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents '+cid+' 0 R >>');
    kids.push(pid+' 0 R');
  });
  objs[1]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+N+' >>';
  const info=add('<< /Title ('+esc(meta.titulo)+') /Producer (Central de cameras) /Creator (Central de cameras) >>');
  let out='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';const off=[];
  objs.forEach((o,i)=>{off.push(out.length);out+=(i+1)+' 0 obj\n'+o+'\nendobj\n'});
  const xr=out.length;out+='xref\n0 '+(objs.length+1)+'\n0000000000 65535 f \n'+off.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objs.length+1)+' /Root 1 0 R /Info '+info+' 0 R >>\nstartxref\n'+xr+'\n%%EOF';
  const u=new Uint8Array(out.length);for(let i=0;i<out.length;i++)u[i]=out.charCodeAt(i)&255;return u;
};

window.gerarRelatorioPDF=function(cams,TYPES,ATS,usuario,pad,cn){
  const now=new Date(),tz={timeZone:'America/Sao_Paulo'};
  const dCurta=now.toLocaleDateString('pt-BR',Object.assign({day:'2-digit',month:'2-digit',year:'numeric'},tz));
  const hora=now.toLocaleTimeString('pt-BR',Object.assign({hour:'2-digit',minute:'2-digit'},tz));
  const dLonga=now.toLocaleDateString('pt-BR',Object.assign({weekday:'long',day:'numeric',month:'long',year:'numeric'},tz));
  const fmt=d=>d?d.toLocaleDateString('pt-BR',Object.assign({day:'2-digit',month:'2-digit',year:'numeric'},tz))+' '+d.toLocaleTimeString('pt-BR',Object.assign({hour:'2-digit',minute:'2-digit'},tz)):'—';
  const tot=cams.length,on=cams.filter(c=>c.on).length,off=tot-on,pct=tot?Math.round(on/tot*1000)/10:0,pcto=tot?Math.round(off/tot*1000)/10:0;
  const pc=n=>String(n).replace('.',',');
  const d=new Doc();
  d.text(MX,d.y+14,'RELATÓRIO DE FUNCIONAMENTO DAS CÂMERAS',{size:17,bold:true,color:'#0B3D5C'});d.y+=22;
  d.text(MX,d.y+14,'DE MONITORAMENTO',{size:17,bold:true,color:'#0B3D5C'});d.y+=26;
  d.text(MX,d.y+10,'Data e hora de referência: '+dLonga+', às '+hora+' (horário de Brasília).',{size:10,color:'#444444'});d.y+=22;

  d.h('1. Situação geral');
  d.para('O presente relatório informa a situação de funcionamento das câmeras de monitoramento do Município de Arraial do Cabo, geridas pela Mobilidade Urbana da Prefeitura Municipal, de acordo com o registro mantido no sistema Central de Câmeras na data e hora de referência acima.');
  d.para('Na data de referência constam '+tot+' câmeras cadastradas, das quais '+on+' ('+pc(pct)+'%) encontram-se em funcionamento (online) e '+off+' ('+pc(pcto)+'%) encontram-se fora de operação (offline).'+(off?' As câmeras fora de operação estão relacionadas na seção 3.':' Não há câmeras registradas como fora de operação.'));
  // caixas
  d.need(70);const bw=(W-2*MX-3*10)/4,by=d.y;
  [['CADASTRADAS',String(tot),'#0B3D5C'],['EM FUNCIONAMENTO',String(on),'#0E8F63'],['FORA DE OPERAÇÃO',String(off),off?'#C62A47':'#0E8F63'],['DISPONIBILIDADE',pc(pct)+'%','#0B3D5C']].forEach((b,i)=>{const x=MX+i*(bw+10);d.rect(x,by,bw,56,'#F1F6F9','#C9D6DD');d.rect(x,by,3.5,56,b[2]);d.text(x+12,by+19,b[0],{size:7.5,bold:true,color:'#555555'});d.text(x+12,by+45,b[1],{size:22,bold:true,color:b[2]})});
  d.y+=72;

  d.h('2. Situação por tipo de câmera');
  const rowsT=TYPES.map((t,i)=>{const l=cams.filter(c=>c.t===i),o=l.filter(c=>c.on).length;return {cells:[t[0],String(l.length),String(o),String(l.length-o)],styles:{3:(l.length-o)?{color:'#C62A47',bold:true}:{}}}}).filter(r=>+r.cells[1]>0);
  rowsT.push({cells:['Total',String(tot),String(on),String(off)],styles:[{bold:true},{bold:true},{bold:true},{bold:true}]});
  d.table([{t:'Tipo',w:211},{t:'Total',w:100,al:'r'},{t:'Online',w:100,al:'r'},{t:'Offline',w:100,al:'r'}],rowsT,{rh:18,size:9});

  d.h('3. Câmeras fora de operação');
  const offl=cams.filter(c=>!c.on);
  if(!offl.length)d.para('Na data de referência, nenhuma câmera está registrada como fora de operação.');
  else d.table([{t:'Nº',w:40},{t:'Identificação',w:231},{t:'Tipo',w:70},{t:'Fora de operação desde',w:170}],offl.map(c=>({cells:[pad(c.id),cn(c),TYPES[c.t][0],fmt(ATS[c.id])],styles:{3:{color:'#C62A47',bold:true}}})),{size:8.5});

  d.h('4. Relação completa das câmeras');
  d.table([{t:'Nº',w:34},{t:'Identificação',w:162},{t:'Tipo',w:50},{t:'Situação',w:56},{t:'Última atualização',w:88},{t:'Coordenadas (lat, long)',w:121}],
    cams.map(c=>({cells:[pad(c.id),cn(c),TYPES[c.t][0],c.on?'Online':'Offline',fmt(ATS[c.id]),c.lat.toFixed(6)+', '+c.lon.toFixed(6)],styles:{3:{color:c.on?'#0E8F63':'#C62A47',bold:true}}})),{size:8});

  d.need(40);
  d.para('Observação: a situação de cada câmera (online ou offline) é registrada pelo operador do sistema. A coluna "Última atualização" indica quando esse registro foi feito pela última vez; "—" significa que a situação não foi alterada desde o cadastro da câmera.',{size:9,color:'#555555'});
  d.need(120);d.y+=14;
  d.para('Arraial do Cabo, '+dLonga.replace(/^[^,]+, /,'')+'.',{size:10.5});
  d.y+=34;d.line(MX,d.y,MX+230,d.y,'#444444',.8);d.y+=13;
  d.text(MX,d.y,'Responsável pelas informações',{size:9.5,bold:true});d.y+=13;
  d.text(MX,d.y,'Mobilidade Urbana · Prefeitura Municipal de Arraial do Cabo',{size:9,color:'#555555'});

  return d.build({titulo:'Relatorio de funcionamento das cameras - '+dCurta,dataCurta:dCurta,hora:hora,rodape:'Gerado pelo sistema Central de Câmeras em '+dCurta+' às '+hora});
};
})();
