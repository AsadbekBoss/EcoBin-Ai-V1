import { NextResponse } from "next/server";

async function loginToken(base:string,token:string){

const body=new URLSearchParams();

body.set("params",JSON.stringify({token}));

const r=await fetch(base+"/wialon/ajax.html?svc=token/login",{

method:"POST",
headers:{
"Content-Type":"application/x-www-form-urlencoded"
},
body

});

return r.json();

}

async function wialonCall(base:string,sid:string,svc:string,params:any){

const body=new URLSearchParams();

body.set("sid",sid);
body.set("params",JSON.stringify(params));

const r=await fetch(base+"/wialon/ajax.html?svc="+svc,{

method:"POST",
headers:{
"Content-Type":"application/x-www-form-urlencoded"
},
body

});

return r.json();

}

export async function GET(req:Request){

const base=process.env.SMARTGPS_BASE!;
const token=process.env.SMARTGPS_TOKEN!;

const {searchParams}=new URL(req.url);

const unitId=Number(searchParams.get("unitId"));

if(!unitId){

return NextResponse.json({error:"unitId kerak"});

}

const login=await loginToken(base,token);

const sid=login.eid;

const now=Math.floor(Date.now()/1000);

const from=now-24*3600;

const data=await wialonCall(

base,
sid,
"messages/load_interval",

{

itemId:unitId,
timeFrom:from,
timeTo:now,
flags:1,
flagsMask:1,
loadCount:10000

}

);

const msgs=data.messages||[];

const points=[];

for(const m of msgs){

const p=m.pos;

if(!p) continue;

points.push({

lat:p.y,
lng:p.x

});

}

return NextResponse.json({

points

});

}