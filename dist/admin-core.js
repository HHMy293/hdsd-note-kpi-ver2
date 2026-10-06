/* Shared pure functions for validating content and exporting an offline ZIP. */
(function(root){
const roles=['both','employee','manager'];
function validateContent(data){
 if(!data||!Array.isArray(data.tutorials)||!Array.isArray(data.videos)||!Array.isArray(data.faq))throw Error('File cần có tutorials, videos và faq.');
 if(!data.tutorials.length||data.tutorials.length>200)throw Error('Cần từ 1 đến 200 hướng dẫn.');
 const ids=new Set();
 const text=(x,label,required=true)=>{if(typeof x!=='string'||(required&&!x.trim())||x.length>10000)throw Error(label+' không hợp lệ.');};
 const image=x=>{if(typeof x!=='string'||!/^[-a-zA-Z0-9_./]+\.(png|jpg|jpeg|webp)$/i.test(x)||x.includes('..')||x.startsWith('/'))throw Error('Ảnh cần là tên file PNG/JPG/WebP trong assets.');};
 for(const t of data.tutorials){
  if(!/^[a-z][a-z0-9-]*$/.test(t.id)||ids.has(t.id))throw Error('Mã hướng dẫn phải duy nhất, dùng chữ không dấu và gạch nối.');ids.add(t.id);
  if(!roles.includes(t.role))throw Error('Vai trò không hợp lệ: '+t.id);
  if(t.id==='phe-duyet-dien-tu'&&t.role!=='manager')throw Error('Phê duyệt điện tử chỉ dành cho lãnh đạo.');
  text(t.title,'Tên hướng dẫn');text(t.description,'Mô tả',false);text(t.result,'Thông báo khi hoàn tất',false);
  if(!Array.isArray(t.keywords)||t.keywords.some(k=>typeof k!=='string'))throw Error('Từ khóa không hợp lệ.');
  if(!Array.isArray(t.steps)||!t.steps.length||t.steps.length>100)throw Error('Mỗi hướng dẫn cần 1–100 bước.');
  if(t.source&&!['employee','manager'].includes(t.source))throw Error('Nguồn PDF không hợp lệ.');
  if(t.source&&(!Number.isInteger(t.page)||t.page<1||t.page>(t.source==='employee'?18:29)))throw Error('Trang PDF không hợp lệ.');
  for(const s of t.steps){text(s.title,'Tên bước');text(s.instruction,'Chỉ dẫn');image(s.image);if(s.tip!==undefined)text(s.tip,'Ghi nhớ',false);if(s.warning!==undefined)text(s.warning,'Lưu ý',false);if(s.highlight&&!['edit-kpi'].includes(s.highlight))throw Error('Vùng khoanh chưa được hỗ trợ.');}
 }
 for(const t of data.tutorials)if(t.next&&(!ids.has(t.next)||t.next===t.id))throw Error('Hướng dẫn tiếp theo không hợp lệ: '+t.title);
 for(const v of data.videos){if(!['employee','manager'].includes(v.role)||!/^[-\w]{11}$/.test(v.id))throw Error('Mã YouTube phải có đúng 11 ký tự và vai trò phù hợp.');text(v.title,'Tên video');}
 for(const f of data.faq){text(f.question,'Câu hỏi');text(f.answer,'Câu trả lời');}
 return data;
}
function dataScript(data){validateContent(data);const j=x=>JSON.stringify(x,null,2).replace(/</g,'\\u003c');return `// Nội dung xuất từ trang quản trị NOTE KPI.\nconst tutorials = ${j(data.tutorials)};\nconst videos = ${j(data.videos)};\nconst faq = ${j(data.faq)};\n`;}
const table=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
const crc32=bytes=>{let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0};
async function makeZip(files){const enc=new TextEncoder(),parts=[],central=[];let offset=0,size=0;const names=new Set();for(const f of files){if(names.has(f.name)||f.name.includes('..')||f.name.startsWith('/'))throw Error('Tên file ZIP không hợp lệ.');names.add(f.name);const name=enc.encode(f.name);const bytes=f.content instanceof Blob?new Uint8Array(await f.content.arrayBuffer()):typeof f.content==='string'?enc.encode(f.content):new Uint8Array(f.content);size+=bytes.length;if(size>150*1024*1024)throw Error('Gói xuất vượt 150 MB.');const crc=crc32(bytes),h=new Uint8Array(30+name.length),v=new DataView(h.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,name.length,true);h.set(name,30);parts.push(h,bytes);const c=new Uint8Array(46+name.length),cv=new DataView(c.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint32(16,crc,true);cv.setUint32(20,bytes.length,true);cv.setUint32(24,bytes.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);c.set(name,46);central.push(c);offset+=h.length+bytes.length;}const csize=central.reduce((n,c)=>n+c.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,csize,true);ev.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:'application/zip'});}
root.AdminCore={validateContent,dataScript,makeZip};
})(globalThis);
