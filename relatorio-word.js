/* Gerador de relatório em Word (.docx), sem bibliotecas externas. Mesmo conteúdo do PDF, porém editável. */
(function(){
const NAVY='0B3D5C',GRAY='444444';
const X=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const cm=v=>Math.round(v*567);
const EMU=v=>Math.round(v*360000);
function R(t,o){o=o||{};return '<w:r><w:rPr>'+(o.b?'<w:b/>':'')+(o.i?'<w:i/>':'')+(o.color?'<w:color w:val="'+o.color+'"/>':'')+'<w:sz w:val="'+Math.round((o.sz||10)*2)+'"/></w:rPr><w:t xml:space="preserve">'+X(t)+'</w:t></w:r>'}
function P(inner,o){o=o||{};
  return '<w:p><w:pPr>'+(o.keep?'<w:keepNext/>':'')+(o.lines?'<w:keepLines/>':'')+(o.border?'<w:pBdr><w:bottom w:val="single" w:sz="'+(o.border.sz||6)+'" w:space="'+(o.border.sp||2)+'" w:color="'+(o.border.color||NAVY)+'"/></w:pBdr>':'')+(o.tab?'<w:tabs><w:tab w:val="left" w:pos="'+o.tab+'"/></w:tabs>':'')+'<w:spacing w:before="'+Math.round((o.before||0)*20)+'" w:after="'+Math.round((o.after===undefined?6:o.after)*20)+'"/>'+(o.hang?'<w:ind w:left="'+o.hang+'" w:hanging="'+o.hang+'"/>':o.ind?'<w:ind w:left="'+o.ind+'"/>':'')+(o.jc?'<w:jc w:val="'+o.jc+'"/>':'')+'</w:pPr>'+inner+'</w:p>'}
const T=(t,o,po)=>P(R(t,o),po);
const H=t=>P(R(t,{b:1,sz:12,color:NAVY}),{keep:1,before:12,after:6,border:{}});
const PB='<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
function cell(w,inner,o){o=o||{};return '<w:tc><w:tcPr><w:tcW w:w="'+w+'" w:type="dxa"/>'+(o.span?'<w:gridSpan w:val="'+o.span+'"/>':'')+(o.top?'<w:tcBorders><w:top w:val="single" w:sz="6" w:color="333333"/></w:tcBorders>':'')+(o.fill?'<w:shd w:val="clear" w:color="auto" w:fill="'+o.fill+'"/>':'')+(o.mid?'<w:vAlign w:val="center"/>':'')+'</w:tcPr>'+inner+'</w:tc>'}
function tbl(ws,rows,o){o=o||{};
  return '<w:tbl><w:tblPr><w:tblW w:w="'+ws.reduce((a,b)=>a+b,0)+'" w:type="dxa"/><w:jc w:val="center"/>'+(o.nob?'':'<w:tblBorders><w:top w:val="single" w:sz="4" w:color="'+(o.bc||'DDE6EB')+'"/><w:bottom w:val="single" w:sz="4" w:color="'+(o.bc||'DDE6EB')+'"/>'+(o.grid?'<w:left w:val="single" w:sz="4" w:color="'+o.bc+'"/><w:right w:val="single" w:sz="4" w:color="'+o.bc+'"/><w:insideH w:val="single" w:sz="4" w:color="'+o.bc+'"/><w:insideV w:val="single" w:sz="4" w:color="'+o.bc+'"/>':'<w:insideH w:val="single" w:sz="4" w:color="'+(o.bc||'DDE6EB')+'"/>')+'</w:tblBorders>')+'<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="70" w:type="dxa"/><w:right w:w="70" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>'+ws.map(w=>'<w:gridCol w:w="'+w+'"/>').join('')+'</w:tblGrid>'+
    rows.map(r=>'<w:tr><w:trPr><w:cantSplit/>'+(r.head?'<w:tblHeader/>':'')+'</w:trPr>'+r.cells+'</w:tr>').join('')+'</w:tbl>'}
function dataTable(ws,head,rows,sz,al,colorFn){
  const hdr={head:1,cells:head.map((h,i)=>cell(ws[i],T(h,{b:1,sz,color:'FFFFFF'},{after:1,before:1,jc:al&&al[i]}),{fill:NAVY})).join('')};
  const body=rows.map((r,ri)=>({cells:r.map((v,i)=>{const c=colorFn&&colorFn(i,v,ri);return cell(ws[i],T(v,{sz,b:c&&c[1],color:c&&c[0]},{after:1,before:1,jc:al&&al[i]}),{fill:ri%2?'F1F6F9':null})}).join('')}));
  return tbl(ws,[hdr].concat(body))}
const CHK=on=>'<w:sdt><w:sdtPr><w14:checkbox><w14:checked w14:val="'+(on?1:0)+'"/><w14:checkedState w14:val="2612" w14:font="MS Gothic"/><w14:uncheckedState w14:val="2610" w14:font="MS Gothic"/></w14:checkbox></w:sdtPr><w:sdtContent><w:r><w:rPr><w:rFonts w:ascii="MS Gothic" w:eastAsia="MS Gothic" w:hAnsi="MS Gothic" w:hint="eastAsia"/><w:sz w:val="22"/></w:rPr><w:t>'+(on?'☒':'☐')+'</w:t></w:r></w:sdtContent></w:sdt>';
const SIG=(nomes,ws)=>tbl(ws,[{cells:nomes.map((n,i)=>cell(ws[i],T(n,{b:1,sz:8.5},{after:0,jc:'center'})+T('Nome · Matrícula',{sz:7.5,color:'8899A3'},{after:0,jc:'center'}),{top:1})).join('')}],{nob:1});

/* ---- pacote ---- */
const NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" mc:Ignorable="w14"';
function Pkg(){this.media=[];this.n=0}
Pkg.prototype.addImg=function(bytes){const id='rIdM'+(++this.n);this.media.push({id,name:'image'+this.n+'.jpg',bytes});return id};
Pkg.prototype.pic=function(id,wc,hc,anchor){
  const ex=EMU(wc),ey=EMU(hc),n=this.n+100;
  const g='<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="'+n+'" name="Imagem '+n+'"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+id+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+ex+'" cy="'+ey+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>';
  if(anchor)return '<w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="0" behindDoc="1" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV><wp:extent cx="'+ex+'" cy="'+ey+'"/><wp:wrapNone/><wp:docPr id="'+n+'" name="Papel timbrado"/><wp:cNvGraphicFramePr/>'+g+'</wp:anchor></w:drawing>';
  return '<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="'+ex+'" cy="'+ey+'"/><wp:docPr id="'+n+'" name="Imagem '+n+'"/><wp:cNvGraphicFramePr/>'+g+'</wp:inline></w:drawing>'};
const b2u=s=>{const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i)&255;return u};
let CT=null;function crc(u){if(!CT){CT=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;CT[n]=c>>>0}}let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CT[(c^u[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
function zip(files){const enc=new TextEncoder(),parts=[],cd=[];let off=0;
  const w16=(a,v)=>a.push(v&255,(v>>8)&255),w32=(a,v)=>{w16(a,v&0xFFFF);w16(a,(v>>>16)&0xFFFF)};
  files.forEach(f=>{const nm=enc.encode(f.name),d=f.data,c=crc(d),h=[];
    w32(h,0x04034b50);w16(h,20);w16(h,0x0800);w16(h,0);w16(h,0);w16(h,0x21);w32(h,c);w32(h,d.length);w32(h,d.length);w16(h,nm.length);w16(h,0);
    parts.push(new Uint8Array(h),nm,d);
    const e=[];w32(e,0x02014b50);w16(e,20);w16(e,20);w16(e,0x0800);w16(e,0);w16(e,0);w16(e,0x21);w32(e,c);w32(e,d.length);w32(e,d.length);w16(e,nm.length);w16(e,0);w16(e,0);w16(e,0);w16(e,0);w32(e,0);w32(e,off);
    cd.push(new Uint8Array(e),nm);off+=h.length+nm.length+d.length});
  let cs=0;cd.forEach(x=>cs+=x.length);const z=[];w32(z,0x06054b50);w16(z,0);w16(z,0);w16(z,files.length);w16(z,files.length);w32(z,cs);w32(z,off);w16(z,0);
  const all=parts.concat(cd,[new Uint8Array(z)]);let n=0;all.forEach(x=>n+=x.length);const o=new Uint8Array(n);let p=0;all.forEach(x=>{o.set(x,p);p+=x.length});return o}
async function fundo(pk){try{const r=await fetch('papel-timbrado.jpg');if(r.ok)return pk.addImg(new Uint8Array(await r.arrayBuffer()))}catch(e){}return null}
function build(pk,body,bgId,titulo){
  const enc=new TextEncoder();
  const hdr='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:hdr '+NS+'><w:p><w:pPr><w:spacing w:after="0"/></w:pPr>'+(bgId?'<w:r>'+pk.pic(bgId,21,29.7,true)+'</w:r>':'')+'</w:p></w:hdr>';
  const fl=(i)=>'<w:r><w:rPr><w:b/><w:color w:val="555555"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:b/><w:color w:val="555555"/><w:sz w:val="16"/></w:rPr><w:instrText xml:space="preserve"> '+i+' </w:instrText></w:r><w:r><w:rPr><w:b/><w:color w:val="555555"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:b/><w:color w:val="555555"/><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:b/><w:color w:val="555555"/><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>';
  const ftr='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr '+NS+'><w:p><w:pPr><w:spacing w:after="0"/><w:jc w:val="right"/></w:pPr>'+R('Página ',{b:1,sz:8,color:'555555'})+fl('PAGE')+R(' de ',{b:1,sz:8,color:'555555'})+fl('NUMPAGES')+'</w:p></w:ftr>';
  const doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document '+NS+'><w:body>'+body+'<w:sectPr><w:headerReference w:type="default" r:id="rIdH"/><w:footerReference w:type="default" r:id="rIdF"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="2551" w:right="1134" w:bottom="1474" w:left="1134" w:header="0" w:footer="794" w:gutter="0"/></w:sectPr></w:body></w:document>';
  const sty='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="20"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="252" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>';
  const rel=(id,t,tg)=>'<Relationship Id="'+id+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/'+t+'" Target="'+tg+'"/>';
  const rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+rel('rIdH','header','header1.xml')+rel('rIdF','footer','footer1.xml')+rel('rIdS','styles','styles.xml')+pk.media.map(m=>rel(m.id,'image','media/'+m.name)).join('')+'</Relationships>';
  const files=[
    {name:'[Content_Types].xml',data:enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>')},
    {name:'_rels/.rels',data:enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>')},
    {name:'docProps/core.xml',data:enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>'+X(titulo)+'</dc:title><dc:creator>Central de câmeras</dc:creator></cp:coreProperties>')},
    {name:'word/document.xml',data:enc.encode(doc)},{name:'word/_rels/document.xml.rels',data:enc.encode(rels)},{name:'word/styles.xml',data:enc.encode(sty)},
    {name:'word/_rels/header1.xml.rels',data:enc.encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+pk.media.map(m=>rel(m.id,'image','media/'+m.name)).join('')+'</Relationships>')},
    {name:'word/header1.xml',data:enc.encode(hdr)},{name:'word/footer1.xml',data:enc.encode(ftr)}];
  pk.media.forEach(m=>files.push({name:'word/media/'+m.name,data:m.bytes}));
  return zip(files)}
const kv=(a,b,empty)=>P(R(a,{b:1,sz:9.5,color:'333333'})+'<w:r><w:tab/></w:r>'+R((b===undefined||b===null||b==='')?(empty||'—'):b,{sz:9.5,color:(b===undefined||b===null||b==='')?'8899A3':'111111'}),{after:2,tab:cm(5.6),hang:cm(5.6)});
const kvL=(a,b)=>P(R(a,{b:1,sz:9.5,color:'333333'})+'<w:r><w:tab/></w:r>'+R(b?b:'________________________',{sz:9.5,color:b?'111111':'8899A3'}),{after:2,tab:cm(5.6),hang:cm(5.6)});
function photoGrid(pk,fotos,cols,mw,mh,withCap){
  let o='',i=0;
  while(i<fotos.length){
    const per=cols===2&&withCap?4:fotos.length;
    const rows=[];
    for(let r=0;r<(withCap?2:1)&&i<fotos.length;r++){let cs='';
      for(let c=0;c<cols;c++){
        if(i<fotos.length){const f=fotos[i],sc=Math.min(mw/f.w,mh/f.h),id=pk.addImg(b2u(f.data));
          cs+=cell(cm(8.5),P('<w:r>'+pk.pic(id,f.w*sc,f.h*sc)+'</w:r>',{jc:'center',after:2})+(withCap?T(f.t||'',{b:1,sz:9,color:NAVY},{after:0})+T(f.s||'',{sz:8,color:'555555'},{after:10}):''));i++}
        else cs+=cell(cm(8.5),'<w:p/>')}
      rows.push({cells:cs})}
    o+=tbl([cm(8.5),cm(8.5)],rows,{nob:1});
    if(i<fotos.length&&withCap)o+=PB}
  return o}

window.gerarRelatorioDOCX=async function(cams,TYPES,ATS,usuario,pad,cn,fotos,opt){opt=opt||{};let secN=5;
  const pk=new Pkg(),bgId=await fundo(pk);
  const now=opt.refDate||new Date(),tz={timeZone:'America/Sao_Paulo'};
  const dCurta=now.toLocaleDateString('pt-BR',Object.assign({day:'2-digit',month:'2-digit',year:'numeric'},tz));
  const hora=now.toLocaleTimeString('pt-BR',Object.assign({hour:'2-digit',minute:'2-digit'},tz));
  const dLonga=now.toLocaleDateString('pt-BR',Object.assign({weekday:'long',day:'numeric',month:'long',year:'numeric'},tz));
  const fmt=d=>d?d.toLocaleDateString('pt-BR',Object.assign({day:'2-digit',month:'2-digit',year:'numeric'},tz))+' '+d.toLocaleTimeString('pt-BR',Object.assign({hour:'2-digit',minute:'2-digit'},tz)):'—';
  const tot=cams.length,on=cams.filter(c=>c.on).length,off=tot-on,pct=tot?Math.round(on/tot*1000)/10:0,pcto=tot?Math.round(off/tot*1000)/10:0;
  const pc=n=>String(n).replace('.',',');
  let b='';
  b+=T('RELATÓRIO DE FUNCIONAMENTO DAS CÂMERAS',{b:1,sz:15.5,color:NAVY},{after:0})+T('DE MONITORAMENTO',{b:1,sz:15.5,color:NAVY},{after:8});
  b+=T('Data e hora de referência: '+dLonga+', às '+hora+' (horário de Brasília).',{sz:10,color:GRAY},{after:8});
  b+=H('1. Situação geral');
  b+=T('O presente relatório informa a situação de funcionamento das câmeras de monitoramento do Município de Arraial do Cabo, geridas pela Secretaria de Mobilidade Urbana da Prefeitura de Arraial do Cabo, de acordo com o registro mantido no sistema Central de Câmeras na data e hora de referência acima.',{},{jc:'both'});
  b+=T('Na data de referência constam '+tot+' câmeras cadastradas, das quais '+on+' ('+pc(pct)+'%) encontram-se em funcionamento (online) e '+off+' ('+pc(pcto)+'%) encontram-se fora de operação (offline).'+(off?' As câmeras fora de operação estão relacionadas na seção 3.':' Não há câmeras registradas como fora de operação.'),{},{jc:'both'});
  const bx=[['CADASTRADAS',String(tot),NAVY],['EM FUNCIONAMENTO',String(on),'0E8F63'],['FORA DE OPERAÇÃO',String(off),off?'C62A47':'0E8F63'],['DISPONIBILIDADE',pc(pct)+'%',NAVY]],bw=cm(4.25);
  b+=tbl([bw,bw,bw,bw],[{cells:bx.map(x=>cell(bw,T(x[0],{b:1,sz:7.5,color:'5A6B75'},{after:0}),{fill:'F1F6F9'})).join('')},{cells:bx.map(x=>cell(bw,T(x[1],{b:1,sz:20,color:x[2]},{after:0}),{fill:'F1F6F9'})).join('')}],{grid:1,bc:'C9D6DD'})+T('',{},{after:2});
  b+=H('2. Situação por tipo de câmera');
  const NM={'OCR':'OCR / LPR (Tipo IV)','Facial':'Reconhecimento facial (Tipo III)','360°':'PTZ / Speed Dome (Tipo II)','Comum':'Câmera fixa (Tipo I)'};
  const rowsT=TYPES.map((t,i)=>{const l=cams.filter(c=>c.t===i),o=l.filter(c=>c.on).length;return [NM[t[0]]||t[0],String(l.length),String(o),String(l.length-o)]}).filter(r=>+r[1]>0);
  rowsT.push(['Total',String(tot),String(on),String(off)]);
  b+=dataTable([cm(7),cm(3),cm(3),cm(3)],['Tipo','Total','Online','Offline'],rowsT,9,[null,'right','right','right'],(i,v,ri)=>ri===rowsT.length-1?[null,1]:(i===3&&+v?['C62A47',1]:null));
  b+=H('3. Câmeras fora de operação');
  const offl=cams.filter(c=>!c.on);
  if(!offl.length)b+=T('Na data de referência, nenhuma câmera está registrada como fora de operação.',{},{jc:'both'});
  else b+=dataTable([cm(1.9),cm(7.3),cm(2.5),cm(4.5)],['Nº','Identificação','Tipo','Fora de operação desde'],offl.map(c=>[pad(c.id),cn(c),TYPES[c.t][0],fmt(ATS[c.id])]),8.5,null,(i)=>i===3?['C62A47',1]:null);
  b+=H('4. Relação completa das câmeras');
  b+=dataTable([cm(1.8),cm(5),cm(1.7),cm(1.6),cm(2.8),cm(3.8)],['Nº','Identificação','Tipo','Situação','Última atualização','Coordenadas (lat, long)'],cams.map(c=>[pad(c.id),cn(c),TYPES[c.t][0],c.on?'Online':'Offline',fmt(ATS[c.id]),c.lat.toFixed(6)+', '+c.lon.toFixed(6)]),7.5,null,(i,v)=>i===3?[v==='Online'?'0E8F63':'C62A47',1]:null);
  b+=T('',{},{after:2})+T('Observação: a situação de cada câmera (online ou offline) é registrada pelo operador do sistema. A coluna "Última atualização" indica quando esse registro foi feito pela última vez; "—" significa que a situação não foi alterada desde o cadastro da câmera.',{sz:9,color:'555555'},{jc:'both'});
  const dataLonga=dLonga.replace(/^[^,]+, /,'');
  if(opt.fiscalizacao){
    const I=opt.ident||{};
    b+=H((secN++)+'. Identificação da fiscalização');
    [['Processo Administrativo:',I.processo],['Contrato Administrativo:',I.contrato],['Unidade fiscalizada:',I.unidade],['Contratada:',I.contratada],['Período de medição:',I.periodo],['Referência da medição:',I.medicao],['Data da fiscalização:',I.data||dCurta],['Fiscal Técnico:',I.fiscalTec],['Fiscal Administrativo:',I.fiscalAdm],['Representante da Contratada:',I.rep]].forEach(x=>b+=kvL(x[0],x[1]));
    b+=H((secN++)+'. Indicadores de desempenho (ANS/SLA)');
    const ifc=tot?Math.round(on/tot*10000)/100:0,ido=opt.ido||{},iao=opt.iao||{},iig=opt.iig||{};
    b+=T('Os indicadores abaixo seguem o Acordo de Nível de Serviço do contrato (disponibilidade operacional mínima de 98,5% ao mês). O IFC é calculado automaticamente com a situação das câmeras registrada no painel; os demais são preenchidos pelo fiscal.',{},{jc:'both'});
    b+=dataTable([cm(5.4),cm(7.4),cm(3.6)],['Indicador','Como se calcula','Apurado'],[
      ['IFC · Funcionamento das câmeras','operacionais ÷ total × 100 ('+on+' ÷ '+tot+')',pc(ifc)+' %'],
      ['IDO · Disponibilidade operacional','horas disponíveis ÷ horas totais × 100',ido.val||'_______ %'],
      ['IAO · Atendimento operacional','chamados atendidos ÷ registrados × 100',iao.val||'_______ %'],
      ['IIG · Integridade das gravações','dias gravados ÷ dias exigidos × 100',iig.val||'_______ %']],8.5,[null,null,'right'],(i,v,ri)=>(i===2&&ri===0)?[ifc>=98.5?'0E8F63':'C62A47',1]:null);
    b+=H((secN++)+'. Verificações operacionais');
    const OCI=opt.oc||null,NC={'Equipamentos íntegros, sem avarias':off>0?off+(off>1?' câmeras fora de operação':' câmera fora de operação'):null,'Chamados registrados, atendidos e encerrados':OCI&&OCI.abertas>0?OCI.abertas+(OCI.abertas>1?' abertas':' aberta')+(OCI.vencidas>0?' ('+OCI.vencidas+' vencida'+(OCI.vencidas>1?'s':'')+')':''):null};
    const W7=[cm(7.2),cm(2.2),cm(2.6),cm(4.4)];
    const rows=[{head:1,cells:['Verificação','Conforme','Não conforme','Observações'].map((h,i)=>cell(W7[i],T(h,{b:1,sz:8.5,color:'FFFFFF'},{after:1,before:1,jc:i===1||i===2?'center':null}),{fill:NAVY})).join('')}];
    const grupo=(n,its)=>{rows.push({cells:cell(W7.reduce((a,c)=>a+c,0),T(n,{b:1,sz:8.5,color:NAVY},{after:1,before:1}),{span:4,fill:'DCE6EE'})});
      its.forEach(it=>{const nc=NC[it]||null;rows.push({cells:cell(W7[0],T(it,{sz:8.5},{after:2,before:2}),{mid:1})+cell(W7[1],P(CHK(!nc),{jc:'center',after:2,before:2}),{mid:1})+cell(W7[2],P(CHK(!!nc),{jc:'center',after:2,before:2}),{mid:1})+cell(W7[3],T(nc||'',{sz:8,color:'C62A47'},{after:2,before:2}),{mid:1})})})};
    grupo('Central operacional',['Central operacional ativa','Videowall e servidores operacionais','Sistema VMS funcional','Backups e redundância ativos']);
    grupo('Câmeras',['Qualidade da imagem e visão noturna','Zoom/PTZ funcional','Equipamentos íntegros, sem avarias']);
    grupo('Atendimento e gravações',['Chamados registrados, atendidos e encerrados','Gravações disponíveis e recuperáveis','Período de retenção adequado']);
    grupo('Rede, segurança e documentos',['Estabilidade da conexão e latência compatível','Controle de acesso, perfis e logs','Relatório mensal da contratada']);
    b+=tbl(W7,rows);
    b+=H((secN++)+'. Conclusão e manifestação quanto à medição');
    b+=T('Não conformidades: as câmeras fora de operação estão relacionadas na seção 3. Demais irregularidades e providências recomendadas:',{},{jc:'both',after:4});
    for(let i=0;i<3;i++)b+=P('<w:r><w:t xml:space="preserve"> </w:t></w:r>',{after:8,border:{sz:4,sp:4,color:'5A6B75'}});
    const op=t=>P(CHK(false)+R('  '+t,{sz:10}),{after:3,ind:cm(0.3)});
    b+=T('Conclusão',{b:1,sz:9.5,color:NAVY},{keep:1,before:6,after:3});
    b+=op('A execução encontra-se plenamente conforme')+op('A execução encontra-se conforme com ressalvas')+op('A execução apresenta não conformidades relevantes');
    b+=T('Manifestação quanto à medição',{b:1,sz:9.5,color:NAVY},{keep:1,before:6,after:3});
    b+=op('Favorável à medição integral')+op('Favorável à medição com ressalvas')+op('Necessária análise complementar')+op('Necessária aplicação de glosa');
  }
  const ciente=()=>{const mesC=now.toLocaleDateString('pt-BR',Object.assign({month:'long',year:'numeric'},tz));
    let o=H('Ciente e de acordo')+T('Ciente e de acordo com as informações constantes deste relatório de funcionamento das câmeras de monitoramento, referente ao mês de '+mesC+'.',{},{jc:'both',after:30});
    o+=tbl([cm(9)],[{cells:cell(cm(9),T('Secretário Municipal de Mobilidade Urbana',{b:1,sz:9.5},{after:0,jc:'center'})+T('Nome · Matrícula',{sz:7.5,color:'8899A3'},{after:0,jc:'center'}),{top:1})}],{nob:1});
    o+=T('Arraial do Cabo, ______ de ____________________ de ________.',{},{jc:'center',before:8});return o};
  if(opt.fiscalizacao){
    b+=T('Arraial do Cabo, '+dataLonga+'.',{},{before:10,after:22,keep:1});
    b+=SIG(['Gestor do contrato','Fiscal Técnico','Fiscal Administrativo'],[cm(5.4),cm(5.4),cm(5.4)]);
    b+=ciente();
  }else{
    b+=T('Arraial do Cabo, '+dataLonga+'.',{},{before:10,after:22,keep:1});
    b+=tbl([cm(8)],[{cells:cell(cm(8),T('Responsável pelas informações',{b:1,sz:9.5},{after:0})+T('Secretaria de Mobilidade Urbana · Prefeitura de Arraial do Cabo',{sz:9,color:'555555'},{after:0}),{top:1})}],{nob:1});
    if(fotos&&fotos.length)b+=PB+ciente();
  }
  if(fotos&&fotos.length){
    const mes=now.toLocaleDateString('pt-BR',Object.assign({month:'long',year:'numeric'},tz));
    b+=PB+H((opt.fiscalizacao?secN:5)+'. Registro fotográfico — '+mes)+T('Observação: valor estimado, com base estimada de câmeras.',{sz:9.5,color:'555555'});
    b+=photoGrid(pk,fotos,2,8.2,8.4,true);
  }
  return build(pk,b,bgId,'Relatório de funcionamento das câmeras - '+dCurta)};

window.gerarDocOcorrenciaDOCX=async function(tipo,o,opt){opt=opt||{};
  const pk=new Pkg(),bgId=await fundo(pk),tz={timeZone:'America/Sao_Paulo'};
  const F=t=>t?new Date(t).toLocaleDateString('pt-BR',Object.assign({day:'2-digit',month:'2-digit',year:'numeric'},tz))+' às '+new Date(t).toLocaleTimeString('pt-BR',Object.assign({hour:'2-digit',minute:'2-digit'},tz)):'—';
  const D=t=>t?new Date(t).toLocaleDateString('pt-BR',Object.assign({day:'2-digit',month:'long',year:'numeric'},tz)):'—';
  const dur=ms=>{if(ms==null||ms<0)return '—';const m=Math.floor(ms/60000),h=Math.floor(m/60),d=Math.floor(h/24);return (d?d+' d ':'')+(h%24?h%24+' h ':'')+(m%60)+' min'};
  const ehOS=tipo==='os',I=opt.ident||{};let b='';
  b+=T(ehOS?(o.resolvidoEm?'ORDEM DE SERVIÇO · CONCLUÍDA':'ORDEM DE SERVIÇO'):'REGISTRO DE OCORRÊNCIA TÉCNICA',{b:1,sz:15.5,color:NAVY},{after:0});
  b+=T(ehOS?'MANUTENÇÃO CORRETIVA · CÂMERA DE MONITORAMENTO':'INDISPONIBILIDADE DE CÂMERA DE MONITORAMENTO',{b:1,sz:10.5,color:GRAY},{after:8});
  b+=H('1. Identificação');
  b+=kv(ehOS?'Ordem de Serviço nº:':'Ocorrência nº:',ehOS?(o.os&&o.os.num):o.numero);
  if(ehOS){b+=kv('Referente à ocorrência nº:',o.numero)+kv('Data de emissão:',D(o.os&&o.os.data||Date.now()))}
  b+=kv('Situação:',o.status)+kv('Processo Administrativo:',I.processo)+kv('Contrato Administrativo:',I.contrato)+kv('Unidade:',I.unidade);
  if(ehOS)b+=kv('Contratada:',o.os&&o.os.empresa)+kv('Preposto da contratada:',o.os&&o.os.preposto);
  b+=H('2. Equipamento');
  b+=kv('Câmera:',o.cod)+kv('Nome / local:',o.nome)+kv('Tipo:',o.tipoTxt)+kv('Bairro:',o.bairro)+kv('Coordenadas:',o.lat!=null?o.lat.toFixed(6)+', '+o.lon.toFixed(6):'');
  b+=H(ehOS?'3. Falha constatada':'3. Registro da indisponibilidade');
  b+=kv('Início da interrupção:',F(o.ini))+kv('Ocorrência registrada em:',F(o.det))+kv('Restabelecimento:',o.fim?F(o.fim):'Ainda indisponível');
  if(o.resolvidoEm)b+=kv('Serviço resolvido em:',F(o.resolvidoEm));
  b+=kv('Duração da interrupção:',dur((o.fim||o.resolvidoEm||Date.now())-o.ini)+((o.fim||o.resolvidoEm)?'':' (até o momento)'));
  b+=T('Indisponibilidade registrada por interrupção contínua superior a 15 (quinze) minutos, conforme a Cláusula Nona do contrato (níveis mínimos de serviço), sem que tenha sido iniciada medida corretiva ou comunicação formal à fiscalização.',{sz:9,color:'555555'},{jc:'both'});
  b+=H('4. Severidade e prazos de atendimento (SLA)');
  b+=kv('Nível de severidade:',o.nivel?o.nivel.k+' — '+o.nivel.nome:'');
  if(o.nivel)b+=kv('Resposta inicial até:',o.nivel.resp+' após o início ('+F(o.ini+o.nivel.respMs)+')')+kv('Solução até:',o.nivel.sol+' após o início ('+F(o.ini+o.nivel.solMs)+')');
  let sn=5;
  if(o.obs)b+=H((sn++)+'. Descrição / observações')+T(o.obs,{},{jc:'both'});
  if(o.fotos&&o.fotos.length)b+=H((sn++)+'. Registro fotográfico (causa / ocorrência)')+photoGrid(pk,o.fotos,2,8.0,7.0,false)+T('',{},{after:2});
  if(ehOS){b+=H((sn++)+'. Serviço a executar')+T('Realizar o atendimento técnico corretivo na câmera acima identificada, restabelecendo o seu pleno funcionamento (alimentação, conectividade, enlace de rede e gravação), nos prazos do nível de severidade indicado, e comunicar a conclusão à fiscalização do contrato.',{},{jc:'both'});
    b+=kv('Serviço concluído em:',o.resolvidoEm?F(o.resolvidoEm):'')+kv('Observações do técnico:',o.solucao||'')}
  b+=T('',{},{after:18});
  const cols=ehOS?['Gestor do contrato','Fiscal Técnico','Preposto da Contratada (ciente)']:['Fiscal Técnico','Gestor do contrato'];
  b+=SIG(cols,cols.length===3?[cm(5.4),cm(5.4),cm(5.4)]:[cm(8),cm(8)]);
  b+=T('Arraial do Cabo, '+D(Date.now())+'.',{sz:9.5,color:GRAY},{before:12});
  return build(pk,b,bgId,(ehOS?'Ordem de Serviço ':'Ocorrência ')+(ehOS?(o.os&&o.os.num):o.numero))};
})();
